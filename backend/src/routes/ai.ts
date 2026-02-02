import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { GenerateTagsSchema, FindSimilarSchema, BlindspotAnalysisSchema, CheckAssumptionSchema } from '../lib/validation.js';
import { stemmer } from '../lib/stemmer.js';
import { badRequest, notFound } from '../middleware/errorHandler.js';

const router = Router();

// ============================================
// RULE-BASED AI UTILITIES
// ============================================

// Common stop words to filter out
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'this', 'that', 'these', 'those', 'it', 'its', 'we', 'our', 'you', 'your', 'they',
    'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
    'only', 'same', 'so', 'than', 'too', 'very', 'can', 'just', 'into', 'also',
]);

// Category-based keyword suggestions
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    PRODUCT: ['feature', 'roadmap', 'launch', 'mvp', 'user', 'ux', 'design', 'release'],
    MARKETING: ['campaign', 'brand', 'content', 'seo', 'advertising', 'growth', 'audience'],
    SALES: ['revenue', 'pipeline', 'lead', 'conversion', 'pricing', 'deal', 'quota'],
    HIRING: ['candidate', 'interview', 'onboarding', 'team', 'culture', 'role', 'talent'],
    TECH: ['infrastructure', 'stack', 'api', 'database', 'security', 'performance', 'migration'],
    OPERATIONS: ['process', 'workflow', 'efficiency', 'automation', 'tools', 'productivity'],
    STRATEGIC: ['vision', 'pivot', 'partnership', 'expansion', 'investment', 'acquisition'],
    OTHER: ['decision', 'change', 'improvement', 'analysis'],
};

// Emotional/Absolute words that might indicate bias
const BIAS_INDICATORS = [
    'absolutely', 'always', 'never', 'obviously', 'undoubtedly', 'perfect',
    'impossible', 'must', 'everyone', 'nobody', 'definitely', 'clearly',
    'fail-safe', 'guaranteed', 'no-brainer', 'common sense', 'natural choice'
];

const LOSS_AVERSION_INDICATORS = [
    'avoid losing', 'prevent loss', 'at all costs', 'safe bet', 'don\'t want to fail',
    'fear', 'scared', 'worried about drop', 'high stakes if we don\'t'
];

const SUNK_COST_INDICATORS = [
    'already spent', 'already invested', 'cannot waste', 'keep going because',
    'put too much in', 'can\'t turn back now'
];

const AVAILABILITY_BIAS_INDICATORS = [
    'just saw', 'recently heard', 'in the news', 'trending', 'everyone is talking about',
    'latest hype', 'neighbor said', 'saw on twitter', 'saw on x'
];

const AUTHORITY_BIAS_INDICATORS = [
    'manager wants', 'ceo said', 'client requested', 'consultant advised', 'expert opinion',
    'boss thinks', 'investors want', 'senior management', 'hippo', 'highest paid'
];

const FALSE_DILEMMA_INDICATORS = [
    'only choice', 'only option', 'no other way', 'either this or', 'forced to',
    'have to choose', 'between a rock', 'last resort'
];

// Weak words that indicate low quality assumptions
const ABSTRACTION_TERMS = [
    'might', 'maybe', 'probably', 'possibly', 'believe', 'feel', 'guess',
    'assume', 'hope', 'think', 'some', 'many', 'few', 'stuff', 'things'
];

// Sentiment/Psychological Indicators
const NEURAL_OVERLOAD_INDICATORS = [
    'panicked', 'stressful', 'urgent', 'emergency', 'asap', 'overwhelmed',
    'scared', 'worried', 'dreading', 'rushed', 'hurry'
];

const NEURAL_FRICTION_INDICATORS = [
    'however', 'but then', 'on the other hand', 'despite', 'conflicting',
    'unsure if', 'contradicts', 'clash'
];

/**
 * Extract keywords from text using rule-based approach
 */
function extractKeywords(text: string, category?: string): string[] {
    if (!text) return [];

    // Normalize and tokenize
    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    // Count word frequency
    const freq: Record<string, number> = {};
    for (const word of words) {
        freq[word] = (freq[word] || 0) + 1;
    }

    // Sort by frequency and take top keywords
    const keywords = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);

    // Add category-relevant keywords if they appear in text (stemmed check)
    if (category && CATEGORY_KEYWORDS[category]) {
        const stemmedText = words.map(stemmer).join(' ');
        const categoryTags = CATEGORY_KEYWORDS[category].filter(tag =>
            stemmedText.includes(stemmer(tag))
        );
        keywords.push(...categoryTags);
    }

    // Deduplicate and return top 5
    return [...new Set(keywords)].slice(0, 5);
}

