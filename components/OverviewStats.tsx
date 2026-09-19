"use client";

import { formatPercent } from "@/lib/format";
import { OverviewCounts } from "@/lib/usage";
import { AccountFilter } from "./FilterBar";

function SummaryStat({
  label,
  value,
  hint,
  tone = "text-zinc-100",
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </span>
      <span className={`mt-1 block text-2xl font-semibold tracking-[-0.04em] tabular-nums ${tone}`}>
        {value}
      </span>
      <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>
    </>
  );

  return onClick ? (
    <button
      onClick={onClick}
      className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 text-left transition hover:border-indigo-300/30 hover:bg-zinc-900"
    >
      {content}
    </button>
  ) : (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">{content}</div>
  );
}

export function OverviewStats({
  counts,
  onFilter,
}: {
  counts: OverviewCounts;
  onFilter?: (filter: AccountFilter) => void;
}) {
  const needsAttention = counts.exhausted + counts.cooldown + counts.errors;

  return (
    <section aria-label="Account summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryStat
        label="Accounts"
        value={String(counts.total)}
        hint="in this workspace"
        onClick={onFilter ? () => onFilter("all") : undefined}
      />
      <SummaryStat
        label="Ready"
        value={String(counts.eligible)}
        hint="available now"
        tone={counts.eligible > 0 ? "text-teal-300" : undefined}
        onClick={onFilter ? () => onFilter("eligible") : undefined}
      />
      <SummaryStat
        label="Attention"
        value={String(needsAttention)}
        hint="limits, cooldowns, or errors"
        tone={needsAttention > 0 ? "text-amber-300" : undefined}
      />
      <SummaryStat
        label="Peak usage"
        value={formatPercent(counts.maxPrimary)}
        hint="highest primary window"
        tone={counts.maxPrimary !== null && counts.maxPrimary >= 95 ? "text-red-300" : undefined}
      />
    </section>
  );
}
