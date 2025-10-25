"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMine = getMine;
exports.upsertMine = upsertMine;
const profile_schema_js_1 = require("../schemas/profile.schema.js");
const profile_services_js_1 = require("../services/profile.services.js");
async function getMine(req, res) {
    const p = await (0, profile_services_js_1.getOwnerProfile)(req.user.id);
    res.json(p ?? null);
}
async function upsertMine(req, res) {
    const input = profile_schema_js_1.upsertProfileSchema.parse(req.body);
    const out = await (0, profile_services_js_1.upsertOwnerProfile)(req.user.id, input);
    res.json(out);
}
