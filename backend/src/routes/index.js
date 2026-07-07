import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';

import authRoutes from './auth.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import publicRoutes from './public.routes.js';
import cronRoutes from './cron.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import userRoutes from './user.routes.js';
import supporterRoutes from './supporter.routes.js';
import volunteerRoutes from './volunteer.routes.js';
import engagementRoutes from './engagement.routes.js';
import materialRequestRoutes from './materialRequest.routes.js';
import conversationRoutes from './conversation.routes.js';
import internalRoutes from './internal.routes.js';
import broadcastRoutes from './broadcast.routes.js';
import reportRoutes from './report.routes.js';
import settingsRoutes from './settings.routes.js';
import uploadRoutes from './upload.routes.js';
import aiRoutes from './ai.routes.js';
import * as crud from './crud.js';

const router = Router();

// Públicas (login + webhook WhatsApp + landing page + cron protegido por secret)
router.use('/auth', authRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/public', publicRoutes);
router.use('/cron', cronRoutes);

// A partir daqui exige autenticação
router.use(authenticate);

router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/supporters', supporterRoutes);
router.use('/volunteers', volunteerRoutes);
router.use('/engagements', engagementRoutes);
router.use('/material-requests', materialRequestRoutes);
router.use('/conversations', conversationRoutes);
router.use('/internal', internalRoutes);
router.use('/broadcasts', broadcastRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/ai', aiRoutes);
router.use('/upload', uploadRoutes);

// CRUDs genéricos
router.use('/notices', crud.notices);
router.use('/media-kit', crud.mediaKit);
router.use('/tasks', crud.tasks);
router.use('/materials', crud.materials);
router.use('/banners', crud.banners);
router.use('/street-actions', crud.streetActions);
router.use('/events', crud.events);
router.use('/demands', crud.demands);
router.use('/automations', crud.automations);
router.use('/regions', crud.regions);
router.use('/cities', crud.cities);
router.use('/blacklist', crud.blacklist);
router.use('/roles', crud.roles);

export default router;
