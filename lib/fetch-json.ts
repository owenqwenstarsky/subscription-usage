/** Shared browser fetch helper for this site's own API routes. */

import { ApiError } from "./types";

export class ApiHttpError extends Error {
  readonly code: string;
  readonly status: number;
  readonly proxyStatus?: number;

  constructor(message: string, code: string, status: number, proxyStatus?: number) {
    super(message);
    this.name = "ApiHttpError";
    this.code = code;
    this.status = status;
    this.proxyStatus = proxyStatus;
  }
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as Partial<ApiError>;
    throw new ApiHttpError(
      err.error ?? `Request failed (${res.status})`,
      err.code ?? "http_error",
      res.status,
      err.proxyStatus,
    );
  }
  return data as T;
}

export const fetcher = <T,>(path: string) => fetchJson<T>(path);
