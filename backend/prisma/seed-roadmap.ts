/**
 * Seed script for Roadmap Features
 * 
 * This script populates the AppUpdate table with all roadmap features,
 * marking implemented ones as LIVE and unimplemented ones as DRAFT.
 * 
 * Run with: npx ts-node prisma/seed-roadmap.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RoadmapFeature {
    title: string;
    description: string;
    version: string;
    type: 'FEATURE' | 'IMPROVEMENT' | 'ANNOUNCEMENT';
    implemented: boolean;
    phase: string;
    featureKey?: string;
}

const ROADMAP_FEATURES: RoadmapFeature[] = [
    // ============================================
    // PHASE 1: CORE LAUNCH (IMPLEMENTED)
    // ============================================
    // ... (omitting already live core features for brevity, or adding keys)
    {
        title: 'Authentication & Workspace',
        description: 'Secure Sign-up/Login with Email + Google OAuth via Clerk. Personal Workspace creation and basic Profile Settings.',
        version: '1.0.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Core Launch',
        featureKey: 'auth_workspace'
    },
    {
        title: 'Decision Logging',
        description: 'Quick Create (Title, Decision, Category in <30s), Detailed Logging with Rich Text Context, Alternatives, Assumptions, and Success Criteria. Draft Mode supported.',
        version: '1.0.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Core Launch',
        featureKey: 'decision_logging'
    },
    {
        title: 'Dashboard & Management',
        description: 'Visual Dashboard with list view, status badges (Active, Succeeded, Failed). Search & Filter by text, status, category, or date. Quick Stats with live decision count.',
        version: '1.0.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Core Launch',
        featureKey: 'dashboard_management'
    },
    {
        title: 'Outcome Tracking',
        description: 'Structured Review Flow to mark decisions as Succeeded, Failed, or Reversed. Reflection capture for "What we learned" and "Root Cause" for failed decisions.',
        version: '1.0.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Core Launch',
        featureKey: 'outcome_tracking'
    },
    {
        title: 'Basic Intelligence (AI)',
        description: 'Auto-Tagging with AI suggestions for tags based on content. Similarity Detection with basic warning if a similar decision exists.',
        version: '1.0.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Core Launch',
        featureKey: 'basic_ai'
    },
    {
        title: 'Free Tier Limits',
        description: 'Max 25 decisions, 1 User (Solo). Upgrade prompts when limits reached.',
        version: '1.0.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Core Launch',
        featureKey: 'tier_limits'
    },

    // ============================================
    // PHASE 2: POLISH & STICKINESS (WEEKS 2-4)
    // ============================================
    {
        title: 'Interactive Demo Decision',
        description: 'A pre-filled "example" decision shows users what a good log looks like during onboarding.',
        version: '1.1.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Week 2 - Onboarding Update',
        featureKey: 'demo_decision'
    },
    {
        title: 'Decision Templates',
        description: 'Pre-set templates for common scenarios: Hiring, Tech Stack Switch, Pricing Change, etc.',
        version: '1.1.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Week 2 - Onboarding Update',
        featureKey: 'decision_templates'
    },
    {
        title: 'Progress Field',
        description: 'Visual progress bar during decision creation to encourage completion.',
        version: '1.1.0',
        type: 'IMPROVEMENT',
        implemented: true,
        phase: 'Week 2 - Onboarding Update',
        featureKey: 'quality_meter'
    },
    {
        title: 'Smart Email Notifications',
        description: 'Welcome Series with tips on first decision. Outcome Reminders: "You said you\'d know if this worked by today. Time to review?"',
        version: '1.2.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Week 3 - Retention Update',
        featureKey: 'email_notifications'
    },
    {
        title: '"Regret" Nudge',
        description: 'Prompt users to log a past decision they regret to see the value immediately.',
        version: '1.2.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Week 3 - Retention Update',
        featureKey: 'regret_nudge'
    },
    {
        title: 'Duplicate Decision',
        description: 'Clone an existing decision - great for repeated processes like hiring.',
        version: '1.3.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Week 4 - Productivity Update',
        featureKey: 'duplicate_decision'
    },
    {
        title: 'Quick Status Edit',
        description: 'Change decision status directly from the dashboard card without opening details.',
        version: '1.3.0',
        type: 'IMPROVEMENT',
        implemented: true,
        phase: 'Week 4 - Productivity Update',
        featureKey: 'quick_status'
    },
    {
        title: 'Keyboard Shortcuts',
        description: 'Cmd/Ctrl+K for search, N for new decision, and other power user shortcuts.',
        version: '1.3.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Week 4 - Productivity Update',
        featureKey: 'keyboard_shortcuts'
    },

    // ============================================
    // PHASE 3: HABIT ENGINE (MONTHS 2-3)
    // ============================================
    {
        title: 'Decision Linking',
        description: 'Manually link related decisions (e.g., "This decision reverses Decision #12").',
        version: '1.5.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Week 8 - Context Update',
        featureKey: 'decision_linking'
    },
    {
        title: 'Timeline View',
        description: 'Visualize decisions on a chronological timeline to see your history at a glance.',
        version: '1.5.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Week 8 - Context Update',
        featureKey: 'timeline_view'
    },
    {
        title: 'Export Data (CSV/JSON)',
        description: 'Allow Pro users to export all decisions to CSV or JSON format.',
        version: '1.6.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Week 10 - Data Update',
        featureKey: 'data_export'
    },

    // ============================================
    // PHASE 4: AI INTELLIGENCE (MONTHS 4-6)
    // ============================================
    {
        title: 'AI Insights Dashboard',
        description: 'Success Rate: "You succeed 80% in Product, but only 40% in Hiring." Blindspots: "You often underestimate timelines by 40%."',
        version: '2.0.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Week 14 - Insights Update',
        featureKey: 'ai_insights'
    },
    {
        title: 'Recurring Failure Detection',
        description: '"You\'ve reversed 3 tool choices for the same reason: Poor Support. Watch out for this."',
        version: '2.0.0',
        type: 'FEATURE',
        implemented: false,
        phase: 'Week 14 - Insights Update',
        featureKey: 'failure_detection'
    },
    {
        title: 'Pre-Mortem Risk Score',
        description: 'AI analyzes draft decisions before saving. Warning: "This is a High Risk decision. Consider adding more alternatives."',
        version: '2.1.0',
        type: 'FEATURE',
        implemented: false,
        phase: 'Week 18 - Risk Management Update',
        featureKey: 'risk_analyzer'
    },
    {
        title: 'Assumption Checker',
        description: 'AI flags vague assumptions ("Revenue will grow") and suggests specific ones ("Revenue grows 20% in Q2").',
        version: '2.1.0',
        type: 'FEATURE',
        implemented: false,
        phase: 'Week 18 - Risk Management Update',
        featureKey: 'assumption_checker'
    },
    {
        title: 'Decision Master Streaks',
        description: '"Logged decisions 3 weeks in a row!" - Gamification to encourage consistent logging.',
        version: '2.2.0',
        type: 'FEATURE',
        implemented: false,
        phase: 'Week 22 - Gamification Update',
        featureKey: 'decision_streaks'
    },
    {
        title: 'Monthly Review Report',
        description: 'A Spotify-Wrapped style email summarizing your decision-making month.',
        version: '2.2.0',
        type: 'FEATURE',
        implemented: false,
        phase: 'Week 22 - Gamification Update',
        featureKey: 'monthly_report'
    },
    {
        title: 'Dynamic Experience CMS',
        description: 'Tailored dashboard messaging and announcements powered by the admin CMS.',
        version: '1.2.0',
        type: 'IMPROVEMENT',
        implemented: true,
        phase: 'Retention Update',
        featureKey: 'dynamic_experience'
    },
    {
        title: 'PDF Decision Reports',
        description: 'Generate professional PDF summaries of individual decisions for sharing with stakeholders.',
        version: '1.6.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Data Update',
        featureKey: 'pdf_reports'
    },
    {
        title: 'Aggregate Success Dashboard',
        description: 'Visual overview of your decision-making performance across different categories and timeframes.',
        version: '2.3.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Intelligence Update',
        featureKey: 'success_dashboard'
    },
    {
        title: 'Automated Weekly Digest',
        description: 'Weekly email summary of your decision velocity and upcoming review reminders.',
        version: '1.2.0',
        type: 'FEATURE',
        implemented: true,
        phase: 'Retention Update',
        featureKey: 'weekly_digest'
    },

    // ============================================
    // PHASE 5: SCALE & TEAM (MONTHS 7+)
    // ============================================
    {
        title: 'Team Workspaces',
        description: 'Invite team members to shared workspace with shared decision history.',
        version: '3.0.0',
        type: 'FEATURE',
        implemented: false,
        phase: 'Month 7 - Team Collaboration'
    },
    {
        title: 'Roles & Permissions',
        description: 'Admin, Member, Viewer (Investor) roles for team access control.',
        version: '3.0.0',
        type: 'FEATURE',
        implemented: false,
        phase: 'Month 7 - Team Collaboration'
    },
    {
        title: 'Activity Feed',
        description: 'See what your co-founders are deciding in real-time.',
        version: '3.0.0',
        type: 'FEATURE',
        implemented: false,
        phase: 'Month 7 - Team Collaboration'
    },
    {
        title: 'Slack Bot',
        description: 'Log decisions via /decision slash command and get notifications in channels.',
        version: '3.1.0',
        type: 'FEATURE',
        implemented: false,
        phase: 'Month 8 - Ecosystem Integrations'
    },
    {
        title: 'Linear/Jira Link',
        description: 'Connect decisions to features/tickets in project management tools.',
        version: '3.1.0',
        type: 'FEATURE',
        implemented: false,
        phase: 'Month 8 - Ecosystem Integrations'
    }
];

async function seedRoadmapFeatures() {
    console.log('🚀 Seeding Roadmap Features...\n');

    // Clear existing updates (optional - remove if you want to keep existing)
    await prisma.appUpdate.deleteMany({});
    console.log('   Cleared existing AppUpdate entries');

    let implementedCount = 0;
    let draftCount = 0;

    for (const feature of ROADMAP_FEATURES) {
        const update = await prisma.appUpdate.create({
            data: {
                title: feature.title,
                description: `**Phase:** ${feature.phase}\n\n${feature.description}`,
                version: feature.version,
                type: feature.type,
                status: feature.implemented ? 'LIVE' : 'DRAFT',
                approvedAt: feature.implemented ? new Date() : null,
                publishedAt: feature.implemented ? new Date() : null,
            }
        });

        if (feature.implemented) {
            implementedCount++;
            console.log(`   ✅ ${feature.title} (LIVE)`);
        } else {
            draftCount++;
            console.log(`   📝 ${feature.title} (DRAFT)`);
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - ${implementedCount} features LIVE (implemented)`);
    console.log(`   - ${draftCount} features DRAFT (pending implementation)`);
    console.log(`   - ${ROADMAP_FEATURES.length} total features`);
    console.log('\n✨ Seeding complete! Check /admin/updates to manage features.');
}

seedRoadmapFeatures()
    .catch((e) => {
        console.error('Seeding failed:', e);
        // @ts-ignore
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
