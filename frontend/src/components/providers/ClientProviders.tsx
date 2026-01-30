'use client';

import { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import QueryProvider from "@/lib/query-provider";
import { Toaster } from 'sonner';
import dynamic from 'next/dynamic';

const AuthSync = dynamic(() => import('@/components/auth-sync').then(mod => mod.AuthSync), { ssr: false });

export function ClientProviders({ children }: { children: ReactNode }) {
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    // Use a fallback key for build-time if missing to prevent Clerk from crashing,
    // though real auth won't work until the real key is provided in production env.
    const effectiveKey = clerkKey || 'pk_test_Y2xlcmsuY29tJA'; // Dummy key for build stability

    return (
        <ClerkProvider publishableKey={effectiveKey}>
            {clerkKey && <AuthSync />}
            <QueryProvider>
                {children}
                <Toaster position="top-right" richColors closeButton />
            </QueryProvider>
        </ClerkProvider>
    );
}
