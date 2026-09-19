"use client";

import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { EligibilityBadge, LimitBadge, StatusBadge } from "@/components/StatusBadge";
import { UsageBar } from "@/components/UsageBar";
import { accountDisplayName } from "@/lib/format";
import { UsageAllItem } from "@/lib/types";
import { isCoolingDown, isExhausted, quotaOf } from "@/lib/usage";
import { useNow } from "./Now";

export function AccountCard({ item }: { item: UsageAllItem }) {
  const { account } = item;
  const quota = quotaOf(item);
  const now = useNow();
  const exhausted = isExhausted(item);
  const coolingDown = isCoolingDown(account, now);
  const showStatus = account.status !== "active";

  return (
    <article
      className={`group relative min-w-0 overflow-hidden rounded-2xl border bg-zinc-900/70 p-5 shadow-[0_18px_50px_-36px_rgba(0,0,0,.92)] transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-900 ${
        exhausted ? "border-red-400/30" : "border-zinc-800/90 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-[-0.02em] text-zinc-100">
            {accountDisplayName(account)}
          </h2>
          {account.email && account.email !== accountDisplayName(account) && (
            <p className="mt-1 truncate text-xs text-zinc-500">{account.email}</p>
          )}
        </div>
        <Link
          href={`/accounts/${encodeURIComponent(account.id)}`}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-200 ring-1 ring-inset ring-indigo-300/15 transition hover:bg-indigo-400/10 hover:text-indigo-100 hover:ring-indigo-300/30"
        >
          Manage
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <EligibilityBadge eligible={account.eligible_now} />
        {showStatus && <StatusBadge status={account.status} />}
        <LimitBadge reached={exhausted} />
        {coolingDown && account.cooldown_until && (
          <span className="inline-flex items-center rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-200 ring-1 ring-inset ring-amber-300/20">
            Ready <Countdown target={account.cooldown_until} prefix="in" className="ml-1" />
          </span>
        )}
        {account.plan_type && (
          <span className="text-xs text-zinc-500">{quota?.plan_type ?? account.plan_type}</span>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <UsageBar title="Primary" subtitle="5h" window={quota?.rate_limit} />
        {quota?.secondary_rate_limit && (
          <UsageBar title="Secondary" subtitle="weekly" window={quota.secondary_rate_limit} />
        )}
        {!quota && (
          <p className="rounded-xl bg-zinc-950/70 px-3 py-2.5 text-sm text-zinc-500 ring-1 ring-inset ring-zinc-800">
            Usage data is not available yet.
          </p>
        )}
      </div>
    </article>
  );
}
