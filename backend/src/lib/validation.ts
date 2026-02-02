import { z } from 'zod';

// ============================================
// DECISION SCHEMAS
// ============================================

export const CategoryEnum = z.enum([
    'PRODUCT',
    'MARKETING',
    'SALES',
    'HIRING',
    'TECH',
    'OPERATIONS',
    'STRATEGIC',
    'OTHER',
]);

export const StatusEnum = z.enum([
    'DRAFT',
    'PROPOSED',
    'ACTIVE',
    'SUCCEEDED',
    'FAILED',
    'REVERSED',
]);

export const ImpactEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const ReversibilityEnum = z.enum(['EASY', 'MODERATE', 'HARD', 'IRREVERSIBLE']);
export const PrivacyEnum = z.enum(['WORKSPACE', 'PUBLIC', 'ANONYMOUS_PUBLIC']);
export const OutcomeEnum = z.enum(['SUCCEEDED', 'FAILED', 'REVERSED']);
export const RootCauseEnum = z.enum([
    'BAD_DATA',
    'WRONG_ASSUMPTIONS',
    'CHANGED_CONTEXT',
    'RUSHED_DECISION',
    'IGNORED_WARNINGS',
    'EXTERNAL_SHOCK',
    'OTHER',
]);
export const ForeseeabilityEnum = z.enum(['YES_HAD_SIGNALS', 'MAYBE_UNCLEAR', 'NO_UNFORESEEABLE']);
export const FailureCostEnum = z.enum(['MINOR', 'MODERATE', 'MAJOR', 'SEVERE']);
export const ActualImpactEnum = z.enum(['LOWER_THAN_EXPECTED', 'AS_EXPECTED', 'HIGHER_THAN_EXPECTED']);

// Alternative schema
export const AlternativeSchema = z.object({
    name: z.string().min(1).max(200),
    whyRejected: z.string().max(500),
});

// Assumption schema
export const AssumptionSchema = z.object({
    text: z.string().min(1).max(500),
    confidence: z.enum(['CONFIDENT', 'SOMEWHAT_CONFIDENT', 'UNCERTAIN']).optional(),
});

// Create Decision
export const CreateDecisionSchema = z.object({
    title: z.string().min(5).max(120),
    category: CategoryEnum,
    theDecision: z.string().min(10).max(500),
    context: z.string().min(10).max(2000),
    alternativesConsidered: z.array(AlternativeSchema).min(1).max(5),
    assumptions: z.array(AssumptionSchema).max(10),
    successCriteria: z.array(z.string().min(1).max(300)).min(1).max(5),
    tags: z.array(z.string().max(50)).max(10).optional(),
    estimatedImpact: ImpactEnum.optional(),
    reversibility: ReversibilityEnum.optional(),
    confidenceLevel: z.number().min(0).max(100).optional(),
    timelineToValidate: z.string().datetime().optional(),
    budgetImpact: z.number().optional(),
    privacy: PrivacyEnum.optional(),
});

// Update Decision
export const UpdateDecisionSchema = CreateDecisionSchema.partial().extend({
    status: StatusEnum.optional(),
});

// Decision Outcome / Review
export const CreateReviewSchema = z.object({
    outcome: OutcomeEnum,
    whatHappened: z.string().max(1000).optional(),
    whatWentWrong: z.string().max(1000).optional(),
    rootCause: RootCauseEnum.optional(),
    couldWeHaveKnown: ForeseeabilityEnum.optional(),
    whatWeLearned: z.string().max(1000).optional(),
    costOfFailure: FailureCostEnum.optional(),
    actualImpact: ActualImpactEnum.optional(),
    wouldMakeAgain: z.boolean().optional(),
    assumptionValidations: z.array(z.object({
        id: z.string().uuid(),
        validatedAs: z.enum(['TRUE', 'FALSE', 'PARTIALLY_TRUE', 'UNKNOWN']),
        notes: z.string().max(500).optional(),
    })).optional(),
});

// ============================================
// QUERY SCHEMAS
// ============================================

export const PaginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
});

export const DecisionFiltersSchema = PaginationSchema.extend({
    status: StatusEnum.optional(),
    category: CategoryEnum.optional(),
    search: z.string().max(200).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    sortBy: z.enum(['madeOn', 'updatedAt', 'title']).default('madeOn'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// WORKSPACE SCHEMAS
// ============================================

export const CreateWorkspaceSchema = z.object({
    name: z.string().min(1).max(100),
});

export const UpdateWorkspaceSchema = z.object({
    name: z.string().min(1).max(100).optional(),
});

// ============================================
// AI SCHEMAS
// ============================================

export const GenerateTagsSchema = z.object({
    title: z.string().min(1),
    context: z.string().optional(),
    theDecision: z.string().optional(),
});

export const FindSimilarSchema = z.object({
    decisionId: z.string().uuid(),
    limit: z.number().min(1).max(10).default(3),
});

export const BlindspotAnalysisSchema = z.object({
    title: z.string().min(1),
    context: z.string().optional(),
    theDecision: z.string().optional(),
    alternatives: z.array(z.string()).optional(),
});

export const CheckAssumptionSchema = z.object({
    text: z.string().min(1),
});

// ============================================
// USER SCHEMAS
// ============================================

export const UpdateUserSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    timezone: z.string().max(50).optional(),
    profilePicture: z.string().url().optional().nullable(),
    emailDigest: z.boolean().optional(),
    reviewReminders: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
});

// ============================================
// COMMENT SCHEMAS
// ============================================

export const CreateCommentSchema = z.object({
    content: z.string().min(1).max(1000),
    isAnonymous: z.boolean().default(false),
});

// ============================================
// INSIGHT SCHEMAS
// ============================================

export const InsightFiltersSchema = PaginationSchema.extend({
    includeDismissed: z.coerce.boolean().default(false),
});

// Type exports
export type CreateDecisionInput = z.infer<typeof CreateDecisionSchema>;
export type UpdateDecisionInput = z.infer<typeof UpdateDecisionSchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type DecisionFilters = z.infer<typeof DecisionFiltersSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type GenerateTagsInput = z.infer<typeof GenerateTagsSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type InsightFilters = z.infer<typeof InsightFiltersSchema>;
export type BlindspotAnalysisInput = z.infer<typeof BlindspotAnalysisSchema>;
export type CheckAssumptionInput = z.infer<typeof CheckAssumptionSchema>;
