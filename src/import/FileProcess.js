module.exports = function (databaseLayer) {
    return {
        process: function (userId, organizationId, facilityId, pathToFile, sourceName, fileType, timestamp, onCompleteCallback) {
            const fs = require('fs');
            const parseXml = require('xml2js').parseString;
            const totemImportMetasys = requireFromRoot('src/import/metasys/ImportMetasys.js')(databaseLayer);
            const totemImportTridium = requireFromRoot('src/import/tridium/ImportTridium.js')(databaseLayer);
            const totemImportPcap = requireFromRoot('src/import/pcap/ImportPcap.js')(databaseLayer);

            var importFunction = null;
            var fileContents = null;

            if (fileType == 'pcap') {
                totemImportPcap.runImport(pathToFile, function (pcapResult) {
                    if (pcapResult == null) {
                        onCompleteCallback({ error: new totemError.ErrorGeneric('Invalid file type', { sourceName: sourceName, pathToFile: pathToFile }) });
                        return;
                    }

                    databaseLayer.sources.saveSource(userId, organizationId, facilityId, sourceName, fileType, timestamp, function (result) {
                        var source = result.data;
                        var sourceId = result.data._id;
                        var devices = pcapResult.devices;
                        var connections = pcapResult.connections;

                        databaseLayer.devices.saveDevices(sourceId, devices, function (saveDevicesResult) {
                            if (!saveDevicesResult.error) {
                                source.devices = devices;
                                onCompleteCallback({ data: source });
                                return;
                            } else {
                                onCompleteCallback(saveDevicesResult);
                                return;
                            }
                        })
                    });
                });
            } else if (fileType == 'config') {
                fs.readFile(pathToFile, 'utf8', function (err, contents) {
                    parseXml(contents, function (err, parsedContents) {
                        if (err != null || parsedContents == null) {
                            onCompleteCallback({ error: new totemError.ErrorGeneric('Invalid file type', { sourceName: sourceName, pathToFile: pathToFile }) });
                            return;
                        }

                        fileContents = parsedContents;

                        // Detects config file type before processing it
                        if (parsedContents["SecurityDS"] != undefined) {
                            sourceType = 'metasys';
                        } else if (parsedContents["bajaObjectGraph"] != undefined) {
                            sourceType = 'tridium';
                        } else {
                            sourceType = '';
                        }

                        if (sourceType === null) {
                            onCompleteCallback({ error: new totemError.ErrorInvalidRequest('Invalid file type', { sourceName: sourceName, sourceType: sourceType }) });
                            return;
                        }
                        
                        switch (sourceType) {
                            case 'metasys':
                                importFunction = totemImportMetasys.runImport;
                                break;
                            case 'tridium':
                                importFunction = totemImportTridium.runImport;
                                break;
                            default:
                                break;
                        }

                        if (importFunction == null) {
                            onCompleteCallback({ error: new totemError.ErrorInvalidRequest('Invalid file type', { sourceName: sourceName, sourceType: sourceType }) });
                            return;
                        }

                        databaseLayer.sources.saveSource(userId, organizationId, facilityId, sourceName, sourceType, timestamp, function (result) {
                            var sourceId = result.data._id;

                            importFunction(fileContents, sourceId, function (info, findings) {
                                databaseLayer.sources.updateConfigSourceCertificationStatus(sourceId, info, function (result) {
                                    var source = result.data;
                                    source.findings = findings;

                                    if (findings.length > 0) {
                                        databaseLayer.sources.saveConfigFindings(findings, function (saveResult) {
                                            if (!saveResult.error) {
                                                onCompleteCallback({ data: source });
                                                return;
                                            } else {
                                                onCompleteCallback(saveResult);
                                                return;
                                            }
                                        });
                                    } else {
                                        if (!result.error) {
                                            onCompleteCallback({ data: source });
                                            return;
                                        } else {
                                            onCompleteCallback(result);
                                            return;
                                        }
                                    }
                                });
                            });
                        });
                    });
                });
            }
        }
    };
};