"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listForClient = listForClient;
exports.createForClient = createForClient;
exports.getOne = getOne;
exports.updateOne = updateOne;
exports.remove = remove;
const project_schema_js_1 = require("../schemas/project.schema.js");
const project_services_js_1 = require("../services/project.services.js");
async function listForClient(req, res) {
    const { clientId } = project_schema_js_1.clientIdParamSchema.parse(req.params);
    const { includeMeta } = project_schema_js_1.listProjectsQuerySchema.parse(req.query);
    const out = await (0, project_services_js_1.listProjectsByClient)(req.user.id, clientId, { includeMeta });
    res.json(out);
}
async function createForClient(req, res) {
    const { clientId } = project_schema_js_1.clientIdParamSchema.parse(req.params);
    const input = project_schema_js_1.createProjectSchema.parse(req.body);
    const out = await (0, project_services_js_1.createProject)(req.user.id, clientId, input);
    res.status(201).json(out);
}
async function getOne(req, res) {
    const { id } = project_schema_js_1.projectIdParamSchema.parse(req.params);
    const { includeMeta } = project_schema_js_1.listProjectsQuerySchema.parse(req.query);
    const out = await (0, project_services_js_1.getProject)(req.user.id, id, { includeMeta });
    res.json(out);
}
async function updateOne(req, res) {
    const { id } = project_schema_js_1.projectIdParamSchema.parse(req.params);
    const input = project_schema_js_1.updateProjectSchema.parse(req.body);
    const out = await (0, project_services_js_1.updateProject)(req.user.id, id, input);
    res.json(out);
}
async function remove(req, res) {
    const { id } = project_schema_js_1.projectIdParamSchema.parse(req.params);
    await (0, project_services_js_1.deleteProject)(req.user.id, id);
    res.status(204).send();
}
