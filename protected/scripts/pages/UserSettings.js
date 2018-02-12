class UserSettings {
	constructor() {
		this._initialize();
	}

	_initialize() {
		TOTEM.model.getUserInfo(function (user) {
			$('#settingsUsername').html(user.username);
			$('#settingsEmail').html(user.email);
			if(user.isMaster){
				$('#settingsDelete').remove();
			}
		});

		this._bindClickListeners();
	}

	_bindClickListeners() {
		function submitSettingsData(data, onFinishedCallback) {
			var dataObject = {};
			for (var i = 0; i < data.length; i++) {
				dataObject[data[i]['name']] = data[i]['value'];
			}

			if (dataObject["password"] != dataObject["confirm-password"]) {
				alert('Entered passwords do not match.');
				return;
			}
			var passwordLength = dataObject["password"].length;

			if (passwordLength == 0) {
				delete dataObject["password"];
			} else if (passwordLength < 6) {
				alert('The password must be at least 6 characters long.');
				return;
			}

			delete dataObject["confirm-password"];

			$.ajax({
				url: '/api/v1/users/' + TOTEM.userId() + '/password', 
				type: 'POST',
				data: JSON.stringify(dataObject),
				headers: { 'Authorization': 'Bearer ' + TOTEM.userToken() },
				dataType: "json",
				contentType: "application/json",
				async: true,
				success: function (data) {
					$("#settingsForm")[0].reset();

					TOTEM.model.getUserInfo(function () {
						alert('Profile settings updated!');
					});
					onFinishedCallback();
				},
				error: function (err) {
					if (err && err.responseJSON && err.responseJSON.error) {
						alert(err.responseJSON.error);
					}
				}
			});
		}

		$("#settingsForm").submit(function (e) {
			var elementId = "#settingsForm";

			e.preventDefault();

			var data = $(elementId + " :input").serializeArray();
			submitSettingsData(data, function () { });
		});

		$('#settingsDelete').click(function () {
			var result = confirm("Are you sure you want to Delete this User?");
			if (result) {
				TOTEM.model.deleteUser(TOTEM.userId(), function () {
					TOTEM.logout();
				}.bind(this));
			} else {
				return;
			}
		});
	}
}