module.exports = function (app, databaseLayer, webSocketMessenger) {
    app.get('/api/v1/dashboard/statistics', function (req, res) {
        databaseLayer.dashboard.getDashboardStatistics(res.locals.userPermissions, function (getDashboardStatisticsResult) {
            if (getDashboardStatisticsResult.error) {
                res.status(getDashboardStatisticsResult.error.httpCode()).json({});
            } else {
                res.status(200).json(getDashboardStatisticsResult.data);
            }
        });
    });
}