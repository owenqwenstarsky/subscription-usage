import { NextResponse } from "next/server";
import { fetchActivitySnapshot, toApiError } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await fetchActivitySnapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}
