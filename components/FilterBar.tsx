"use client";

import { RotationStrategy } from "@/lib/types";

export type AccountFilter =
  | "all"
  | "eligible"
  | "exhausted"
  | "cooldown"
  | "error"
  | "disabled";

export type SortKey = "custom" | "primary-desc" | "secondary-desc" | "reset-soonest" | "label";

const FILTERS: { key: AccountFilter; label: string }[] = [
  { key: "all", label: "All accounts" },
  { key: "eligible", label: "Ready" },
  { key: "exhausted", label: "Limit reached" },
  { key: "cooldown", label: "Cooldown" },
  { key: "error", label: "Needs attention" },
  { key: "disabled", label: "Disabled" },
];

export function FilterBar({
  filter,
  onFilter,
  sort,
  onSort,
  query,
  onQuery,
  counts,
}: {
  filter: AccountFilter;
  onFilter: (filter: AccountFilter) => void;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  query: string;
  onQuery: (query: string) => void;
  counts: Record<AccountFilter, number>;
}) {
  const hasActiveFilter = filter !== "all" || query.trim() !== "";

  return (
    <section aria-label="Find accounts" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search accounts"
          aria-label="Search accounts"
          className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-indigo-300/50 focus:ring-2 focus:ring-indigo-400/10"
        />
        <select
          value={filter}
          onChange={(event) => onFilter(event.target.value as AccountFilter)}
          className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300 outline-none transition focus:border-indigo-300/50 focus:ring-2 focus:ring-indigo-400/10"
          aria-label="Filter accounts"
        >
          {FILTERS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label} ({counts[option.key]})
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={sort}
          onChange={(event) => onSort(event.target.value as SortKey)}
          className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300 outline-none transition focus:border-indigo-300/50 focus:ring-2 focus:ring-indigo-400/10 sm:flex-none"
          aria-label="Sort accounts"
        >
          <option value="custom">Custom order</option>
          <option value="primary-desc">Usage: high to low</option>
          <option value="secondary-desc">Secondary: high to low</option>
          <option value="reset-soonest">Reset soonest</option>
          <option value="label">Name: A to Z</option>
        </select>
        {hasActiveFilter && (
          <button
            onClick={() => {
              onFilter("all");
              onQuery("");
            }}
            className="rounded-lg px-2 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
          >
            Clear
          </button>
        )}
      </div>
    </section>
  );
}

export function FilterCount({ visible, total }: { visible: number; total: number }) {
  if (visible === total) return null;
  return <p className="text-xs text-zinc-500">{visible} of {total} accounts shown</p>;
}

export function RotationControl({
  rotation,
  onChange,
  busy,
  error,
}: {
  rotation: RotationStrategy | null;
  onChange: (strategy: RotationStrategy) => void;
  busy: boolean;
  error?: string | null;
}) {
  const options: RotationStrategy[] = ["least_used", "round_robin", "sticky", "sticky-thread"];
  const effective = rotation ?? "least_used";

  return (
    <label className="flex items-center justify-between gap-4 text-sm text-zinc-400">
      <span>Rotation</span>
      <select
        value={effective}
        onChange={(event) => onChange(event.target.value as RotationStrategy)}
        disabled={busy}
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-300/50 disabled:opacity-50"
        title={error ? `Last rotation change failed: ${error}` : undefined}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
