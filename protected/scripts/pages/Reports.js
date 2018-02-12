function Reports() {
    this._containerSelector = '#treeContainer';
    this.createButton = $("#createOrgButton");
    this._treeReference = null;
    this._treeNodeHelper = new TreeNodeHelper();
    this._contextMenu = new TreeContextMenu();
    this._selectedFacility = null;
    this.data = null;

    this.createButton.on("click", this.createOrganization.bind(this));
}

// Updates the source list and findings based on the results retrieved.
Reports.prototype.update = function () {
    this.updateView();

    TOTEM.model.getOrganizations(function (orgs) {
        this.removeExistingTree();
        this.data = orgs;
        this._initializeTree();
    }.bind(this));
}

Reports.prototype.updateView = function () {
    var widgetContainer = $('#sourceContainer');
    widgetContainer.empty();
}

Reports.prototype.removeExistingTree = function () {
    this._treeReference = null;
    $(this._containerSelector).jstree('destroy')
}

Reports.prototype._initializeTree = function () {
    $('#treeContainer').outerHeight($('#leftContainerReports').height() - $('#createOrgButton').height());

    var that = this;

    var tree = {
        'core': {
            'multiple': false,
            'animation': 0,
            'check_callback': function (operation, node, parent, position, more) {
                if (operation === 'move_node') {
                    return false;
                }

                return true;
            },
            'worker': false,
            'data': this._loadTreeNode.bind(this)
        },
        'types': {
            '#': {
                'valid_children': ['organization']
            },
            'organization': {
                //  'icon': 'images/16x16/organization_16x16.png',
                'valid_children': ['facility']
            },
            'facility': {
                //'icon': 'images/16x16/location_16x16.png',
                'valid_children': ['source']
            },
            'source': {
                //  'icon': 'images/16x16/source_16x16.png',
                'valid_children': []
            }
        },
        'contextmenu': {
            'items': this._contextMenu.contextMenu.bind(this._contextMenu),
            select_node: false
        },
        'dnd': {
            is_draggable: function (nodes, evt) {
                return false;
            }.bind(this),
            copy: false,
            large_drag_target: true,
            large_drop_target: true
        },
        'plugins': ['contextmenu', 'types', 'wholerow', 'dnd']
    };

    $(this._containerSelector).jstree(tree);
    this._treeReference = $(this._containerSelector).jstree(true);

    this._bindTreeEvents();
}

Reports.prototype._loadTreeNode = function (node, callback) {
    if (node.id === '#') {
        callback(this._loadRootNode());
    } else if (node.type === 'organization') {
        callback(this._loadOrganizationNode(node.id));
    } else if (node.type === 'facility') {
        callback(this._loadFacilityNode(node.data.organizationId, node.id));
    }
}

Reports.prototype._loadRootNode = function () {
    var childrenToAdd = [];

    for (var orgId in this.data) {
        childrenToAdd.push(this._treeNodeHelper.createOrganizationNode(this.data[orgId]));
    }

    return childrenToAdd;
}

Reports.prototype._loadOrganizationNode = function (organizationId) {
    var childrenToAdd = [];

    for (var facilityId in this.data[organizationId].facilities) {
        childrenToAdd.push(this._treeNodeHelper.createFacilityNode(this.data[organizationId].facilities[facilityId]));
    }

    return childrenToAdd;
}

Reports.prototype._loadFacilityNode = function (organizationId, facilityId) {
    var facility = this.data[organizationId].facilities[facilityId];
    
    var sources = [];

    for (var sourceId in facility.sources) {
        sources.push(facility.sources[sourceId]);
    }
    
    //sorts sources in an ascending order based on their timestamps
    sources.sort(function (a, b) {
        return parseFloat(a.timestamp) - parseFloat(b.timestamp);
    });

    var sourceNodes = [];

    for (var i = 0; i < sources.length; i++) {
        var source = sources[i];
        var sourceNode = this._treeNodeHelper.createSourceNode(source);
        sourceNodes.push(sourceNode);
    }

    return sourceNodes;
}

