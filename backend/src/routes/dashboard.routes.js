import { Router } from 'express';
import * as dash from '../controllers/dashboard.controller.js';

const r = Router();

r.get('/stats', dash.getStats);
r.get('/charts', dash.getCharts);
r.get('/rankings', dash.getRankings);
r.get('/map', dash.getMap);

export default r;
