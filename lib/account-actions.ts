/**
 * Shared account mutation helpers used by AccountCard and AccountDetail.
 * Each helper talks to this site's own API routes (never the proxy directly)
 * and returns the server-confirmed payload so callers can patch SWR caches.
 */

import { fetchJson } from "./fetch-json";
import {
  AccountMetaResponse,
  AdminAccount,
  SingleUsageResponse,
} from "./types";

export async function liveRefreshAccount(accountId: string): Promise<SingleUsageResponse> {
  return fetchJson<SingleUsageResponse>(
    `/api/accounts/${encodeURIComponent(accountId)}/refresh-usage`,
    { method: "POST" },
  );
}

export async function tokenRefreshAccount(accountId: string): Promise<AdminAccount> {
  const data = await fetchJson<{ account: AdminAccount; fetchedAt: string }>(
    `/api/accounts/${encodeURIComponent(accountId)}/refresh-token`,
    { method: "POST" },
  );
  return data.account;
}

export async function patchAccountStatus(
  accountId: string,
  status: "active" | "disabled",
): Promise<AdminAccount> {
  const data = await fetchJson<AccountMetaResponse>(
    `/api/accounts/${encodeURIComponent(accountId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  return data.account;
}

export async function patchAccountLabel(
  accountId: string,
  label: string,
): Promise<AdminAccount> {
  const data = await fetchJson<AccountMetaResponse>(
    `/api/accounts/${encodeURIComponent(accountId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    },
  );
  return data.account;
}

export async function deleteAccountById(accountId: string): Promise<void> {
  const res = await fetch(`/api/accounts/${encodeURIComponent(accountId)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
}