Reports.prototype._bindTreeEvents = function () {
    $(this._containerSelector).on("rename_node.jstree", function (evt, data) {
        switch (data.node.type) {
            case 'organization':
                this.renameOrganization(data.node.id, data.text);
                break;
            case 'facility':
                this.renameFacility(data.node.data.organizationId, data.node.id, data.text);
                break;
            case 'source':
                this.renameSource(data.node.data.organizationId, data.node.data.facilityId, data.node.id, data.text);
                break;
            default:
                break;
        }
    }.bind(this));

    this._onTreeNodeSelected = function (evt, data) {
        this._selectedId = data.node.id;
        switch (data.node.type) {
            case 'organization':
                this._onOrganizationSelected(data.node.id);
                break;
            case 'facility':
                this._onFacilitySelected(data.node.data.organizationId, data.node.id);
                break;
            case 'source':
                this._onSourceSelected(data.node.data.organizationId, data.node.data.facilityId, data.node.id);
                break;
            default:
                break;
        }
    }.bind(this);

    $(this._containerSelector).on("select_node.jstree", this._onTreeNodeSelected);
}

// Adds Buttons (save, email)
Reports.prototype._addButtons = function (container, object, reportType) {
    var buttonContainer = $('<p class="buttonContainer">').appendTo(container);
    var saveButton = $('<span id="saveButton-' + object._id + '" class="glyphicon glyphicon-download button" title="Download Report"></span>').appendTo(buttonContainer);
    saveButton.tooltip();

    saveButton.on('click', { object: object }, function (e) {
        var button = $('#saveButton-' + e.data.object._id);
        button.removeClass('success').removeClass('error');
        button.addClass('processing');

        TOTEM.pdfCreator.save(e.data.object, reportType, function (result) {
            button.removeClass('processing');

            if (result == true) {
                button.addClass('success');
            } else {
                button.addClass('error');
            }
        });
    });

    var emailButton = $('<span id="emailButton-' + object._id + '" class="glyphicon glyphicon-envelope button" title="Email Report"></span>').appendTo(buttonContainer);
    emailButton.tooltip();

    emailButton.on('click', { object: object }, function (e) {
        var button = $('#emailButton-' + e.data.object._id);
        button.removeClass('success').removeClass('error');
        button.addClass('processing');

        TOTEM.pdfCreator.sendEmail(e.data.object, reportType, function (result) {
            button.removeClass('processing');

            if (result == true) {
                button.addClass('success');
            } else {
                button.addClass('error');
            }
        });
    });
}

