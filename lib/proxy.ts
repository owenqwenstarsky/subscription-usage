/**
 * Server-only client for the chatgpt-codex-proxy admin API.
 *
 * IMPORTANT: This module reads PROXY_API_KEY from server env. Never import it
 * from client components ("use client") — only from Route Handlers / server code.
 * The `server-only` import below turns an accidental client import into a
 * build-time error.
 */

import "server-only";

import {
  AdminAccount,
  AdminAccountUsage,
  ApiError,
  DeviceLoginRecord,
  ActivityLogDatesResponse,
  ActivityLogResponse,
  ActivitySnapshot,
  ProxyHealth,
  RotationStrategy,
} from "./types";
import { mapProxyErrorStatus, readProxyErrorResponse } from "./proxy-errors";

export class ProxyConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProxyConfigError";
  }
}

export class ProxyRequestError extends Error {
  readonly proxyStatus?: number;
  readonly code: string;

  constructor(message: string, code: string, proxyStatus?: number) {
    super(message);
    this.name = "ProxyRequestError";
    this.code = code;
    this.proxyStatus = proxyStatus;
  }
}

function getBaseUrl(): string {
  const raw = (process.env.PROXY_BASE_URL ?? "").trim() || "http://localhost:8080";
  return raw.replace(/\/+$/, "");
}

function getApiKey(): string {
  const key = (process.env.PROXY_API_KEY ?? "").trim();
  if (!key) {
    throw new ProxyConfigError(
      "PROXY_API_KEY is not set. Add it to web/.env.local (same value as the proxy's PROXY_API_KEY).",
    );
  }
  return key;
}

/**
 * Proxy host shown in the UI. Never includes the API key.
 */
export function getProxyHostLabel(): string {
  try {
    const url = new URL(getBaseUrl());
    return url.host;
  } catch {
    return getBaseUrl();
  }
}

interface ProxyFetchOptions {
  method?: string;
  body?: unknown;
  /** Defaults to 15s; live usage fan-out uses a longer budget. */
  timeoutMs?: number;
  /** Live upstream quota fetches can be slow; callers may raise this. */
  authenticated?: boolean;
}

