const nodemailer = require('nodemailer');
const totemConfiguration = requireFromRoot('totem_configuration.json');

function Email() {
	this._transporter = nodemailer.createTransport({
		host: totemConfiguration.email.host,
    	port: totemConfiguration.email.port,
    	secure: totemConfiguration.email.secure,
    	auth: {
			user: totemConfiguration.email.username,
			pass: totemConfiguration.email.password
		}
	});
}

Email.prototype.sendActivationEmail = function (username, email, activationKey, isMaster, onFinishedCallback) {
	if (isMaster == true) {
		onFinishedCallback({data : {}});
		return;
	}

	var mailOptions = {
		from: "Intelligent Buildings <" + totemConfiguration.email.username + ">",
		to: email,
		subject: 'Intelligent Buildings - User Activation',
		html:'<html><body><p>Hello '+ username +',</p><p>Thank you for registering! We need to verify your email to complete your registration. Please use the following key to activate your account:</p><br><p style="padding:10px;background:blue;color:white;text-align:center;border-radius:5px;width:80%;margin:auto">'+ activationKey +'</p></body></html>'
	};

	this._transporter.sendMail(mailOptions, function(error, info){
		if (error) {
			onFinishedCallback({ error: new totemError.ErrorGeneric('Unable to send activation email', { error: error }) });
	        return;
		} else {
			onFinishedCallback({data : {}});
			return;
		}
	});
}

Email.prototype.sendPasswordResetEmail = function (username, email, newPassword, onFinishedCallback) {
	var mailOptions = {
		from: "Intelligent Buildings <" + totemConfiguration.email.username + ">",
		to: email,
		subject: 'Intelligent Buildings - Account Password Reset',
		html: '<html><body><p>Hello '+ username +',</p><p>You recently requested to reset your password. Here is your new password:</p><br/><p style="padding:10px;background:blue;color:white;text-align:center;border-radius:5px;width:80%;margin:auto;">'+ newPassword +'</p></body></html>'
	};

	this._transporter.sendMail(mailOptions, function(error, info){
		if (error) {
			onFinishedCallback({ error: new totemError.ErrorGeneric('Unable to send email', { error: error }) });
	        return;
		} else {
			onFinishedCallback({data : {}});
			return;
		}
	});
}

Email.prototype.sendAssessmentEmail = function (username, email, pathToFile, onFinishedCallback) {
	var mailOptions = {
		from: "Intelligent Buildings <" + totemConfiguration.email.username + ">",
		to: email,
		subject: 'Intelligent Buildings - Assessment Report',
		attachments: [{   
        	path: pathToFile
    	}],
		html: '<html><body><p>Hello '+ username +',</p><p>The requested assessment report is attached:</p></body></html>'
	};

	this._transporter.sendMail(mailOptions, function(error, info){
		if (error) {
			onFinishedCallback({ error: new totemError.ErrorGeneric('Unable to send email', { error: error }) });
	        return;
		} else {
			onFinishedCallback({data : {}});
			return;
		}
	});
}

module.exports = Email;