"use client";

import { RateLimitWindow } from "@/lib/types";
import { formatPercent, formatWindow } from "@/lib/format";
import { Countdown } from "./Countdown";

function barColor(percent: number | null | undefined, limitReached: boolean): string {
  if (limitReached) return "bg-red-500";
  if (percent === null || percent === undefined) return "bg-zinc-600";
  if (percent >= 95) return "bg-red-500";
  if (percent >= 80) return "bg-amber-500";
  if (percent >= 50) return "bg-yellow-400";
  return "bg-emerald-500";
}

export function UsageBar({
  title,
  subtitle,
  window,
  deemphasized = false,
}: {
  title: string;
  subtitle: string;
  window: RateLimitWindow | null | undefined;
  deemphasized?: boolean;
}) {
  const percent = window?.used_percent ?? null;
  const clamped = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  const limitReached = window?.limit_reached ?? false;

  return (
    <div className={deemphasized ? "opacity-80" : ""}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-medium text-zinc-200">
          {title}{" "}
          <span className="text-xs font-normal text-zinc-500">{subtitle}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          {limitReached && (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-medium text-red-300">
              limit
            </span>
          )}
          <span className="font-mono text-sm text-zinc-100">
            {formatPercent(percent)}
          </span>
        </div>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-800"
        role="progressbar"
        aria-valuenow={percent ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${title} usage`}
      >
        <div
          className={`h-full rounded-full transition-all ${barColor(percent, limitReached)}`}
          style={{ width: `${percent === null ? 100 : clamped}%`, opacity: percent === null ? 0.25 : 1 }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span>window {formatWindow(window?.limit_window_seconds)}</span>
        {window?.reset_at ? (
          <Countdown target={window.reset_at} />
        ) : (
          <span>reset unknown</span>
        )}
      </div>
    </div>
  );
}
