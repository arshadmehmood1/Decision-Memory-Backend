'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-6">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-red-500">
              System Failure
            </h1>
            <p className="text-gray-400 font-medium">
              A critical error occurred in the global trace buffer.
            </p>
            {error.digest && (
              <p className="text-[10px] font-mono text-gray-600">
                Trace ID: {error.digest}
              </p>
            )}
            <div className="flex flex-col gap-4 pt-4">
              <button
                onClick={() => reset()}
                className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all"
              >
                Attempt Recovery
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-8 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all border border-white/10"
              >
                Return to Nexus
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
