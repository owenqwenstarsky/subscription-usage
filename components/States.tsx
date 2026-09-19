"use client";

export function ErrorBanner({
  title,
  message,
  hint,
  details,
  onRetry,
  retryLabel = "Retry",
  onDismiss,
}: {
  title: string;
  message: string;
  hint?: string;
  details?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-medium text-red-200">{title}</div>
          <div className="mt-1 text-sm text-red-200/80">{message}</div>
          {hint && (
            <div className="mt-2 text-xs text-red-200/60">{hint}</div>
          )}
          {details && (
            <details className="mt-2 text-xs text-red-200/60">
              <summary className="cursor-pointer hover:text-red-200/90">
                Technical details
              </summary>
              <div className="mt-1 break-words font-mono">{details}</div>
            </details>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-md bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-100 ring-1 ring-inset ring-red-500/40 hover:bg-red-500/30"
            >
              {retryLabel}
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="rounded-md px-2 py-1.5 text-sm text-red-200/60 hover:text-red-100"
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ onAddAccount }: { onAddAccount?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center shadow-[0_20px_50px_-42px_rgba(0,0,0,.9)]">
      <div className="text-lg font-semibold tracking-[-0.02em] text-zinc-100">No accounts yet</div>
      <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">Add an account to start tracking usage.</p>
      {onAddAccount && (
        <button
          onClick={onAddAccount}
          className="mt-5 rounded-xl bg-teal-300 px-4 py-2 text-sm font-semibold text-teal-950 transition hover:bg-teal-200"
        >
          Add account
        </button>
      )}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="h-5 w-2/3 rounded bg-zinc-800" />
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-zinc-800" />
        <div className="h-5 w-20 rounded-full bg-zinc-800" />
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-2 rounded bg-zinc-800" />
        <div className="h-2 rounded bg-zinc-800" />
        <div className="h-2 rounded bg-zinc-800" />
      </div>
    </div>
  );
}
