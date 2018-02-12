module.exports = function (app, databaseLayer, webSocketMessenger) {
    return {
        organizations: requireFromRoot('src/api/v1/ApiOrganization.js')(app, databaseLayer, webSocketMessenger),
        facilities: requireFromRoot('src/api/v1/ApiFacility.js')(app, databaseLayer, webSocketMessenger),
        sources: requireFromRoot('src/api/v1/ApiSources.js')(app, databaseLayer, webSocketMessenger),
        users: requireFromRoot('src/api/v1/ApiUsers.js')(app, databaseLayer, webSocketMessenger),
        fileImport: requireFromRoot('src/api/v1/ApiFileImport.js')(app, databaseLayer, webSocketMessenger),
        dashboard: requireFromRoot('src/api/v1/ApiDashboard.js')(app, databaseLayer, webSocketMessenger)
    };
}