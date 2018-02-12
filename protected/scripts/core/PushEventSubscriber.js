//Handles subscribing to events sent from server->client over a web socket
class PushEventSubscriber {
	constructor(userToken) {
	    this._socket = io();

	    this._socket.emit('register', {userToken: userToken});

	    this._socket.on('organizationChanged', function (data) {
	    	TOTEM.realTimeUpdater.onOrganizationUpdated(data.organizationId);
	    }.bind(this));

	    this._socket.on('userUpdated', function (data) {
	    	TOTEM.realTimeUpdater.onUserUpdated(data.userId);
	    }.bind(this));
	}
}

