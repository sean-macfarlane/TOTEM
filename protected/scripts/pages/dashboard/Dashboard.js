class Dashboard {
	constructor() {
		this._container = $('#dashboardContainer');

		this.update();
	}

	update() {
	    this._container.empty();

		TOTEM.model.getDashboardStatistics(function (data) {
			for (var i = 0; i < data.organizations.length; i++) {
				this._createOrganization(data.organizations[i]);
			}
			if (data.organizations.length == 0) {
				var noFindings = $('<p class="noFindings">No organizations found to display. </p>').appendTo(this._container);
				var addSources = $('<span class="addSources">Add an organization</span>').appendTo(noFindings);
				addSources.on('click', function () {
					TOTEM.pageSwitcher.switchPage('reports');
				});
			}
		}.bind(this));
	}

	_createOrganization(organization) {
		var organizationContainer = $('<div class="organizationBox box"></div>').appendTo(this._container);
		var header = $('<div class="header unselectable">'+ organization.name +'</div>').appendTo(organizationContainer); 
		var body = $('<div class="body customScrollbar"></div>').appendTo(organizationContainer);
		var panelGroup = $('<div class="panel-group"></div>').appendTo(body);

		var firstColumn = $('<div class="col-sm-3"></div>').appendTo(panelGroup);
		var firstColumnFirstBox = $('<div class="box"></div>').appendTo(firstColumn);
		var firstWidgetHeader = $('<div class="header unselectable">Overall Risk Score</div>').appendTo(firstColumnFirstBox);
		var firstWidgetBody = $('<div class="body dashboardWidget customScrollbar unselectable"</div>').appendTo(firstColumnFirstBox);
		
		var firstColumnSecondBox = $('<div class="box"></div>').appendTo(firstColumn);
		var secondWidgetHeader = $('<div class="header unselectable">Facility Risk Scoreboard</div>').appendTo(firstColumnSecondBox);
		var secondWidgetBody = $('<div class="body dashboardWidget customScrollbar unselectable"></div>').appendTo(firstColumnSecondBox);

		var secondColumn = $('<div class="col-sm-4"></div>').appendTo(panelGroup);
		var secondColumnBox = $('<div class="box"></div>').appendTo(secondColumn);
		var thirdWidgetHeader = $('<div class="header unselectable">Risk Statistics</div>').appendTo(secondColumnBox);
		var thirdWidgetBody = $('<div class="body dashboardWidget customScrollbar unselectable"></div>').appendTo(secondColumnBox);

		var thirdColumn = $('<div class="col-sm-5"></div>').appendTo(panelGroup);
		var thirdColumnBox = $('<div class="box"></div>').appendTo(thirdColumn);
		var fourthWidgetHeader = $('<div class="header unselectable">Latest Findings Overview</div>').appendTo(thirdColumnBox);
		var fourthWidgetBody = $('<div class="body dashboardWidget customScrollbar unselectable"></div>').appendTo(thirdColumnBox);
		
		new Widget().create(1, organization, firstWidgetBody);
		new Widget().create(2, organization, secondWidgetBody)
		new Widget().create(3, organization, thirdWidgetBody)
		new Widget().create(4, organization, fourthWidgetBody);
	}
}