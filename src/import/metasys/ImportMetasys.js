const fs = require('fs');
const FindingsHelper = requireFromRoot('src/import/FindingsHelper.js');
const THREE_MONTHS_IN_MS = 60 * 60 * 24 * 90 * 1000;

module.exports = function (databaseLayer) {
    return {
        runImport: function (parsedContents, sourceId, onCompleteCallback) {
            var metasysImporter = new MetasysImporter();

            metasysImporter.import(parsedContents, sourceId, function (info, findings) {
                onCompleteCallback(info, findings);
            });
        }
    }
}

class MetasysImporter {
    constructor() {}

    import(parsedContents, sourceId, onCompleteCallback) {
        var findings = new FindingsHelper(sourceId);

        var main = parsedContents["SecurityDS"];

        var info = {};
        
        var bannedDomains = findings.getBannedEmailDomains();

        if (!main) {
            findings.add('22200');
            return;
        }

        var users = null;
        var accountPolicies = null;

        // Get version info
        if (main.tblVersion) {
            for (var i = 0; i < main.tblVersion.length; i++) {
                var versions = main.tblVersion[i].versionID;
                for (var j = 0; j < versions.length; j++) {
                    if (versions[j]) {
                        info.version = versions[j];
                        break;
                    }
                }
            }
        } 

        // Get User Details
        if (main.tblUser) {
            users = main.tblUser;
        } else {
            findings.add('22201');
        }

        // Get Account Policy
        if (main.tblAccountPolicy) {
            accountPolicies = main.tblAccountPolicy;
        } else {
            findings.add('22202');
        }

        // Processes users data 
        if (users && users.length) {
            for (var i = 0; i < users.length; i++) {
                var user = users[i];
                var username = "";
                var password = "";

                if (user.UserName[0]) {
                    username = user.UserName[0];
                }
                if (user.Password[0]) {
                    password = user.Password[0];
                }

                var passwordExpiration = false;
                if (user.PasswordNeverExpires[0] === 'true') {
                    passwordExpiration = 'Never';
                } else {
                    if (user.PasswordExpiresDays[0] && user.LastPasswordChangeDate[0]) {
                        var msPassedSinceCreation = new Date(user.LastPasswordChangeDate[0]).getTime() + user.PasswordExpiresDays[0]*24*3600*1000;
                        passwordExpiration = new Date(msPassedSinceCreation).toUTCString();
                    }
                }

                var accountExpiration = false;
                if (user.AccountExpiration[0] == 0) {
                    accountExpiration = 'Never';
                } else {
                    if (user.AccountExpiration[0] && user.CreateDate[0]) {
                        var msPassedSinceCreation = new Date(user.CreateDate[0]).getTime() + user.AccountExpiration[0]*24*3600*1000;
                        accountExpiration = new Date(msPassedSinceCreation).toUTCString();
                    }
                }

                // Creates a new user and add to the findings
                findings.add('98',
                    {
                        username: username,
                        permissions: (user.UserDefined[0] === 'false' ? 'super' : null),
                        status: (user.AccountDisabled[0] === 'true' ? "Disabled" : "Enabled"),
                        fullName: user.FullName[0],
                        userExpiration: accountExpiration,
                        lockOut: (user.NoAccountLockOut[0] === 'true' ? false : true),
                        passwordExpiration: passwordExpiration
                    }
                );

                if (user.LastPasswordChangeDate[0] != undefined) {
                    var lastPasswordReset = new Date(user.LastPasswordChangeDate[0]).getTime();

                    if (lastPasswordReset < (new Date().getTime() - THREE_MONTHS_IN_MS)) {
                        findings.add('22221',
                            {   
                                info: true,
                                username: username,
                                password: password,
                                lastPasswordReset: lastPasswordReset
                            }
                        );
                    }
                }

                if (user.EMailAddress[0] != undefined) {
                    var emailAddress = user.EMailAddress[0];

                    var isBannedEmailAddressInUse = false;
                    for (var j = 0; j < bannedDomains.length; j++) {
                        if (emailAddress.indexOf(bannedDomains[j]) != -1) {
                            isBannedEmailAddressInUse = true;
                            break;
                        }
                    }

                    if (isBannedEmailAddressInUse) {
                        findings.add('22222',
                            {   
                                info: true,
                                username: username,
                                password: password,
                                emailAddress: emailAddress
                            }
                        );
                    }
                }

                if (user.PasswordNeverExpires[0] != undefined) {
                    if (user.PasswordNeverExpires[0] == "true") {
                        findings.add('22223',
                            {   
                                info: true,
                                username: username,
                                password: password,
                                passwordExpires: "Never"
                            }
                        );
                    }
                }

                if (user.PasswordExpiresDays[0] != undefined) {
                    var passwordExpiresAfter = user.PasswordExpiresDays[0];

                    if (passwordExpiresAfter > 90) {
                        findings.add('22224',
                            {   
                                info: true,
                                username: username,
                                password: password,
                                passwordExpiresAfter: passwordExpiresAfter
                            }
                        );
                    }
                }

                if (user.NoPasswordHistory[0] != undefined) {
                    if (user.NoPasswordHistory[0] == "true") {
                        findings.add('22225',
                            {   
                                info: true,
                                username: username,
                                password: password
                            }
                        );
                    }
                }

                if (user.NoAccountLockOut[0] != undefined) {
                    if (username != 'MetasysSysAgent' && user.NoAccountLockOut[0] == "true") {
                        findings.add('22226',
                            {   
                                info: true,
                                username: username,
                                password: password
                            }
                        );
                    }
                }
            }
        }
        // Processes account policies data 
        if (accountPolicies && accountPolicies.length) {
            function accountData(sourceId) {
                return { sourceId: sourceId };
            }

            for (var i = 0; i < accountPolicies.length; i++) {
                var policy = accountPolicies[i];

                if (policy.MinPassword[0] != undefined) {
                    var minimumAllowedPasswordLength = policy.MinPassword[0];
                    if (minimumAllowedPasswordLength < 8) {
                        findings.add('22227',
                            {   
                                info: true,
                                minimumAllowedPasswordLength: minimumAllowedPasswordLength
                            }
                        );
                    }
                }
            }
        }

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
    }
}