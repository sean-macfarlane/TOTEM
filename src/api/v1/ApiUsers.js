module.exports = function (app, databaseLayer, webSocketMessenger) {
    app.get('/api/v1/users', function (req, res) {
        if (!res.locals.userPermissions.admin) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({ error: err.message() });
            return;
        }

        databaseLayer.users.getUsers(function (getUsersResult) {
            if (getUsersResult.error) {
                res.status(getUsersResult.error.httpCode()).json({ error: getUsersResult.error.message() });
            } else {
                res.status(200).json(getUsersResult.data);
            }
        });
    });

    app.get('/api/v1/users/:user_id', function (req, res) {
        databaseLayer.users.findUserById(req.params.user_id, function (findUserByIdResult) {
            if (findUserByIdResult.error) {
                res.status(findUserByIdResult.error.httpCode()).json({ error: findUserByIdResult.error.message() });
            } else {
                res.status(200).json(findUserByIdResult.data);
            }
        });
    });

    app.post('/api/v1/users', function (req, res) {
        if (!res.locals.userPermissions.admin) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({ error: err.message() });
            return;
        }

        databaseLayer.users.registerUser(req.body, function (registerUserResult) {
            if (registerUserResult.error) {
                res.status(registerUserResult.error.httpCode()).json({ error: registerUserResult.error.message() });
            } else {
                res.status(200).json(registerUserResult.data);
            }
        });
    });

    app.post('/api/v1/users/:user_id', function (req, res) {
        if (req.params.user_id != res.locals.userId) {
            if (!res.locals.userPermissions.admin) {
                var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
                res.status(err.httpCode()).json({ error: err.message() });
                return;
            }
        }

        databaseLayer.users.updateUser(req.params.user_id, req.body, function (updateUserResult) {
            if (updateUserResult.error) {
                res.status(updateUserResult.error.httpCode()).json({ error: updateUserResult.error.message() });
            } else {
                webSocketMessenger.sendMessage('userUpdated', { userId: req.params.user_id }, req.params.user_id);
                res.status(200).json(updateUserResult.data);
            }
        });
    });

    app.post('/api/v1/users/:user_id/password', function (req, res) {
        if (req.params.user_id != res.locals.userId) {
            var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
            res.status(err.httpCode()).json({ error: err.message() });
            return;
        }

        databaseLayer.users.updateUserPassword(req.params.user_id, req.body, function (updateUserResult) {
            if (updateUserResult.error) {
                res.status(updateUserResult.error.httpCode()).json({ error: updateUserResult.error.message() });
            } else {
                res.status(200).json(updateUserResult.data);
            }
        });
    });

    app.delete('/api/v1/users/:user_id', function (req, res) {
        if (req.params.user_id != res.locals.userId) {
            if (!res.locals.userPermissions.admin) {
                var err = new totemError.ErrorInvalidPermissions('Not authorized', { url: req.url, userId: res.locals.userId });
                res.status(err.httpCode()).json({ error: err.message() });
                return;
            }
        }

        databaseLayer.users.deleteUser(req.params.user_id, function (deleteUserResult) {
            if (deleteUserResult.error) {
                res.status(deleteUserResult.error.httpCode()).json({ error: deleteUserResult.error.message() });
            } else {
                webSocketMessenger.sendMessage('userUpdated', { userId: req.params.user_id }, req.params.user_id);
                res.status(200).json(deleteUserResult.data);
            }
        });
    });
};