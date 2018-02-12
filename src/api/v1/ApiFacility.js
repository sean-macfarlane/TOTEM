module.exports = function (app, databaseLayer, webSocketMessenger) {
    app.get('/api/v1/orgs/:org_id/facilities/:facility_id', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id]) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }

        databaseLayer.facility.getFacility(req.params.org_id, req.params.facility_id, function (getFacilityResult) {
            if (getFacilityResult.error) {
                res.status(getFacilityResult.error.httpCode()).json({});
            } else {
                res.status(200).json(getFacilityResult.data);
            }
        });
    });

    app.post('/api/v1/orgs/:org_id/facilities', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id].edit) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }

        databaseLayer.facility.createFacility(req.params.org_id, req.body.name, function (createfacilityResult) {
            if (createfacilityResult.error) {
                res.status(createfacilityResult.error.httpCode()).json({});
            } else {
                res.status(200).json(createfacilityResult.data);
            }
        });
    });

    app.post('/api/v1/orgs/:org_id/facilities/:facility_id', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id].edit) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }

        databaseLayer.facility.updateFacility(req.params.org_id, req.params.facility_id, req.body, function (updatefacilityResult) {
            if (updatefacilityResult.error) {
                res.status(updatefacilityResult.error.httpCode()).json({});
            } else {
                webSocketMessenger.sendMessage('organizationChanged', { organizationId: req.params.org_id });
                res.status(200).json(updatefacilityResult.data);
            }
        });
    });

    app.delete('/api/v1/orgs/:org_id/facilities/:facility_id', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id].edit) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }

        databaseLayer.facility.deleteFacility(req.params.org_id, req.params.facility_id, function (deletefacilityResult) {
            if (deletefacilityResult.error) {
                res.status(deletefacilityResult.error.httpCode()).json({});
            } else {
                webSocketMessenger.sendMessage('organizationChanged', { organizationId: req.params.org_id });
                res.status(200).json(deletefacilityResult.data);
            }
        });
    });

    app.get('/api/v1/orgs/:org_id/facilities/:facility_id/statistics', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id]) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }

        databaseLayer.dashboard.getFacilityStatistics(req.params.facility_id, function (getFacilityStatisticsResult) {
            if (getFacilityStatisticsResult.error) {
                res.status(getFacilityStatisticsResult.error.httpCode()).json({});
            } else {
                res.status(200).json(getFacilityStatisticsResult.data);
            }
        });
    });
}