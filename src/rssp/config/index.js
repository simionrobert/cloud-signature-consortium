var info = require('./info');
var config = require('./config');

module.exports = {
    getInfoConfig: function (lang) {
        switch (lang) {
            case "RO":
                return info.infos[0];
            case "EN":
                return info.infos[1];
            default:
                return info.infos[1];
        }
    },
    getDBConnectionString: function () {
        return config.db;
    }
}