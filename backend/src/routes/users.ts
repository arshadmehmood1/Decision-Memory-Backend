import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { UpdateUserSchema } from '../lib/validation.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/users/me - Get current user profile
 */
router.get('/me', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        planTier: true,
                    },
                },
                _count: {
                    select: {
                        decisions: true,
                        reviews: true,
                        comments: true,
                    },
                },
            },
        });

        if (!user) {
            throw notFound('User not found');
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                profilePicture: user.profilePicture,
                timezone: user.timezone,
                role: user.role,
                workspace: user.workspace,
                stats: user._count,
                hasOnboarded: user.hasOnboarded,
                emailDigest: user.emailDigest,
                reviewReminders: user.reviewReminders,
                marketingEmails: user.marketingEmails,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/users/me - Update current user profile
 */
router.patch('/me', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { hasOnboarded, ...otherData } = req.body;

        const parsed = UpdateUserSchema.safeParse(otherData);
        if (!parsed.success && Object.keys(otherData).length > 0) {
            throw badRequest(parsed.error.errors.map(e => e.message).join(', '));
        }

        const updateData: any = { ...parsed.data };
        if (typeof hasOnboarded === 'boolean') {
            updateData.hasOnboarded = hasOnboarded;
        }

        const updated = await prisma.user.update({
            where: { id: req.userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                profilePicture: true,
                timezone: true,
                role: true,
                hasOnboarded: true,
                emailDigest: true,
                reviewReminders: true,
                marketingEmails: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
});

export default router;
