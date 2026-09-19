import { NextRequest, NextResponse } from "next/server";
import { fetchAccountUsage, toApiError } from "@/lib/proxy";
import { SingleUsageResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/accounts/[id]/usage">,
) {
  const { id } = await ctx.params;
  const modeParam = request.nextUrl.searchParams.get("mode");
  if (modeParam !== null && modeParam !== "cached" && modeParam !== "live") {
    return NextResponse.json(
      { error: "mode must be cached or live.", code: "invalid_mode" },
      { status: 400 },
    );
  }
  const mode = modeParam === "live" ? "live" : "cached";

  try {
    const usage = await fetchAccountUsage(id, mode === "cached");
    const payload: SingleUsageResponse = {
      usage,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload);
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}
