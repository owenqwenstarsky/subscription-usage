import { NextResponse } from "next/server";
import { startDeviceLogin, toApiError } from "@/lib/proxy";
import { DeviceLoginResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST() {
  try {
    const login = await startDeviceLogin();
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
