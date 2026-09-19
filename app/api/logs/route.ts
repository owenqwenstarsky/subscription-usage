import { NextRequest, NextResponse } from "next/server";
import { fetchActivityLogs, toApiError } from "@/lib/proxy";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const OUTCOMES = new Set(["active", "succeeded", "failed", "cancelled", "timed_out"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const date = params.get("date") ?? "";
  const outcome = params.get("outcome") ?? "";
  const q = params.get("q") ?? "";
  const account = params.get("account") ?? "";
  const model = params.get("model") ?? "";
  const cursor = params.get("cursor") ?? "";
  const requestedLimit = Number(params.get("limit") ?? "50");

  if (!DATE.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD.", code: "invalid_date" }, { status: 400 });
  }
  if (outcome && !OUTCOMES.has(outcome)) {
    return NextResponse.json({ error: "Invalid outcome filter.", code: "invalid_outcome" }, { status: 400 });
  }
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
    return NextResponse.json({ error: "limit must be between 1 and 100.", code: "invalid_limit" }, { status: 400 });
  }
  if ([q, account, model, cursor].some((value) => value.length > 200)) {
    return NextResponse.json({ error: "A filter value is too long.", code: "invalid_filter" }, { status: 400 });
  }

  const query = new URLSearchParams({ date, limit: String(requestedLimit) });
  if (outcome) query.set("outcome", outcome);
  if (q) query.set("q", q);
  if (account) query.set("account", account);
  if (model) query.set("model", model);
  if (cursor) query.set("cursor", cursor);

  try {
    return NextResponse.json(await fetchActivityLogs(query.toString()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}
