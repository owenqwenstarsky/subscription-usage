import { NextRequest, NextResponse } from "next/server";
import { refreshAccountToken, toApiError } from "@/lib/proxy";
import { AdminAccount } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/accounts/[id]/refresh-token">,
) {
  const { id } = await ctx.params;

  try {
    const { account } = await refreshAccountToken(id);
    return NextResponse.json({
      account,
      fetchedAt: new Date().toISOString(),
    } satisfies { account: AdminAccount; fetchedAt: string });
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}
