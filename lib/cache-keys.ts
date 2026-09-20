/**
 * Shared SWR cache-key contract between server-provided data, client reads,
 * and mutations. Keep this module free of server-only and client-only
 * imports so every layer can reuse it.
 *
 * The key strings must match the Route Handler URLs exactly; if a key and
 * its fetcher URL drift, SWR ignores cached/optimistic values and refetches.
 */

export type UsageMode = "cached" | "live";

export function manualUsageMode(status?: string): UsageMode {
  return status === "disabled" ? "cached" : "live";
}

export const healthKey = "/api/health";

export const rotationKey = "/api/rotation";

export function usageAllKey(mode: UsageMode): string {
  return `/api/accounts/usage-all?mode=${mode}`;
}

export function accountUsageKey(accountId: string, mode: UsageMode): string {
  return `/api/accounts/${encodeURIComponent(accountId)}/usage?mode=${mode}`;
}

export function accountMetaKey(accountId: string): string {
  return `/api/accounts/${encodeURIComponent(accountId)}`;
}

export function deviceLoginKey(loginId: string): string {
  return `/api/device-login/${encodeURIComponent(loginId)}`;
}
