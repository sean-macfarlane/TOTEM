class ConnectionsHelper {
	constructor() {
    	this._connections = {};
	}

	createConnection(connection) {
	    if (!connection.source || !connection.destination) {
	    	return;
	    }

	   	var timestamp = connection.timestamp.toString();

	    var key = connection.source + ':' + connection.destination;

	    if (key in this._connections === false) {
	        this._connections[key] = {
	            source: connection.source,
	            destination: connection.destination,
            	sourcePorts: {},
            	destinationPorts: {},
            	packetsByProtocol: {},
            	created: timestamp
	        };
	    }

	    var newConnection = this._connections[key];

	    if (connection.sourcePort !== null) {
	        if (connection.sourcePort in newConnection.sourcePorts === false) {
	            newConnection.sourcePorts[connection.sourcePort] = {
	                protocol: connection.protocol || 'Unknown',
	                service: connection.service || 'Unknown',
	                packets: 0
	            };
	        }
	        if (connection.numberOfPackets) {
	            newConnection.sourcePorts[connection.sourcePort].packets += parseFloat(connection.numberOfPackets);
	        } else {
	           ++newConnection.sourcePorts[connection.sourcePort].packets;
	        }
	    }

	    if (connection.destinationPort !== null) {
	        if (connection.destinationPort in newConnection.destinationPorts === false) {
	            newConnection.destinationPorts[connection.destinationPort] = {
	                protocol: connection.protocol,
	                service: connection.service || 'Unknown',
	                packets: 0
	            };
	        }
	        if (connection.numberOfPackets) {
	            newConnection.destinationPorts[connection.destinationPort].packets += parseFloat(connection.numberOfPackets);
	        } else {
	           ++newConnection.destinationPorts[connection.destinationPort].packets;
	        }
	    }

	    if (connection.protocol in newConnection.packetsByProtocol === false) {
	        newConnection.packetsByProtocol[connection.protocol] = {};
	    }

	    var packetsByProtocol = newConnection.packetsByProtocol[connection.protocol];

	    if (timestamp in packetsByProtocol === false) {
	        packetsByProtocol[timestamp] = 0;
	    } 
	    if (connection.numberOfPackets) {
	        packetsByProtocol[timestamp] += parseFloat(connection.numberOfPackets);
	    } else {
	        ++packetsByProtocol[timestamp];
	    }
	}

	connections() {
    	return this._connections;
	}
}

module.exports = ConnectionsHelper;