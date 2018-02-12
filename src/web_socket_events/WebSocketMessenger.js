const socketIo = require('socket.io');
const mongo = require('mongodb');

class WebSocketMessenger {
    constructor(httpServer) {
        this._io = socketIo(httpServer, { pingInterval: (30 * 1000), pingTimeout: (60 * 1000 * 30)});

        this._clientConnections = {};

        this._io.on('connection', function (socket) {
            socket.on('register', function (data) {
                var split = data.userToken.split('|');
    
                if (split.length !== 3) {
                    return;
                }

                var userId = split[0];
                var sessionId = new mongo.ObjectID().toString();

                // Single user can login multiple times at the same time
                if (userId in this._clientConnections === false) {
                    this._clientConnections[userId] = {
                        sessions: {}
                    };
                }
                
                this._clientConnections[userId].sessions[sessionId] = socket;
                
                socket.on('disconnect', function () {
                    if (sessionId in this._clientConnections[userId].sessions === true) {
                        delete this._clientConnections[userId].sessions[sessionId];
                    }
                }.bind(this));
            }.bind(this));
        }.bind(this));
    }

    //Sends a message to all users or a specific user if the optional userId is provided
    sendMessage(messageType, messageBody, optionalUserId) {
        if (typeof optionalUserId !== 'undefined') {
            if (optionalUserId in this._clientConnections === true) {
                for (var sessionId in this._clientConnections[optionalUserId].sessions) {
                    var socket = this._clientConnections[optionalUserId].sessions[sessionId];
                    socket.emit(messageType, messageBody);
                }
            }
        } else {
            for (var userId in this._clientConnections) {
                for (var sessionId in this._clientConnections[userId].sessions) {
                    var socket = this._clientConnections[userId].sessions[sessionId];
                    socket.emit(messageType, messageBody);
                }
            }
        }
    }
}

module.exports = WebSocketMessenger;