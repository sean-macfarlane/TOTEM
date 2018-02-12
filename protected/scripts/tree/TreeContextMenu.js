class TreeContextMenu {
	constructor(){}

	_organizationContextMenu(node) {
		var isDisabled = true;
		if (TOTEM.model.userPermissions.admin || (TOTEM.model.userPermissions.organizations[node.id] && TOTEM.model.userPermissions.organizations[node.id].edit)) {
		    isDisabled = false;
		}
		var defaultItems = $.jstree.defaults.contextmenu.items();

		var items = {};

		items.newFacility = {
		    label: 'New Facility',
		    icon: 'glyphicon glyphicon-plus',
		    action: function () {
		        TOTEM.reports.createFacility(node.id);
		    },
		    _disabled: isDisabled
		};

		items.rename = {
		    label: 'Rename Organization',
		    icon: 'glyphicon glyphicon-pencil',
		    action: defaultItems.rename.action,
		    _disabled: isDisabled
		};

		items.delete = {
		    label: 'Delete Organization',
		    icon: 'glyphicon glyphicon-trash',
		    action: function () {
		        TOTEM.reports.deleteOrganization(node.id);
		    },
		    _disabled: isDisabled
		};

		return items;
	}

	_facilityContextMenu(node) {
		var isDisabled = true;
		var uploadDisabled = true;
		if (TOTEM.model.userPermissions.admin || (TOTEM.model.userPermissions.organizations[node.data.organizationId] && TOTEM.model.userPermissions.organizations[node.data.organizationId].edit)) {
		    isDisabled = false;
		}
		if (TOTEM.model.userPermissions.admin || (TOTEM.model.userPermissions.organizations[node.data.organizationId] && TOTEM.model.userPermissions.organizations[node.data.organizationId].upload)) {
		    uploadDisabled = false;
		}
		var defaultItems = $.jstree.defaults.contextmenu.items();

		var items = {};

		items.import = {
		    label: 'Import Files',
		    icon: 'glyphicon glyphicon-folder-open',
		    action: function () {
		        TOTEM.reports.importSources(node.data.organizationId, node.id);
		    },
		    _disabled: uploadDisabled
		};

		items.rename = {
		    label: 'Rename Facility',
		    icon: 'glyphicon glyphicon-pencil',
		    action: defaultItems.rename.action,
		    _disabled: isDisabled
		};

		items.delete = {
		    label: 'Delete Facility',
		    icon: 'glyphicon glyphicon-trash',
		    action: function () {
		        TOTEM.reports.deleteFacility(node.data.organizationId, node.id);
		    },
		    _disabled: isDisabled
		};

		return items;
	}

	_sourceContextMenu(node) {
		var isDisabled = true;
		if (TOTEM.model.userPermissions.admin || (TOTEM.model.userPermissions.organizations[node.data.organizationId] && TOTEM.model.userPermissions.organizations[node.data.organizationId].edit)) {
		    isDisabled = false;
		}

		var defaultItems = $.jstree.defaults.contextmenu.items();
		var items = {};

		items.rename = {
		    label: 'Rename Node',
		    icon: 'glyphicon glyphicon-pencil',
		    action: defaultItems.rename.action,
		    _disabled: isDisabled
		};

		items.delete = {
		    label: 'Delete Node',
		    icon: 'glyphicon glyphicon-trash',
		    action: function () {
		        TOTEM.reports.deleteSource(node.data.organizationId, node.data.facilityId, node.id);
		    },
		    _disabled: isDisabled
		};

		return items;
	}

	contextMenu(node) {
		switch (node.type) {
		    case 'organization':
		        return this._organizationContextMenu(node);
		    case 'facility':
		        return this._facilityContextMenu(node);
		    case 'source':
		        return this._sourceContextMenu(node);
		    default:
		        break;
		}
	}

	_roleContextMenu(node) {
		var items = {};

		items.create = {
		    label: 'Create User',
		    icon: 'glyphicon glyphicon-plus',
		    action: function () {
		        TOTEM.admin.showCreateUser(node.id);
		    }
		}

		return items;
	}

	_userContextMenu(node) {
		var isDisabled = true;

		if (!node.data.isMaster && TOTEM.model.userPermissions.master == true) {
		    isDisabled = false;
		} else if (!node.data.isAdmin) {
		    isDisabled = false;
		}
		var items = {};

		items.delete = {
		    label: 'Delete User',
		    icon: 'glyphicon glyphicon-trash',
		    action: function () {
		        TOTEM.admin.deleteUser(node.id);
		    },
		    _disabled: isDisabled
		};

		return items;
	}

	adminContextMenu(node) {
		switch (node.type) {
		    case 'role':
		        return this._roleContextMenu(node);
		    case 'user':
		        return this._userContextMenu(node);
		    default:
		        break;
		}
	}
}