import { Router } from 'express';
import health from './health.route.js';
import auth from './auth.routes.js';

const v1 = Router();
v1.use(health);
v1.use(auth);

export default v1;
