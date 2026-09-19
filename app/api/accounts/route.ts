import { NextResponse } from "next/server";
import { fetchAccounts, toApiError } from "@/lib/proxy";
import { AccountsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accounts = await fetchAccounts();
    const payload: AccountsResponse = {
      accounts,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload);
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}
