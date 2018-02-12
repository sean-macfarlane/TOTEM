function Login() { }

Login.prototype.initialize = function () {
    this._bindEventListeners();
    this._checkSessionStatus();
    this._getVersionInformation();
    this._user = null;
}

Login.prototype._bindEventListeners = function () {
    $('#login-form-link').click(function (e) {
        $("#login-form").fadeIn(300);
        $("#register-form").hide();
        $('#register-form-link').removeClass('active');
        $('#login-form-link').addClass('active');
        e.preventDefault();
    });
    $('#register-form-link').click(function (e) {
        $("#register-form").fadeIn(300);
        $("#login-form").hide();
        $('#login-form-link').removeClass('active');
        $('#register-form-link').addClass('active');
        e.preventDefault();
    });

    $('#forgotPassword').click(function (e) {
        $('#loginContainer').hide();
        $('#activateContainer').hide();
        $('#resetPasswordContainer').show();
        e.preventDefault();
    });

    $('#forgot-password-back-button').click(function (e) {
        $('#loginContainer').show();
        $('#activateContainer').hide();
        $('#resetPasswordContainer').hide();
        e.preventDefault();
    });

    $("#register-form").submit(function (e) {
        var elementId = "#register-form";

        $(elementId).addClass('processing');
        $(elementId).closest('.panel-body').addClass('spinner');
        e.preventDefault();

        var data = $(elementId + " :input").serializeArray();
        this._submitRegistrationData(data, function () {
            $(elementId).removeClass('processing');
            $(elementId).closest('.panel-body').removeClass('spinner');
        });
    }.bind(this));

    $("#login-form").submit(function (e) {
        var elementId = "#login-form";

        $(elementId).addClass('processing');
        $(elementId).closest('.panel-body').addClass('spinner');
        e.preventDefault();

        var data = $(elementId + " :input").serializeArray();
        this._submitLoginData(data, function () {
            $(elementId).removeClass('processing');
            $(elementId).closest('.panel-body').removeClass('spinner');
        });
    }.bind(this));

    $("#activation-form").submit(function (e) {
        var elementId = "#activation-form";

        $(elementId).addClass('processing');
        $(elementId).closest('.panel-body').addClass('spinner');
        e.preventDefault();

        var data = $(elementId + " :input").serializeArray();
        this._activateUser(data, function () {
            $(elementId).removeClass('processing');
            $(elementId).closest('.panel-body').removeClass('spinner');
        });
    }.bind(this));

    $("#reset-password-form").submit(function (e) {
        var elementId = "#reset-password-form";

        $(elementId).addClass('processing');
        $(elementId).closest('.panel-body').addClass('spinner');
        e.preventDefault();

        var data = $(elementId + " :input").serializeArray();
        this._resetPassword(data, function () {
            $(elementId).removeClass('processing');
            $(elementId).closest('.panel-body').removeClass('spinner');
        });
    }.bind(this));
}

Login.prototype._checkSessionStatus = function () {
    var userToken = window.localStorage.getItem('totemUserToken');
    if (!userToken) {
        return;
    }

    $.ajax({
        url: '/session',
        type: 'GET',
        dataType: "json",
        contentType: 'application/json; charset=utf-8',
        headers: { 'Authorization': 'Bearer ' + userToken },
        async: true,
        success: function (data) {
            if (data && data.status == true) {
                window.location.href = '/main';
            }
        }
    });
}

Login.prototype._getVersionInformation = function () {
    $.ajax({
        url: '/version',
        type: 'GET',
        dataType: "json",
        contentType: 'application/json; charset=utf-8',
        async: true,
        success: function (data) {
            $('#copyright').html(
                data.name + ' v' + data.version +
                ' - &copy; ' + data.year + ' ' +
                data.company + ' - All Rights Reserved');
        }
    });
}

Login.prototype._submitRegistrationData = function (data, onFinishedCallback) {
    var dataObject = {};
    for (var i = 0; i < data.length; i++) {
        dataObject[data[i]['name']] = data[i]['value'];
    }

    if (dataObject["password"] != dataObject["confirm-password"]) {
        alert('Entered passwords do not match.');
        onFinishedCallback();
        return;
    }
    if (dataObject["password"].length < 6) {
        alert('Please select a password longer than 6 characters.');
        onFinishedCallback();
        return;
    }
    if (dataObject["organization"] == "") {
        dataObject["organization"] = "N/A";
    }

    delete dataObject["confirm-password"];

    $.ajax({
        url: '/register',
        type: 'POST',
        data: JSON.stringify(dataObject),
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function (data) {
            this._user = data;
            this._user.password = dataObject["password"];
            $('#loginContainer').hide();
            $('#activateContainer').show();
        }.bind(this),
        error: function (err) {
            if (err && err.responseJSON && err.responseJSON.error) {
                alert(err.responseJSON.error);
            }
        },
        complete: function () {
            onFinishedCallback();
        }
    });
}

