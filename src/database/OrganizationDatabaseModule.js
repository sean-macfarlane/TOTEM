const mongo = require('mongodb');
const objectIdFromString = requireFromRoot('src/database/ObjectIdFromString.js');

function OrganizationDatabaseModule(databaseLayer, db) {
    this.databaseLayer = databaseLayer;
    this._db = db;
}

OrganizationDatabaseModule.prototype.getOrganizations = function (userPermissions, onFinishedCallback) {
    var all = {};
    var loopCounter = 0;
    var query = {};

    if (!userPermissions.admin) {
        query = {
            _id: {
                $in: []
            }
        }

        for(var id in userPermissions.organizations){
            query._id.$in.push(objectIdFromString(id));
        }
    }

    this._db.collection('Organizations').find(query).toArray(function (err, organizations) {
        if (err) {
            onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Error occured while getting Organizations', {}) });
            return;
        }

        var getSources = function (facility) {
            for (var sourceId in facility.sources) {
                ++loopCounter;

                this._db.collection('Sources').findOne({ _id: objectIdFromString(sourceId) }, function (err, source) {
                    if (!err && source) {
                        facility.sources[source._id] = source;
                    }

                    if (--loopCounter == 0) {
                        onFinishedCallback({ data: all });
                        return;
                    }
                });
            }
        }.bind(this);

        for (var i = 0; i < organizations.length; i++) {
            all[organizations[i]._id] = organizations[i];
            for (var j in organizations[i].facilities) {
                getSources(organizations[i].facilities[j]);
            }
        }

        if (loopCounter == 0) {
            onFinishedCallback({ data: all });
            return;
        }
    }.bind(this));
}

OrganizationDatabaseModule.prototype.createOrganization = function (userId, organizationData, onFinishedCallback) {
    var organization = {
        _id: new mongo.ObjectID(),
        name: organizationData.name,
        timestamp: Date.now(),
        facilities: {}
    };

    this._db.collection('Organizations').insert(organization, { w: 1 }, function (err, insertOrgResult) {
        if (!err && insertOrgResult.result.n > 0) {
            onFinishedCallback({ data: organization });
        } else {
            onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to create organization', { userId: userId }) });
            return;
        }
    }.bind(this));
}

OrganizationDatabaseModule.prototype.getOrganization = function (organizationId, onFinishedCallback) {
    this._db.collection('Organizations').findOne({ _id: objectIdFromString(organizationId) }, function (err, organization) {
        if (organization === null) {
            onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Could not retrieve organization', { organizationId: organizationId }) });
            return;
        } else {
            var organizationFacilityIds = [];

            for (var id in organization.facilities) {
                organizationFacilityIds.push(id);
            }

            var loopCounter = 0;
            var facilities = [];

            var getFacility = function (facilityId) {
                this.databaseLayer.facility.getFacility(organizationId, facilityId, function (getFacilityResult) {
                    if (getFacilityResult.error) {
                        onFinishedCallback(getFacilityResult);
                        return;
                    } else {
                        var facility = getFacilityResult.data;
                        facilities.push(facility);
                    
                        if (++loopCounter == organizationFacilityIds.length) {
                            organization.facilities = facilities;
                            onFinishedCallback({ data: organization });
                            return;
                        }
                    }
                });
            }.bind(this);

            if (organizationFacilityIds.length == 0) {
                organization.facilities = facilities;
                onFinishedCallback({ data: organization });
                return;
            }

            for (var i = 0; i < organizationFacilityIds.length; i++) {
                getFacility(organizationFacilityIds[i]);
            }
        }
    }.bind(this));
}

OrganizationDatabaseModule.prototype.findOrganization = function (organizationId, onFinishedCallback) {
    this._db.collection('Organizations').findOne({ _id: objectIdFromString(organizationId) }, function (err, organization) {
        if (organization === null) {
            onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Could not find organization', { organizationId: organizationId }) });
            return;
        } else {
            onFinishedCallback({ data: organization });
            return;
        }
    }.bind(this));
}

OrganizationDatabaseModule.prototype.updateOrganization = function (organizationId, update, onFinishedCallback) {
    var query = {
        _id: objectIdFromString(organizationId)
    };

    this._db.collection('Organizations').updateOne(query, { $set: update }, { w: 1 }, function (err, result) {
        if (result.result.n !== 0) {
            onFinishedCallback({ data: true });
            return;
        } else {
            onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to update organization', { organizationId: organizationId }) });
            return;
        }
    });
}

OrganizationDatabaseModule.prototype.deleteOrganization = function (userId, organizationId, onFinishedCallback) {
    this._db.collection('Organizations').deleteOne({ _id: objectIdFromString(organizationId) }, { w: 1 }, function (err, result) {
        if (result.deletedCount !== 0) {
            this.databaseLayer.sources.getSources({ organizationId: objectIdFromString(organizationId) }, function (getSourcesResult) {
                if (getSourcesResult.error) {
                    onFinishedCallback(getSourcesResult);
                    return;
                }
                var sources = getSourcesResult.data;
                var loopCounter = 0;

                var deleteSource = function (sourceId) {
                    this.databaseLayer.sources.deleteSource(sourceId, function () {
                        if (++loopCounter == sources.length) {
                            onFinishedCallback({ data: {} });
                            return;
                        }
                    }.bind(this));
                }.bind(this);

                if (sources.length == 0) {
                    onFinishedCallback({ data: {} });
                    return;
                }

                for (var i = 0; i < sources.length; i++) {
                    deleteSource(sources[i]._id);
                }
            }.bind(this));
        } else {
            onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to delete Organization.', { userId: userId }) });
            return;
        }
    }.bind(this));
}

module.exports = OrganizationDatabaseModule;