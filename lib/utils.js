
module.exports = {
    deleteFile: function (file) {
        require('fs').unlink(`${file}`, (err) => {
            if (err) require('winston').error("Error on deleting the hash file generated");
        });
    },
    getAlgorithmByOID(oid) {
        switch (oid) {
            case "1.2.840.113549.1.1.5":
                return 'sha1RSA';
            case '1.2.840.113549.1.1.4':
                return 'md5RSA';
            case '1.2.840.10040.4.3':
                return 'sha1DSA';
            case '1.3.14.3.2.29':
                return 'sha1RSA';
            case '1.3.14.3.2.15':
                return 'shaRSA';
            case '1.3.14.3.2.3':
                return 'md5RSA';
            case '1.2.840.113549.1.1.2':
                return 'md2RSA';
            case '1.2.840.113549.1.1.3':
                return 'md4RSA';
            case '1.3.14.3.2.2':
                return 'md4RSA';
            case '1.3.14.3.2.4':
                return 'md4RSA';
            case '1.3.14.7.2.3.1':
                return 'md2RSA';
            case '1.3.14.3.2.13':
                return 'sha1DSA';
            case '1.3.14.3.2.27':
                return 'dsaSHA1';
            case '2.16.840.1.101.2.1.1.19':
                return 'mosaicUpdatedSig';
            case '1.3.14.3.2.26':
                return 'SHA1';
            case '1.2.840.113549.2.5':
                return 'md5NoSign';
            case '2.16.840.1.101.3.4.2.1':
                return 'SHA256';
            case '2.16.840.1.101.3.4.2.2':
                return 'SHA384';
            case '2.16.840.1.101.3.4.2.3':
                return 'SHA512';
            case '1.2.840.113549.1.1.11':
                return 'sha256RSA';
            case '1.2.840.113549.1.1.12':
                return 'sha384RSA';
            case '1.2.840.113549.1.1.13':
                return 'sha512RSA';
            case '1.2.840.113549.1.1.10':
                return 'RSASSA-PSS';
            case '1.2.840.10045.4.1':
                return 'sha1ECDSA';
            case '1.2.840.10045.4.3.2':
                return 'sha256ECDSA';
            case '1.2.840.10045.4.3.3':
                return 'sha384ECDSA';
            case '1.2.840.10045.4.3.4':
                return 'sha512ECDSA';
            case '1.2.840.10045.4.3':
                return 'specifiedECDSA';
            default:
                return '';
        }
    }
}