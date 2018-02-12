function LogsDatabaseModule (databaseLayer, db) {
    this.databaseLayer = databaseLayer;
    this._db = db;
}

LogsDatabaseModule.prototype.saveLogToDatabase = function (logData) {
	var log = {
   		log: logData
    };

    this._db.collection('Logs').insert(log, { w: 1 });
}
module.exports = LogsDatabaseModule;