Reports.prototype._onSourceSelected = function (orgId, facilityId, selectedSourceId) {
    var getPanelBodyText = function (source) {
        var getFindingHtml = function (finding) {
            var findingContainer = $('<div class="finding"></div>');

            for (var key in finding.data) {
                var keyValuePair = TOTEM.findingsHelper.getFindingDetails(finding.data, key);
                if (keyValuePair == undefined) continue;

                var findingElement = $('<p><b>' + keyValuePair[0] + ':</b> ' + keyValuePair[1] + '</p>').appendTo(findingContainer);

                if (keyValuePair[0] == 'Severity') {
                    findingElement.css('color', TOTEM.severityColors[keyValuePair[1]]);
                }
            }
            return findingContainer;
        }.bind(this);

        var panelBody = $('<div></div>');
        var sourceSummary = $('<div class="sourceSummary"></div>').appendTo(panelBody);

        var sourceName = $('<p><b>Name:</b> ' + source.name + '</p>').appendTo(sourceSummary);
        var sourceType = $('<p><b>Type:</b> ' + TOTEM.model.getSourceType(source.type) + '</p>').appendTo(sourceSummary);
        if (source.version) {
            $('<p><b>Version:</b> ' + source.version  + '</p>').appendTo(sourceSummary);
        }
        
        if (TOTEM.model.isConfigSource(source)) {
            var certificationStatus = $('<p class="' + source.certificationStatus + '"><b>Certification Status:</b> ' + source.certificationStatus + '</p>').appendTo(sourceSummary);

            // Return if the certification status is passed or there are no findings
            if (source.certificationStatus == 'passed' || source.findings.length == 0) {
                return panelBody;
            }

            $('<p><b>' + source.findings.length + ' Finding(s) Discovered:</b></p>').appendTo(sourceSummary);

            var allFindingsContainer = $('<div class="allFindingsContainer"></div>').appendTo(panelBody);

            var categorizedFindings = TOTEM.findingsHelper.categorizeFindings(source.findings);

            // Display Findings
            if (categorizedFindings.general.length > 0) {
                var findings = categorizedFindings.general;
                var header = $('<p class="mainHeader">General Policy Findings:</p>').appendTo(allFindingsContainer);

                var findingsContainer = $('<div class="specificFindings"></div>').appendTo(allFindingsContainer);

                for (var j = 0; j < findings.length; j++) {
                    getFindingHtml(findings[j]).appendTo(findingsContainer);
                }
            }

            if (Object.keys(categorizedFindings.userData).length > 0) {
                var rowData = categorizedFindings.userData;

                $('<p class="mainHeader">User Specific Findings:</p>').appendTo(allFindingsContainer);

                var table = new DynamicTable(allFindingsContainer);

                table.addDynamicHeader('Username');
                table.addDynamicHeader('Full Name');
                table.addDynamicHeader('Status');
                table.addDynamicHeader('User Expiration');
                table.addDynamicHeader('Password Expiration');
                table.addDynamicHeader('Permissions');
                table.addDynamicHeader('Lock Out');
                var numOfFindingsHeader = table.addDynamicHeader('# of Findings');

                for (var username in rowData) {
                    var user = rowData[username];

                    var row = table.addRow();

                    table.addColumn(row, username);
                    table.addColumn(row, user.data.fullName || "");
                    table.addColumn(row, user.data.status);
                    table.addColumn(row, user.data.userExpiration);
                    table.addColumn(row, user.data.passwordExpiration);
                    table.addColumn(row, user.data.permissions);
                    table.addColumn(row, user.data.lockOut);
                    table.addColumn(row, user.numberOfFindings);
                }

                numOfFindingsHeader.click();

                // Risks per user type
                var userTypes = categorizedFindings.userLevels;
                var userTypesContainer = $('<div class="specificFindings"></div>').appendTo(allFindingsContainer);
                $('<div class="heading">Risks Per User Types: ' + '</div>').appendTo(userTypesContainer);

                for (var type in userTypes) {
                    $('<p class="userType">'+ type +':</p>').appendTo(userTypesContainer);
                    var codes = userTypes[type];

                    for (var code in codes) {
                        var finding = codes[code];
                        var p = $('<p class="userFinding"></p>').appendTo(userTypesContainer);
                        var badge = $('<span class="badge">' + finding.count +' user(s)</span>').appendTo(p);
                        badge.css('background', TOTEM.severityColors[finding.severity]);
                        badge.attr('title', finding.severity);
                        $('<span> ' + finding.finding +'</span>').appendTo(p);
                    }
                }

                // User specific findings list
                for (var username in categorizedFindings.users) {
                    var findings = categorizedFindings.users[username];

                    var findingsContainer = $('<div class="specificFindings"></div>').appendTo(allFindingsContainer);
                    $('<div class="heading">Findings for User: ' + username + '</div>').appendTo(findingsContainer);

                    for (var j = 0; j < findings.length; j++) {
                        getFindingHtml(findings[j]).appendTo(findingsContainer);
                    }
                }
            }
        } else if (source.type == 'pcap') {
            var sourceDevices = $('<p><b>Discovered ' + source.devices.length + ' Device(s):</b></p>').appendTo(sourceSummary);
            var deviceListContainer = $('<div class="allFindingsContainer"></div>').appendTo(panelBody)
            var ul = $('<ul class="deviceList"></ul>').appendTo(deviceListContainer);

            for (var i = 0; i < source.devices.length; i++) {
                var li = $('<li></li>').appendTo(ul);
                var deviceText = $('<span class="hyperlink">' + source.devices[i].ipv4Address +'</span>)').appendTo(li);
                deviceText.click({ device: source.devices[i]}, function (e) {
                    $('#deviceModalTitle').html(e.data.device.ipv4Address);
                    
                    var deviceModalBody = $('#deviceModalBody');
                    deviceModalBody.empty();

                    $('<p><b>Device IP Address:</b> '+ e.data.device.ipv4Address + '</p>').appendTo(deviceModalBody);
                    $('<p><b>MAC Address:</b> '+ (e.data.device.macAddress || 'Unknown') + '</p>').appendTo(deviceModalBody);

                    $("#deviceModal").modal('show');
                });
            }
        }
        return panelBody;
    }.bind(this);


    TOTEM.model.getSource(orgId, facilityId, selectedSourceId, function (source) {
        var sourceContainer = $('#sourceContainer');
        sourceContainer.empty();

        var panel = $('<div class="panel panel-default"></div>').appendTo(sourceContainer);
        var panelHeading = $('<div class="panel-heading sourceListElement"></div>').appendTo(panel);
        
        if (TOTEM.model.isConfigSource(source)) {
            var statusIndicator = $('<p class="indicator ' + source.certificationStatus + '"></p>').appendTo(panelHeading);
        }

        var panelTitle = $('<h4 class="panel-title">'
            + source.name + ' [' + new Date(source.timestamp).toUTCString() + ']</h4>').appendTo(panelHeading);

        if (TOTEM.model.isConfigSource(source)) {
            this._addButtons(panelHeading, source, 'source');
        }

        var collapsiblePanel = $('<div style="height: calc(100% - 60px)" ></div>').appendTo(panel);
        var panelBody = $('<div class="panel-body customScrollbar">' + +'</div>').appendTo(collapsiblePanel);

        var bodyContent = getPanelBodyText(source);
        bodyContent.appendTo(panelBody);
    }.bind(this))
}

