var configValues = require('./info');

module.exports = {
    getInfoConfig: function (lang) {
        switch (lang) {
            case "RO":
                return configValues.infos[0];
            case "EN":
                return configValues.infos[1];
            default:
                return configValues.infos[1];
        }
    },
    getDBConnectionString:function(){
        return `mongodb://localhost/users`;
    }
}