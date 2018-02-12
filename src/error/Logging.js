const winston = require('winston');
winston.configure({
	transports: [
		new (winston.transports.File)({ filename: 'totem_error.log' })
	]
});

module.exports = function () {
    return {
        log: function (error) {
			winston.log('error', error.message(),  error.toLogObject() );
        }
    }
};