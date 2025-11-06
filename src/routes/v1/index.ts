import { Router } from 'express';
import health from './health.route.js';
import auth from './auth.routes.js';
import events from './events.routes.js';
import clients from './clients.routes.js';
import projects from './projects.routes.js';
import invoices from './invoices.routes.js';
import profile from './profile.routes.js';
import expenses from './expenses.routes.js';
import accounting from './accounting.routes.js';
import logs from './logs.routes.js';

const v1 = Router();
v1.use(health);
v1.use(auth);
v1.use(events);
v1.use(clients);
v1.use(projects);
v1.use(invoices);
v1.use(profile);
v1.use(expenses);
v1.use(accounting);
v1.use(logs);

export default v1;
