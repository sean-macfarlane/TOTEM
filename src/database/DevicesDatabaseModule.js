const mongo = require('mongodb');
const objectIdFromString = requireFromRoot('src/database/ObjectIdFromString.js');

function DevicesDatabaseModule(databaseLayer, db) {
    this.databaseLayer = databaseLayer;
    this._db = db;
}

//Sorts devices in ascending order based on IP addresses. Usage: sortIpAddresses(array, 'ipv4Address') 
DevicesDatabaseModule.prototype._sortDevices = function (devices, field) {
    function getIpNumber (ip) {
        var splitted = ip.split(".");
        return splitted[0]*0x1000000 + splitted[1]*0x10000 + splitted[2]*0x100 + splitted[3]*1;
    }
    return devices.sort(function(a, b) { return getIpNumber(a[field]) - getIpNumber(b[field]); });
}

DevicesDatabaseModule.prototype.saveDevices = function (sourceId, devices, onFinishedCallback) {
	var dataCollection = this._db.collection('Devices');

    if (devices === null || devices.length == 0) {
        onFinishedCallback({ data: {} });
        return;
    }

    for (var i = 0; i < devices.length; i++) {
    	devices[i].sourceId = objectIdFromString(sourceId);
    }

    dataCollection.insertMany(devices, { w: 1 }, function (err, result) {
        if (!err) {
            onFinishedCallback({ data: {} });
            return;
        } else {
            onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Devices could not be saved', {sourceId: sourceId}) });
            return;
        }
    }.bind(this));
}

DevicesDatabaseModule.prototype.getDevices = function (sourceId, onFinishedCallback) {
	var dataCollection = this._db.collection('Devices');

	dataCollection.find({sourceId: objectIdFromString(sourceId)}).toArray(function (err, devices) {
		if (!err) {
			devices = this._sortDevices(devices, 'ipv4Address');
            onFinishedCallback({ data: devices });
            return;
        } else {
            onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Devices could not be retrieved', {sourceId: sourceId}) });
            return;
        }
	}.bind(this));
}

DevicesDatabaseModule.prototype.deleteDevices = function (sourceId, onFinishedCallback) {
	var dataCollection = this._db.collection('Devices');

	dataCollection.deleteMany({ sourceId: objectIdFromString(sourceId) }, function (err, result) {
	    if (!err) {
            onFinishedCallback({ data: {} });
            return;
        } else {
            onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Devices could not be deleted', {sourceId: sourceId}) });
            return;
        }
	});
}

module.exports = DevicesDatabaseModule;