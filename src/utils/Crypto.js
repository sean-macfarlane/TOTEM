const crypto = require('crypto');
const totemConfiguration = requireFromRoot('totem_configuration.json');

function Crypto() {
    this._cryptoAlgorithm = 'AES-256-CTR',
    this._cryptoPassword = totemConfiguration.cryptoSecret;
}

Crypto.prototype.encrypt = function (text) {
    var iv = crypto.randomBytes(16);
    var cipher = crypto.createCipheriv(this._cryptoAlgorithm, this._cryptoPassword, iv);
    var encrypted = cipher.update(text);
    var finalBuffer = Buffer.concat([encrypted, cipher.final()]);
    var crypted = iv.toString('hex') + ':' + finalBuffer.toString('hex')
    return crypted;
}

Crypto.prototype.decrypt = function (text) {
    if (text == null || text.indexOf(':') == -1) {
        return null;
    }

    var encryptedArray = text.split(':');
    var iv = new Buffer(encryptedArray[0], 'hex');
    var encrypted = new Buffer(encryptedArray[1], 'hex');
    var decipher = crypto.createDecipheriv(this._cryptoAlgorithm, this._cryptoPassword, iv);
    var decrypted = decipher.update(encrypted);
    var clearText = Buffer.concat([decrypted, decipher.final()]).toString();
    return clearText;
}

module.exports = Crypto;