import { NextResponse } from "next/server";
import {
  fetchHealth,
  fetchLiveHealth,
  getProxyHostLabel,
  toApiError,
} from "@/lib/proxy";
import { HealthResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Always returns HTTP 200 so SWR treats the payload as data (not error) and
 * the UI can always read proxyHost + distinguish "proxy down" from "bad key".
 * Failures are signaled via proxyReachable=false plus error/code fields.
 */
export async function GET() {
  const proxyHost = getProxyHostLabel();
  const fetchedAt = new Date().toISOString();

  // /health/live needs no key; try it first to distinguish "proxy down"
  // from "key wrong".
  try {
    await fetchLiveHealth();
  } catch (err) {
    const { body } = toApiError(err);
    const payload: HealthResponse = {
      proxyReachable: false,
      proxyHost,
      fetchedAt,
      error: body.error,
      code: body.code,
    };
    return NextResponse.json(payload);
  }

  try {
    const health = await fetchHealth();
    const payload: HealthResponse = {
      proxyReachable: true,
      proxyHost,
      live: { status: "ok" },
      health,
      fetchedAt,
    };
    return NextResponse.json(payload);
  } catch (err) {
    const { body } = toApiError(err);
    // Live ping worked but authed call failed (e.g. bad key).
    const payload: HealthResponse = {
      proxyReachable: true,
      proxyHost,
      live: { status: "ok" },
      fetchedAt,
      error: body.error,
      code: body.code,
    };
    return NextResponse.json(payload);
  }
}
