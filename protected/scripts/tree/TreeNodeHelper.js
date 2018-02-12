class TreeNodeHelper { 
	constructor(){}

	createOrganizationNode(organization) {
		return {
			id: organization._id,
			text: organization.name,
			type: 'organization',
			children: true,
			state: {
				opened: true,
				checkbox_disabled: true
			},
			li_attr: {
				class: 'treeTextColor'
			}
		};
	}

	createFacilityNode(facility) {
		return {
			id: facility._id,
			text: facility.name,
			type: 'facility',
			children: true,
			state: {
				opened: true,
				checkbox_disabled: true
			},
			li_attr: {
				class: 'treeTextColor'
			},
			data: {
				organizationId: facility.organizationId
			}
		};
	}

	createSourceNode(source) {
		return {
			id: source._id,
			text: source.name,
			type: 'source',
			icon: "jstree-file",
			children: [],
			state: {
				opened: false,
				checkbox_disabled: true
			},
			li_attr: {
				class: 'treeTextColor'
			},
			data: {
				organizationId: source.organizationId,
				facilityId: source.facilityId
			}
		};
	}
	
	createUserNode(user) {
		return {
			id: user._id,
			text: user.username,
			type: 'user',
			icon: "glyphicon glyphicon-user",
			children: [],
			state: {
				opened: false,
				checkbox_disabled: true
			},
			data: {
				isMaster: user.isMaster,
				isAdmin: user.isAdmin
			}
		};
	}
}