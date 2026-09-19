"use client";

import { OverviewCounts } from "@/lib/usage";
import { formatPercent } from "@/lib/format";
import { AccountFilter } from "./FilterBar";

function Stat({
  label,
  value,
  accent = "text-zinc-100",
  onClick,
}: {
  label: string;
  value: string;
  accent?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>
        {value}
      </div>
    </>
  );
  if (!onClick) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
        {inner}
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      title={`Filter: ${label}`}
      className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-left transition-colors hover:border-zinc-600"
    >
      {inner}
    </button>
  );
}

export function OverviewStats({
  counts,
  onFilter,
}: {
  counts: OverviewCounts;
  onFilter?: (f: AccountFilter) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
      <Stat label="Accounts" value={String(counts.total)} onClick={onFilter ? () => onFilter("all") : undefined} />
      <Stat
        label="Eligible"
        value={String(counts.eligible)}
        accent={counts.eligible > 0 ? "text-emerald-300" : "text-zinc-100"}
        onClick={onFilter ? () => onFilter("eligible") : undefined}
      />
      <Stat
        label="Exhausted"
        value={String(counts.exhausted)}
        accent={counts.exhausted > 0 ? "text-red-300" : "text-zinc-100"}
        onClick={onFilter ? () => onFilter("exhausted") : undefined}
      />
      <Stat
        label="Cooldown"
        value={String(counts.cooldown)}
        accent={counts.cooldown > 0 ? "text-amber-300" : "text-zinc-100"}
        onClick={onFilter ? () => onFilter("cooldown") : undefined}
      />
      <Stat
        label="Disabled"
        value={String(counts.disabled)}
        onClick={onFilter ? () => onFilter("disabled") : undefined}
      />
      <Stat
        label="Fetch errors"
        value={String(counts.errors)}
        accent={counts.errors > 0 ? "text-red-300" : "text-zinc-100"}
        onClick={onFilter ? () => onFilter("error") : undefined}
      />
      <Stat
        label="Token expired"
        value={String(counts.tokenExpired)}
        accent={counts.tokenExpired > 0 ? "text-red-300" : "text-zinc-100"}
      />
      <Stat
        label="Token < 1h"
        value={String(counts.tokenExpiringSoon)}
        accent={counts.tokenExpiringSoon > 0 ? "text-amber-300" : "text-zinc-100"}
      />
      <Stat
        label="Max primary"
        value={formatPercent(counts.maxPrimary)}
        accent={
          counts.maxPrimary !== null && counts.maxPrimary >= 95
            ? "text-red-300"
            : "text-zinc-100"
        }
      />
    </div>
  );
}
