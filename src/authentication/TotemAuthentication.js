const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const atob = require('atob');
const totemConfiguration = requireFromRoot('totem_configuration.json');

const HASH_SECRET = totemConfiguration.passwordHashSecret;
const SESSION_LENGTH_MILLISECONDS = 1000 * 60 * 60 * 24; //Length of time for which tokens and cookies are valid

module.exports = function (app, databaseLayer) {
    //Make public directory contents available to all, this contains the login page content
    app.use('/', express.static(global.rootDirectory + '/public'));

    //Public login page
    app.get('/', function (req, res) {
        res.sendFile(global.rootDirectory + '/public/Login.html');
    });

    //Token based authentication performed before any API access is granted
    app.use('/api/v1', function (req, res, next) {
        if ((req.headers.authorization) && (req.headers.authorization.substring(0, 7) === 'Bearer ')) {
            var token = req.headers.authorization.substring(7);
            var split = token.split('|');

            if (split.length === 3) {
                var userId = split[0];
                var timestamp = split[1];
                var hashProvided = split[2];

                if (parseFloat(timestamp) + SESSION_LENGTH_MILLISECONDS > Date.now()) {
                    var hashComputed = crypto.createHmac('sha256', HASH_SECRET).update(userId + '|' + timestamp).digest('hex');

                    if (hashProvided === hashComputed) {
                        res.locals.userId = userId;
                        next();
                    } else {
                        res.redirect(401, '/');
                    }
                } else {
                    res.redirect(401, '/');
                }
            } else {
                res.redirect(401, '/');
            }
        } else {
            res.redirect(401, '/');
        }
    });

    app.get('/version', function (req, res) {
        var data = {
            name: totemConfiguration.name,
            version: totemConfiguration.version,
            company: totemConfiguration.company,
            year: new Date().getFullYear()
        };

        res.status(200).json(data);
    });
    
    //Public endpoint to perform username/password authentication
    //Sets a cookie to authorize access to web content past the login page
    //Returns a token to the user to be used for api requests
    app.post('/login', function (req, res) {
        if ((req.headers.authorization) && (req.headers.authorization.substring(0, 6) === 'Basic ')) {
            var decoded = atob(req.headers.authorization.substring(6));
            var split = decoded.split(':');

            if (split.length === 2) {
                var username = split[0];
                var password = split[1];

                databaseLayer.users.findUserByUsername(username, function (findUserResult) {
                    if (!findUserResult.error && findUserResult.data) {
                        var user = findUserResult.data;
                        
                        bcrypt.compare(password, user.password, function (err, isMatch) {
                            if (isMatch === true) {
                                var timestamp = Date.now();

                                var viewProtectedContentCookie = timestamp + '|' + crypto.createHmac('sha256', HASH_SECRET).update(timestamp.toString()).digest('hex');
                                res.cookie('totemViewProtectedContent', viewProtectedContentCookie, { maxAge: SESSION_LENGTH_MILLISECONDS, httpOnly: true });

                                if (user.activated == false) {
                                    var err = new totemError.ErrorInvalidRequest('Inactive account', { username: username });
                                    res.status(err.httpCode()).json({error: err.message()});
                                    return; 
                                }

                                res.status(200).json({
                                    token: user._id + '|' + timestamp + '|' + crypto.createHmac('sha256', HASH_SECRET).update(user._id + '|' + timestamp).digest('hex')
                                });
                            } else {
                                var err = new totemError.ErrorNotAuthenticated('Invalid username or password', { username: username });
                                res.status(err.httpCode()).json({error: err.message()});
                                return;
                            }
                        })
                    } else {
                        var err = new totemError.ErrorNotAuthenticated('Invalid username or password', { username: username });
                        res.status(err.httpCode()).json({error: err.message()});
                        return;
                    }
                });
            } else {
                var err = new totemError.ErrorNotAuthenticated('Invalid authentication details provided', { username: username });
                res.status(err.httpCode()).json({error: err.message()});
                return;
            }
        } else {
            var err = new totemError.ErrorNotAuthenticated('Invalid authentication details provided', { username: username });
            res.status(err.httpCode()).json({error: err.message()});
            return;
        }
    });

    //Registration endpoint
    app.post('/register', function (req, res) {
        databaseLayer.users.registerUser(req.body, function (registerUserResult) {
            if (registerUserResult.error) {
                res.status(registerUserResult.error.httpCode()).json({error: registerUserResult.error.message()});
            } else {
                res.status(200).json(registerUserResult.data);
            }
        });
    });

    //Activates an account
    app.post('/activate', function (req, res) {
        databaseLayer.users.activateUser(req.body.username, req.body.activationKey, function (activateUserResult) {
            if (activateUserResult.error) {
                res.status(activateUserResult.error.httpCode()).json({error: activateUserResult.error.message()});
            } else {
                res.status(200).json(activateUserResult.data);
            }
        });
    });

    //Resets a user password
    app.post('/reset', function (req, res) {
        databaseLayer.users.resetUserPassword(req.body.username, req.body.email, function (resetUserPasswordResult) {
            if (resetUserPasswordResult.error) {
                res.status(resetUserPasswordResult.error.httpCode()).json({error: resetUserPasswordResult.error.message()});
            } else {
                res.status(200).json(resetUserPasswordResult.data);
            }
        });
    });

    //Creates and sends an old cookie to let the user log out.
    app.get('/logout', function (req, res) {
        var timestamp = Date.now()-1;

        var viewProtectedContentCookie = timestamp + '|' + crypto.createHmac('sha256', HASH_SECRET).update(timestamp.toString()).digest('hex');
        res.cookie('totemViewProtectedContent', viewProtectedContentCookie, { maxAge: 0, httpOnly: true });

        res.status(200).json({});
    });

    //Checks if the session token is still valid (used to navigate to the main page from the login page)
    app.get('/session', function (req, res) {
        if ((req.headers.authorization) && (req.headers.authorization.substring(0, 7) === 'Bearer ')) {
            var token = req.headers.authorization.substring(7);
            var split = token.split('|');

            if (split.length === 3) {
                var userId = split[0];
                var timestamp = split[1];
                var hashProvided = split[2];
                if (parseFloat(timestamp) + SESSION_LENGTH_MILLISECONDS > Date.now()) {

                    var hashComputed = crypto.createHmac('sha256', HASH_SECRET).update(userId + '|' + timestamp).digest('hex');

                    if (hashProvided === hashComputed) {
                        res.status(200).json({status: true});
                    } else {
                        res.status(200).json({status: false});
                    }
                } else {
                    res.status(200).json({status: false});
                }
            } else {
                res.status(200).json({status: false});
            }
        } else {
            res.status(200).json({status: false});
        }
    });

    //Cookie checked to see if user is authorized to view web content past the login page
    app.use('/', function (req, res, next) {
        var viewProtectedContentCookie = req.cookies.totemViewProtectedContent;

        if (viewProtectedContentCookie) {
            var split = viewProtectedContentCookie.split('|');

            if (split.length === 2) {
                var timestamp = split[0];
                var hashProvided = split[1];

                if (parseFloat(timestamp) + SESSION_LENGTH_MILLISECONDS > Date.now()) {
                    var hashComputed = crypto.createHmac('sha256', HASH_SECRET).update(split[0]).digest('hex');

                    if (hashProvided === hashComputed) {
                        next();
                    } else {
                        res.redirect('/');
                    }
                } else {
                    res.redirect('/');
                }
            } else {
                res.redirect('/');
            }
        } else {
            res.redirect('/');
        }
    });

    app.use('/main', express.static(global.rootDirectory + '/protected'));

    app.get('/main', function (req, res) {
        res.sendFile(global.rootDirectory + '/protected/Index.html');
    });
};