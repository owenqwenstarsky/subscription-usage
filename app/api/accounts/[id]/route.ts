import { NextRequest, NextResponse } from "next/server";
import {
  deleteAccount,
  fetchSingleAccount,
  patchAccount,
  toApiError,
} from "@/lib/proxy";
import { AccountMetaResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/accounts/[id]">,
) {
  const { id } = await ctx.params;

  try {
    const account = await fetchSingleAccount(id);
    const payload: AccountMetaResponse = {
      account,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload);
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/accounts/[id]">,
) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON.", code: "invalid_json" },
      { status: 400 },
    );
  }

  const { label, status } = (body ?? {}) as {
    label?: unknown;
    status?: unknown;
  };

  if (label !== undefined && typeof label !== "string") {
    return NextResponse.json(
      { error: "label must be a string.", code: "invalid_label" },
      { status: 400 },
    );
  }
  if (
    status !== undefined &&
    status !== "active" &&
    status !== "disabled"
  ) {
    return NextResponse.json(
      { error: "status must be active or disabled.", code: "invalid_status" },
      { status: 400 },
    );
  }

  try {
    const account = await patchAccount(id, {
      ...(label !== undefined ? { label } : {}),
      ...(status !== undefined
        ? { status: status as "active" | "disabled" }
        : {}),
    });
    return NextResponse.json({
      account,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const { status: statusCode, body: errorBody } = toApiError(err);
    return NextResponse.json(errorBody, { status: statusCode });
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/accounts/[id]">,
) {
  const { id } = await ctx.params;

  try {
    await deleteAccount(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}
