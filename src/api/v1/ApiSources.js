module.exports = function (app, databaseLayer, webSocketMessenger) {
    app.get('/api/v1/orgs/:org_id/facilities/:facility_id/sources/:source_id', function (req, res) {
        if (!res.locals.userPermissions.admin &&  !res.locals.userPermissions.organizations[req.params.org_id]) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }
        
        databaseLayer.sources.findSource(req.params.source_id, function (findSourceResult) {
            if (findSourceResult.error) {
                res.status(findSourceResult.error.httpCode()).json({error: findSourceResult.error.message()});
            } else {
                res.status(200).json(findSourceResult.data);
            }
        });
    });

    app.post('/api/v1/orgs/:org_id/facilities/:facility_id/sources/:source_id', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id].edit) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }
        
        databaseLayer.sources.updateSource(req.params.source_id, req.body, function (updateSourceResult) {
            if (updateSourceResult.error) {
                res.status(updateSourceResult.error.httpCode()).json({error: updateSourceResult.error.message()});
            } else {
                webSocketMessenger.sendMessage('organizationChanged', { organizationId: req.params.org_id });
                res.status(200).json(updateSourceResult.data);
            }
        });
    });

    app.delete('/api/v1/orgs/:org_id/facilities/:facility_id/sources/:source_id', function (req, res) {
        if (!res.locals.userPermissions.admin && !res.locals.userPermissions.organizations[req.params.org_id].edit) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }
        
        databaseLayer.sources.deleteSource(req.params.source_id, function (deleteSourceResult) {
            if (deleteSourceResult.error) {
                res.status(deleteSourceResult.error.httpCode()).json({error: deleteSourceResult.error.message()});
            } else {
                webSocketMessenger.sendMessage('organizationChanged', { organizationId: req.params.org_id });
                res.status(200).json(deleteSourceResult.data);
            }
        });
    });
};