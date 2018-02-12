function PDFCreator (){
    this.colors = {};

    for (var i in TOTEM.severityColors) {
        this.colors[i] = this._hex2Rgb(TOTEM.severityColors[i]);
    }

    this.leftMargin = 8; 
    this.rightMargin = 8; 
    this.topMargin = 8;
    this.bottomMargin = 8;
    this.pdfWidth = 216;
    this.pdfHeight = 279;
    this.padding = 8;

    this.sideBarWidth = 72;
    this.headerThickness = 16;
    this.footerLinePositionY = 265;
    
    this.pages = {};
    this.pageNumber = 0;

    this.font = "helvetica";

    this.reportData = null;

    $.getJSON("report_data.json", function(data) {
        this.reportData = data;
    }.bind(this));
}

PDFCreator.prototype._hex2Rgb = function (hex) {
    var rgb = ['0x' + hex[1] + hex[2] | 0, '0x' + hex[3] + hex[4] | 0, '0x' + hex[5] + hex[6] | 0];
    return "<"+rgb[0]+","+rgb[1]+","+rgb[2]+">";
}

PDFCreator.prototype._getImageDataUri = function (url, onFinishedCallback) {
    var image = new Image();

    image.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = this.naturalWidth; // or 'width' if you want a special/scaled size
        canvas.height = this.naturalHeight; // or 'height' if you want a special/scaled size

        canvas.getContext('2d').drawImage(this, 0, 0);

        onFinishedCallback(canvas.toDataURL('image/png'));
    };

    image.src = url;
}

PDFCreator.prototype._addShortText = function (pdf, text, x,y, fontSize, r,g,b, style, align) {
    if (style) {
        pdf.setFontType(style);
    }

    pdf.setTextColor(r,g,b);
    pdf.setFontSize(fontSize);

    if (align == 'right' || align == 'center') {
        pdf.text(x, y, text, align);
    } else {
        pdf.text(x, y, text);
    }
}

/* Async function that can add text batches either a single page or multiple pages long*/
PDFCreator.prototype._addLongText = function (pdf, data, text, x,y, maxWidth, fontSize, r,g,b, style, align, onFinishedCallback) {
    var splitText = pdf.splitTextToSize(text, maxWidth, {fontSize: fontSize});
    var lineHeight = fontSize/2;

    var processText = function (i, yPos, line, callback) {
        var setTextProperties = function () {
            if (line.indexOf('<b>') !== -1 && line.indexOf('<i>') !== -1) {
                line = line.replace(/<b>/g,'');
                line = line.replace(/<i>/g,'');
                pdf.setFontType('bolditalic');
            } else if (line.indexOf('<b>') !== -1) {
                line = line.replace(/<b>/g,'');
                pdf.setFontType('bold');
            } else if (line.indexOf('<i>') !== -1) {
                line = line.replace(/<i>/g,'');
                pdf.setFontType('italic');
            } else  {
                pdf.setFontType(style);
            }

            var colorMatch = /\<(\d{1,3}),(\d{1,3}),(\d{1,3})\>/.exec(line);// <255,252,101>
            if (colorMatch !== null) {
                line = line.replace(colorMatch[0], '');

                pdf.setTextColor(colorMatch[1], colorMatch[2], colorMatch[3]);
            } else {
                pdf.setTextColor(r,g,b);
            }

            pdf.setFontSize(fontSize);

            if (align == 'center' || align == 'right') {
                pdf.text(x, yPos, line, align);
            } else {
                pdf.text(x, yPos, line);
            }
            yPos = yPos + lineHeight;

            callback(++i, yPos);
        }


        if (yPos > (this.footerLinePositionY - this.bottomMargin)) {
            // reset yPos to start from the top of the new page.
            yPos = this.topMargin + this.headerThickness + this.padding;

            this._addNewPage(pdf, data, this.pages[this.pageNumber-1], true, function () {
                setTextProperties();
            });
        } else {
            setTextProperties();
        }
    }.bind(this);

    var i = 0;

    if (splitText.length > 0) {
        var next = function(i, yPosition) {
            processText(i, yPosition, splitText[i], function(j, newY) {
                if (j < splitText.length) {
                    next(j, newY);
                } else {
                    onFinishedCallback();
                }
            });
        }.bind(this);
        next(i, y);
    } else {
        onFinishedCallback();
    }
}

