class PageSwitcher {
	constructor() {
		this._initialize();

		this._activePageName = 'dashboard';
	}

	_initialize() {
		this._bindClickListeners();
	}

	_bindClickListeners() {
		$('#dashboardPageButton').on('click', function () {
			this.switchPage('dashboard');
		}.bind(this));

		$('#reportsPageButton').on('click', function () {
			this.switchPage('reports');
		}.bind(this));

		$('#adminPageButton').on('click', function () {
			this.switchPage('admin');
		}.bind(this));

		$('#settingsPageButton').on('click', function () {
			this.switchPage('settings');
		}.bind(this));
	}

	getActivePageName() {
		return this._activePageName;
	}

	switchPage(pageName) {
		this._activePageName = pageName;

		if (pageName == 'dashboard') {
			if ($('#dashboardPage').css('display') == 'block') {
				return;
			}

			$('#reportsPageButton').removeClass('activeButton');
			$('#dashboardPageButton').addClass('activeButton');
			$('#adminPageButton').removeClass('activeButton');
			$('#settingsPageButton').removeClass('activeButton');

			$('#dashboardPage').show();
			$('#reportsPage').hide();
			$('#settingsPage').hide();
			$('#adminPage').hide();

			TOTEM.dashboard.update();

		} else if (pageName == 'reports') {
			if ($('#reportsPage').css('display') == 'block') {
				return;
			}

			$('#reportsPageButton').addClass('activeButton');
			$('#dashboardPageButton').removeClass('activeButton');
			$('#adminPageButton').removeClass('activeButton');
			$('#settingsPageButton').removeClass('activeButton');

			$('#reportsPage').show();
			$('#dashboardPage').hide();
			$('#settingsPage').hide();
			$('#adminPage').hide();

			TOTEM.reports.update();
		} else if (pageName == 'settings') {
			if ($('#settingsPage').css('display') == 'block') {
				return;
			}

			$('#reportsPageButton').removeClass('activeButton');
			$('#dashboardPageButton').removeClass('activeButton');
			$('#adminPageButton').removeClass('activeButton');
			$('#settingsPageButton').addClass('activeButton');

			$('#settingsPage').show();
			$('#dashboardPage').hide();
			$('#reportsPage').hide();
			$('#adminPage').hide();

		} else if (pageName == 'admin') {
			if ($('#adminPage').css('display') == 'block') {
				return;
			}

			$('#reportsPageButton').removeClass('activeButton');
			$('#dashboardPageButton').removeClass('activeButton');
			$('#settingsPageButton').removeClass('activeButton');
			$('#adminPageButton').addClass('activeButton');

			$('#adminPage').show();
			$('#settingsPage').hide();
			$('#dashboardPage').hide();
			$('#reportsPage').hide();

			TOTEM.admin.update();
		}
	}
}