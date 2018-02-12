const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const app = express();

global.rootDirectory = __dirname;
global.requireFromRoot = function (dir) {
    return require(global.rootDirectory + '/' + dir);
}
global.uploadFolder = global.rootDirectory + '/tmp';

app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));

const databaseLayer = new (requireFromRoot('src/database/DatabaseLayer.js'))();
const logger = new (requireFromRoot('src/error/Logging.js'))();

global.totemError = requireFromRoot('src/error/ErrorTypes.js')(function (err) { logger.log(err); });

const totemAuthentication = requireFromRoot('src/authentication/TotemAuthentication.js')(app, databaseLayer);
const totemAuthorization = requireFromRoot('src/authorization/TotemAuthorization.js')(app, databaseLayer);

var server = app.listen(8080, function () {});

global.webSocketMessenger = new (requireFromRoot('src/web_socket_events/WebSocketMessenger.js'))(server);

const api = requireFromRoot('src/api/v1/ApiMain.js')(app, databaseLayer, webSocketMessenger);