async function proxyFetch<T>(
  path: string,
  options: ProxyFetchOptions = {},
): Promise<T> {
  const { method = "GET", body, timeoutMs = 15_000, authenticated = true } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        ...(authenticated ? { Authorization: `Bearer ${getApiKey()}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof ProxyConfigError) throw err;
    const reason =
      err instanceof Error && err.name === "AbortError"
        ? `timed out after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err);
    throw new ProxyRequestError(
      `Proxy unreachable at ${getBaseUrl()} (${reason})`,
      "proxy_unreachable",
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new ProxyRequestError(
        "Proxy rejected the API key (401/403). Check that PROXY_API_KEY matches the proxy's key.",
        "proxy_auth_failed",
        res.status,
      );
    }
    // Admin endpoints use { error: stable_code, message: safe explanation }.
    // Preserve that contract so callers can distinguish invalid input from an
    // unavailable proxy instead of receiving a generic gateway error.
    const { code: upstreamCode, message: upstreamMessage } =
      await readProxyErrorResponse(res);
    const fallbackCode = res.status === 404 ? "proxy_not_found" : "proxy_request_failed";
    const fallbackMessage =
      res.status === 404
        ? "Not found on proxy."
        : `Proxy request failed: ${method} ${path} -> ${res.status}`;
    throw new ProxyRequestError(
      upstreamMessage ?? fallbackMessage,
      upstreamCode ?? fallbackCode,
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function toApiError(err: unknown): { status: number; body: ApiError } {
  if (err instanceof ProxyConfigError) {
    return {
      status: 500,
      body: { error: err.message, code: "config_error" },
    };
  }
  if (err instanceof ProxyRequestError) {
    const status = mapProxyErrorStatus(err.code, err.proxyStatus);
    return {
      status,
      body: {
        error: err.message,
        code: err.code,
        ...(err.proxyStatus ? { proxyStatus: err.proxyStatus } : {}),
      },
    };
  }
  return {
    status: 500,
    body: {
      error: err instanceof Error ? err.message : "Unknown error",
      code: "internal_error",
    },
  };
}

export async function fetchLiveHealth(): Promise<ProxyHealth> {
  return proxyFetch<ProxyHealth>("/health/live", { authenticated: false });
}

export async function fetchHealth(): Promise<ProxyHealth> {
  return proxyFetch<ProxyHealth>("/health");
}

export async function fetchAccounts(): Promise<AdminAccount[]> {
  const data = await proxyFetch<{ accounts: AdminAccount[] }>("/admin/accounts");
  return Array.isArray(data.accounts) ? data.accounts : [];
}

export async function fetchAccountUsage(
  accountId: string,
  cached: boolean,
  timeoutMs = 30_000,
): Promise<AdminAccountUsage> {
  const suffix = cached ? "?cached=true" : "";
  return proxyFetch<AdminAccountUsage>(
    `/admin/accounts/${encodeURIComponent(accountId)}/usage${suffix}`,
    { timeoutMs },
  );
}

export async function refreshAccountToken(
  accountId: string,
): Promise<{ account: AdminAccount }> {
  return proxyFetch<{ account: AdminAccount }>(
    `/admin/accounts/${encodeURIComponent(accountId)}/refresh`,
    { method: "POST", timeoutMs: 60_000 },
  );
}

export async function fetchRotation(): Promise<{ strategy: RotationStrategy }> {
  return proxyFetch<{ strategy: RotationStrategy }>("/admin/rotation");
}

export async function setRotation(
  strategy: RotationStrategy,
): Promise<{ strategy: RotationStrategy }> {
  return proxyFetch<{ strategy: RotationStrategy }>("/admin/rotation", {
    method: "PUT",
    body: { strategy },
  });
}

export async function patchAccount(
  accountId: string,
  body: { label?: string; status?: "active" | "disabled" },
): Promise<AdminAccount> {
  return proxyFetch<AdminAccount>(
    `/admin/accounts/${encodeURIComponent(accountId)}`,
    { method: "PATCH", body },
  );
}

export async function deleteAccount(accountId: string): Promise<void> {
  await proxyFetch<void>(`/admin/accounts/${encodeURIComponent(accountId)}`, {
    method: "DELETE",
  });
}

/**
 * The proxy has no single-account metadata endpoint, so resolve one account
 * from the list. Used for the detail page header (label/email/plan).
 */
export async function fetchSingleAccount(accountId: string): Promise<AdminAccount> {
  const accounts = await fetchAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) {
    throw new ProxyRequestError(
      `Account ${accountId} not found on proxy.`,
      "proxy_not_found",
      404,
    );
  }
  return account;
}

export async function startDeviceLogin(): Promise<DeviceLoginRecord> {
  return proxyFetch<DeviceLoginRecord>("/admin/accounts/device-login/start", {
    method: "POST",
    timeoutMs: 60_000,
  });
}

export async function getDeviceLogin(loginId: string): Promise<DeviceLoginRecord> {
  return proxyFetch<DeviceLoginRecord>(
    `/admin/accounts/device-login/${encodeURIComponent(loginId)}`,
  );
}

export async function fetchActivitySnapshot(): Promise<ActivitySnapshot> {
  return proxyFetch<ActivitySnapshot>("/admin/requests/activity");
}

export async function fetchActivityLogDates(): Promise<ActivityLogDatesResponse> {
  return proxyFetch<ActivityLogDatesResponse>("/admin/requests/logs/dates");
}

export async function fetchActivityLogs(query: string): Promise<ActivityLogResponse> {
  return proxyFetch<ActivityLogResponse>(`/admin/requests/logs?${query}`);
}

/**
 * Opens the proxy's protected SSE activity feed. This deliberately returns the
 * raw response so the Route Handler can pass its body straight to EventSource.
 */
export async function fetchActivityStream(signal: AbortSignal): Promise<Response> {
  try {
    const res = await fetch(`${getBaseUrl()}/admin/requests/activity/stream`, {
      headers: { Authorization: `Bearer ${getApiKey()}`, Accept: "text/event-stream" },
      signal,
      cache: "no-store",
    });
    if (!res.ok || !res.body) {
      throw new ProxyRequestError(
        `Proxy activity stream failed -> ${res.status}`,
        "proxy_request_failed",
        res.status,
      );
    }
    return res;
  } catch (err) {
    if (err instanceof ProxyConfigError || err instanceof ProxyRequestError) throw err;
    const reason = err instanceof Error ? err.message : String(err);
    throw new ProxyRequestError(
      `Proxy activity stream unreachable at ${getBaseUrl()} (${reason})`,
      "proxy_unreachable",
    );
  }
}