PDFCreator.prototype._addNewPage = function (pdf, data, headerText, addPageNumber, onFinishedCallback) {
    pdf.addPage();
    //keeps the pages to be displayed in the table of contents
    this.pages[this.pageNumber] = headerText;
    this.pageNumber++;

    this._addHeader(pdf, data, headerText, function () {
        this._addFooter(pdf, data, true, addPageNumber, function () {
            onFinishedCallback();
        }.bind(this));
    }.bind(this));
}

PDFCreator.prototype._addHeader = function (pdf, data, headerText, onFinishedCallback) {
    pdf.setFillColor(89,89,89);
    pdf.rect(this.leftMargin, this.topMargin, this.pdfWidth - this.rightMargin - this.leftMargin, this.headerThickness, 'F')

    this._addShortText(pdf, headerText, (this.leftMargin + this.padding), 
        (this.topMargin + this.headerThickness/2 + this.padding/4), 19, 255,255,255, "normal", "left");

    this._getImageDataUri('images/report/logo_white.png', function (imageBase64) {
        var imageWidth = 60,
            imageHeight = 11,
            imageX = this.pdfWidth - imageWidth - this.rightMargin - this.padding,
            imageY = this.topMargin + this.padding/4;

        pdf.addImage(imageBase64, 'PNG', imageX, imageY, imageWidth, imageHeight);

        onFinishedCallback();
    }.bind(this));
}

PDFCreator.prototype._addFooter = function (pdf, data, drawLine, addPageNumber, onFinishedCallback) {
    //Adds a straight line
    if (drawLine == true) {
        pdf.setLineWidth(0.8);
        pdf.setDrawColor(155,155,155);
        pdf.line(this.leftMargin, this.footerLinePositionY, this.pdfWidth - this.rightMargin, this.footerLinePositionY); //(x1,x2,y1,y2)
    }

    var footerLeftText = "\u00a9 " + new Date().getFullYear() +" - "+ this.reportData.footer.left;
    var footerRightText = data.organizationName + " - " + this.reportData.footer.right +" v" + data.version + "-" + data.date;

    this._addShortText(pdf, footerLeftText, this.leftMargin, 270, 7, 155,155,155, "normal", "left");
    this._addShortText(pdf, footerRightText, this.pdfWidth - this.rightMargin, 270, 7, 155,155,155, "normal", "right");

    if (addPageNumber == true) {
        this._addShortText(pdf, (this.pageNumber - 1).toString(), this.pdfWidth/2, 270, 10, 155,155,155, "normal", "center");
    }
    onFinishedCallback();
}

PDFCreator.prototype._addCoverPage = function (pdf, data, onFinishedCallback) { 
    this._getImageDataUri('images/report/cover.png', function (imageBase64) {
        pdf.addImage(imageBase64, 'PNG', this.leftMargin, this.topMargin, 200, 230);
        this._getImageDataUri('images/report/logo_white.png', function (imageBase64) {
            pdf.addImage(imageBase64, 'PNG', 100, 15, 101, 18);

            this._addShortText(pdf, data.organizationName, (this.pdfWidth - this.rightMargin - this.padding),
                218, 30, 255,255,255, "bold", "right");

            this._addShortText(pdf, this.reportData.cover.header, (this.pdfWidth - this.rightMargin - this.padding),
                228, 20, 255,255,255, "normal", "right");
            
            this._addShortText(pdf, this.reportData.cover.subHeader, (this.pdfWidth - this.rightMargin),
                250, 12, 110,110,110, "normal", "right");

            this._addShortText(pdf, this.reportData.cover.organization, (this.pdfWidth - this.rightMargin),
                257, 18, 110,110,110, "normal", "right");

            this._addFooter(pdf, data, false, false, function () {
                onFinishedCallback();
            });
        }.bind(this));
    }.bind(this));
}

