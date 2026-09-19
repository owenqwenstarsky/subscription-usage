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
    <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center">
      <div className="text-lg font-medium text-zinc-200">No accounts yet</div>
      <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">
        The proxy has no Codex accounts. Add one with the device-login flow:
      </p>
      {onAddAccount && (
        <button
          onClick={onAddAccount}
          className="mt-4 rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          Add account
        </button>
      )}
      <details className="mx-auto mt-4 max-w-xl text-left">
        <summary className="cursor-pointer text-center text-xs text-zinc-500 hover:text-zinc-300">
          CLI alternative
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-300 ring-1 ring-zinc-800">
{`curl -sS -X POST "$PROXY_URL/admin/accounts/device-login/start" \\
  -H "Authorization: Bearer $PROXY_API_KEY"`}
        </pre>
        <p className="mt-3 text-center text-xs text-zinc-500">
          Open the returned <span className="font-mono">auth_url</span>, then poll{" "}
          <span className="font-mono">/admin/accounts/device-login/&lt;login_id&gt;</span>{" "}
          until status is <span className="font-mono">ready</span>.
        </p>
      </details>
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
