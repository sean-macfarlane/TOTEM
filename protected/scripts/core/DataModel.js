function DataModel(userToken, userId) {
    this._userToken = userToken;
    this._userId = userId;
    this._getVersionInformation();
}

DataModel.prototype.getUserInfo = function (onFinishedCallback) {
    $.ajax({
        url: '/api/v1/users/' + this._userId,
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (user) {
            $('#username').html('<span class="glyphicon glyphicon-user" title="Username"></span> ' + user.username);
            this.userPermissions = {
                admin: user.isAdmin,
                master: user.isMaster,
                organizations: user.organizations
            };
            if (onFinishedCallback) {
                onFinishedCallback(user);
            }
        }.bind(this),
        error: function () {
            onFinishedCallback(null);
        }
    });
}

DataModel.prototype._getVersionInformation = function () {
    $.ajax({
        url: '/version',
        type: 'GET',
        dataType: "json",
        contentType: 'application/json; charset=utf-8',
        async: true,
        success: function (data) {
            $('#copyright').html(
                data.name + ' v' + data.version +
                ' - &copy; ' + data.year + ' ' +
                data.company + ' - All Rights Reserved');
        }
    });
}

DataModel.prototype.getSourceType = function (type) {
	if (type == 'tridium') {
		return 'Niagara Tridium Config Bog File';
	} else if (type == 'metasys') {
		return 'Johnson Controls Metasys';
	} else if (type == 'pcap') {
		return 'Packet Capture';
	} else {
		return 'Unknown';
	}
}

DataModel.prototype.isConfigSource = function (source) {
	if (!source.type) {
		return false;
	} else {
		if (source.type == 'tridium' || source.type == "metasys") {
			return true;
		} else {
			return false;
		}
	}
}

DataModel.prototype.getSources = function (onFinishedCallback) {
    $.ajax({
        url: '/api/v1/users/' + this._userId + '/sources',
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (sources) {
            onFinishedCallback(sources);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.getDashboardStatistics = function (onFinishedCallback) {
    $.ajax({
        url: '/api/v1/dashboard/statistics',
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (sources) {
            onFinishedCallback(sources);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.getOrganizations = function (onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs',
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (orgs) {
            onFinishedCallback(orgs);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.createOrganization = function (organizationName, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs',
        data: JSON.stringify({ name: organizationName }),
        type: 'POST',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback(data);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

/*Gets all organization data including facilities, sources and findings*/
DataModel.prototype.getOrganization = function (orgId, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId,
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback(data);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

/*Retrieves general organization information*/
DataModel.prototype.getOrganizationInfo = function (orgId, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId +'/info',
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback(data);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.updateOrganization = function (orgId, updates, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId,
        data: JSON.stringify(updates),
        type: 'POST',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback(data);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.deleteOrganization = function (orgId, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId,
        type: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback(data);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.getOrganizationStatistics = function (orgId, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId + '/statistics',
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (sources) {
            onFinishedCallback(sources);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.createFacility = function (orgId, facilityName, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId + '/facilities',
        data: JSON.stringify({ name: facilityName }),
        type: 'POST',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback(data);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.getFacility = function (orgId, facilityId, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId + '/facilities/' + facilityId,
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback(data);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.updateFacility = function (orgId, facilityId, updates, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId + '/facilities/' + facilityId,
        data: JSON.stringify(updates),
        type: 'POST',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback(data);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.deleteFacility = function (orgId, facilityId, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId + '/facilities/' + facilityId,
        type: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback(data);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.getFacilityStatistics = function (orgId, facilityId, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId + '/facilities/' + facilityId + '/statistics',
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (sources) {
            onFinishedCallback(sources);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.getSource = function (orgId, facilityId, sourceId, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId + '/facilities/' + facilityId + '/sources/' + sourceId,
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (source) {
            onFinishedCallback(source);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.updateSource = function (orgId, facilityId, sourceId, updates, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId + '/facilities/' + facilityId + '/sources/' + sourceId,
        data: JSON.stringify(updates),
        type: 'POST',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback(data);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.deleteSource = function (orgId, facilityId, sourceId, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/orgs/' + orgId + '/facilities/' + facilityId + '/sources/' + sourceId,
        type: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback(data);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.getUsers = function (onFinishedCallback) {
    $.ajax({
        url: '/api/v1/users',
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (users) {
            onFinishedCallback(users);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
            onFinishedCallback(null);
        }.bind(this)
    });
}

DataModel.prototype.getUser = function (id, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/users/' + id,
        type: 'GET',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (user) {
            onFinishedCallback(user);
        }.bind(this)
    });
}

DataModel.prototype.createUser = function (data, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/users',
        type: 'POST',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        data: JSON.stringify(data),
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (user) {
            onFinishedCallback(user);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
        }.bind(this)
    });
}

DataModel.prototype.updateUser = function (id, data, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/users/' + id,
        type: 'POST',
        headers: { 'Authorization': 'Bearer ' + this._userToken },
        data: JSON.stringify(data),
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback(data);
        }.bind(this),
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
        }.bind(this)
    });
}

DataModel.prototype.deleteUser = function (userId, onFinishedCallback) {
    $.ajax({
        url: '/api/v1/users/' + userId,
        type: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + TOTEM.userToken() },
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            onFinishedCallback();
        },
        error: function (data) {
            alert("Error: " + data.responseJSON.error);
        }
    });
}