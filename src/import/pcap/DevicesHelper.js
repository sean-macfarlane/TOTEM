const mongo = require('mongodb');

class DevicesHelper {
	constructor() {
		this._uniqueDevices = {};
	}

	createDevice(device) {
		if (!device.ipv4Address) {
			return null;
		}
		var ipv4Split = device.ipv4Address.split('.');

		if (ipv4Split.length !== 4) {
		    return null;
		}

		this._uniqueDevices[device.ipv4Address] = {
			_id: new mongo.ObjectID().toString(),
			ipv4Address: device.ipv4Address,
			macAddress: device.macAddress
		};
	}

	finalize() {
		var devices = [];

		for (var ipv4Address in this._uniqueDevices) {
			devices.push(this._uniqueDevices[ipv4Address]);
		}

		return {
			devices: devices
		};
	}
}

module.exports = DevicesHelper;