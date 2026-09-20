/** Client-safe aggregations over accounts + usage. */

import {
  AdminAccount,
  AdminAccountUsage,
  QuotaSnapshot,
  RateLimitWindow,
  UsageAllItem,
} from "./types";

export function quotaOf(item: UsageAllItem) {
  return item.quota ?? item.account.cached_quota ?? null;
}

export function isExhausted(item: UsageAllItem): boolean {
  const quota = quotaOf(item);
  if (!quota) return false;
  return (
    quota.rate_limit.limit_reached ||
    quota.secondary_rate_limit?.limit_reached === true
  );
}

export function isCoolingDown(account: AdminAccount, now = Date.now()): boolean {
  if (!account.cooldown_until) return false;
  const ms = Date.parse(account.cooldown_until);
  return !Number.isNaN(ms) && ms > now;
}

/** True for either a failed UI refresh or the proxy's most recent account error. */
export function hasAccountError(item: UsageAllItem): boolean {
  return Boolean(item.error || item.account.last_error);
}

export function primaryPercent(item: UsageAllItem): number | null {
  const quota = quotaOf(item);
  const value = quota?.rate_limit.used_percent;
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

export interface OverviewCounts {
  total: number;
  eligible: number;
  exhausted: number;
  cooldown: number;
  disabled: number;
  errors: number;
  tokenExpiringSoon: number;
  tokenExpired: number;
  maxPrimary: number | null;
  avgPrimary: number | null;
}

export function summarize(items: UsageAllItem[], now = Date.now()): OverviewCounts {
  let eligible = 0;
  let exhausted = 0;
  let cooldown = 0;
  let disabled = 0;
  let errors = 0;
  let tokenExpiringSoon = 0;
  let tokenExpired = 0;
  let maxPrimary: number | null = null;
  let primarySum = 0;
  let primaryCount = 0;

  for (const item of items) {
    if (item.account.eligible_now) eligible += 1;
    if (isExhausted(item)) exhausted += 1;
    if (isCoolingDown(item.account, now)) cooldown += 1;
    if (item.account.status === "disabled") disabled += 1;
    if (hasAccountError(item)) errors += 1;

    const expiresMs = Date.parse(item.account.oauth_expires);
    if (!Number.isNaN(expiresMs)) {
      const diff = expiresMs - now;
      if (diff <= 0) {
        tokenExpired += 1;
      } else if (diff < 60 * 60 * 1000) {
        tokenExpiringSoon += 1;
      }
    }

    const pct = primaryPercent(item);
    if (pct !== null) {
      primarySum += pct;
      primaryCount += 1;
      if (maxPrimary === null || pct > maxPrimary) maxPrimary = pct;
    }
  }

  return {
    total: items.length,
    eligible,
    exhausted,
    cooldown,
    disabled,
    errors,
    tokenExpiringSoon,
    tokenExpired,
    maxPrimary,
    avgPrimary: primaryCount > 0 ? primarySum / primaryCount : null,
  };
}

export function resetTimestamp(window: RateLimitWindow | null | undefined): number | null {
  if (!window?.reset_at) return null;
  const ms = Date.parse(window.reset_at);
  return Number.isNaN(ms) ? null : ms;
}

/** Effective quota from a live usage response (fresh runtime, else cached). */
export function liveQuotaOfUsage(usage: AdminAccountUsage): QuotaSnapshot | null {
  return usage.quota_runtime ?? usage.cached_quota ?? null;
}

/**
 * Merge a live usage response into a list account. Mirrors the server fan-out
 * in app/api/accounts/usage-all/route.ts. NOTE: the usage response carries no
 * label/email/plan_type, so those are preserved from the existing account.
 */
export function applyLiveUsage(
  account: AdminAccount,
  usage: AdminAccountUsage,
): AdminAccount {
  return {
    ...account,
    status: usage.status,
    eligible_now: usage.eligible_now,
    cooldown_until: usage.cooldown_until ?? null,
    last_error: usage.last_error ?? "",
    cached_quota: usage.cached_quota ?? account.cached_quota,
    oauth_expires: usage.oauth_expires,
  };
}

export function liveQuotaSource(
  usage: AdminAccountUsage,
  quota: QuotaSnapshot | null,
): string {
  return usage.quota_source ?? quota?.source ?? "";
}

export function liveQuotaFetchedAt(
  usage: AdminAccountUsage,
  quota: QuotaSnapshot | null,
): string | null {
  return usage.quota_fetched_at ?? quota?.fetched_at ?? null;
}
