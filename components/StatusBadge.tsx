"use client";

import { AccountStatus } from "@/lib/types";

const STATUS_STYLES: Record<AccountStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  disabled: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
  expired: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  banned: "bg-red-500/15 text-red-300 ring-red-500/30",
};

export function StatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status] ?? STATUS_STYLES.disabled}`}
    >
      {status}
    </span>
  );
}

export function EligibilityBadge({ eligible }: { eligible: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        eligible
          ? "bg-sky-500/15 text-sky-300 ring-sky-500/30"
          : "bg-orange-500/15 text-orange-300 ring-orange-500/30"
      }`}
      title={eligible ? "Eligible for routing now" : "Not eligible for routing now"}
    >
      <span
        className={`mr-1.5 inline-block size-1.5 rounded-full ${eligible ? "bg-sky-400" : "bg-orange-400"}`}
      />
      {eligible ? "eligible" : "not eligible"}
    </span>
  );
}

export function LimitBadge({ reached }: { reached: boolean }) {
  if (!reached) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300 ring-1 ring-inset ring-red-500/30">
      limit reached
    </span>
  );
}
