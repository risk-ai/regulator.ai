'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4"></div>
        <h1 className="text-xl font-bold mb-4">Something went wrong</h1>
        <p className="text-gray-400 mb-6 text-sm">
          We've encountered an unexpected error. The issue has been reported automatically.
        </p>
        <button
          onClick={() => reset()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm transition-colors mr-4"
        >
          Try again
        </button>
        <a
          href="/"
          className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
        >
          Go home
        </a>
      </div>
    </div>
  );
}