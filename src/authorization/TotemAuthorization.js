module.exports = function (app, databaseLayer) {
    app.use('/api/v1', function (req, res, next) {
        databaseLayer.users.findUserPermissions(res.locals.userId, function (permissions) {
            res.locals.userPermissions = permissions;
            next();
        });
    });
};