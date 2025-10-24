"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signJwt = signJwt;
exports.verifyJwt = verifyJwt;
const jose_1 = require("jose");
const enc = new TextEncoder();
async function signJwt(payload, secret, expiresIn) {
    const now = Math.floor(Date.now() / 1000);
    return await new jose_1.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now)
        .setExpirationTime(expiresIn)
        .sign(enc.encode(secret));
}
async function verifyJwt(token, secret) {
    const { payload } = await (0, jose_1.jwtVerify)(token, enc.encode(secret));
    return payload;
}
