
module.exports = {
    deleteFile: function (file) {
        if (file !== '' && file !== undefined && file !== null) {
            require('fs').unlink(`${file}`, (err) => {
                if (err) require('winston').error("Error on deleting the hash file generated");
            });
        }
    },
    hash: function (value) {
        return require('crypto').createHash('sha256').update(value).digest('hex');
    }
}