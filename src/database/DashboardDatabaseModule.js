const objectIdFromString = requireFromRoot('src/database/ObjectIdFromString.js');

function DashboardDatabaseModule(databaseLayer, db) {
    this.databaseLayer = databaseLayer;
    this._db = db;
}

DashboardDatabaseModule.prototype._calculateSourceStatistics = function (sources) {
    for (var i = 0; i < sources.length; i++) {
        var source = sources[i];
        source.statistics = {};

        for (var j = 0; j < source.findings.length; j++) {
            var finding = source.findings[j];

            if (source.statistics[finding.data.severity] === undefined) {
                source.statistics[finding.data.severity] = 0;
            }
            source.statistics[finding.data.severity]++;
        }
    }

    sources.sort(function (a, b) {
        return parseFloat(b.timestamp) - parseFloat(a.timestamp);
    });

    return sources;
}

DashboardDatabaseModule.prototype._calculateFacilityStatistics = function (facility) {
    var facilityStatistics = {};

    for (var id in facility.sources) {
        var source = facility.sources[id];

        for (var severity in source.statistics) {
            if (facilityStatistics[severity] === undefined) {
                facilityStatistics[severity] = 0;
            }
            facilityStatistics[severity] += source.statistics[severity];
        }
    }
    facility.statistics = facilityStatistics;

    return facility;
}

DashboardDatabaseModule.prototype._calculateOrganizationStatistics = function (organization) {
    var organizationStatistics = {};

    for (var id in organization.facilities) {
        var facility = organization.facilities[id];

        for (var severity in facility.statistics) {
            if (organizationStatistics[severity] === undefined) {
                organizationStatistics[severity] = 0;
            }
            organizationStatistics[severity] += facility.statistics[severity];
        }
    }
    organization.statistics = organizationStatistics;

    return organization;
}

DashboardDatabaseModule.prototype.getOrganizationStatistics = function (organizationId, onFinishedCallback) {
    this.databaseLayer.sources.getSources({ organizationId: objectIdFromString(organizationId) }, function (getSourcesResult) {
        if (getSourcesResult.error) {
            onFinishedCallback(getSourcesResult);
            return;
        }

        var sources = getSourcesResult.data;
        sources = this._calculateSourceStatistics(sources);
        onFinishedCallback({ data: sources });
    }.bind(this))
}

DashboardDatabaseModule.prototype.getFacilityStatistics = function (facilityId, onFinishedCallback) {
    this.databaseLayer.sources.getSources({ facilityId: objectIdFromString(facilityId) }, function (getSourcesResult) {
        if (getSourcesResult.error) {
            onFinishedCallback(getSourcesResult);
            return;
        }

        var sources = getSourcesResult.data;
        sources = this._calculateSourceStatistics(sources);
        onFinishedCallback({ data: sources });
    }.bind(this))
}

DashboardDatabaseModule.prototype.getDashboardStatistics = function (userPermissions, onFinishedCallback) {
    var result = {};

    var query = {};

    if (!userPermissions.admin) {
        query = {
            _id: {
                $in: []
            }
        }

        for (var id in userPermissions.organizations) {
            query._id.$in.push(objectIdFromString(id));
        }
    }
    
    //Collect all the required data from the database first
    this._db.collection('Organizations').find(query).toArray(function (err, organizations) {
        if (!err && organizations != null) {
            var loopCounter = 0;

            var getOrganizationSources = function (organization) {
                this.databaseLayer.sources.getSources({organizationId: objectIdFromString(organization._id)}, function (getSourcesResult){
                    if (getSourcesResult.error) {
                        onFinishedCallback(getSourcesResult);
                        return;
                    }

                    organization.sources = this._calculateSourceStatistics(getSourcesResult.data);

                    if (++loopCounter == organizations.length) {
                        classifyOrganizations(organizations);
                    }
                }.bind(this));
            }.bind(this);

            if (organizations.length == 0) {
                result.organizations = [];

                onFinishedCallback({data: result});
                return;
            }

            for (var i = 0; i < organizations.length; i++) {                
                getOrganizationSources(organizations[i]);
            }

            // Add sources to their facilities and calculate statistics
            var classifyOrganizations = function (organizations) {
                result.organizations = [];

                for (var i = 0; i < organizations.length; i++) {
                    var organization = organizations[i];

                    for (var id in organization.facilities) {
                        var facility = organization.facilities[id];

                        for (var j = 0; j < organization.sources.length; j++) {
                            var source = organization.sources[j];

                            if (source.facilityId == id) {
                                facility.sources[source._id] = source;
                            }
                        }
                        facility = this._calculateFacilityStatistics(facility);
                    }
                    organization = this._calculateOrganizationStatistics(organization);
                    delete organization.sources;
                }

                result.organizations = organizations;
                onFinishedCallback({data: result})
            }.bind(this);
        } else {
            onFinishedCallback({ error: new totemError.ErrorGeneric('Unable to get dashboard statistics', { organizationIds: organizationIds }) });
            return;
        }
    }.bind(this));
}

module.exports = DashboardDatabaseModule;