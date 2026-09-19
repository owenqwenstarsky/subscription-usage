import { NextRequest, NextResponse } from "next/server";
import { fetchRotation, setRotation, toApiError } from "@/lib/proxy";
import { RotationStrategy } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID: RotationStrategy[] = [
  "least_used",
  "round_robin",
  "sticky",
  "sticky-thread",
];

export async function GET() {
  try {
    const rotation = await fetchRotation();
    return NextResponse.json({
      ...rotation,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON.", code: "invalid_json" },
      { status: 400 },
    );
  }

  const strategy = (body as { strategy?: unknown })?.strategy;
  if (typeof strategy !== "string" || !VALID.includes(strategy as RotationStrategy)) {
    return NextResponse.json(
      {
        error: "strategy must be least_used, round_robin, sticky, or sticky-thread.",
        code: "invalid_strategy",
      },
      { status: 400 },
    );
  }

  try {
    const rotation = await setRotation(strategy as RotationStrategy);
    return NextResponse.json({
      ...rotation,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}
