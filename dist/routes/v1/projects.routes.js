"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const project_controller_js_1 = require("../../controllers/project.controller.js");
const r = (0, express_1.Router)();
r.use(auth_js_1.requireAuth);
// nested under clients
r.get('/clients/:clientId/projects', project_controller_js_1.listForClient);
r.get('/projects', project_controller_js_1.listAllProjects);
r.post('/clients/:clientId/projects', project_controller_js_1.createForClient);
// direct project routes
r.get('/projects/:id', project_controller_js_1.getOne);
r.patch('/projects/:id', project_controller_js_1.updateOne);
r.delete('/projects/:id', project_controller_js_1.remove);
exports.default = r;
