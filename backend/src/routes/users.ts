import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { UpdateUserSchema } from '../lib/validation.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';

const router = Router();

function calculateStreak(dates: Date[]) {
    if (dates.length === 0) return { current: 0, longest: 0, activity: Array(7).fill(false) };

    const sorted = dates.map(d => d.toISOString().split('T')[0]).sort().reverse();
    const uniqueDays = Array.from(new Set(sorted));

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let current = 0;

    // Check if streak is active (today or yesterday has an entry)
    if (uniqueDays.includes(today)) {
        current = 1;
        // Count backwards
        let checkDate = new Date(Date.now() - 86400000);
        while (true) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (uniqueDays.includes(dateStr)) {
                current++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    } else if (uniqueDays.includes(yesterday)) {
        current = 1;
        // Count backwards from yesterday
        let checkDate = new Date(Date.now() - 86400000 * 2);
        while (true) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (uniqueDays.includes(dateStr)) {
                current++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    // Last 7 days activity (Mon-Sun or just last 7 days? Spec says "Mon Tue..." imply fixed week or rolling window. Rolling window relative to today is best)
    const activity = Array(7).fill(false);
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i)); // 6 days ago -> today
        const dateStr = d.toISOString().split('T')[0];
        if (uniqueDays.includes(dateStr)) {
            activity[i] = true;
        }
    }

    return { current, longest: current, activity };
}

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

        // Calculate streak
        const decisions = await prisma.decision.findMany({
            where: { madeById: req.userId },
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' }
        });

        const streakData = calculateStreak(decisions.map(d => d.createdAt));

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
                streak: streakData,
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
                emailNotifications: true,
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
