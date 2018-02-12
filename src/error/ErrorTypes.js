function TotemError(message, data, type, httpCode, logErrorFunction) {
    this._message = message;
    this._data = data;
    this._type = type;
    this._httpCode = httpCode;
    this._timestamp = Date.now();

    logErrorFunction(this);
}

TotemError.prototype.type = function () {
    return this._type;
}

TotemError.prototype.message = function () {
    return this._message;
}

TotemError.prototype.httpCode = function () {
    return this._httpCode;
}

TotemError.prototype.toString = function () {
    return this._type + ' | ' 
        + this._timestamp + ' | ' 
        + new Date(this._timestamp).toUTCString() + ' | ' 
        + this._message + ' | ' 
        + JSON.stringify(this._data);
}

TotemError.prototype.toLogObject = function () {
    return { 
        type: this._type,
        timestamp: this._timestamp,
        date: new Date(this._timestamp).toUTCString(),
        data: this._data
    }
}

module.exports = function (logErrorFunction) {
    return {
        ErrorResourceNotFound: function (message, data) {
            return new TotemError(message, data, 'RESOURCE_NOT_FOUND', 404, logErrorFunction);
        },
        ErrorInvalidPermissions: function (message, data) {
            return new TotemError(message, data, 'INVALID_PERMISSIONS', 403, logErrorFunction);
        },
        ErrorInvalidRequest: function (message, data) {
            return new TotemError(message, data, 'INVALID_REQUEST', 400, logErrorFunction);
        },
        ErrorNotAuthenticated: function (message, data) {
            return new TotemError(message, data, 'NOT_AUTHENTICATED', 401, logErrorFunction);
        },
        ErrorGeneric: function (message, data) {
            return new TotemError(message, data, 'GENERIC_ERROR', 500, logErrorFunction);
        }
    }
};