PDFCreator.prototype._addTableOfContentsPage = function (pdf, data, onFinishedCallback) {
    this._addNewPage(pdf, data, this.reportData.tableOfContents.header, true, function () {
        // sideBar on the right
        pdf.setFillColor(213,213,213);

        var sideBar = {
            x: this.pdfWidth - this.rightMargin - this.sideBarWidth,
            y: this.topMargin + this.headerThickness + 0.1,
            h: this.footerLinePositionY - this.headerThickness - this.topMargin - 0.4
        }

        pdf.rect(sideBar.x, sideBar.y, this.sideBarWidth, sideBar.h, 'F')
                    
        var sideBarText = this.reportData.tableOfContents.sideBar.h1 + "\n\n" 
            + this.reportData.tableOfContents.sideBar.p1 + "\n\n\n" 
            + this.reportData.tableOfContents.sideBar.h2 + "\n\n" 
            + data.organizationInfo + "\n\n" 
            + data.organizationPurpose;

        var fontSize = 9;
        var param = {
            x: sideBar.x + this.padding/2,
            y: sideBar.y + this.padding,
            maxWidth: this.sideBarWidth - this.padding
        }

        this._addLongText(pdf, data, sideBarText, param.x, param.y, param.maxWidth, fontSize, 104,104,104, "normal", "left", function () {
            onFinishedCallback();
        });
    }.bind(this));
}

PDFCreator.prototype._addExecutiveSummaryPage = function (pdf, data, onFinishedCallback) {
    this._addNewPage(pdf, data, this.reportData.executiveSummary.header, true, function () {
        var addSourceSummary = function (txt, source) {
            if (source.certificationStatus == "passed") {
                txt += "\n   " + source.name +": No policy findings were discovered for this source file. Certification status: Passed";
            } else {
                txt += "\n   " + source.name +": " + source.findings.length + " findings were discovered for this source file. Certification status: Failed";
            }

            return txt;
        }.bind(this);

        var addFacilitySummary = function (txt, facility) {
            if (facility.sources.length == 0) {
                txt += "\n\n<b>" + facility.name + " facility does not contain any source files.";
            } else {
                if (facility.sources.length == 1) {
                    txt += "\n\n<b>" + facility.name + " facility contains " + facility.sources.length +" source and its certification status is as follows:\n";
                } else {
                    txt += "\n\n<b>" + facility.name + " facility contains " + facility.sources.length +" sources and their certification statuses are as follows:\n";
                }

                for (var i = 0; i < facility.sources.length; i++) {
                    var source = facility.sources[i];

                    txt = addSourceSummary(txt, source);
                }
            }

            return txt;
        }.bind(this);

        var addOrganizationSummary = function (txt, organization) {
            if (organization.facilities.length == 0) {
                txt += "\n\n" + organization.name + " organization does not contain any source files.";
            } else {
                if (organization.facilities.length == 1) {
                    txt += "\n\n" + organization.name + " organization contains " + organization.facilities.length +" facility and its sources are as follows:";
                } else {
                    txt += "\n\n" + organization.name + " organization contains " + organization.facilities.length +" facilities and their sources are as follows:";
                }

                for (var i = 0; i < organization.facilities.length; i++) {
                    var facility = organization.facilities[i];

                    txt = addFacilitySummary(txt, facility);
                }
            }

            return txt;
        }.bind(this);

        var param = {
            x: this.leftMargin,
            y: this.topMargin + this.headerThickness + this.padding,
            maxWidth: this.pdfWidth - this.leftMargin - this.rightMargin
        }

        var text = this.reportData.executiveSummary.main.h1 + "\n\n" 
            + data.organizationPurpose+ "\n\n"
            + this.reportData.executiveSummary.main.h2 + "\n\n";

        if (data.reportType == 'source') {
            text += "This document contains information on '" + data.object.name + "' and lists discovered findings for this configuration file."; 
            
            text = addSourceSummary(text, data.object);
        } else if (data.reportType == 'facility') {
            text += "This document contains information on '" + data.object.name + "' facility and lists discovered findings for this facility.";
            
            text = addFacilitySummary(text, data.object);
        } else {
            text += "This document contains information on '" + data.object.name + "' and lists discovered findings for this organization's facilities.";
        
            text = addOrganizationSummary(text, data.object);
        }

        var fontSize = 10;
        this._addLongText(pdf, data, text, param.x, param.y, param.maxWidth, fontSize, 104,104,104, "normal", "left", function () {
            onFinishedCallback();
        });
    }.bind(this));
}

