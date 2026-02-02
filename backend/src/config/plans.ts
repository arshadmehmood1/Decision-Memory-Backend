export const PLANS = {
    FREE: {
        DECISIONS: 10,
        MEMBERS: 1,
        AI_INSIGHTS: false, // Basic only
        EXPORT: 'PDF'
    },
    PRO: {
        DECISIONS: -1, // Unlimited
        MEMBERS: 5,
        AI_INSIGHTS: true, // Advanced (Blindspots)
        EXPORT: 'ALL'
    },
    TEAM: {
        DECISIONS: -1,
        MEMBERS: -1,
        AI_INSIGHTS: true,
        EXPORT: 'ALL'
    }
} as const;

export type PlanType = keyof typeof PLANS;
export type FeatureType = keyof typeof PLANS['FREE'];
