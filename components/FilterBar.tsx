"use client";

import { RotationStrategy } from "@/lib/types";

export type AccountFilter =
  | "all"
  | "eligible"
  | "exhausted"
  | "cooldown"
  | "error"
  | "disabled";

export type SortKey = "primary-desc" | "secondary-desc" | "reset-soonest" | "label";

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
  onFilter: (f: AccountFilter) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  query: string;
  onQuery: (q: string) => void;
  counts: Record<AccountFilter, number>;
}) {
  const filters: { key: AccountFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "eligible", label: "Eligible" },
    { key: "exhausted", label: "Exhausted" },
    { key: "cooldown", label: "Cooldown" },
    { key: "error", label: "Errors" },
    { key: "disabled", label: "Disabled" },
  ];

  const hasActiveFilter = filter !== "all" || query.trim() !== "";

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${
              filter === f.key
                ? "bg-zinc-100 text-zinc-900 ring-zinc-100"
                : "bg-transparent text-zinc-400 ring-zinc-700 hover:text-zinc-200 hover:ring-zinc-600"
            }`}
          >
            {f.label}{" "}
            <span className={filter === f.key ? "text-zinc-600" : "text-zinc-600"}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search label, email, id, plan…"
          className="w-56 rounded-md bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:outline-none focus:ring-zinc-600"
        />
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="rounded-md bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 ring-1 ring-zinc-800 focus:outline-none focus:ring-zinc-600"
          aria-label="Sort accounts"
        >
          <option value="primary-desc">Primary % ↓</option>
          <option value="secondary-desc">Secondary % ↓</option>
          <option value="reset-soonest">Reset soonest</option>
          <option value="label">Label A–Z</option>
        </select>
        {hasActiveFilter && (
          <button
            onClick={() => {
              onFilter("all");
              onQuery("");
            }}
            className="rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export function FilterCount({ visible, total }: { visible: number; total: number }) {
  if (visible === total) return null;
  return (
    <div className="text-xs text-zinc-500">
      Showing {visible} of {total} accounts
    </div>
  );
}

export function RotationControl({
  rotation,
  onChange,
  busy,
  error,
}: {
  rotation: RotationStrategy | null;
  onChange: (s: RotationStrategy) => void;
  busy: boolean;
  error?: string | null;
}) {
  const options: RotationStrategy[] = [
    "least_used",
    "round_robin",
    "sticky",
    "sticky-thread",
  ];
  // Enabled with a last-known/default value even when health fails, so a
  // failed health poll never blocks rotation changes.
  const effective = rotation ?? "least_used";
  return (
    <label className="flex items-center gap-2 text-xs text-zinc-400">
      Rotation
      <select
        value={effective}
        onChange={(e) => onChange(e.target.value as RotationStrategy)}
        disabled={busy}
        className="rounded-md bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 ring-1 ring-zinc-800 focus:outline-none focus:ring-zinc-600 disabled:opacity-50"
        title={error ? `Last rotation change failed: ${error}` : undefined}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {busy && <span className="text-zinc-600">saving…</span>}
    </label>
  );
}
