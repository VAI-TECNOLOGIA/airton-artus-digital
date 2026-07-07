import { Router } from 'express';
import * as report from '../controllers/report.controller.js';

const r = Router();

r.get('/summary', report.summary);
r.get('/growth', report.growth);

export default r;
