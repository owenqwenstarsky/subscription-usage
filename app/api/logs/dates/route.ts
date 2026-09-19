import { NextResponse } from "next/server";
import { fetchActivityLogDates, toApiError } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await fetchActivityLogDates(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}
