const mongo = require('mongodb');

function DatabaseLayer() {
    const databaseUrl = 'mongodb://localhost:27017/TOTEM';

    this._db = null;

    mongo.MongoClient.connect(databaseUrl, function (err, db) {
        if (err) {
            console.log('Unable to connect to database: ', err);
            return;
        }

        this._db = db;

        console.log("Connected to database: ", databaseUrl);

        this._initializeDatabaseModules();
    }.bind(this));
}

DatabaseLayer.prototype._initializeDatabaseModules = function () {
    this.organization = new (requireFromRoot('src/database/OrganizationDatabaseModule.js'))(this, this._db);
    this.facility = new (requireFromRoot('src/database/FacilityDatabaseModule.js'))(this, this._db);
    this.sources = new (requireFromRoot('src/database/SourcesDatabaseModule.js'))(this, this._db);
    this.devices = new (requireFromRoot('src/database/DevicesDatabaseModule.js'))(this, this._db);
    this.users = new (requireFromRoot('src/database/UsersDatabaseModule.js'))(this, this._db);
    this.dashboard = new (requireFromRoot('src/database/DashboardDatabaseModule.js'))(this, this._db);
    this.logs = new (requireFromRoot('src/database/LogsDatabaseModule.js'))(this, this._db);
}

module.exports = DatabaseLayer;