class FindingsHelper {
    constructor() {
        this._userInfoFindingCode = '98';
    }

    categorizeFindings (findings) {
        var categorized = {
            general: [],
            users: {},
            userData: {},
            userLevels: {}
        };

        var userLevelMappings = {};

        for (var f = 0; f < findings.length; f++) {
            var finding = findings[f];

            if (finding.data.code === this._userInfoFindingCode) {
                finding.numberOfFindings = 0;
                var username = finding.data.username;
                categorized.userData[username] = finding;

                // Create user-level mappings
                if (userLevelMappings[username] === undefined) {
                    if (finding.data.permissions === 'super') {
                        userLevelMappings[username] = 'Admin';
                    } else if (finding.data.permissions === null) {
                        userLevelMappings[username] = 'Guest';
                    } else {
                        userLevelMappings[username] = 'Other';
                    }
                }

            } else {
                finding.data.severityNum = TOTEM.severityLevels[finding.data.severity];

                if (finding.data.username !== undefined) {
                    var username = finding.data.username;

                    if (categorized.users[username] === undefined) {
                        categorized.users[username] = [];
                    }
                    categorized.users[username].push(finding);
                } else {
                    categorized.general.push(finding);
                }
            }
        }
        
        //Populates user levels
        for (var f = 0; f < findings.length; f++) {
            var finding = findings[f];

            if (finding.data.username !== undefined) {
                var username = finding.data.username;
                var code = finding.data.code;

                if (code === this._userInfoFindingCode) continue;

                if (userLevelMappings[username]) {
                    var level = userLevelMappings[username];

                    if (categorized.userLevels[level] === undefined) {
                        categorized.userLevels[level] = {};
                    }
                    if (categorized.userLevels[level][code] === undefined) {
                        categorized.userLevels[level][code] = {
                            count: 0, 
                            finding: finding.data.finding
                        };
                    }
                    categorized.userLevels[level][code].count++;
                }  
            }
        }

        // Assigns Risk levels to findings per user types
        for (var level in categorized.userLevels) {
            var codes = categorized.userLevels[level];
            for (var code in codes) {
                var finding = codes[code];

                if (finding.count > 20) {
                    finding.severity = 'Critical';
                } else if (finding.count >= 15) {
                    finding.severity = 'Very High';
                } else if (finding.count >= 11) {
                    finding.severity = 'High';
                } else if (finding.count >= 6) {
                    finding.severity = 'Medium';
                } else if (finding.count < 6) {
                    finding.severity = 'Low';
                }
            }
        }

        // Sort findings to display the critical ones at the top.
        categorized.general.sort(function (a, b) {
            return parseFloat(b.data.severityNum) - parseFloat(a.data.severityNum);
        });

        // Sort and Count the number of findings per user
        for (var user in categorized.users) {
            var findings = categorized.users[user];

            if (categorized.userData[user]) {
                categorized.userData[user].numberOfFindings = findings.length;
            }

            findings.sort(function (a, b) {
                return parseFloat(b.data.severityNum) - parseFloat(a.data.severityNum);
            });
        }

        return categorized;
    }


    getFindingDetails(findingData, key) {
        function convertCamelCaseToRegular(s) {
            return s.replace(/([A-Z])/g, ' $1').replace(/^./, function (str) { return str.toUpperCase(); })
        }

        if (key == 'username' || key == 'password' || key == 'code' || key == 'severityNum') return;

        var value = findingData[key];

        if (key == 'finding') {
            value = value + ' (' + findingData['code'] + ')';
        }

        if (key == 'lastPasswordReset') {
            value = new Date(value).toUTCString();
        }
        return [convertCamelCaseToRegular(key), value];
    }
}