Reports.prototype._addNewNode = function (parentNode, newNode, select, edit) {
    var newlyCreatedNode = this._treeReference.create_node(parentNode, newNode);

    if (select === true) {
        this._treeReference.deselect_all();
        this._treeReference.select_node(newlyCreatedNode);
    }

    if (edit === true) {
        this._treeReference.open_node(newlyCreatedNode);
        this._treeReference.edit(newlyCreatedNode);
    }

    this.updateView();
}

Reports.prototype.createOrganization = function () {
    TOTEM.model.createOrganization("New Organization", function (data) {
        if (data) {
            this.data[data._id] = data;
            var rootNode = this._treeReference.get_node('#');
            var orgNode = this._treeNodeHelper.createOrganizationNode(data);
            this._addNewNode(rootNode, orgNode, true, true);
        }
    }.bind(this));
}

Reports.prototype.renameOrganization = function (organizationId, name) {
    TOTEM.model.updateOrganization(organizationId, { name: name }, function (data) {
        if (data) {
            this.data[organizationId].name = name;
        } else {
            this._treeReference.set_text(this._treeReference.get_node(organizationId), this.data[organizationId].name);
        }
    }.bind(this));
}

Reports.prototype.deleteOrganization = function (organizationId) {
    TOTEM.model.deleteOrganization(organizationId, function (data) {
        if (data) {
            this._deselect(organizationId);
            this._treeReference.delete_node(organizationId);

            this.updateView();
        }
    }.bind(this));
}

Reports.prototype.createFacility = function (orgId) {
    TOTEM.model.createFacility(orgId, "New Facility", function (data) {
        if (data) {
            this.data[orgId].facilities[data._id] = data;
            var orgNode = this._treeReference.get_node(orgId);
            var facilityNode = this._treeNodeHelper.createFacilityNode(data);
            this._addNewNode(orgNode, facilityNode, true, true);
        }
    }.bind(this));
}

Reports.prototype.renameFacility = function (organizationId, facilityId, name) {
    TOTEM.model.updateFacility(organizationId, facilityId, { name: name }, function (data) {
        if (data) {
            this.data[organizationId].facilities[facilityId].name = name;
        } else {
            this._treeReference.set_text(this._treeReference.get_node(facilityId), this.data[organizationId].facilities[facilityId].name);
        }
    }.bind(this));
}

Reports.prototype.deleteFacility = function (organizationId, facilityId) {
    TOTEM.model.deleteFacility(organizationId, facilityId, function (data) {
        if (data) {
            this._deselect(facilityId);
            this._treeReference.delete_node(facilityId);

            this.updateView();
        }
    }.bind(this));
}


Reports.prototype.importSources = function (organizationId, facilityId) {
    this._selectedFacility = {
        organizationId: organizationId,
        facilityId: facilityId
    };

    $("#importModal").modal('show');
}

Reports.prototype.uploadFile = function (sourceId, formData) {
    var sourceElementId = '#' + sourceId;

    if (!this._selectedFacility) {
        return false;
    }

    $.ajax({
        url: '/api/v1/orgs/'+ this._selectedFacility.organizationId +
        '/facilities/' + this._selectedFacility.facilityId + '/upload',
        type: 'POST',
        headers: { 'Authorization': 'Bearer ' + TOTEM.userToken() },
        data: formData,
        processData: false,
        contentType: false,
        async: true,
        complete: function () {
            $(sourceElementId + ' .loader').removeClass('spinner');
        }.bind(this),
        success: function (data) {
            $(sourceElementId + ' .loader').addClass('glyphicon glyphicon-ok-circle green');
            $(sourceElementId + ' .loader').attr('title', 'File uploaded and processed successfully');
            $(sourceElementId + ' .loader').tooltip();

            if (data.data) {
                this.createSource(data.data);
            }
            else {
                alert("Error: " + data.error);
            }
        }.bind(this),
        error: function (err) {
            $(sourceElementId + ' .loader').addClass('glyphicon glyphicon-remove-circle red');
            if (err && err.responseJSON && err.responseJSON.error) {
                $(sourceElementId + ' .loader').attr('title', err.responseJSON.error);
            } else {
                $(sourceElementId + ' .loader').attr('title', 'Error occured');
            }
            $(sourceElementId + ' .loader').tooltip();
        }
    });
}

