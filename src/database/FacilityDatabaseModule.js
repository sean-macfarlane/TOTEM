const mongo = require('mongodb');
const objectIdFromString = requireFromRoot('src/database/ObjectIdFromString.js');

function FacilityDatabaseModule(databaseLayer, db) {
    this.databaseLayer = databaseLayer;
    this._db = db;
}

FacilityDatabaseModule.prototype.findFacility = function (organizationId, facilityId, onFinishedCallback) {
    this.databaseLayer.organization.findOrganization(organizationId, function (findOrganizationResult) {
        if (findOrganizationResult.error) {
            onFinishedCallback({ error: findOrganizationResult.error });
            return;
        } else {
            var organization = findOrganizationResult.data;

            if (facilityId in organization.facilities === true) {
                onFinishedCallback({ data: organization.facilities[facilityId] });
                return;
            } else {
                onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Facility not found', { organizationId: organizationId, facilityId: facilityId }) });
                return;
            }
        }
    }.bind(this));
}

FacilityDatabaseModule.prototype.getFacility = function (organizationId, facilityId, onFinishedCallback) {
    this.databaseLayer.organization.findOrganization(organizationId, function (findOrganizationResult) {
        if (findOrganizationResult.error) {
            onFinishedCallback({ error: findOrganizationResult.error });
            return;
        } else {
            var organization = findOrganizationResult.data;

            var facility = null;

            if (facilityId in organization.facilities === true) {
                facility = organization.facilities[facilityId];
            } else {
                onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Facility not found', { organizationId: organizationId, facilityId: facilityId }) });
                return;
            }

            var facilitySources = [];

            this.databaseLayer.sources.getSources({ facilityId: objectIdFromString(facilityId) }, function(getSourcesResult) {
                if (getSourcesResult.error) {
                    onFinishedCallback({ error: getSourcesResult.error });
                    return;
                } else {
                    var sources = getSourcesResult.data;
                
                    for (var i = 0; i < sources.length; i++) {
                        var source = sources[i];

                        if (source._id in facility.sources == true) {
                            facilitySources.push(source);
                        }
                    }
                    facility.sources = facilitySources;

                    onFinishedCallback({ data: facility });
                    return;
                }
            });
        }
    }.bind(this));
}

FacilityDatabaseModule.prototype.createFacility = function (organizationId, name, onFinishedCallback) {
    var facility = {
        _id: new mongo.ObjectID(),
        name: name,
        timestamp: Date.now(),
        organizationId: objectIdFromString(organizationId),
        sources: {}
    };

    var setOperation = {};
    setOperation['facilities.' + facility._id] = facility;

    this._db.collection('Organizations').updateOne({ _id: objectIdFromString(organizationId) }, { $set: setOperation }, { w: 1 }, function (error, result) {
        if (result.result.n !== 0) {
            onFinishedCallback({ data: facility });
            return;
        } else {
            onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to create facility', { organizationId: organizationId }) });
            return;
        }
    });
}

FacilityDatabaseModule.prototype.updateFacility = function (organizationId, facilityId, update, onFinishedCallback) {
    var setOperation = {};

    for (var key in update) {
        setOperation['facilities.' + facilityId + '.' + key] = update[key];
    }

    var query = {
        _id: objectIdFromString(organizationId)
    };
    query['facilities.' + facilityId] = { $exists: true, $ne: null };

    this._db.collection('Organizations').updateOne(query, { $set: setOperation }, { w: 1 }, function (err, result) {
        if (result.result.n !== 0) {
            onFinishedCallback({ data: true });
            return;
        } else {
            onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to update facility', { organizationId: organizationId, facilityId: facilityId }) });
            return;
        }
    });
}

FacilityDatabaseModule.prototype.deleteFacility = function (organizationId, facilityId, onFinishedCallback) {
    organizationId = objectIdFromString(organizationId);

    this._db.collection('Organizations').findOne({ _id: organizationId }, function (err, organization) {
        if (organization === null) {
            onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to delete facility, organization not found', { organizationId: organizationId, facilityId: facilityId }) });
            return;
        }

        if (facilityId in organization.facilities === false) {
            onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to delete facility, facility not found', { organizationId: organizationId, facilityId: facilityId }) });
            return;
        }

        var sourcesToDelete = [];

        for (var sourceId in organization.facilities[facilityId].sources) {
            sourcesToDelete.push(objectIdFromString(sourceId));
        }

        var unsetOperation = {};
        unsetOperation['facilities.' + facilityId] = '';

        var query = {
            _id: organizationId
        };
        this._db.collection('Organizations').updateOne(query, { $unset: unsetOperation }, { w: 1 }, function (err, result) {
            var loopCounter = 0;

            var deleteSource = function (sourceId) {
                this.databaseLayer.sources.deleteSource(sourceId, function () {
                    if (++loopCounter == sourcesToDelete.length) {
                        onFinishedCallback({ data: {} });
                        return;
                    }
                }.bind(this));
            }.bind(this);

            if (sourcesToDelete.length == 0) {
                onFinishedCallback({ data: {} });
                return;
            }

            for (var i = 0; i < sourcesToDelete.length; i++) {
                deleteSource(sourcesToDelete[i]);
            }
        }.bind(this));
    }.bind(this));
}

module.exports = FacilityDatabaseModule;