PDFCreator.prototype._addAuditFindingsPage = function (pdf, data, onFinishedCallback) {
    this._addNewPage(pdf, data, this.reportData.auditFindings.header, true, function () {
        var fontSize = 10;

        var dashedLine = function() {
            var line = "     <216,216,216>";
            for (var i = 0; i < 100; i++) {
                line += "-----";
            }
            var splitText = pdf.splitTextToSize(line, this.pdfWidth - this.leftMargin - this.rightMargin, {fontSize: fontSize});
            return splitText[0];
        }.bind(this)();

        var addDashedLine = function (txt) {
            return (txt += "\n" + dashedLine);
        }.bind(this);

        var addSource = function (txt, source) {
            if (!source.findings || (source.findings && source.findings.length == 0)) {
                return txt;
            }

            txt += "\n\n<b>  SOURCE: " + source.name;

            var categorizedFindings = TOTEM.findingsHelper.categorizeFindings(source.findings);
            
            var addFindings = function (findings){
                var findingsTab = "     ";

                for (var j = 0; j < findings.length; j++) {
                    
                    var finding = findings[j];

                    for (var key in finding.data) {
                        var keyValuePair = TOTEM.findingsHelper.getFindingDetails(finding.data, key);
                        if (keyValuePair == undefined) continue;
                        
                        if (keyValuePair[0] == 'Severity') {
                            var rgbColor =  this.colors[keyValuePair[1]];
                            txt += "\n<b>" + findingsTab + rgbColor + keyValuePair[0] + ": " + keyValuePair[1];
                        } else {
                            txt += "\n" + findingsTab + keyValuePair[0] + ": " + keyValuePair[1];
                        }
                    }
                    txt = addDashedLine(txt);
                }
            }.bind(this);

            // General Policy Findings
            if (categorizedFindings.general.length > 0 ) {
                var findings = categorizedFindings.general;

                txt += "\n\n<b><i>   General Policy Findings:\n";

                addFindings(findings);
            } 

            // User specific findings
            if (Object.keys(categorizedFindings.userData).length > 0){
                txt += "\n\n<b><i>   User Specific Findings:\n";
                
                //Table here

                for (var username in categorizedFindings.users) {
                    var findings = categorizedFindings.users[username];
                    
                    txt += "\n<b><i>    Findings for User: " + username + "\n";

                    addFindings(findings);
                    // Adds User Info temporarily (Until adding a table is supported)
                    // The PDF library needs to be changed to "pdfmake" at some point for more complex reports.
                    addFindings([categorizedFindings.userData[username]]);
                }

            }
            
            return txt;
        }.bind(this);

        var addFacility = function (txt, facility) {
            txt +="\n\n<b> FACILITY: " + facility.name;

            if (facility.sources.length == 0) {
                txt += "\n\n  No findings were discovered for this facility."
            } else {

                for (var i = 0; i < facility.sources.length; i++) {
                    var source = facility.sources[i];

                    txt = addSource(txt, source);
                }
            }

            return txt;
        }.bind(this);

        var addOrganization = function (txt, organization) {
            txt +="\n<b>ORGANIZATION: " + organization.name;

            if (organization.facilities.length == 0) {
                txt += "\n\n No findings were discovered for this organization."
            } else {
                for (var i = 0; i < organization.facilities.length; i++) {
                    var facility = organization.facilities[i];

                    txt = addFacility(txt, facility);
                }
            }

            return txt;
        }.bind(this);

        var param = {
            x: this.leftMargin,
            y: this.topMargin + this.headerThickness + this.padding,
            maxWidth: this.pdfWidth - this.leftMargin - this.rightMargin
        }
        var text = "";

        if (data.reportType == 'source') {          
            text = addSource(text, data.object);
        } else if (data.reportType == 'facility') {         
            text = addFacility(text, data.object);
        } else {
            text = addOrganization(text, data.object);
        }

        this._addLongText(pdf, data, text, param.x, param.y, param.maxWidth, fontSize, 104,104,104, "normal", "left", function () {
            onFinishedCallback();
        });
    }.bind(this));
}