Reports.prototype.createSource = function (data) {
    if (data) {
        this.data[data.organizationId].facilities[data.facilityId].sources[data._id] = data;
        var facilityNode = this._treeReference.get_node(data.facilityId);
        var sourceNode = this._treeNodeHelper.createSourceNode(data);
        this._addNewNode(facilityNode, sourceNode, true, false);
    }
}

Reports.prototype.renameSource = function (organizationId, facilityId, sourceId, name) {
    TOTEM.model.updateSource(organizationId, facilityId, sourceId, { name: name }, function (data) {
        if (data) {
            this.data[organizationId].facilities[facilityId].sources[sourceId].name = name;
        } else {
            this._treeReference.set_text(this._treeReference.get_node(sourceId), this.data[organizationId].facilities[facilityId].sources[sourceId].name);
        }
    }.bind(this));
}

Reports.prototype.deleteSource = function (organizationId, facilityId, sourceId) {
    TOTEM.model.deleteSource(organizationId, facilityId, sourceId, function (data) {
        if (data) {
            this._deselect(sourceId);
            this._treeReference.delete_node(sourceId);

            this.updateView();
        }
    }.bind(this));
}

Reports.prototype.getOrganizationStatistics = function (organizationId, onFinishedCallback) {
    TOTEM.model.getOrganizationStatistics(organizationId, function (data) {
        onFinishedCallback(data);
    }.bind(this));
}

Reports.prototype.getFacilityStatistics = function (organizationId, facilityId, onFinishedCallback) {
    TOTEM.model.getFacilityStatistics(organizationId, facilityId, function (data) {
        onFinishedCallback(data);
    }.bind(this));
}

Reports.prototype._onOrganizationSelected = function (orgId) {
    var widgetContainer = $('#sourceContainer');
    widgetContainer.empty();

    TOTEM.model.getOrganization(orgId, function (organization) {
        var panel = $('<div class="panel panel-default"></div>').appendTo(widgetContainer);
        var panelHeading = $('<div class="panel-heading sourceListElement"></div>').appendTo(panel);
        var panelTitle = $('<h4 class="panel-title">' + organization.name + '</h4>').appendTo(panelHeading);

        this._addButtons(panelHeading, organization, 'organization');

        var collapsiblePanel = $('<div style="height: calc(100% - 60px)" ></div>').appendTo(panel);
        var panelBody = $('<div class="panel-body customScrollbar">' + +'</div>').appendTo(collapsiblePanel);

        this.getOrganizationStatistics(orgId, function (sources) {
            var statistics = this._calculateSumStatistics(sources);

            if ($.isEmptyObject(statistics)) {
                $('<p class="noFindings">There are currently no findings.</p>').appendTo(panelBody);
                return;
            }
            var chartContainer = $('<div id="chartsContainer" class="customScrollbar unselectable"></div>').appendTo(panelBody);

            this._drawRiskDoughnutChart(statistics);
            this._drawRiskGraph(sources);
            this._getFindingsSummary(sources).appendTo(chartContainer);
        }.bind(this))
    }.bind(this));
}

Reports.prototype._onFacilitySelected = function (orgId, facilityId) {
    var widgetContainer = $('#sourceContainer');
    widgetContainer.empty();

    TOTEM.model.getFacility(orgId, facilityId, function (facility) {
        var panel = $('<div class="panel panel-default"></div>').appendTo(widgetContainer);
        var panelHeading = $('<div class="panel-heading sourceListElement"></div>').appendTo(panel);
        var panelTitle = $('<h4 class="panel-title">' + facility.name + '</h4>').appendTo(panelHeading);

        this._addButtons(panelHeading, facility, 'facility');

        var collapsiblePanel = $('<div style="height: calc(100% - 60px)" ></div>').appendTo(panel);
        var panelBody = $('<div class="panel-body customScrollbar">' + +'</div>').appendTo(collapsiblePanel);

        this.getFacilityStatistics(orgId, facilityId, function (sources) {
            var statistics = this._calculateSumStatistics(sources);

            if ($.isEmptyObject(statistics)) {
                $('<p class="noFindings">There are currently no findings.</p>').appendTo(panelBody);
                return;
            }

            var chartContainer = $('<div id="chartsContainer" class="customScrollbar"></div>').appendTo(panelBody);

            var statistics = this._calculateSumStatistics(sources);
            this._drawRiskDoughnutChart(statistics);
            this._drawRiskGraph(sources);
            this._getFindingsSummary(sources).appendTo(chartContainer);
        }.bind(this))
    }.bind(this));
}

