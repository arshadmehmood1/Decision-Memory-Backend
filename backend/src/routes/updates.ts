import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';
import { z } from 'zod';

// Helper to safely extract string from params/query
const getString = (val: string | string[] | undefined): string | undefined => {
    return typeof val === 'string' ? val : Array.isArray(val) ? val[0] : undefined;
};

// ============================================
// PUBLIC UPDATES ROUTER
// ============================================
export const publicUpdatesRouter = Router();

/**
 * GET /api/updates - Fetch all LIVE updates (for end users)
 */
publicUpdatesRouter.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [updates, total] = await Promise.all([
            prisma.appUpdate.findMany({
                where: { status: 'LIVE' },
                orderBy: { publishedAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.appUpdate.count({ where: { status: 'LIVE' } })
        ]);

        res.json({
            success: true,
            data: updates,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN UPDATES ROUTER
// ============================================
export const adminUpdatesRouter = Router();

// Protect all admin update routes
adminUpdatesRouter.use(requireRole('ADMIN'));

/**
 * GET /api/admin/updates - Fetch all updates (all statuses)
 */
adminUpdatesRouter.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const status = req.query.status as string | undefined;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const where = status ? { status } : {};

        const [updates, total] = await Promise.all([
            prisma.appUpdate.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.appUpdate.count({ where })
        ]);

        res.json({
            success: true,
            data: updates,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/updates/:id - Get single update
 */
adminUpdatesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = getString(req.params.id);
        if (!id) throw badRequest('Update ID required');
        const update = await prisma.appUpdate.findUnique({ where: { id } });
        if (!update) throw notFound('Update not found');
        res.json({ success: true, data: update });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/updates - Create a new DRAFT update
 */
const createUpdateSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1),
    version: z.string().optional(),
    type: z.enum(['FEATURE', 'BUGFIX', 'IMPROVEMENT', 'ANNOUNCEMENT']).default('FEATURE')
});

adminUpdatesRouter.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const parsed = createUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest(parsed.error.errors.map(e => e.message).join(', '));
        }

        const update = await prisma.appUpdate.create({
            data: {
                ...parsed.data,
                status: 'DRAFT'
            }
        });

        res.status(201).json({ success: true, data: update });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/admin/updates/:id - Edit an update
 */
const updateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).optional(),
    version: z.string().optional(),
    type: z.enum(['FEATURE', 'BUGFIX', 'IMPROVEMENT', 'ANNOUNCEMENT']).optional()
});

adminUpdatesRouter.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = getString(req.params.id);
        if (!id) throw badRequest('Update ID required');
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest(parsed.error.errors.map(e => e.message).join(', '));
        }

        const update = await prisma.appUpdate.update({
            where: { id },
            data: parsed.data
        });

        res.json({ success: true, data: update });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/updates/:id/approve - Approve and publish an update
 */
adminUpdatesRouter.post('/:id/approve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = getString(req.params.id);
        if (!id) throw badRequest('Update ID required');

        const existing = await prisma.appUpdate.findUnique({ where: { id } });
        if (!existing) throw notFound('Update not found');
        if (existing.status === 'LIVE') throw badRequest('Update is already live');

        const update = await prisma.appUpdate.update({
            where: { id: existing.id },
            data: {
                status: 'LIVE',
                approvedAt: new Date(),
                approvedBy: req.userId,
                publishedAt: new Date()
            }
        });

        res.json({ success: true, data: update });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/updates/:id/archive - Archive an update
 */
adminUpdatesRouter.post('/:id/archive', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = getString(req.params.id);
        if (!id) throw badRequest('Update ID required');

        const update = await prisma.appUpdate.update({
            where: { id },
            data: { status: 'ARCHIVED' }
        });

        res.json({ success: true, data: update });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/admin/updates/:id - Delete an update
 */
adminUpdatesRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = getString(req.params.id);
        if (!id) throw badRequest('Update ID required');
        await prisma.appUpdate.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default publicUpdatesRouter;
