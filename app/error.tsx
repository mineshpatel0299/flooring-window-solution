'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
        <p className="text-muted-foreground mb-8">
          An error occurred while processing your request.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
