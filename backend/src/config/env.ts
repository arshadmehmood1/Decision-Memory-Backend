import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    DATABASE_URL: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1, "Clerk Secret Key is required for production auth"),
    CLERK_PUBLISHABLE_KEY: z.string().min(1, "Clerk Publishable Key is required for production auth"),
    OPENAI_API_KEY: z.string().optional(),
    PORT: z.string().default('3001'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    FRONTEND_URL: z.string().default('https://decision-memory-frontend.vercel.app'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    // Don't exit in development - allow running without all env vars
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

export const config = {
    databaseUrl: process.env.DATABASE_URL || '',
    clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: (process.env.FRONTEND_URL || 'https://decision-memory-frontend.vercel.app').trim().replace(/\/+$/, ''),

    // Feature flags based on available keys
    isAuthEnabled: !!process.env.CLERK_SECRET_KEY,
    isAiEnabled: !!process.env.OPENAI_API_KEY,
};
