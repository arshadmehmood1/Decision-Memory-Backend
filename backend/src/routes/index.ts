import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import decisionsRouter from './decisions.js';
import workspacesRouter from './workspaces.js';
import aiRouter from './ai.js';
import insightsRouter from './insights.js';
import usersRouter from './users.js';

import billingRouter from './billing.js';
import notificationsRouter from './notifications.js';
import publicRouter from './public.js';
import adminRouter from './admin.js';
import featuresRouter, { adminFeaturesRouter } from './features.js';
import { publicUpdatesRouter, adminUpdatesRouter } from './updates.js';



export const routes = Router();

// Public routes (no auth required)
routes.use('/public', publicRouter);
routes.use(featuresRouter);
routes.use('/updates', publicUpdatesRouter);


// All other routes require authentication
routes.use(authMiddleware);

// Mount route modules
routes.use('/decisions', decisionsRouter);
routes.use('/workspaces', workspacesRouter);
routes.use('/ai', aiRouter);
routes.use('/insights', insightsRouter);
routes.use('/users', usersRouter);
routes.use('/billing', billingRouter);
routes.use('/notifications', notificationsRouter);
routes.use('/admin', adminRouter);
// Mount admin features under /admin path
routes.use('/admin', adminFeaturesRouter);
// Mount admin updates under /admin path
routes.use('/admin/updates', adminUpdatesRouter);


