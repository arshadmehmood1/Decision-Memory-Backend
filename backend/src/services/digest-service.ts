import { prisma } from '../lib/prisma.js';

export async function runWeeklyDigest() {
    console.log('📊 [Digest Service] Starting weekly digest run...');

    // 1. Get all users who have opted into the digest
    const users = await prisma.user.findMany({
        where: { emailDigest: true },
        include: {
            workspace: true
        }
    });

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    for (const user of users) {
        // 2. Calculate New Decisions in the last 7 days
        const newDecisions = await prisma.decision.count({
            where: {
                workspaceId: user.workspaceId,
                createdAt: { gte: sevenDaysAgo }
            }
        });

        // 3. Find decisions that need review (timelineToValidate reached)
        const pendingReviews = await prisma.decision.findMany({
            where: {
                workspaceId: user.workspaceId,
                status: 'ACTIVE',
                timelineToValidate: { lte: now }
            },
            select: {
                id: true,
                title: true,
                timelineToValidate: true
            },
            take: 5
        });

        if (newDecisions > 0 || pendingReviews.length > 0) {
            console.log(`✉️ [Digest Service] Summary for ${user.email}:`);
            console.log(`   - New Decisions logged: ${newDecisions}`);
            console.log(`   - Decisions seeking review: ${pendingReviews.length}`);
            pendingReviews.forEach(d => console.log(`     * ${d.title} (Target: ${d.timelineToValidate?.toLocaleDateString()})`));

            // In a real system, we would call an EmailService here
            // await EmailService.sendDigest(user.email, { newDecisions, pendingReviews });
        }
    }

    console.log('✅ [Digest Service] Digest run complete.');
}
