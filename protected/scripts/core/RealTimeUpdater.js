class RealTimeUpdater {
	constructor() {}

	onOrganizationUpdated(organizationId) {
		TOTEM.model.getUserInfo(function (user) {
            if (!user.isAdmin && (organizationId in user.organizations === false)) {
            	return;
            }
            var currentPageName = TOTEM.pageSwitcher.getActivePageName();

            if (currentPageName == 'dashboard') {
				TOTEM.dashboard.update();
			} else if (currentPageName == 'reports') {
				TOTEM.reports.update();
			}
        });
	}

	onUserUpdated(userId) {
       	var currentPageName = TOTEM.pageSwitcher.getActivePageName();

   		TOTEM.model.getUserInfo(function (user) {
   			//user is deleted
   			if (user == null) {
   				TOTEM.logout();
   				return;
   			}
            if (user.isAdmin) {
                $('#createOrgButton').show();
                $('#adminPageButton').show();
                TOTEM.admin = new AdminPage();
            } else {
                $('#createOrgButton').hide();
                $('#adminPageButton').hide();
            }

            if (currentPageName == 'dashboard') {
				TOTEM.dashboard.update();
			}
        });
	}
}