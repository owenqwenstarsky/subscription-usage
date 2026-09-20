import type {
  AdminAccount,
  AdminAccountUsage,
  UsageAllItem,
} from "./types";

type FetchAccountUsage = (accountId: string) => Promise<AdminAccountUsage>;

function cachedUsageItem(account: AdminAccount): UsageAllItem {
  return {
    account,
    quota: account.cached_quota ?? null,
    quotaSource: account.cached_quota?.source ?? "",
    quotaFetchedAt: account.cached_quota?.fetched_at ?? null,
  };
}

function pulledUsageItem(
  account: AdminAccount,
  usage: AdminAccountUsage,
): UsageAllItem {
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
}

export async function loadUsageItems(
  accounts: AdminAccount[],
  forcePull: boolean,
  fetchAccountUsage: FetchAccountUsage,
): Promise<{ items: UsageAllItem[]; failures: number }> {
  if (!forcePull || accounts.length === 0) {
    return { items: accounts.map(cachedUsageItem), failures: 0 };
  }

  const settled = await Promise.allSettled(
    accounts.map(async (account): Promise<UsageAllItem> => {
      if (account.status === "disabled") return cachedUsageItem(account);
      const usage = await fetchAccountUsage(account.id);
      return pulledUsageItem(account, usage);
    }),
  );

  const items = settled.map((result, index) => {
    const account = accounts[index]!;
    if (result.status === "fulfilled") return result.value;
    const reason =
      result.reason instanceof Error ? result.reason.message : String(result.reason);
    return { ...cachedUsageItem(account), error: reason };
  });

  return {
    items,
    failures: items.filter((item) => item.error).length,
  };
}
