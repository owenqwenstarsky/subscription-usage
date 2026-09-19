import { NextRequest, NextResponse } from "next/server";
import { getDeviceLogin, toApiError } from "@/lib/proxy";
import { DeviceLoginResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/device-login/[loginId]">,
) {
  const { loginId } = await ctx.params;

  try {
    const login = await getDeviceLogin(loginId);
    const payload: DeviceLoginResponse = {
      login,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload);
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}