Login.prototype._submitLoginData = function (data, onFinishedCallback) {
    $('#loginErrorContainer').html('');

    var dataObject = {};
    for (var i = 0; i < data.length; i++) {
        dataObject[data[i]['name']] = data[i]['value'];
    }

    this._login(dataObject.username, dataObject.password, onFinishedCallback);
}

Login.prototype._login = function (username, password, onFinishedCallback) {
    var encoded = window.btoa(username + ':' + password);

    $.ajax({
        url: '/login',
        type: 'POST',
        dataType: "json",
        contentType: 'application/json; charset=utf-8',
        headers: { 'Authorization': 'Basic ' + encoded },
        async: true,
        success: function (data) {
            if (data.token) {
                $("#login-username").addClass('loginSuccess');
                $("#login-password").addClass('loginSuccess');

                var userAuthToken = data.token;
                window.localStorage.setItem('totemUserToken', userAuthToken);

                var split = userAuthToken.split('|');

                if (split.length === 3) {
                    var userId = split[0];
                    window.localStorage.setItem('totemUserId', userId);
                }
                window.location.href = '/main';
            } else {
                $('#loginErrorContainer').html('Login Failed');
            }
        },
        error: function (err) {
            if (err && err.responseJSON && err.responseJSON.error) {
                // Forward to activation if the account is still inactive
                if (err.responseJSON.error == 'Inactive account') {
                    $('#loginContainer').hide();
                    $('#activateContainer').show();
                    this._user = {};
                    this._user.username = username;
                    this._user.password = password;
                    return;
                }

                $('#loginErrorContainer').html(err.responseJSON.error);
            } else {
                $('#loginErrorContainer').html('Login Failed');
            }
            $("#login-username").addClass('loginError');
            $("#login-password").addClass('loginError');

            setTimeout(function () {
                $("#login-username").removeClass('loginError');
                $("#login-password").removeClass('loginError');
            }, 2000);
        }.bind(this),
        complete: function () {
            onFinishedCallback();
        }
    });
}

Login.prototype._activateUser = function (data, onFinishedCallback) {
    $('#activationErrorContainer').html('');

    var dataObject = {};
    for (var i = 0; i < data.length; i++) {
        dataObject[data[i]['name']] = data[i]['value'];
    }
    var activationKey = dataObject["activation-key"];

    $.ajax({
        url: '/activate',
        type: 'POST',
        data: JSON.stringify({ username: this._user.username, activationKey: activationKey }),
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function () {
            $("#activation-key").addClass('loginSuccess');

            this._login(this._user.username, this._user.password, onFinishedCallback);
        }.bind(this),
        error: function (err) {
            if (err && err.responseJSON && err.responseJSON.error) {
                $('#activationErrorContainer').html(err.responseJSON.error);
            } else {
                $('#activationErrorContainer').html('Activation Failed');
            }

            $("#activation-key").addClass('loginError');
            setTimeout(function () {
                $("#activation-key").removeClass('loginError');
            }, 2000);

            onFinishedCallback();
        }
    });
}

Login.prototype._resetPassword = function (data, onFinishedCallback) {
    $('#passwordResetErrorContainer').html('');

    var dataObject = {};
    for (var i = 0; i < data.length; i++) {
        dataObject[data[i]['name']] = data[i]['value'];
    }
    var username = dataObject["username"];
    var email = dataObject["email"];

    $.ajax({
        url: '/reset',
        type: 'POST',
        data: JSON.stringify({ username: username, email: email }),
        dataType: "json",
        contentType: "application/json",
        async: true,
        success: function () {
            $("#reset-password-username").val('');
            $("#reset-password-email").val('');

            $('#loginContainer').show();
            $('#activateContainer').hide();
            $('#resetPasswordContainer').hide();
            alert('A new password has been sent to your e-mail address');
        },
        error: function (err) {
            if (err && err.responseJSON && err.responseJSON.error) {
                $('#passwordResetErrorContainer').html(err.responseJSON.error);
            } else {
                $('#passwordResetErrorContainer').html('Unable to reset password');
            }

            $("#reset-password-username").addClass('loginError');
            setTimeout(function () {
                $("#reset-password-username").removeClass('loginError');
            }, 2000);

            $("#reset-password-email").addClass('loginError');
            setTimeout(function () {
                $("#reset-password-email").removeClass('loginError');
            }, 2000);
        },
        complete: function () {
            onFinishedCallback();
        }
    });
}