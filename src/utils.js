
module.exports = {
    deleteFile: function (file) {
        if (file !== '' && file !== undefined && file !== null) {
            require('fs').unlink(`${file}`, (err) => {
                if (err) require('winston').error("Error on deleting the hash file generated");
            });
        }
    }
}