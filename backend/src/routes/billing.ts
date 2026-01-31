import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { PLANS, PlanType, FeatureType } from '../config/plans.js';
import { badRequest } from '../middleware/errorHandler.js';
import { config } from '../config/env.js';
import { mailService } from '../lib/mail.js';
import { createNotification } from './notifications.js';

const router = Router();

// Mock Stripe for dev until keys provided
const STRIPE_LINKS = {
    FREE: '',
    PRO: 'https://buy.stripe.com/mock_pro_link',
    TEAM: 'https://buy.stripe.com/mock_team_link'
};

/**
 * POST /api/billing/checkout - Create checkout session
 */
router.post('/checkout', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { plan } = req.body; // PRO, TEAM

        if (!plan || !['PRO', 'TEAM'].includes(plan)) {
            throw badRequest('Invalid plan selected');
        }

        // ...

        if (process.env.NODE_ENV === 'development') {
            await prisma.workspace.update({
                where: { id: req.workspaceId },
                data: { planTier: plan }
            });

            // Trigger notification & email
            const user = await prisma.user.findUnique({ where: { id: req.userId } });
            if (user) {
                await createNotification(user.id, {
                    type: 'SUCCESS',
                    title: 'Workspace Upgraded!',
                    message: `Welcome to the ${plan} plan. Your premium features are now active.`,
                    link: '/settings/billing'
                });
                await mailService.sendSubscriptionSuccessEmail(user.email, plan);
            }

            res.json({
                success: true,
                url: `${config.frontendUrl}/dashboard?upgraded=true`
            });
            return;
        }

        // Production placeholder
        res.json({
            success: true,
            url: STRIPE_LINKS[plan as keyof typeof STRIPE_LINKS]
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/billing/portal - Manage subscription
 */
router.post('/portal', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // In real impl: create portal session
        // const session = await stripe.billingPortal.sessions.create(...)

        res.json({
            success: true,
            url: 'https://billing.stripe.com/p/login/mock'
        });
    } catch (error) {
        next(error);
    }
});

export default router;
