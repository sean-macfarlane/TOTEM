const mongo = require('mongodb');
const objectIdFromString = requireFromRoot('src/database/ObjectIdFromString.js');

function SourcesDatabaseModule(databaseLayer, db) {
    this.databaseLayer = databaseLayer;
    this._db = db;
}

SourcesDatabaseModule.prototype.saveSource = function (userId, organizationId, facilityId, sourceName, sourceType, timestamp, onFinishedCallback) {
    
    var source = {
        _id: new mongo.ObjectID(),
        name: sourceName,
        type: sourceType,
        timestamp: parseFloat(timestamp),
        userId: objectIdFromString(userId),
        organizationId: objectIdFromString(organizationId),
        facilityId: objectIdFromString(facilityId),
        certificationStatus: null,
        version: null
    };

    this._db.collection('Sources').insert(source, { w: 1 }, function (err, result) {
        if (!err) {
            var setOperation = {};
            setOperation['facilities.' + facilityId + '.sources.' + source._id] = source._id;

            this._db.collection('Organizations').update({ _id: objectIdFromString(organizationId) }, { $set: setOperation }, { w: 1 }, function (err, result) {
                if (!err) {
                    return onFinishedCallback({ data: source });
                } else {
                    onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Source could not be created', { sourceName: sourceName, sourceType: sourceType, userId: userId }) });
                    return;
                }
            }.bind(this));
        } else {
            onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Source could not be created', { sourceName: sourceName, sourceType: sourceType, userId: userId }) });
            return;
        }
    }.bind(this));
}

SourcesDatabaseModule.prototype.updateConfigSourceCertificationStatus = function (sourceId, info, onFinishedCallback) {
    var dataCollection = this._db.collection('Sources');

    sourceId = objectIdFromString(sourceId);

    var setOperation = {
        certificationStatus: info.status
    }

    if (info.version) {
    	setOperation.version = info.version;
    }

    dataCollection.update({ _id: sourceId }, { $set: setOperation }, { w: 1 }, function (err, result) {
        if (!err) {
            dataCollection.findOne({ _id: sourceId }, function (err, source) {
                onFinishedCallback({ data: source });
                return;
            });
        } else {
            onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Source could not be updated', { sourceId: sourceId }) });
            return;
        }

    });
}

SourcesDatabaseModule.prototype.saveConfigFindings = function (findings, onFinishedCallback) {
    var dataCollection = this._db.collection('Findings');

    if (findings === null || findings.length == 0) {
        onFinishedCallback({ data: {} });
        return;
    }

    dataCollection.insertMany(findings, { w: 1 }, function (err, result) {
        if (!err) {
            onFinishedCallback({ data: {} });
            return;
        } else {
            onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Findings could not be saved', {}) });
            return;
        }
    }.bind(this));
}

SourcesDatabaseModule.prototype.findSource = function (sourceId, onFinishedCallback) {
    this.getSources({_id: objectIdFromString(sourceId)}, function (getSourcesResult) {
    	if (getSourcesResult.error) {
    		onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Failed to find source', { sourceId: sourceId }) });
            return;
        } else {
            var sourceArray = getSourcesResult.data;
            if (sourceArray && sourceArray.length > 0) {
            	onFinishedCallback({ data: sourceArray[0] });
            } else {
            	onFinishedCallback({ data: {} });
            }
        }
    });
}

SourcesDatabaseModule.prototype.getSources = function (filter, onFinishedCallback) {
    var dataCollection = this._db.collection('Findings');
    var sourceCollection = this._db.collection('Sources');
    var allSources = [];
    var loopCounter = 0;

    sourceCollection.find(filter).toArray(function (err, sources) {
        if (err) {
            onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Error occured while getting sources', {}) });
            return;
        }

        var getSourceData = function (source) {
            dataCollection.find({ sourceId: objectIdFromString(source._id) }).toArray(function (err, findings) {
               	this.databaseLayer.devices.getDevices(source._id, function (getDevicesResult) {
                	if (!err && getDevicesResult.data) {
                		var devices = getDevicesResult.data;

	                    source.findings = findings;
	                    source.devices = devices;
	                    allSources.push(source);
	                }

	                if (++loopCounter == sources.length) {
	                    onFinishedCallback({ data: allSources });
	                    return;
	                }
                });
            }.bind(this));
        }.bind(this);

        if (sources.length == 0) {
            onFinishedCallback({ data: allSources });
            return;
        }

        for (var i = 0; i < sources.length; i++) {
            getSourceData(sources[i]);
        }
    }.bind(this));
}

SourcesDatabaseModule.prototype.updateSource = function (sourceId, updates, onFinishedCallback) {
    var dataCollection = this._db.collection('Sources');

    sourceId = objectIdFromString(sourceId);

    dataCollection.update({ _id: sourceId }, { $set: updates }, { w: 1 }, function (err, result) {
        if (!err) {
            onFinishedCallback({ data: result });
            return;
        } else {
            onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Source could not be updated', { sourceId: sourceId }) });
            return;
        }
    });
}

SourcesDatabaseModule.prototype.deleteSource = function (sourceId, onFinishedCallback) {
    var dataCollection = this._db.collection('Findings');
    var sourceCollection = this._db.collection('Sources');

    sourceCollection.findOne({ _id: objectIdFromString(sourceId) }, function (err, source) {
        if (source === null) {
            onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to delete source', { sourceId: sourceId }) });
            return;
        }

        var organizationId = objectIdFromString(source.organizationId);
        var facilityId = source.facilityId;

        sourceCollection.deleteOne({ _id: objectIdFromString(sourceId) }, function (err, result) {
            if (result.deletedCount !== 0) {
                dataCollection.deleteMany({ sourceId: objectIdFromString(sourceId) }, function (err, result) {
                    if (err == null || result.deletedCount !== 0) {
                    	this.databaseLayer.devices.deleteDevices(sourceId, function (deleteDevicesResult) {
                    		if (deleteDevicesResult.error) {
		                        onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to delete source devices', { sourceId: sourceId }) });
		                        return;
		                    }
	                        var unsetOperation = {};
	                        unsetOperation['facilities.' + facilityId + '.sources.' + sourceId] = '';

	                        var query = { _id: organizationId };
	                        query['facilities.' + facilityId] = { $exists: true, $ne: null };

	                        this._db.collection('Organizations').updateOne(query, { $unset: unsetOperation }, { w: 1 }, function (err, result) {
	                            if (err) {
	                                onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to delete source', { sourceId: sourceId }) });
	                                return;
	                            } else {
	                                return onFinishedCallback({ data: {} });
	                            }
	                        });
	                        return;
	                    }.bind(this));
                    } else {
                        onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to delete source findings', { sourceId: sourceId }) });
                        return;
                    }
                }.bind(this));
            } else {
                onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to delete source', { sourceId: sourceId }) });
                return;
            }
        }.bind(this));
    }.bind(this));
}

module.exports = SourcesDatabaseModule;