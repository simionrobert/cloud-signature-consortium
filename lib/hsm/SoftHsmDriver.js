'use strict';
const graphene = require("graphene-pk11");
const Module = graphene.Module;


class SoftHSMDriver {
    constructor(path) {
        this.path = path;
    }

    sign(hash, pin) {
        const mod = Module.load(this.path, "SoftHSM");
        mod.initialize();

        const slot = mod.getSlots(0);
        if (slot.flags & graphene.SlotFlag.TOKEN_PRESENT) {
            const session = slot.open();
            session.login(pin);

            // generate RSA key pair
            const keys = session.generateKeyPair(graphene.KeyGenMechanism.RSA, {
                keyType: graphene.KeyType.RSA,
                modulusBits: 1024,
                publicExponent: Buffer.from([3]),
                token: false,
                verify: true,
                encrypt: true,
                wrap: true
            }, {
                keyType: graphene.KeyType.RSA,
                token: false,
                sign: true,
                decrypt: true,
                unwrap: true
            });

            // sign content
            const sign = session.createSign("SHA1_RSA_PKCS", keys.privateKey);
            sign.update(hash);
            const signature = sign.final();
            console.log("Signature RSA-SHA1:", signature.toString("hex")); // Signature RSA-SHA1: 6102a66dc0d97fadb5...

            // verify content
            const verify = session.createVerify("SHA1_RSA_PKCS", keys.publicKey);
            verify.update(hash);
            const verify_result = verify.final(signature);
            console.log("Signature RSA-SHA1 verify:", verify_result);      // Signature RSA-SHA1 verify: true

            session.logout();
            session.close();
        }
        else {
            console.error("Slot is not initialized");
        }

        mod.finalize();
    }
}

module.exports = SoftHSMDriver;