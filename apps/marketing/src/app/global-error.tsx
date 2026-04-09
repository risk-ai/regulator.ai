'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4 text-gold-300">!</div>
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-gray-400 mb-6">
            An unexpected error has occurred. We've been notified and are working on a fix.
          </p>
          <button
            onClick={() => reset()}
            className="bg-gold-400 hover:bg-gold-500 text-black px-6 py-2 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}