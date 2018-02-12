class Widget {
	constructor() {}

	create(type, organization, widgetContainer) {
		switch (type) {
			case 1:
				this._overallRiskScoreWidget(organization, widgetContainer);
				break;
			case 2:
				this._facilityRiskScoreboard(organization, widgetContainer);
				break;
			case 3:
				this._riskStatisticsWidget(organization, widgetContainer);
				break;
			case 4:
				this._latestFindingsWidget(organization, widgetContainer);
				break; 
		}
	}

	_calculateRiskScore(statistics) {
		var result = 0;
		var total = 0;

		for (var severity in statistics) {
			result += TOTEM.severityLevels[severity] * statistics[severity]; 
			total += statistics[severity];
		}

		if (result == 0 || total == 0) {
			return null;
		}
		result = Math.ceil(result / total);

		return result;
	}

	_findRiskColorCode(riskScore) {
		var colors = TOTEM.severityColors;

		if (riskScore == null) {
			return "#66ff66";
		} else if (0 <= riskScore && riskScore <= 25) {
			return colors["Low"];
		} else if (25 < riskScore && riskScore <= 50) {
			return colors["Medium"];
		} else if (50 < riskScore && riskScore <= 75) {
			return colors["High"];
		} else if (75 < riskScore && riskScore <= 90) {
			return colors["Very High"];
		} else if (80 < riskScore && riskScore <= 100) {
			return colors["Critical"];
		}
	}

	_findRiskLevel(riskScore) {
		if (riskScore == null) {
			return "None";
		} else if (0 <= riskScore && riskScore <= 25) {
			return "Low";
		} else if (25 < riskScore && riskScore <= 50) {
			return "Medium";
		} else if (50 < riskScore && riskScore <= 75) {
			return "High";
		} else if (75 < riskScore && riskScore <= 90) {
			return "Very High";
		} else if (90 < riskScore && riskScore <= 100) {
			return "Critical";
		}
	}

	_overallRiskScoreWidget(organization, widgetContainer) {
		widgetContainer.empty();

		var statistics = organization.statistics;
		var numberOfFacilities = 0;

		for (var i in organization.facilities) {
			numberOfFacilities++;
		}

		//calculates riskScore based on the number of severities
		var riskScore = this._calculateRiskScore(statistics);
		var riskText = this._findRiskLevel(riskScore);
		var riskColor = this._findRiskColorCode(riskScore);
		
		var organizationInformationContainer = $('<div class="organizationInformationContainer"></div>').appendTo(widgetContainer);
		$('<p>Risk Score: '+ (riskScore | 0) +'%</p>').appendTo(organizationInformationContainer);
		$('<p>Level: '+ riskText +'</p>').appendTo(organizationInformationContainer);
		$('<p>Facilities: '+ numberOfFacilities+'</p>').appendTo(organizationInformationContainer);

		var organizationRiskContainer = $('<div class="organizationRiskScoreContainer"></div>').appendTo(widgetContainer);
		var ctx = $('<canvas></canvas>').appendTo(organizationRiskContainer);

		var otherColor = "#e1e1e1";
		if (riskScore == null) {
			otherColor = this._findRiskColorCode(riskScore);

		}

		var data = {
	    	datasets: [{
	            data: [riskScore | 0, 100 - riskScore | 0],
	            backgroundColor: [
	                riskColor,
	                otherColor
	            ]
	        }]
	    };

		new Chart(ctx, {
			type: 'doughnut', 
			data: data,
			options: {
				plugin_attribute: 'gauge_with_text',
				circumference: Math.PI,
				rotation: 1.0 * Math.PI,
				cutoutPercentage: 70,
				legend: {
					display: false
				},
				elements: {
			        arc: {
			            borderWidth: 1
			        }
			    },
				textColor: riskColor,
				text: (riskScore | 0) + "%",
				tooltips: {
			        enabled: true,
			        mode: 'single',
			        displayColors: false,
			        callbacks: {
			            label: function(tooltipItems, data) { 
			                return riskText;
			            }
			        }
			    }
			}
		});
	}

	_facilityRiskScoreboard(organization, widgetContainer) {
		widgetContainer.css('max-height', '125px'); 
		widgetContainer.empty();

		var table = $('<table class="facilityRiskTable"></table>').appendTo(widgetContainer);
		var firstRow = $('<tr><td class="name">Facility</td>'
				+ '<td class="score">Risk Score</td>'
				+ '<td class="severity">Level</td></tr>').appendTo(table);
		
		var facilities = [];

		for (var facilityId in organization.facilities) {
			var facility = organization.facilities[facilityId];

			facility.riskScore = this._calculateRiskScore(facility.statistics);
			var riskLevel = this._findRiskLevel(facility.riskScore);

			facilities.push(facility);
		}

		// Sort facilities from the most severe to the least
		facilities.sort(function (a, b) {
			return parseFloat(b.riskScore) - parseFloat(a.riskScore);
		});

		for (var i = 0; i < facilities.length; i++) {
			var facility = facilities[i];
			
			var riskLevel = this._findRiskLevel(facility.riskScore);

			var row = $('<tr></tr>').appendTo(table);

			$('<td class="name">' + facility.name + '</td>').appendTo(row);
			$('<td class="score">' + (facility.riskScore || 0) + '</td>').appendTo(row);
			$('<td class="severity" style="color:'+ TOTEM.severityColors[riskLevel] +'">'+ riskLevel +'</td>').appendTo(row);
		}
	}

	_riskStatisticsWidget(organization, widgetContainer) {
		widgetContainer.empty();

		var isOrganizationEmpty = true;

		for (var facilityId in organization.facilities) {
			for (var sourceId in organization.facilities[facilityId]) {
				isOrganizationEmpty = false;
			}
		}

		if (isOrganizationEmpty == true) {
			var noFindings = $('<p class="noFindings">This organization currently has no data. </p>').appendTo(widgetContainer);
			var addSources = $('<span class="addSources">Import sources</span>').appendTo(noFindings);
			addSources.on('click', function () {
				TOTEM.pageSwitcher.switchPage('reports');
			});
			return;
		}

		var chartContainer = $('<div class="chartContainer"></div>').appendTo(widgetContainer);

		var createChart = function (statistics) {		
			chartContainer.empty();

			if (statistics == null) {
				$('<p class="noFindings">There are no sources for this facility.</p>').appendTo(chartContainer);
				return;
			}

			var labels = [];
			var data = [];
			var backgroundColors = [];

			for (var key in statistics) {
				labels.push(key);
				data.push(statistics[key]);
				backgroundColors.push(TOTEM.severityColors[key]);
			}

			if (data.length == 0) {
				$('<p class="noFindings">There are no findings for this source.</p>').appendTo(chartContainer);
				return;
			}

			var ctx = $('<canvas id="widget-1" width="50" height="50"></canvas>').appendTo(chartContainer);

			new Chart(ctx, {
				type: 'doughnutLabels',
				data: {
					labels: labels,
					datasets: [{
						backgroundColor: backgroundColors,
						borderWidth: 0,
						data: data
					}],
				},
				options: {
					tooltips: {
						enabled: true,
						mode: 'single',
						callbacks: {
							label: function (tooltipItems, data) {
								var index = tooltipItems.index;
								var numberOfFindings = data.datasets[0].data[index];
								if (numberOfFindings  == 1) {
									return data.labels[index] + ' : ' + numberOfFindings + ' finding';
								} else {
									return data.labels[index] + ' : ' + numberOfFindings + ' findings';
								}
							}.bind(this)
						}
					},
					cutoutPercentage: 60,
					legend: {
						display: true,
						position: 'right',
						labels: {
							boxWidth: 30,
							fontColor: 'rgb(0, 0, 0)'
						}
					},
					maintainAspectRatio: false
				}
			});
		}

		//Source selector
		var setSourceSelector = function (selector, options) {
			selector.empty()
			selector.off();

			for (var sourceId in options) {
				var source = options[sourceId];

				$('<option value="' + source._id +'">' + source.name + ' ('+ new Date(source.timestamp).toUTCString() +')</option>').appendTo(selector);
			}

			selector.on('change', function () {
				var selectedSourceId = selector.val();
				var selectedSource = null;

				for (var sourceId in options) {
					if (sourceId == selectedSourceId) {
						selectedSource = options[sourceId];
						break;
					}
				}
				if (selectedSource && selectedSource.statistics) {
					createChart(selectedSource.statistics);
				}
			});

			//Displays the first source of the first facility initially(if exists)
			var firstSource = options[Object.keys(options)[0]];

			if (firstSource && firstSource.statistics) {
				createChart(firstSource.statistics);
			} else {
				createChart(null);
			}
		}.bind(this);

		var firstFacility = organization.facilities[Object.keys(organization.facilities)[0]];

		var selectorContainer = $('<div class ="selectorContainer"></div>').prependTo(widgetContainer);

		var selector = $('<select class="dashboardSelector"></select>').prependTo(selectorContainer);

		setSourceSelector(selector, firstFacility.sources);

		//Facility selector
		var facilitySelector = $('<select class="dashboardSelector"></select>').prependTo(selectorContainer);
		
		for (var i in organization.facilities) {
			var facility = organization.facilities[i];

			$('<option value="' + facility._id +'">' + facility.name + '</option>').appendTo(facilitySelector);
		}

		//Changing the facility selector changes the source selector
		facilitySelector.on('change',function (){
			var selectedFacilityId = facilitySelector.val();
			var selectedFacility = null;

			for (var facilityId in organization.facilities) {
				if (facilityId == selectedFacilityId) {
					selectedFacility = organization.facilities[facilityId];
					break;
				}
			}
			setSourceSelector(selector, selectedFacility.sources);
		});
	}

	_latestFindingsWidget(organization, widgetContainer) {
		widgetContainer.empty();

		var isOrganizationEmpty = true;

		for (var facilityId in organization.facilities) {
			for (var sourceId in organization.facilities[facilityId]) {
				isOrganizationEmpty = false;
			}
		}

		if (isOrganizationEmpty == true) {
			var noFindings = $('<p class="noFindings">This organization currently has no data. </p>').appendTo(widgetContainer);
			var addSources = $('<span class="addSources">Import sources</span>').appendTo(noFindings);
			addSources.on('click', function () {
				TOTEM.pageSwitcher.switchPage('reports');
			});
			return;
		}

		function randomColorGenerator(rgb, opacity) {
			if (rgb) {
				return rgb + ',' + opacity + ')'
			} else {
				return 'rgba(' + Math.floor(Math.random() * (230) + 1) + ','
			    + Math.floor(Math.random() * (230) + 1) + ','
			    + Math.floor(Math.random() * (230) + 1);
			}
		}

		var labels = [];

		for (var key in TOTEM.severityLevels) {
			labels.push(key);
		}
		labels.reverse(); // reversing the labels to start from 'Low'

		var chartContainer = $('<div class="chartContainer"></div>').appendTo(widgetContainer);

		var createChart = function (sourcesObject) {
			if (sourcesObject == null) return;

			chartContainer.empty();

			var ctx = $('<canvas width="50" height="50"></canvas>').appendTo(chartContainer);

			//converts sources object into an array for ease of iteration
			var sources = [];
			for (var id in sourcesObject) {
				sources.push(sourcesObject[id]);
			}

			var data = {
				labels: labels,
				datasets: []
			};

			sources.sort(function (a, b) {
				return parseFloat(b.timestamp) - parseFloat(a.timestamp);
			});

			for (var i = 0; (i < 5 && i < sources.length); i++) {
				var source = sources[i];

				var sourceData = [];

				// Create source data array based on the label order.
				for (var j = 0; j < labels.length; j++) {
					var findingCount = source.statistics[labels[j]];
					if (findingCount == undefined) {
						findingCount = 0;
					}
					sourceData.push(findingCount);
				}

				var randomColor = randomColorGenerator();

				data.datasets.push({
					label: source.name+' ('+ new Date(source.timestamp).toUTCString() +')',
					data: sourceData,
					borderWidth: 1,
					borderColor: randomColorGenerator(randomColor, 1),
					backgroundColor: randomColorGenerator(randomColor, 0.4),
				});
			}
			

			new Chart(ctx, {
				type: 'line',
				data: data,
				options: {
					tooltips: {
						enabled: true,
						mode: 'single',
						callbacks: {
							label: function (tooltipItems, data) {
								return tooltipItems.yLabel + ' findings';
							}
						}
					},
					legend: {
						display: true,
						position: 'bottom',
						labels: {
							boxWidth: 30,
							fontColor: 'rgb(0, 0, 0)'
						}
					},
					scales: {
						yAxes: [{
							ticks: {
								beginAtZero: true,
								reverse: false,
								autoSkip: true,
								maxRotation: 0,
								fontColor: 'rgb(88, 88, 88)',
								fontSize: 11
							}
						}],
						xAxes: [{
							ticks: {
								autoSkip: true,
								maxRotation: 0,
								fontColor: 'rgb(88, 88, 88)',
								fontSize: 11

							}
						}]
					},
					maintainAspectRatio: false
				}
			});
		}

		//Facility selector
		var facilitySelector = $('<select class="dashboardSelector"></select>').prependTo(widgetContainer);
		
		for (var i in organization.facilities) {
			var facility = organization.facilities[i];

			$('<option value="' + facility._id +'">' + facility.name + '</option>').appendTo(facilitySelector);
		}

		facilitySelector.on('change',function (){
			var selectedFacilityId = facilitySelector.val();
			var selectedFacility = null;

			for (var facilityId in organization.facilities) {
				if (facilityId == selectedFacilityId) {
					selectedFacility = organization.facilities[facilityId];
					break;
				}
			}
			createChart(selectedFacility.sources);
		});

		var firstFacility = organization.facilities[Object.keys(organization.facilities)[0]];
		createChart(firstFacility.sources)
	}
}