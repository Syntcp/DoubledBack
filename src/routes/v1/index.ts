import { Router } from 'express';
import health from './health.route.js';
import auth from './auth.routes.js';
import clients from './clients.routes.js';
import projects from './projects.routes.js';
import invoices from './invoices.routes.js';
import profile from './profile.routes.js';

const v1 = Router();
v1.use(health);
v1.use(auth);
v1.use(clients);
v1.use(projects);
v1.use(invoices);
v1.use(profile);

export default v1;
