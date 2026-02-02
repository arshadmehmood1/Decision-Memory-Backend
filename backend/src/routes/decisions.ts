import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import {
    CreateDecisionSchema,
    UpdateDecisionSchema,
    CreateReviewSchema,
    DecisionFiltersSchema,
    CreateCommentSchema,
} from '../lib/validation.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';
import { checkLimit } from '../middleware/features.js';
import { createNotification } from './notifications.js';
import { mailService } from '../lib/mail.js';

const router = Router();

// ...

/**
 * POST /api/decisions - Create a new decision
 */
router.post('/', checkLimit('DECISIONS'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const parsed = CreateDecisionSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest(parsed.error.errors.map(e => e.message).join(', '));
        }

        const data = parsed.data;

        // Create decision with assumptions (serialize JSON fields for SQLite)
        const decision = await prisma.decision.create({
            data: {
                workspaceId: req.workspaceId!,
                madeById: req.userId!,
                title: data.title,
                category: data.category,
                theDecision: data.theDecision,
                context: data.context,
                alternativesConsidered: JSON.stringify(data.alternativesConsidered),
                successCriteria: JSON.stringify(data.successCriteria),
                tags: JSON.stringify(data.tags || []),
                estimatedImpact: data.estimatedImpact,
                reversibility: data.reversibility,
                confidenceLevel: data.confidenceLevel,
                timelineToValidate: data.timelineToValidate ? new Date(data.timelineToValidate) : undefined,
                budgetImpact: data.budgetImpact,
                privacy: data.privacy,
                assumptions: {
                    create: data.assumptions.map(a => ({
                        text: a.text,
                        confidenceAtCreation: a.confidence,
                    })),
                },
            },
            include: {
                assumptions: true,
                madeBy: { select: { id: true, name: true, email: true } },
            },
        });

        // Trigger milestone notification if relevant
        const decisionCount = await prisma.decision.count({ where: { madeById: req.userId } });
        if ([1, 5, 10, 25, 50, 100].includes(decisionCount)) {
            await createNotification(req.userId!, {
                type: 'INFO',
                title: 'Decision Milestone!',
                message: `You have successfully logged ${decisionCount} decisions. Keep up the great analytical work!`,
                link: '/decisions'
            });
            await mailService.sendDecisionMilestoneEmail(decision.madeBy.email, decisionCount);
        }

        // Parse JSON fields for response
        const parsedDecision = {
            ...decision,
            alternativesConsidered: JSON.parse(decision.alternativesConsidered),
            successCriteria: JSON.parse(decision.successCriteria),
            tags: JSON.parse(decision.tags),
        };

        res.status(201).json({ success: true, data: parsedDecision });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/decisions - List decisions with filtering and pagination
 */
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const parsed = DecisionFiltersSchema.safeParse(req.query);
        if (!parsed.success) {
            throw badRequest(parsed.error.errors.map(e => e.message).join(', '));
        }

        const { page, limit, status, category, search, dateFrom, dateTo, sortBy, sortOrder } = parsed.data;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            workspaceId: req.workspaceId,
        };

        if (status) where.status = status;
        if (category) where.category = category;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { context: { contains: search, mode: 'insensitive' } },
                { theDecision: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (dateFrom || dateTo) {
            where.madeOn = {};
            if (dateFrom) where.madeOn.gte = new Date(dateFrom);
            if (dateTo) where.madeOn.lte = new Date(dateTo);
        }

        // Execute query
        const [decisions, total] = await Promise.all([
            prisma.decision.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    madeBy: { select: { id: true, name: true } },
                    _count: { select: { assumptions: true } },
                },
            }),
            prisma.decision.count({ where }),
        ]);

        // Parse JSON fields for all decisions
        const parsedDecisions = decisions.map(d => ({
            ...d,
            alternativesConsidered: d.alternativesConsidered ? JSON.parse(d.alternativesConsidered as string) : [],
            successCriteria: d.successCriteria ? JSON.parse(d.successCriteria as string) : [],
            tags: d.tags ? JSON.parse(d.tags as string) : [],
        }));

        res.json({
            success: true,
            data: parsedDecisions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/decisions/:id - Get a single decision with all relations
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const decision = await prisma.decision.findFirst({
            where: {
                id: req.params.id as string,
                workspaceId: req.workspaceId as string,
            },
            include: {
                madeBy: { select: { id: true, name: true, email: true } },
                assumptions: true,
                review: true,
                versions: {
                    orderBy: { versionNumber: 'desc' },
                    take: 5,
                },
            },
        });

        if (!decision) {
            throw notFound('Decision not found');
        }

        // Parse JSON fields (cast to any for SQLite string storage)
        const d = decision as any;
        const parsedDecision = {
            ...decision,
            alternativesConsidered: d.alternativesConsidered ? JSON.parse(d.alternativesConsidered) : [],
            successCriteria: d.successCriteria ? JSON.parse(d.successCriteria) : [],
            tags: d.tags ? JSON.parse(d.tags) : [],
            // SQLite might return version changes as string
            versions: d.versions ? d.versions.map((v: any) => ({
                ...v,
                changes: typeof v.changes === 'string' ? JSON.parse(v.changes) : v.changes
            })) : []
        };

        res.json({ success: true, data: parsedDecision as any });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/decisions/:id - Update a decision
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const parsed = UpdateDecisionSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest(parsed.error.errors.map(e => e.message).join(', '));
        }

        // Verify decision exists and belongs to workspace
        const existing = await prisma.decision.findFirst({
            where: {
                id: req.params.id as string,
                workspaceId: req.workspaceId as string
            },
        });

        if (!existing) {
            throw notFound('Decision not found');
        }

        const data = parsed.data;

        // Update decision
        const updated = await prisma.$transaction(async (tx) => {
            // 1. Get current version count
            const versionCount = await tx.decisionVersion.count({
                where: { decisionId: req.params.id as string }
            });

            // 2. Update core decision data
            const decision = await tx.decision.update({
                where: { id: req.params.id as string },
                data: {
                    ...(data.title && { title: data.title }),
                    ...(data.category && { category: data.category }),
                    ...(data.theDecision && { theDecision: data.theDecision }),
                    ...(data.context && { context: data.context }),
                    ...(data.alternativesConsidered && { alternativesConsidered: JSON.stringify(data.alternativesConsidered) }),
                    ...(data.successCriteria && { successCriteria: JSON.stringify(data.successCriteria) }),
                    ...(data.tags && { tags: JSON.stringify(data.tags) }),
                    ...(data.status && { status: data.status }),
                    ...(data.estimatedImpact !== undefined && { estimatedImpact: data.estimatedImpact }),
                    ...(data.reversibility !== undefined && { reversibility: data.reversibility }),
                    ...(data.confidenceLevel !== undefined && { confidenceLevel: data.confidenceLevel }),
                    ...(data.privacy !== undefined && { privacy: data.privacy }),
                },
                include: {
                    assumptions: true,
                    madeBy: { select: { id: true, name: true } },
                },
            });

            // 3. Update assumptions if provided (Replace Strategy)
            if (data.assumptions) {
                await tx.assumption.deleteMany({
                    where: { decisionId: req.params.id as string }
                });

                await tx.assumption.createMany({
                    data: data.assumptions.map(a => ({
                        decisionId: req.params.id as string,
                        text: a.text,
                        confidenceAtCreation: a.confidence || 'CONFIDENT',
                    }))
                });
            }

            // 4. Create version record
            await tx.decisionVersion.create({
                data: {
                    decisionId: req.params.id as string,
                    versionNumber: versionCount + 1,
                    changedBy: req.userId!,
                    changes: JSON.stringify({ before: existing, after: decision }),
                },
            });

            return decision;
        });

        // Parse updated decision for response
        const parsedUpdated = {
            ...updated,
            alternativesConsidered: updated.alternativesConsidered ? JSON.parse(updated.alternativesConsidered as string) : [],
            successCriteria: updated.successCriteria ? JSON.parse(updated.successCriteria as string) : [],
            tags: updated.tags ? JSON.parse(updated.tags as string) : [],
        };

        res.json({ success: true, data: parsedUpdated });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/decisions/:id - Soft delete (archive) a decision
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const existing = await prisma.decision.findFirst({
            where: {
                id: req.params.id as string,
                workspaceId: req.workspaceId as string
            },
        });

        if (!existing) {
            throw notFound('Decision not found');
        }

        // Soft delete by updating status to a special value
        // In production, you might add an "archived" boolean field
        await prisma.decision.delete({
            where: { id: req.params.id as string },
        });

        res.json({ success: true, message: 'Decision deleted' });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/decisions/:id/outcome - Record outcome/review for a decision
 */
router.post('/:id/outcome', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const parsed = CreateReviewSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest(parsed.error.errors.map(e => e.message).join(', '));
        }

        const decision = await prisma.decision.findFirst({
            where: { id: req.params.id as string, workspaceId: req.workspaceId as string },
            include: { review: true },
        });

        if (!decision) {
            throw notFound('Decision not found');
        }

        if (decision.review) {
            throw badRequest('Outcome already recorded for this decision');
        }

        const data = parsed.data;

        // Create review and update decision status
        const [review] = await prisma.$transaction([
            prisma.review.create({
                data: {
                    decisionId: req.params.id as string,
                    reviewedById: req.userId as string,
                    outcome: data.outcome,
                    whatHappened: data.whatHappened,
                    whatWentWrong: data.whatWentWrong,
                    rootCause: data.rootCause,
                    couldWeHaveKnown: data.couldWeHaveKnown,
                    whatWeLearned: data.whatWeLearned,
                    costOfFailure: data.costOfFailure,
                    actualImpact: data.actualImpact,
                    wouldMakeAgain: data.wouldMakeAgain,
                },
            }),
            prisma.decision.update({
                where: { id: req.params.id as string },
                data: { status: data.outcome },
            }),
        ]);

        // Update assumption validations if provided
        if (data.assumptionValidations) {
            for (const av of data.assumptionValidations) {
                await prisma.assumption.update({
                    where: { id: av.id },
                    data: {
                        validatedAs: av.validatedAs,
                        validatedOn: new Date(),
                        validationNotes: av.notes,
                    },
                });
            }
        }

        res.status(201).json({ success: true, data: review });
    } catch (error) {
        next(error);
    }
});

