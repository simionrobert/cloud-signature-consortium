
module.exports = {
    deleteFile: function (file) {
        require('fs').unlink(`${file}`, (err) => {
            if (err) require('winston').error("Error on deleting the hash file generated");
        });
    }
}