const mongo = require('mongodb');
const bcrypt = require('bcrypt');
const objectIdFromString = requireFromRoot('src/database/ObjectIdFromString.js');
const passwordHashSaltRounds = 10;
const crypto = require("crypto");
const cryptoUtils = new (requireFromRoot('src/utils/Crypto.js'));
const emailer = new (requireFromRoot('src/utils/Email.js'))();
const totemConfiguration = requireFromRoot('totem_configuration.json');

function UsersDatabaseModule(databaseLayer, db) {
	this.databaseLayer = databaseLayer;
	this._db = db;

	var masterUser = {
		username: totemConfiguration.admin.username,
		email: totemConfiguration.admin.email,
		organizations: {},
		isAdmin: true,
		isMaster: true,
		password: totemConfiguration.admin.password
	};
	this.registerUser(masterUser, function () {});
}

UsersDatabaseModule.prototype.registerUser = function (userData, onFinishedCallback) {
	var dataCollection = this._db.collection('Users');

	function createUserActivationKey() {
		return crypto.randomBytes(10).toString('hex');
	}

	this._checkUsernameAndEmailExistence(userData.username, userData.email, function (existence) {
		if (existence == true) {
			// Prevents error log to be created if the master user already exists.
			if (userData.isMaster) {
				onFinishedCallback();
				return;
			}
			onFinishedCallback({ error: new totemError.ErrorInvalidRequest('User already exists', { username: userData.username }) });
			return;
		}
		bcrypt.hash(userData.password, passwordHashSaltRounds, function (err, hashedPassword) {
			if (!err && hashedPassword) {

				var activationKey = createUserActivationKey();
				var activationStatus = false;

				if (!userData.isAdmin) {
					userData.isAdmin = false;
				}

				if (!userData.isMaster) {
					userData.isMaster = false;
				} else {
					activationStatus = true;
				}

				if (!userData.organizations) {
					userData.organizations = {};
				}

				var newUser = {
					_id: new mongo.ObjectID(),
					username: userData.username,
					email: userData.email,
					organizations: userData.organizations,
					isAdmin: userData.isAdmin,
					isMaster: userData.isMaster,
					password: hashedPassword,
					activated: activationStatus,
					activationKey: cryptoUtils.encrypt(activationKey)
				};

				emailer.sendActivationEmail(userData.username, userData.email, activationKey, userData.isMaster, function (sendEmailResult) {
					if (sendEmailResult.error) {
						onFinishedCallback(sendEmailResult);
						return;
					}
					dataCollection.insert(newUser, { w: 1 }, function (err, insertUserResult) {
						if (!err && insertUserResult.result.n > 0) {
							onFinishedCallback({ data: newUser });
							return;
						} else {
							onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to create user', { username: userData.username }) });
							return;
						}
					});
				}.bind(this));
			} else {
				onFinishedCallback({ error: new totemError.ErrorGeneric('Problem hashing password', { username: userData.username }) });
				return;
			}
		});
	});
}

UsersDatabaseModule.prototype._checkUsernameAndEmailExistence = function (username, email, onFinishedCallback) {
	var dataCollection = this._db.collection('Users');
	dataCollection.findOne({ $or: [{ username: new RegExp('^' + username + '$', "i") }, { email: email }] }, function (err, user) {
		if (user == null) {
			onFinishedCallback(false);
			return;
		} else {
			onFinishedCallback(true);
			return;
		}
	});
}

UsersDatabaseModule.prototype.findUserByUsername = function (username, onFinishedCallback) {
	var dataCollection = this._db.collection('Users');
	dataCollection.findOne({ username: new RegExp('^' + username + '$', "i") }, function (err, user) {
		if (user == null) {
			onFinishedCallback({ error: new totemError.ErrorGeneric('Unable to find user', { username: username }) });
			return;
		} else {
			onFinishedCallback({ data: user });
			return;
		}
	});
}

UsersDatabaseModule.prototype.findUserById = function (userId, onFinishedCallback) {
	var dataCollection = this._db.collection('Users');
	dataCollection.findOne({ _id: objectIdFromString(userId) }, function (err, user) {
		if (user == null) {
			onFinishedCallback({ error: new totemError.ErrorGeneric('Unable to find user', { userId: userId }) });
			return;
		} else {
			onFinishedCallback({ data: user });
			return;
		}
	});
}

UsersDatabaseModule.prototype.activateUser = function (username, activationKey, onFinishedCallback) {
	var dataCollection = this._db.collection('Users');

	this.findUserByUsername(username, function (findUserByUsernameResult) {
		if (findUserByUsernameResult.error) {
			onFinishedCallback(findUserByUsernameResult);
			return;
		}
		var user = findUserByUsernameResult.data;

		if (user.activated == true) {
			onFinishedCallback({ error: new totemError.ErrorInvalidRequest('User is already activated', { username: username }) });
			return;
		}

		if (cryptoUtils.decrypt(user.activationKey) === activationKey) {
			dataCollection.update({ _id: objectIdFromString(user._id) },
				{ $set: { activated: true }, $unset: { activationKey: "" } }, { w: 1 }, function (err, result) {
					if (!err) {
						onFinishedCallback({ data: {} });
					} else {
						onFinishedCallback({ error: new totemError.ErrorInvalidRequest('User could not be activated', { username: username }) });
						return;
					}
				});
		} else {
			onFinishedCallback({ error: new totemError.ErrorInvalidRequest('Invalid Activation Key', { username: username }) });
			return;
		}
	});
}

