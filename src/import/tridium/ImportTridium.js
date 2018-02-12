const fs = require('fs');
const FindingsHelper = requireFromRoot('src/import/FindingsHelper.js');
const SIX_MONTHS_IN_MS = 6 * 30 * 24 * 60 * 60 * 1000;

module.exports = function (databaseLayer) {
    return {
        runImport: function (parsedContents, sourceId, onCompleteCallback) {
            var tridiumImporter = new TridiumImporter();

            tridiumImporter.import(parsedContents, sourceId, function (info, findings) {
                onCompleteCallback(info, findings);
            });
        }
    }
}

class TridiumImporter {
    constructor() {}

    import(parsedContents, sourceId, onCompleteCallback) {
        var findings = new FindingsHelper(sourceId);

        var main = parsedContents["bajaObjectGraph"];

        var bannedDomains = findings.getBannedEmailDomains();

        var info = {};

        var driversTree = {};

        var webServiceTree = {};
        var userServiceTree = {};
        var ldapUserServiceTree = {};
        var emailServiceTree = {};
        var backupServiceTree = {};

        var reportServicePrimaryEmailTree = {};
        var reportServiceEmailRotatorTree = {};

        var alarmServiceEmailRecipientTree = {};
        var alarmServiceEmailRecipient1Tree = {};
        var alarmServiceEscalationEmailTree = {};
        var alarmServicePrimaryEmailTree = {};
        var alarmServiceEmailRotatorTree = {};

        function getServiceTrees(main) {
            if (main && main.p) {
                for (var i = 0; i < main.p.length; i++) {
                    var categories = main.p[i].p;

                    if (categories) {
                        for (var j = 0; j < categories.length; j++) {
                            var category = categories[j];

                            if (category.$ && category.p && category.$.n == "Services") {
                                var services = category.p;

                                if (services) {
                                    for (var k = 0; k < services.length; k++) {
                                        var service = services[k];

                                        // Web Service
                                        if (service.$ && service.$.n == "WebService") {
                                            webServiceTree = service;
                                        }

                                        //User service tree
                                        if (service.$ && service.$.n == "UserService") {
                                            userServiceTree = service;
                                        }

                                        //LDAP User service tree
                                        if (service.$ && service.$.n == "LdapUserService") {
                                            ldapUserServiceTree = service;
                                        }

                                        //Email service tree
                                        if (service.$ && service.$.n == "EmailService") {
                                            emailServiceTree = service;
                                        }

                                        //Backup service tree
                                        if (service.$ && service.$.n == "BackupService") {
                                            backupServiceTree = service;
                                        }

                                        //Report service tree
                                        if (service.$ && service.p && service.$.n == "ReportService") {
                                            for (var l = 0; l < service.p.length; l++) {
                                                var serviceObject = service.p[l];

                                                if (serviceObject.$ && serviceObject.$.n == "PrimaryEmail") {
                                                    reportServicePrimaryEmailTree = serviceObject;
                                                }

                                                if (serviceObject.$ && serviceObject.$.n == "EmailRotator") {
                                                    reportServiceEmailRotatorTree = serviceObject;
                                                }
                                            }
                                        }

                                        //Alarm service tree
                                        if (service.$ && service.$.n == "AlarmService") {
                                            for (var l = 0; l < service.p.length; l++) {
                                                var serviceObject = service.p[l];

                                                if (serviceObject.$ && serviceObject.$.n == "EmailRecipient") {
                                                    alarmServiceEmailRecipientTree = serviceObject;
                                                }

                                                if (serviceObject.$ && serviceObject.$.n == "EmailRecipient1") {
                                                    alarmServiceEmailRecipient1Tree = serviceObject;
                                                }

                                                if (serviceObject.$ && serviceObject.$.n == "EscalationEmail") {
                                                    alarmServiceEscalationEmailTree = serviceObject;
                                                }

                                                if (serviceObject.$ && serviceObject.$.n == "PrimaryEmail") {
                                                    alarmServicePrimaryEmailTree = serviceObject;
                                                }

                                                if (serviceObject.$ && serviceObject.$.n == "EmailRotator") {
                                                    alarmServiceEmailRotatorTree = serviceObject;
                                                }
                                            }
                                        }
                                    }
                                }
                            } else if (category.$ && category.p && category.$.n == "Drivers") {                                
                                driversTree = category.p;
                            }
                        }
                    }
                }
            }
        }

        // Gets version information
        function getVersion(drivers) {
            if (drivers) {
                for (var k = 0; k < drivers.length; k++) {
                    var driver = drivers[k];
                    
                    if (driver.$.n === 'NiagaraNetwork') {
                        if (driver.p) {
                            for (var d = 0; d < driver.p.length; d++) {
                                if (driver.p[d].$.t === 'nd:NiagaraStation') {
                                    var station = driver.p[d].p;
                                    
                                    for (var p = 0; p < station.length; p++) {
                                        if (station[p].$.n === 'version') {
                                            if(station[p].$.v) {
                                                info.version = station[p].$.v;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Processes the "WebService" tree
        function webServiceSecurityChecks(serviceTree) {
            if (!serviceTree || !serviceTree.p) {
                findings.add('1');
                return;
            }

            for (var i = 0; i < serviceTree.p.length; i++) {
                var item = serviceTree.p[i];

                if (item.$.n == 'tunnelingEnabled') {
                    if (item.$.v == 'true') {
                        findings.add('129');
                    }
                }

                if (item.$.n == 'proxyAuthenticationWhenTunneling') {
                    if (item.$.v == 'true') {
                        findings.add('130');
                    }
                }
            }
        }

        // Processes the "UserService" and "LdapUserService" trees
        function userServiceSecurityChecks(userServiceTree, ldapUserServiceTree) {
            // If no user service tree exists
            if (!(userServiceTree && userServiceTree.p) && !(ldapUserServiceTree && ldapUserServiceTree.p)) {
                findings.add('2');
                return;
            }
            function analyseUserTree(uTree) {
                if (uTree && uTree.p) {
                    for (var i = 0; i < uTree.p.length; i++) {
                        var userTree = uTree.p[i];

                        if (userTree) {
                            if (userTree.p && userTree.$.n === 'userPrototypes') {
                                for (var j = 0; j < userTree.p.length; j++) {
                                    if (userTree.p[j].$.n === 'defaultPrototype') {
                                        var properties = userTree.p[j].p;

                                        if (properties) {

                                            for (var k = 0; k < properties.length; k++) {
                                                if (properties[k].$.n === 'permissions') {
                                                    if (properties[k].$.v === 'super') {
                                                        findings.add('111');
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } else if (userTree.p && userTree.$.n && userTree.$.t) {
                                var isPasswordEmpty = true;
                                var isUserDisabled = false;
                                var username = userTree.$.n;
                                var fullName = null;
                                var tagType = userTree.$.t;
                                var permissions = null;
                                var userExpiration = false;
                                var passwordExpiration = false;
                                var lockOut = false;

                                var emailAddress = null;

                                if (tagType === 'b:User') {
                                    for (var j = 0; j < userTree.p.length; j++) {

                                        if (userTree.p[j].$.n === 'password') {
                                            if (userTree.p[j].$.v != '') {
                                                isPasswordEmpty = false;
                                            }
                                        }

                                        if (userTree.p[j].$.n === 'enabled') {
                                            if (userTree.p[j].$.v == 'false') {
                                                isUserDisabled = true;
                                            }
                                        }

                                        if (userTree.p[j].$.n === 'email') {
                                            if (userTree.p[j].$.v) {
                                                emailAddress = userTree.p[j].$.v;
                                            }
                                        }

                                        if (userTree.p[j].$.n === 'permissions') {
                                            permissions = userTree.p[j].$.v;
                                        }

                                        if (userTree.p[j].$.n === 'fullName') {
                                            fullName = userTree.p[j].$.v;
                                        }

                                        if (userTree.p[j].$.n === 'expiration') {
                                            if (userTree.p[j].$.v) {
                                                userExpiration = new Date(userTree.p[j].$.v).toUTCString();
                                            }
                                        }

                                        if (userTree.p[j].$.n === 'lockOut') {
                                            if (userTree.p[j].$.v) {
                                                lockOut = true;
                                            }
                                        }
                                    }

                                    if (lockOut == false) {
                                        findings.add('131', { 
                                            info: true,
                                            username: username
                                        });
                                    }

                                    if (passwordExpiration == false) {
                                        findings.add('132', { 
                                            info: true,
                                            username: username
                                        });
                                    }

                                    if (emailAddress) {
                                        var emailDomain = emailAddress.substr(emailAddress.indexOf("@") + 1);

                                        for (var k = 0; k < bannedDomains.length; k++) {
                                            if (emailDomain.toLowerCase() == bannedDomains[k]) {
                                                findings.add('122', { 
                                                    info: true,
                                                    username: username,
                                                    emailAddress: emailAddress 
                                                });
                                                break;
                                            }
                                        }
                                    }

                                    if (isPasswordEmpty === true && isUserDisabled === false) {
                                        findings.add('11112',
                                            {
                                                info: true,
                                                username: username
                                            }
                                        );
                                    }

                                    // Create user as an informational finding
                                    var userStatus = isUserDisabled === true ? 'Disabled' : 'Enabled';
                                    findings.add('98',
                                        {
                                            username: username,
                                            permissions: permissions,
                                            status: userStatus,
                                            fullName: fullName,
                                            userExpiration: userExpiration,
                                            lockOut: lockOut,
                                            passwordExpiration: passwordExpiration
                                        }
                                    );
                                }
                            }
                        }
                    }
                }
            }

            analyseUserTree(userServiceTree);
            analyseUserTree(ldapUserServiceTree);
        }

        // Processes the "EmailService" tree
        function emailServiceSecurityChecks(serviceTree) {
            if (!serviceTree || !serviceTree.p) {
                return;
            }

            for (var i = 0; i < serviceTree.p.length; i++) {
                var accountItems = serviceTree.p[i].p;

                var username = "N/A";
                var emailHostname = "N/A";

                var isPasswordEmpty = false;

                if (accountItems) {
                    for (var j = 0; j < accountItems.length; j++) {
                        if (accountItems[j].$.n == 'hostname') {
                            emailHostname = accountItems[j].$.v;
                        }

                        if (accountItems[j].$.n == 'account') {
                            username = accountItems[j].$.v;
                        }

                        if (accountItems[j].$.n == 'password') {
                            if (accountItems[j].$.v == '') {
                                isPasswordEmpty = true;
                            }
                        }
                    }
                }
                if (isPasswordEmpty == true) {
                    findings.add('113',
                        {
                            username: username,
                            emailHostname: emailHostname
                        }
                    );
                }
            }
        }

        // Processes the "BackupService" tree
        function backupServiceSecurityChecks(serviceTree) {
            function noBackup() {
                findings.add('99',
                    {   
                        info: true,
                        lastBackupTime: 'Never'
                    }
                );
            }

            if (!serviceTree || !serviceTree.p) {
                noBackup();
                return;
            }

            var lastBackupTime = 0;
            var username = "";

            for (var i = 0; i < serviceTree.p.length; i++) {
                if (serviceTree.p[i].$.n == 'BackupRecord') {
                    var backupRecords = serviceTree.p[i].p;


                    if (backupRecords) {
                        for (var j = 0; j < backupRecords.length; j++) {
                            if (backupRecords[j].$.n == 'timestamp') {
                                var backupTime = new Date(backupRecords[j].$.v).getTime();

                                if (backupTime > lastBackupTime) {
                                    lastBackupTime = backupTime;
                                }
                            }
                            if (backupRecords[j].$.n == 'user') {
                                username = backupRecords[j].$.v;
                            }
                        }
                    }

                }
            }

            // Check if no backup is available
            if (lastBackupTime == 0) {
                noBackup();
            }
            // Check if the last backup was done in the last 6 months or not
            if (lastBackupTime != 0 && lastBackupTime < new Date().getTime() - SIX_MONTHS_IN_MS) {
                findings.add('100',
                    {   
                        info: true,
                        lastBackupTime: new Date(lastBackupTime).toUTCString()
                    }
                );
            }
        }

        // Processes the "ReportService/PrimaryEmail" tree
        function reportservicePrimaryEmailSecurityChecks(serviceTree) {
            if (!serviceTree || !serviceTree.p) {
                return;
            }

            for (var i = 0; i < serviceTree.p.length; i++) {
                var reports = serviceTree.p[i].p;

                if (reports) {
                    for (var j = 0; j < reports.length; j++) {
                        if (reports[j].$.n == 'value') {
                            var emailAddress = reports[j].$.v;

                            if (!emailAddress) continue;

                            var emailDomain = emailAddress.substr(emailAddress.indexOf("@") + 1);

                            for (var k = 0; k < bannedDomains.length; k++) {
                                if (emailDomain.toLowerCase() == bannedDomains[k]) {
                                    findings.add('114', { emailAddress: emailAddress });
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Processes the "ReportService/EmailRotator" tree
        function reportserviceEmailRotatorSecurityChecks(serviceTree) {
            if (!serviceTree || !serviceTree.p) {
                return;
            }

            for (var i = 0; i < serviceTree.p.length; i++) {
                var email = serviceTree.p[i];

                if (email) {
                    if (email.$.n == 'Email1' || email.$.n == 'Email2') {
                        var emailAddress = email.$.v;

                        var emailDomain = emailAddress.substr(emailAddress.indexOf("@") + 1);

                        for (var k = 0; k < bannedDomains.length; k++) {
                            if (emailDomain.toLowerCase() == bannedDomains[k]) {
                                findings.add('115', { emailAddress: emailAddress });
                            }
                        }
                    } else if (email.$.n == 'Tech1' || email.$.n == 'Tech2') {
                        for (var j = 0; j < email.p.length; j++) {
                            if (email.p[j].$.n == 'value') {
                                var emailAddress = email.p[j].$.v;

                                if (!emailAddress) continue;

                                var emailDomain = emailAddress.substr(emailAddress.indexOf("@") + 1);

                                for (var k = 0; k < bannedDomains.length; k++) {
                                    if (emailDomain.toLowerCase() == bannedDomains[k]) {
                                        findings.add('110', { emailAddress: emailAddress });
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Processes the "AlarmService/EmailRecipient" tree
        function alarmServiceEmailRecipientSecurityChecks(serviceTree) {
            if (!serviceTree || !serviceTree.p) {
                return;
            }

            for (var i = 0; i < serviceTree.p.length; i++) {
                var email = serviceTree.p[i];

                if (email) {
                    if (email.$.n == 'to') {
                        var emailAddress = email.$.v;

                        if (!emailAddress) continue;

                        var emailDomain = emailAddress.substr(emailAddress.indexOf("@") + 1);

                        for (var k = 0; k < bannedDomains.length; k++) {
                            if (emailDomain.toLowerCase() == bannedDomains[k]) {
                                findings.add('116', { emailAddress: emailAddress });
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Processes the "AlarmService/EmailRecipient1" tree
        function alarmServiceEmailRecipient1SecurityChecks(serviceTree) {
            if (!serviceTree || !serviceTree.p) {
                return;
            }

            for (var i = 0; i < serviceTree.p.length; i++) {
                var email = serviceTree.p[i];

                if (email) {
                    if (email.$.n == 'to') {
                        var emailAddress = email.$.v;

                        if (!emailAddress) continue;

                        var emailDomain = emailAddress.substr(emailAddress.indexOf("@") + 1);

                        for (var k = 0; k < bannedDomains.length; k++) {
                            if (emailDomain.toLowerCase() == bannedDomains[k]) {
                                findings.add('117', { emailAddress: emailAddress });
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Processes the "AlarmService/EscalationEmail" tree
        function alarmServiceEscalationEmailSecurityChecks(serviceTree) {
            if (!serviceTree || !serviceTree.p) {
                return;
            }

            for (var i = 0; i < serviceTree.p.length; i++) {
                var items = serviceTree.p[i].p;

                if (items) {
                    for (var j = 0; j < items.length; j++) {
                        if (items[j].$.n == 'value') {
                            var emailAddress = items[j].$.v;

                            if (!emailAddress) continue;

                            var emailDomain = emailAddress.substr(emailAddress.indexOf("@") + 1);

                            for (var k = 0; k < bannedDomains.length; k++) {
                                if (emailDomain.toLowerCase() == bannedDomains[k]) {
                                    findings.add('118', { emailAddress: emailAddress });
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Processes the "AlarmService/PrimaryEmail" tree
        function alarmServicePrimaryEmailSecurityChecks(serviceTree) {
            if (!serviceTree || !serviceTree.p) {
                return;
            }

            for (var i = 0; i < serviceTree.p.length; i++) {
                var items = serviceTree.p[i].p;

                if (items) {
                    for (var j = 0; j < items.length; j++) {
                        if (items[j].$.n == 'value') {
                            var emailAddress = items[j].$.v;

                            if (!emailAddress) continue;

                            var emailDomain = emailAddress.substr(emailAddress.indexOf("@") + 1);

                            for (var k = 0; k < bannedDomains.length; k++) {
                                if (emailDomain.toLowerCase() == bannedDomains[k]) {
                                    findings.add('119', { emailAddress: emailAddress });
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Processes the "AlarmService/EmailRotator" tree
        function alarmServiceEmailRotatorSecurityChecks(serviceTree) {
            if (!serviceTree || !serviceTree.p) {
                return;
            }

            for (var i = 0; i < serviceTree.p.length; i++) {
                var email = serviceTree.p[i];

                if (email) {
                    if (email.$.n == 'Email1' || email.$.n == 'Email2') {
                        var emailAddress = email.$.v;

                        if (!emailAddress) continue;

                        var emailDomain = emailAddress.substr(emailAddress.indexOf("@") + 1);

                        for (var k = 0; k < bannedDomains.length; k++) {
                            if (emailDomain.toLowerCase() == bannedDomains[k]) {
                                findings.add('120', { emailAddress: emailAddress });
                                break;
                            }
                        }
                    } else if (email.$.n == 'Tech1' || email.$.n == 'Tech2') {
                        for (var j = 0; j < email.p.length; j++) {
                            if (email.p[j].$.n == 'value') {
                                var emailAddress = email.p[j].$.v;

                                var emailDomain = emailAddress.substr(emailAddress.indexOf("@") + 1);

                                for (var k = 0; k < bannedDomains.length; k++) {
                                    if (emailDomain.toLowerCase() == bannedDomains[k]) {
                                        findings.add('121', { emailAddress: emailAddress });
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        getServiceTrees(main);

        getVersion(driversTree);

        webServiceSecurityChecks(webServiceTree);
        userServiceSecurityChecks(userServiceTree, ldapUserServiceTree);
        emailServiceSecurityChecks(emailServiceTree);
        backupServiceSecurityChecks(backupServiceTree);

        reportservicePrimaryEmailSecurityChecks(reportServicePrimaryEmailTree);
        reportserviceEmailRotatorSecurityChecks(reportServiceEmailRotatorTree);

        alarmServiceEmailRecipientSecurityChecks(alarmServiceEmailRecipientTree);
        alarmServiceEmailRecipient1SecurityChecks(alarmServiceEmailRecipient1Tree);
        alarmServiceEscalationEmailSecurityChecks(alarmServiceEscalationEmailTree);
        alarmServicePrimaryEmailSecurityChecks(alarmServicePrimaryEmailTree);
        alarmServiceEmailRotatorSecurityChecks(alarmServiceEmailRotatorTree);

        // Certification status
        info.status = 'passed';
        var allFindings = findings.getAll();
        
        for (var i = 0; i < allFindings.length; i++) {
            if (allFindings[i].data.severity !== 'Info') {
                info.status = 'failed';
                break;
            }
        }

        onCompleteCallback(info, allFindings);
        return;
    }
}