PDFCreator.prototype._updateTableOfContentsPage = function (pdf, data, onFinishedCallback) {
    pdf.setPage(2); //tableOfContentsPage

    var fontSize = 10;
    var yPos = this.headerThickness + this.topMargin + this.padding;
    var textPosX = this.leftMargin;
    var numberPosX = this.pdfWidth - this.sideBarWidth - this.rightMargin - this.padding;
    
    function capitalizeFirstLetter(string) {
        return string.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }
    var previousPageName = "";

    for (var number in this.pages) {
        var pageName = capitalizeFirstLetter(this.pages[number]);
    
        if (pageName != previousPageName) {
            this._addShortText(pdf, pageName, textPosX, yPos, fontSize, 104,104,104, "normal");
            this._addShortText(pdf, number, numberPosX, yPos, fontSize, 104,104,104, "normal");

            yPos += fontSize;
        }
        previousPageName = pageName;
    }

    onFinishedCallback();
}

PDFCreator.prototype._create = function (object, reportType, onFinishedCallback) {
    this.pages = {};
    this.pageNumber = 0;

    if (this.reportData == null) {
        alert("An error occured while creating the report file (Error: Corrupt Template Data).");
        return;
    }

    var pdf = new jsPDF("p","mm",[this.pdfWidth, this.pdfHeight]);
    pdf.setFont("helvetica");

    var organizationId = null;

    if (reportType == 'source') {           
        organizationId = object.organizationId;
    } else if (reportType == 'facility') {          
        organizationId = object.organizationId;
    } else {
        organizationId = object._id;
    }

    //Gets organization information
    TOTEM.model.getOrganizationInfo(organizationId, function (organization) {
        if (!organization) {
            alert("An error occured while creating the report file (Error: Unable to retrieve organization data).");
            return;
        }
        var data = {
            reportType: reportType,
            object: object, //source or facility or organization
            organizationName: organization.name.toUpperCase(),
            organizationInfo: "No information yet.",
            organizationPurpose: organization.name + " is proactively looking to obtain visibility into the current state of building monitoring, control systems and IT security vulnerabilities via Intelligent Buildings' CyberSafe offering, to potentially remediate any deficiencies discovered under a future effort and to build capabilities of internal resources for future cybersecurity risk mitigation efforts.",
            date: new Date().toISOString().split('T')[0],
            version:"1.0"
        }

        this._addCoverPage(pdf, data, function () {
            this._addTableOfContentsPage(pdf, data, function () {
                this._addExecutiveSummaryPage(pdf, data, function () {
                    this._addAuditFindingsPage(pdf, data, function () {
                        this._updateTableOfContentsPage(pdf, data, function () {
                            var sourceTimestamp = new Date(object.timestamp).toUTCString();
                            var fileName = 'Totem_Assessment_'+ object.name + '_' + sourceTimestamp + '.pdf';
                            onFinishedCallback(pdf, fileName);
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        }.bind(this));
    }.bind(this));
}

PDFCreator.prototype.save = function (object, reportType, onFinishedCallback) {
    this._create(object, reportType, function(pdf, fileName){
        pdf.save(fileName);
        onFinishedCallback(true);
    });
}

PDFCreator.prototype.sendEmail = function (object, reportType, onFinishedCallback) {
    this._create(object, reportType, function(pdf, fileName){
        var blob = pdf.output('blob');
        var formData = new FormData();
        formData.append('blob', blob, fileName);

        $.ajax({
            url: '/api/v1/email',
            type: 'POST',
            headers: { 'Authorization': 'Bearer ' + TOTEM.userToken() },
            data: formData,
            processData: false,
            contentType: false,
            async: true,
            success: function () {
                onFinishedCallback(true);
            },
            error: function () {
                onFinishedCallback(false);
            }
        });
    });
}