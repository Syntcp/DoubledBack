import { Router } from 'express';
import health from './health.route.js';
import auth from './auth.routes.js';
import clients from './clients.routes.js';
import projects from './projects.routes.js';

const v1 = Router();
v1.use(health);
v1.use(auth);
v1.use(clients);
v1.use(projects);

export default v1;
