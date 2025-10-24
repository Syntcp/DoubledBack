"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
const node_crypto_1 = require("node:crypto");
function sha256(input) {
    return (0, node_crypto_1.createHash)('sha256').update(input).digest('hex');
}
