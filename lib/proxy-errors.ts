export interface ProxyErrorPayload {
  code?: string;
  message?: string;
}

export function parseProxyErrorPayload(payload: unknown): ProxyErrorPayload {
  if (!payload || typeof payload !== "object") return {};
  const value = payload as { error?: unknown; message?: unknown };
  return {
    ...(typeof value.error === "string" && value.error.trim()
      ? { code: value.error.trim() }
      : {}),
    ...(typeof value.message === "string" && value.message.trim()
      ? { message: value.message.trim() }
      : {}),
  };
}

export async function readProxyErrorResponse(response: Response): Promise<ProxyErrorPayload> {
  try {
    return parseProxyErrorPayload(await response.json());
  } catch {
    return {};
  }
}

export function mapProxyErrorStatus(code: string, proxyStatus?: number): number {
  if (code === "proxy_unreachable" || code === "proxy_auth_failed") return 502;
  if (code === "proxy_not_found") return 404;
  if (proxyStatus !== undefined && proxyStatus >= 400 && proxyStatus < 500) {
    return proxyStatus;
  }
  return 502;
}
