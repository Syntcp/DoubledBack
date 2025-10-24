"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.refresh = refresh;
exports.logoutController = logoutController;
const auth_schema_js_1 = require("../schemas/auth.schema.js");
const auth_services_js_1 = require("../services/auth.services.js");
async function register(req, res) {
    const input = auth_schema_js_1.registerSchema.parse(req.body);
    const result = await (0, auth_services_js_1.registerUser)(input);
    res.status(201).json(result);
}
async function login(req, res) {
    const input = auth_schema_js_1.loginSchema.parse(req.body);
    const result = await (0, auth_services_js_1.loginUser)(input);
    res.json(result);
}
async function refresh(req, res) {
    const input = auth_schema_js_1.refreshSchema.parse(req.body);
    const result = await (0, auth_services_js_1.refreshTokens)(input.refreshToken);
    res.json(result);
}
async function logoutController(req, res) {
    const input = auth_schema_js_1.refreshSchema.parse(req.body);
    await (0, auth_services_js_1.logout)(input.refreshToken);
    res.status(204).send();
}
