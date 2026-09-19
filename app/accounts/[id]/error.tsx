"use client";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <div className="text-lg font-medium text-red-200">Something went wrong</div>
        <p className="mx-auto mt-2 max-w-md text-sm text-red-200/80">
          {error.message || "The account page failed to render."}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-red-500/20 px-4 py-2 text-sm font-medium text-red-100 ring-1 ring-inset ring-red-500/40 hover:bg-red-500/30"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
