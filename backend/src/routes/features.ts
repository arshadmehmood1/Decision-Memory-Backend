import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

// Public router for feature flag checks (no auth required)
export const publicFeaturesRouter = Router();

// GET /feature/:key
// Publicly accessible to check feature status
publicFeaturesRouter.get('/feature/:key', async (req, res, next) => {
    try {
        const { key } = req.params as { key: string };
        const feature = await prisma.featureFlag.findUnique({
            where: { featureKey: key }
        });

        // If feature doesn't exist, default to false (hidden)
        if (!feature) {
            return res.json({ enabled: false });
        }

        res.json({ enabled: feature.isEnabled });
    } catch (error) {
        next(error);
    }
});

// Admin router for feature flag management (mounted under /admin)
export const adminFeaturesRouter = Router();

// GET /feature (will be mounted at /admin/feature)
// Admin only - list all feature flags
adminFeaturesRouter.get('/feature', async (req, res, next) => {
    try {
        const features = await prisma.featureFlag.findMany({
            orderBy: { featureKey: 'asc' }
        });
        res.json({ success: true, data: features });
    } catch (error) {
        next(error);
    }
});

// PUT /feature/:key (will be mounted at /admin/feature/:key)
// Admin only - auth is handled by admin router middleware
adminFeaturesRouter.put('/feature/:key', async (req, res, next) => {
    try {
        const { key } = req.params as { key: string };

        const schema = z.object({
            enabled: z.boolean()
        });

        const { enabled } = schema.parse(req.body);

        const feature = await prisma.featureFlag.upsert({
            where: { featureKey: key },
            update: { isEnabled: enabled },
            create: { featureKey: key, isEnabled: enabled }
        });

        res.json({ success: true, feature });
    } catch (error) {
        next(error);
    }
});

// Default export for backwards compatibility
export default publicFeaturesRouter;
