const mongo = require('mongodb');

var checkFor24CharHexStringRegex = new RegExp("^[0-9a-fA-F]{24}$");

//Converts a string to a Mongo ObjectId only if it's format is valid
//Returns a mongo.ObjectID object for valid string representations
//Returns null otherwise
module.exports = function (objectIdString) {
    return (checkFor24CharHexStringRegex.test(objectIdString) === true) ? new mongo.ObjectID(objectIdString) : null;
}