UsersDatabaseModule.prototype.resetUserPassword = function (username, email, onFinishedCallback) {
	var dataCollection = this._db.collection('Users');

	this.findUserByUsername(username, function (findUserByUsernameResult) {
		if (findUserByUsernameResult.error) {
			onFinishedCallback(findUserByUsernameResult);
			return;
		}
		var user = findUserByUsernameResult.data;

		if (user.email != email) {
			onFinishedCallback({ error: new totemError.ErrorInvalidRequest('Provided e-mail does not match with the user records', { username: username, emailProvided: email }) });
			return;
		}

		var newPassword = crypto.randomBytes(10).toString('hex');

		bcrypt.hash(newPassword, passwordHashSaltRounds, function (err, hashedPassword) {
			if (!err && hashedPassword) {
				dataCollection.update({ _id: objectIdFromString(user._id) },
					{ $set: { password: hashedPassword } }, { w: 1 }, function (err, result) {
						if (!err) {
							emailer.sendPasswordResetEmail(username, email, newPassword, function (sendEmailResult) {
								if (sendEmailResult.error) {
									onFinishedCallback(sendEmailResult);
									return;
								}
								onFinishedCallback({ data: {} });
							})
						} else {
							onFinishedCallback({ error: new totemError.ErrorGeneric('Error occured while creating a new password', { username: username }) });
							return;
						}
					});
			} else {
				onFinishedCallback({ error: new totemError.ErrorGeneric('Error occured while creating a new password', { username: username }) });
				return;
			}
		});
	});
}

UsersDatabaseModule.prototype.updateUser = function (userId, fieldsToUpdate, onFinishedCallback) {
	var dataCollection = this._db.collection('Users');

	dataCollection.updateOne({ _id: objectIdFromString(userId) }, { $set: fieldsToUpdate }, { w: 1 }, function (err, result) {
		if (!err && result.result.n > 0) {
			this.findUserById(userId, onFinishedCallback);
			return;
		} else {
			onFinishedCallback({ error: new totemError.ErrorResourceNotFound('User settings could not be updated.', { userId: userId }) });
			return;
		}
	}.bind(this));
}

UsersDatabaseModule.prototype.updateUserPassword = function (userId, fieldsToUpdate, onFinishedCallback) {
	var dataCollection = this._db.collection('Users');

	this.findUserById(userId, function (findUserByIdResult) {
		if (findUserByIdResult.error) {
			onFinishedCallback({ error: findUserByIdResult.error });
		} else {
			var user = findUserByIdResult.data;

			// Checks if the current password matches with the records first
			bcrypt.compare(fieldsToUpdate["current-password"], user.password, function (err, isMatch) {
				delete fieldsToUpdate["current-password"];

				if (isMatch === true) {
					if (fieldsToUpdate.password != undefined) {
						bcrypt.hash(fieldsToUpdate.password, passwordHashSaltRounds, function (err, hashedPassword) {
							if (!err && hashedPassword) {
								dataCollection.updateOne({ _id: user._id }, { $set: { password: hashedPassword } }, { w: 1 }, function (err, updateUserResult) {
									if (!err && updateUserResult.result.n > 0) {
										onFinishedCallback({ data: true });
										return;
									} else {
										onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Failed to update user', { userId: userId }) });
										return;
									}
								}.bind(this));
							} else {
								onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Password could not be updated.', { userId: userId }) });
								return;
							}
						}.bind(this));
					}
				} else {
					onFinishedCallback({ error: new totemError.ErrorResourceNotFound('Current password does not match with the user records.', { userId: userId }) });
					return;
				}
			}.bind(this));
		}
	}.bind(this));
}

UsersDatabaseModule.prototype.deleteUser = function (userId, onFinishedCallback) {
	var databaseLayer = this.databaseLayer;
	var usersCollection = this._db.collection('Users');

	usersCollection.deleteOne({ _id: objectIdFromString(userId) }, function (err, result) {
		if (result.deletedCount !== 0) {
			onFinishedCallback({ data: {} });
		} else {
			onFinishedCallback({ error: new totemError.ErrorGeneric('Failed to delete user.', { userId: userId }) });
			return;
		}
	}.bind(this));
}

UsersDatabaseModule.prototype.getUsers = function (onFinishedCallback) {
	this._db.collection('Users').find({}).toArray(function (err, users) {
		if (users == null) {
			onFinishedCallback({ error: new totemError.ErrorGeneric('Unable to find users', {}) });
			return;
		} else {
			onFinishedCallback({ data: users });
			return;
		}
	}.bind(this));
}

UsersDatabaseModule.prototype.findUserPermissions = function (userId, onFinishedCallback) {
	var dataCollection = this._db.collection('Users');
	dataCollection.findOne({ _id: objectIdFromString(userId) }, function (err, user) {
		var permissions = {
			organizations: {},
			admin: false,
			master: false
		};

		if (user == null) {
			onFinishedCallback(permissions);
			return;
		} else {
			if (user.isAdmin === true) {
				permissions.admin = true;
			}
			if (user.isMaster === true) {
				permissions.master = true;
			}
			if (user.organizations) {
				permissions.organizations = user.organizations;
			}

			onFinishedCallback(permissions);
			return;
		}
	});
};

module.exports = UsersDatabaseModule;