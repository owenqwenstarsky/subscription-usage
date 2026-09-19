import { NextRequest, NextResponse } from "next/server";
import { fetchAccountUsage, toApiError } from "@/lib/proxy";
import { SingleUsageResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/accounts/[id]/refresh-usage">,
) {
  const { id } = await ctx.params;

  try {
    const usage = await fetchAccountUsage(id, false);
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
