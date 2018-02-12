const findingDetails = requireFromRoot('/src/import/FindingDetails.json');
const totemConfiguration = requireFromRoot('totem_configuration.json');

class FindingsHelper {
    constructor(sourceId) {
        this._findings = [];
        this._sourceId = sourceId;
    }

    add(code, optional) {
        var finding = {
            sourceId: this._sourceId,
            data: {
                code: code,
                severity: findingDetails[code].severity,
                finding: findingDetails[code].finding
            }
        };

        if (optional) {
            for (var key in optional) {
                if (key === 'info') {
                    finding.data.info = totemConfiguration.applicationName + " " + findingDetails[code].info;
                } else {
                    finding.data[key] = optional[key];
                }
            }
        }

        this._findings.push(finding);
    }

    getBannedEmailDomains() {
        return findingDetails['bannedEmailDomains'];
    }

    getAll() {
        return this._findings;
    }
}

module.exports = FindingsHelper;