// ============================================
// COMMENT ENDPOINTS
// ============================================

/**
 * GET /api/decisions/:id/comments - List comments for a decision
 */
router.get('/:id/comments', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const decision = await prisma.decision.findFirst({
            where: {
                id: req.params.id as string,
                workspaceId: req.workspaceId as string
            },
        });

        if (!decision) {
            throw notFound('Decision not found');
        }

        const comments = await prisma.comment.findMany({
            where: { decisionId: req.params.id as string },
            orderBy: { createdAt: 'asc' },
            include: {
                author: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        // Handle anonymous comments
        const processedComments = comments.map(c => ({
            id: c.id,
            content: c.content,
            isAnonymous: c.isAnonymous,
            author: c.isAnonymous ? { id: 'anonymous', name: 'Anonymous', email: null } : c.author,
            createdAt: c.createdAt,
        }));

        res.json({ success: true, data: processedComments });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/decisions/:id/comments - Add a comment to a decision
 */
router.post('/:id/comments', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const parsed = CreateCommentSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest(parsed.error.errors.map(e => e.message).join(', '));
        }

        const decision = await prisma.decision.findFirst({
            where: {
                id: req.params.id as string,
                workspaceId: req.workspaceId as string
            },
        });

        if (!decision) {
            throw notFound('Decision not found');
        }

        const comment = await prisma.comment.create({
            data: {
                decisionId: req.params.id as string,
                authorId: req.userId as string,
                content: parsed.data.content,
                isAnonymous: parsed.data.isAnonymous,
            },
            include: {
                author: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        const result = {
            id: comment.id,
            content: comment.content,
            isAnonymous: comment.isAnonymous,
            author: comment.isAnonymous
                ? { id: 'anonymous', name: 'Anonymous', email: null }
                : (comment as any).author,
            createdAt: comment.createdAt,
        };

        res.status(201).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/decisions/:id/comments/:commentId - Delete a comment
 */
router.delete('/:id/comments/:commentId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const comment = await prisma.comment.findFirst({
            where: {
                id: req.params.commentId as string,
                decisionId: req.params.id as string,
                decision: { workspaceId: req.workspaceId as string },
            },
        });

        if (!comment) {
            throw notFound('Comment not found');
        }

        // Only author or admin can delete
        if (comment.authorId !== req.userId && req.userRole !== 'ADMIN') {
            throw badRequest('You can only delete your own comments');
        }

        await prisma.comment.delete({
            where: { id: req.params.commentId as string },
        });

        res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
        next(error);
    }
});

export default router;
