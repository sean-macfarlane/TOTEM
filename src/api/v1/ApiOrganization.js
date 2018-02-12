module.exports = function (app, databaseLayer, webSocketMessenger) {
    app.get('/api/v1/orgs', function (req, res) {
        databaseLayer.organization.getOrganizations(res.locals.userPermissions, function (getOrganizationsResult) {
            if (getOrganizationsResult.error) {
                res.status(getOrganizationsResult.error.httpCode()).json({});
            } else {
                res.status(200).json(getOrganizationsResult.data);
            }
        });
    });

    /*Retrieves general information about an organization*/
    app.get('/api/v1/orgs/:org_id/info', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id]) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }

        databaseLayer.organization.findOrganization(req.params.org_id, function (findOrganizationResult) {
            if (findOrganizationResult.error) {
                res.status(findOrganizationResult.error.httpCode()).json({});
            } else {
                res.status(200).json(findOrganizationResult.data);
            }
        });
    });

    /*Gets an organization data including facilities, sources and findings*/
    app.get('/api/v1/orgs/:org_id', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id]) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }

        databaseLayer.organization.getOrganization(req.params.org_id, function (getOrganizationResult) {
            if (getOrganizationResult.error) {
                res.status(getOrganizationResult.error.httpCode()).json({});
            } else {
                res.status(200).json(getOrganizationResult.data);
            }
        });
    });

    app.post('/api/v1/orgs', function (req, res) {
        if (!res.locals.userPermissions.admin) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }

        databaseLayer.organization.createOrganization(res.locals.userId, req.body, function (createOrganizationResult) {
            if (createOrganizationResult.error) {
                res.status(createOrganizationResult.error.httpCode()).json({});
            } else {
                res.status(200).json(createOrganizationResult.data);
            }
        });
    });

    app.post('/api/v1/orgs/:org_id', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id].edit) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }

        databaseLayer.organization.updateOrganization(req.params.org_id, req.body, function (updateOrganizationResult) {
            if (updateOrganizationResult.error) {
                res.status(updateOrganizationResult.error.httpCode()).json({});
            } else {
                webSocketMessenger.sendMessage('organizationChanged', { organizationId: req.params.org_id });
                res.status(200).json({});
            }
        });
    });

    app.delete('/api/v1/orgs/:org_id', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id].edit) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }

        databaseLayer.organization.deleteOrganization(res.locals.userId, req.params.org_id, function (deleteOrganizationResult) {
            if (deleteOrganizationResult.error || !deleteOrganizationResult.data) {
                res.status(404).json({ error: deleteOrganizationResult.error });
            } else {
                webSocketMessenger.sendMessage('organizationChanged', { organizationId: req.params.org_id });
                res.status(200).json(deleteOrganizationResult.data);
            }
        });
    });

    app.get('/api/v1/orgs/:org_id/statistics', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id]) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }

        databaseLayer.dashboard.getOrganizationStatistics(req.params.org_id, function (getOrganizationStatisticsResult) {
            if (getOrganizationStatisticsResult.error) {
                res.status(getOrganizationStatisticsResult.error.httpCode()).json({});
            } else {
                res.status(200).json(getOrganizationStatisticsResult.data);
            }
        });
    });
}