/**
 * Calculate text similarity score (Weighted Jaccard with Stemming)
 */
function calculateSimilarity(text1: string, text2: string): number {
    const processWords = (t: string) => {
        return new Set(
            t.toLowerCase()
                .split(/\s+/)
                .filter(w => w.length > 2 && !STOP_WORDS.has(w))
                .map(stemmer)
        );
    };

    const words1 = processWords(text1);
    const words2 = processWords(text2);

    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;

    return union > 0 ? (intersection / union) : 0;
}

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/ai/tag - Generate tags using keyword extraction
 */
router.post('/tag', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const parsed = GenerateTagsSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest(parsed.error.errors.map(e => e.message).join(', '));
        }

        const { title, context, theDecision } = parsed.data;

        // Combine all text for analysis
        const fullText = [title, context, theDecision].filter(Boolean).join(' ');

        // Extract keywords
        const tags = extractKeywords(fullText);

        // Add category tag if detected
        const categoryMatches = Object.entries(CATEGORY_KEYWORDS)
            .find(([_, keywords]) =>
                keywords.some(kw => fullText.toLowerCase().includes(kw))
            );

        if (categoryMatches) {
            tags.unshift(categoryMatches[0].toLowerCase());
        }

        res.json({
            success: true,
            data: {
                tags: [...new Set(tags)].slice(0, 5),
                source: 'rule-based',
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/ai/similar - Find similar decisions using text matching
 */
router.post('/similar', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const parsed = FindSimilarSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest(parsed.error.errors.map(e => e.message).join(', '));
        }

        const { decisionId, limit } = parsed.data;

        // Get the source decision
        const sourceDecision = await prisma.decision.findFirst({
            where: {
                id: decisionId,
                workspaceId: req.workspaceId,
            },
        });

        if (!sourceDecision) {
            throw notFound('Decision not found');
        }

        // Get all other decisions in workspace
        const allDecisions = await prisma.decision.findMany({
            where: {
                workspaceId: req.workspaceId,
                id: { not: decisionId },
            },
            select: {
                id: true,
                title: true,
                status: true,
                category: true,
                madeOn: true,
                context: true,
                theDecision: true,
                tags: true,
            },
        });

        // Calculate similarity scores
        const sourceText = `${sourceDecision.title} ${sourceDecision.context} ${sourceDecision.theDecision}`;

        const scoredDecisions = allDecisions.map(d => {
            const targetText = `${d.title} ${d.context} ${d.theDecision}`;
            let score = calculateSimilarity(sourceText, targetText);

            // Boost score for same category
            if (d.category === sourceDecision.category) {
                score += 0.2;
            }

            // Boost for overlapping tags
            try {
                const sourceTags = (JSON.parse(sourceDecision.tags as string) as string[]) || [];
                const targetTags = (JSON.parse(d.tags as string) as string[]) || [];
                const overlap = sourceTags.filter((t: string) => targetTags.includes(t)).length;
                score += overlap * 0.1;
            } catch {
                // Ignore tag parsing errors
            }

            return { ...d, score };
        });

        // Sort by score and return top matches
        const similar = scoredDecisions
            .filter(d => d.score > 0.1) // Minimum threshold
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ context, theDecision, tags, score, ...rest }) => ({
                ...rest,
                similarity: Math.round(score * 100),
            }));

        res.json({
            success: true,
            data: {
                similar,
                source: 'text-matching',
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/ai/risk - Calculate decision risk score (Weighted Matrix V2)
 */
router.post('/risk', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { impact, reversibility, confidenceLevel, alternativesCount, assumptionsCount } = req.body;

        // Weighted Risk Scoring Strategy (V2)
        // Impact x Reversibility compounding + Analysis Depth evaluation

        let baselineScore = 0;

        // 1. Impact Multiplier (0-40 points)
        const impactWeights: Record<string, number> = {
            LOW: 5,
            MEDIUM: 15,
            HIGH: 30,
            CRITICAL: 40,
        };
        const impactScore = impactWeights[impact] || 15;

        // 2. Reversibility Multiplier (Compounding effect)
        // Irreversible high-impact decisions should spike to near 100
        const reversibilityWeights: Record<string, number> = {
            EASY: 1.0,      // No multiplier
            MODERATE: 1.3,  // 30% increase
            HARD: 1.8,      // 80% increase
            IRREVERSIBLE: 2.5 // 150% increase (Very punitive)
        };
        const reversibilityMult = reversibilityWeights[reversibility] || 1.2;

        // Compounded Base Score
        baselineScore = impactScore * reversibilityMult;

        // 3. Confidence Adjustment (The "Dunning-Kruger" filter)
        // Very high confidence with low alternatives = high risk
        let confidenceRisk = 0;
        if (typeof confidenceLevel === 'number') {
            // High confidence (90+) on high impact is risky if depth is low
            if (confidenceLevel > 90 && alternativesCount < 2) {
                confidenceRisk = 15; // Penalty for overconfidence
            } else if (confidenceLevel < 40) {
                confidenceRisk = 20; // High risk due to self-admitted uncertainty
            } else {
                confidenceRisk = Math.round((100 - confidenceLevel) * 0.15);
            }
        }

        // 4. Analysis Depth (Reduces risk if high)
        let depthBonus = 0;
        if (alternativesCount >= 3) depthBonus += 10;
        if (assumptionsCount >= 4) depthBonus += 5;

        // Final score calculation
        let finalScore = baselineScore + confidenceRisk - depthBonus;

        // Normalize to 0-100
        finalScore = Math.min(100, Math.max(5, finalScore));

        const riskLevel = finalScore >= 75 ? 'CRITICAL' : finalScore >= 50 ? 'HIGH' : finalScore >= 25 ? 'MEDIUM' : 'LOW';

        // Neural Flux Meta-Data
        const isNeuralHigh = finalScore > 80;

        res.json({
            success: true,
            data: {
                riskScore: Math.round(finalScore),
                riskLevel,
                isNeuralHigh,
                factors: {
                    baseline: Math.round(baselineScore),
                    confidence: Math.round(confidenceRisk),
                    depthBonus: -depthBonus,
                    compoundingFactor: reversibilityMult
                },
                neuralInsight: isNeuralHigh
                    ? "NEURAL OVERLOAD: This decision is high-impact and low-reversibility. The strategic vector suggests extreme caution."
                    : "Trace parameters operating within safe margins."
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/ai/blindspot - Analyze decision for blindspots (rule-based)
 */
router.post('/blindspot', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const parsed = BlindspotAnalysisSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest(parsed.error.errors.map(e => e.message).join(', '));
        }

        const { title, context, theDecision, alternatives } = parsed.data;
        const fullText = `${title} ${context || ''} ${theDecision || ''}`.toLowerCase();

        const blindspots: string[] = [];

        // 1. Check for Confirmation Bias indicators
        const foundBiasWords = BIAS_INDICATORS.filter(word => fullText.includes(word));
        if (foundBiasWords.length > 0) {
            blindspots.push(
                `Potential Confirmation Bias: You used strong absolute words like "${foundBiasWords.slice(0, 3).join(', ')}". Consider if you are over-confident.`
            );
        }

        // 2. Check for Lack of Alternatives
        if (!alternatives || alternatives.length <= 1) {
            blindspots.push(
                "Lack of Alternatives: You haven't considered enough alternatives. Good decisions usually involve comparing at least 3 viable options."
            );
        }

        // 3. Check for Groupthink (if context mentions 'everyone agrees' etc)
        if (fullText.includes('agreed') || fullText.includes('consensus') || fullText.includes('everyone')) {
            blindspots.push(
                "Potential Groupthink: Emphasis on consensus might hide dissenting views. Have you actively assigned a 'Devil's Advocate'?"
            );
        }

        // 4. Check Short Context / Rushed Decision
        if ((context?.length || 0) < 50) {
            blindspots.push(
                "Shallow Context: The context provided is very brief. You might be missing important constraints or background information."
            );
        }

        // 5. Check for Loss Aversion
        const foundLossWords = LOSS_AVERSION_INDICATORS.filter(word => fullText.includes(word));
        if (foundLossWords.length > 0) {
            blindspots.push(
                `Potential Loss Aversion: You seem focused on avoiding losses rather than maximizing gains. Research shows humans overweigh the pain of a loss twice as much as the joy of a gain.`
            );
        }

        // 6. Check for Sunk Cost Fallacy
        const foundSunkCost = SUNK_COST_INDICATORS.filter(word => fullText.includes(word));
        if (foundSunkCost.length > 0) {
            blindspots.push(
                `Sunk Cost Fallacy: You mentioned previous investments. Past costs should not influence future decisions—only future utility matters.`
            );
        }

        // 7. Check for Availability Bias
        const foundAvailability = AVAILABILITY_BIAS_INDICATORS.filter(word => fullText.includes(word));
        if (foundAvailability.length > 0) {
            blindspots.push(
                `Availability Bias: You're referencing recent or trending events. These are often more "available" in memory but not necessarily representative of long-term patterns.`
            );
        }

        // 8. Check for Authority Bias
        const foundAuthority = AUTHORITY_BIAS_INDICATORS.filter(word => fullText.includes(word));
        if (foundAuthority.length > 0) {
            blindspots.push(
                `Authority Bias: Referencing "${foundAuthority[0]}" suggests you might be deferring to hierarchy rather than data. Does the evidence support their claim?`
            );
        }

        // 9. Check for False Dilemma
        const foundDilemma = FALSE_DILEMMA_INDICATORS.filter(word => fullText.includes(word));
        if (foundDilemma.length > 0) {
            blindspots.push(
                `False Dilemma: You used binary language ("${foundDilemma[0]}"). Rarely are there only two options. Try to generate a 3rd hybrid option.`
            );
        }

        // 8. Neural Sentiment Analysis (Psychological Trace)
        const overloadWords = NEURAL_OVERLOAD_INDICATORS.filter(word => fullText.includes(word));
        const frictionWords = NEURAL_FRICTION_INDICATORS.filter(word => fullText.includes(word));

        let psychologicalTrace = "Stable";
        if (overloadWords.length > 2) {
            psychologicalTrace = "NEURAL OVERLOAD DETECTED";
            blindspots.push(
                `Neural Overload: Your language suggests high stress or urgency ("${overloadWords.slice(0, 2).join(', ')}"). Stress narrows focus and leads to poor trade-off analysis.`
            );
        } else if (frictionWords.length > 3) {
            psychologicalTrace = "HIGH NEURAL FRICTION";
            blindspots.push(
                "Neural Friction: Significant internal contradictions detected. You are acknowledging data that conflicts with your choice—ensure this isn't being 'reasoned away'."
            );
        }

        res.json({
            success: true,
            data: {
                blindspots,
                psychologicalTrace,
                analysisType: 'neural-strategic-v1'
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/ai/check-assumption - Check assumption quality (rule-based)
 */
router.post('/check-assumption', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const parsed = CheckAssumptionSchema.safeParse(req.body);
        if (!parsed.success) {
            throw badRequest(parsed.error.errors.map(e => e.message).join(', '));
        }

        const { text } = parsed.data;
        const lowerText = text.toLowerCase();

        const issues: string[] = [];
        let score = 100;

        // 1. Check for weak/vague words
        const foundWeakWords = ABSTRACTION_TERMS.filter(word => lowerText.includes(word));
        if (foundWeakWords.length > 0) {
            score -= 20 * foundWeakWords.length;
            issues.push(
                `Vague Language: Usage of "${foundWeakWords.join(', ')}" makes this assumption hard to validate. Be more specific.`
            );
        }

        // 2. Check for length/specificity
        if (text.length < 20) {
            score -= 30;
            issues.push("Too Short: Short assumptions are often ambiguous. Add more detail about the 'who', 'what', and 'when'.");
        }

        // 3. Check if it's falsifiable (heuristic: contains numbers or dates)
        const hasNumbers = /\d/.test(text);
        if (!hasNumbers) {
            score -= 10;
            issues.push("Measurability: Lacks numbers or specific metrics. How will you measure if this is true?");
        }

        res.json({
            success: true,
            data: {
                score: Math.max(0, score),
                isValidatable: score > 60,
                issues
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