Reports.prototype._getFindingsSummary = function (sources) {
    var container = $('<div></div>');
    var statistics = {};

    for (var i = 0; i < sources.length; i++) {
        var source = sources[i];

        for (var j in source.findings) {
            var finding = source.findings[j];
            if (statistics[finding.data.code] == undefined) {
                statistics[finding.data.code] = {
                    code: finding.data.code,
                    severity: finding.data.severity,
                    finding: finding.data.finding,
                    count: 0
                };
            }

            statistics[finding.data.code].count++;
        }
    }

    var severityMap = {};
    for (var i in statistics) {
        if (severityMap[statistics[i].severity] == undefined) {
            severityMap[statistics[i].severity] = [];
        }
        severityMap[statistics[i].severity].push(statistics[i]);
    }

    function createPanel(severity, findings) {
        var panel = $('<div class="panel panel-default"></div>').appendTo(container);
        var panelHeading = $('<div class="panel-heading"></div>').appendTo(panel);
        var panelTitle = $('<h4 class="panel-title">' + severity + ': <b>' + findings.length + '</b></h4>').appendTo(panelHeading);
        panelTitle.css('background', TOTEM.severityColors[severity]);

        var panelBody = $('<div class="panel-body"></div>').appendTo(panel);
        for (var j in findings) {
            $('<p><span class="badge">' + findings[j].count + '</span> ' + findings[j].finding + ' (' + findings[j].code + ')</p>').appendTo(panelBody);
        }

        return panel;
    }

    var keySeverityArray = [];
    for (var key in severityMap) {
        keySeverityArray.push({ key: key, severityNum: TOTEM.severityLevels[key] });
    }    

    keySeverityArray.sort(function(a, b) {
        return parseFloat(b.severityNum) - parseFloat(a.severityNum);
    })

    for (var i = 0; i < keySeverityArray.length; i++) {
        var key = keySeverityArray[i].key;
        createPanel(key, severityMap[key]).appendTo(container);
    }

    return container;
}

Reports.prototype._calculateSumStatistics = function (sources) {
    var statistics = {};

    for (var i = 0; i < sources.length; i++) {
        var source = sources[i];

        for (var j in source.statistics) {
            if (statistics[j] == undefined) {
                statistics[j] = 0;
            }
            statistics[j] += source.statistics[j];
        }
    }

    return statistics;
}

Reports.prototype._drawRiskDoughnutChart = function (statistics) {
    var widgetContainer = $('#chartsContainer');
    var chartContainer = $('<div class="chartContainer"></div>').appendTo(widgetContainer);

    var createChart = function (statistics) {
        if (statistics == null) return;

        chartContainer.empty();

        var labels = [];
        var data = [];
        var backgroundColors = [];

        for (var key in statistics) {
            labels.push(key);
            data.push(statistics[key]);
            backgroundColors.push(TOTEM.severityColors[key]);
        }

        var ctx = $('<canvas width="50" height="50"></canvas>').appendTo(chartContainer);

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
                            if (numberOfFindings == 1) {
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

    createChart(statistics);
}

Reports.prototype._drawRiskGraph = function (sources) {
    if (sources.length == 0) {
        return;
    }

    var widgetContainer = $('#chartsContainer');

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
            label: source.name + ' (' + new Date(source.timestamp).toUTCString() + ')',
            data: sourceData,
            borderWidth: 1,
            borderColor: randomColorGenerator(randomColor, 1),
            backgroundColor: randomColorGenerator(randomColor, 0.4),
        });
    }

    var chartContainer = $('<div class="chartContainer"></div>').appendTo(widgetContainer);
    var ctx = $('<canvas width="50" height="50"></canvas>').appendTo(chartContainer);

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

Reports.prototype._deselect = function (id) {
    if (this._selectedId == id) {
        var widgetContainer = $('#sourceContainer');
        widgetContainer.empty();
        this._selectedId = null;
    }
}