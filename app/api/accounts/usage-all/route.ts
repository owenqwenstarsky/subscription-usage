import { NextRequest, NextResponse } from "next/server";
import { fetchAccounts, fetchAccountUsage, toApiError } from "@/lib/proxy";
import { UsageAllItem, UsageAllResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function GET(request: NextRequest) {
  const modeParam = request.nextUrl.searchParams.get("mode");
  if (modeParam !== null && modeParam !== "cached" && modeParam !== "live") {
    return NextResponse.json(
      { error: "mode must be cached or live.", code: "invalid_mode" },
      { status: 400 },
    );
  }
  const mode = modeParam === "live" ? "live" : "cached";

  try {
    const accounts = await fetchAccounts();

    if (mode === "cached" || accounts.length === 0) {
      const items: UsageAllItem[] = accounts.map((account) => ({
        account,
        quota: account.cached_quota ?? null,
        quotaSource: account.cached_quota?.source ?? "",
        quotaFetchedAt: account.cached_quota?.fetched_at ?? null,
      }));
      const payload: UsageAllResponse = {
        mode,
        items,
        fetchedAt: new Date().toISOString(),
        failures: 0,
      };
      return NextResponse.json(payload);
    }

    // Live mode: fan out to the proxy; one bad account must not fail the page.
    // Disabled accounts cannot make an upstream usage request, so keep their
    // cached values without treating them as failures.
    const settled = await Promise.allSettled(
      accounts.map(async (account): Promise<UsageAllItem> => {
        if (account.status === "disabled") {
          return {
            account,
            quota: account.cached_quota ?? null,
            quotaSource: account.cached_quota?.source ?? "",
            quotaFetchedAt: account.cached_quota?.fetched_at ?? null,
          };
        }
        const usage = await fetchAccountUsage(account.id, false);
        const quota = usage.quota_runtime ?? usage.cached_quota ?? null;
        return {
          account: {
            ...account,
            status: usage.status,
            eligible_now: usage.eligible_now,
            cooldown_until: usage.cooldown_until ?? null,
            last_error: usage.last_error ?? "",
            cached_quota: usage.cached_quota ?? account.cached_quota,
            oauth_expires: usage.oauth_expires,
          },
          quota,
          quotaSource: usage.quota_source ?? quota?.source ?? "",
          quotaFetchedAt: usage.quota_fetched_at ?? quota?.fetched_at ?? null,
        };
      }),
    );

    const items: UsageAllItem[] = settled.map((result, index) => {
      // accounts[index] always exists: same length as settled input.
      const account = accounts[index]!;
      if (result.status === "fulfilled") return result.value;
      const reason =
        result.reason instanceof Error ? result.reason.message : String(result.reason);
      return {
        account,
        quota: account.cached_quota ?? null,
        quotaSource: account.cached_quota?.source ?? "",
        quotaFetchedAt: account.cached_quota?.fetched_at ?? null,
        error: reason,
      };
    });

    const failures = items.filter((item) => item.error).length;
    const payload: UsageAllResponse = {
      mode,
      items,
      fetchedAt: new Date().toISOString(),
      failures,
    };
    return NextResponse.json(payload);
  } catch (err) {
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}
