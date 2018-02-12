//Represents the main application
var TOTEM = (function () {
    var totem = {};

    var userToken = window.localStorage.getItem('totemUserToken');
    var userId = window.localStorage.getItem('totemUserId');

    totem.userToken = function () { return userToken; }
    totem.userId = function () { return userId; }

    var pushEventSubscriber = new PushEventSubscriber(totem.userToken());

    totem.model = null;

    totem.severityColors = {
        "Critical": '#793d7f', // purple
        "Very High": '#e40505', // red 
        "High": '#b52e05', // blood-orange
        "Medium": '#dc8121', //orange
        "Low": '#efdf05', // yellow
        "Info": '#12a51c' //green
    };

    totem.severityLevels = {
        "Critical": 100,
        "Very High": 80,
        "High": 60,
        "Medium": 40,
        "Low": 20,
        "Info": 0
    };

    totem.logout = function () {
        $.ajax({
            url: '/logout',
            type: 'GET',
            headers: { 'Authorization': 'Bearer ' + totem.userToken() },
            dataType: "json",
            contentType: "application/json",
            async: true,
            success: function () {
                window.localStorage.removeItem('totemUserToken');
                window.localStorage.removeItem('totemUserId');
                window.location.href = '/';
            }
        });
    }

    totem.initialize = function () {
        function resize() {
            $('#topLevelContainer').outerHeight(window.innerHeight);
            $('#mainContentContainer').outerHeight($('#topLevelContainer').height());

            var borderContainerWidth = window.innerWidth - ($('#headerContainerOuter').outerWidth() - $('#headerContainerOuter').width());
            var borderContainerHeight = window.innerHeight - ($('#headerContainerOuter').outerHeight() - $('#headerContainerOuter').height());

            $('#treeContainer').outerHeight($('#leftContainerReports').height() - $('#createOrgButton').height());

            $('#usersTreeContainer').outerHeight($('#leftContainerUsers').height() - $('#createUserButton').height());

            $(TOTEM).trigger('applicationResized');
        }

        resize();

        $(window).resize(resize);

        totem.model = new DataModel(totem.userToken(), totem.userId());
        totem.dashboard = new Dashboard();
        totem.reports = new Reports();
        totem.settings = new UserSettings();

        totem.model.getUserInfo(function (user) {
            if (user.isAdmin) {
                $('#createOrgButton').show();
                $('#adminPageButton').show();
                totem.admin = new AdminPage();
            } else {
                $('#createOrgButton').hide();
                $('#adminPageButton').hide();
            }
        });

        totem.pdfCreator = new PDFCreator();
        totem.pageSwitcher = new PageSwitcher();
        new FileUpload();

        totem.realTimeUpdater = new RealTimeUpdater();
        totem.findingsHelper = new FindingsHelper();

        $('#logout').tooltip();
        $('#logout').click(function () {
            totem.logout();
        });
    }

    return totem;
})();

