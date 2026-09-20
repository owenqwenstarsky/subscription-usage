import { NextRequest, NextResponse } from "next/server";
import { fetchAccounts, fetchAccountUsage, toApiError } from "@/lib/proxy";
import { UsageAllResponse } from "@/lib/types";
import { loadUsageItems } from "@/lib/usage-refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function GET(request: NextRequest) {
  const modeParam = request.nextUrl.searchParams.get("mode");
  if (modeParam !== null && modeParam !== "cached" && modeParam !== "live") {
    return NextResponse.json(
      { error: "mode must be cached or live.", code: "invalid_mode" },
      { status: 400 },
    );
  }
  const mode = modeParam === "live" ? "live" : "cached";

  try {
    const accounts = await fetchAccounts();

    const { items, failures } = await loadUsageItems(
      accounts,
      mode === "live",
      (accountId) => fetchAccountUsage(accountId, false),
    );
    const payload: UsageAllResponse = {
      mode,
      items,
      fetchedAt: new Date().toISOString(),
      failures,
    };
    return NextResponse.json(payload);
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}
