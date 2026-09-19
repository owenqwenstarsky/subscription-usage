"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { AccountCard } from "@/components/AccountCard";
import { AddAccount } from "@/components/AddAccount";
import { useNow } from "@/components/Now";
import {
  AccountFilter,
  FilterBar,
  FilterCount,
  RotationControl,
  SortKey,
} from "@/components/FilterBar";
import { OverviewStats } from "@/components/OverviewStats";
import { CardSkeleton, EmptyState, ErrorBanner } from "@/components/States";
import {
  healthKey,
  rotationKey,
  usageAllKey,
} from "@/lib/cache-keys";
import { fetchJson, fetcher, ApiHttpError } from "@/lib/fetch-json";
import { accountDisplayName, formatAgo } from "@/lib/format";
import {
  HealthResponse,
  RotationStrategy,
  UsageAllResponse,
} from "@/lib/types";
import {
  isCoolingDown,
  isExhausted,
  quotaOf,
  resetTimestamp,
  summarize,
} from "@/lib/usage";

const FILTERS: AccountFilter[] = [
  "all",
  "eligible",
  "exhausted",
  "cooldown",
  "error",
  "disabled",
];
const SORTS: SortKey[] = ["primary-desc", "secondary-desc", "reset-soonest", "label"];
const POLL_OPTIONS = [15_000, 30_000, 60_000, 300_000];

function parseFilter(v: string | null): AccountFilter {
  return v !== null && FILTERS.includes(v as AccountFilter)
    ? (v as AccountFilter)
    : "all";
}

function parseSort(v: string | null): SortKey {
  return v !== null && SORTS.includes(v as SortKey) ? (v as SortKey) : "primary-desc";
}

function readLS(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function errorDetails(err: unknown): string | null {
  if (err instanceof ApiHttpError) {
    const parts = [`code: ${err.code}`, `http: ${err.status}`];
    if (err.proxyStatus) parts.push(`proxy: ${err.proxyStatus}`);
    return parts.join(" · ");
  }
  return null;
}

interface RotationResponse {
  strategy: RotationStrategy;
  fetchedAt: string;
}

export function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = useNow();

  // ---- UI state: filter/sort/search live in the URL (shareable, survives back-nav)
  const [filter, setFilter] = useState<AccountFilter>(() =>
    parseFilter(searchParams.get("filter")),
  );
  const [sort, setSort] = useState<SortKey>(() => parseSort(searchParams.get("sort")));
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  // Poll prefs persist locally (not in URL).
  const [autoRefresh, setAutoRefresh] = useState(
    () => readLS("usage-viewer:auto") !== "off",
  );
  const [pollMs, setPollMs] = useState(() => {
    const v = Number(readLS("usage-viewer:poll"));
    return POLL_OPTIONS.includes(v) ? v : 60_000;
  });
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem("usage-viewer:auto", autoRefresh ? "on" : "off");
      window.localStorage.setItem("usage-viewer:poll", String(pollMs));
    } catch {
      // Private mode etc. — prefs just won't persist.
    }
  }, [autoRefresh, pollMs]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (sort !== "primary-desc") params.set("sort", sort);
    if (query.trim() !== "") params.set("q", query.trim());
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filter, sort, query, router, pathname]);

  // ---- Data: cached usage list (polls), health (polls slower), rotation (own key)
  const [liveRefreshing, setLiveRefreshing] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveDetails, setLiveDetails] = useState<string | null>(null);
  const [rotationBusy, setRotationBusy] = useState(false);
  const [rotationError, setRotationError] = useState<string | null>(null);
  const liveAbort = useRef<AbortController | null>(null);

  const {
    data: usageData,
    error: usageError,
    isLoading: usageLoading,
    isValidating: usageValidating,
    mutate: mutateUsage,
  } = useSWR<UsageAllResponse>(usageAllKey("cached"), fetcher, {
    refreshInterval: autoRefresh ? pollMs : 0,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
    onSuccess: (data) => {
      // A fresh cached poll supersedes any earlier live-attempt failure.
      if (data.mode === "cached") {
        setLiveError(null);
        setLiveDetails(null);
      }
    },
  });

  const { data: health } = useSWR<HealthResponse>(healthKey, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });

  const { data: rotationData, mutate: mutateRotation } = useSWR<RotationResponse>(
    rotationKey,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false },
  );

  const rotation: RotationStrategy | null =
    rotationData?.strategy ?? health?.health?.rotation ?? null;

  const items = useMemo(() => usageData?.items ?? [], [usageData]);
  const fetchedAt = usageData?.fetchedAt ?? null;
  const failures = usageData?.failures ?? 0;
  const proxyDown = health ? !health.proxyReachable : false;

  // ---- Live refresh all (cancellable; per-account failures stay on cards)
  async function handleLiveRefreshAll() {
    liveAbort.current?.abort();
    const ctrl = new AbortController();
    liveAbort.current = ctrl;
    setLiveRefreshing(true);
    setLiveError(null);
    setLiveDetails(null);
    try {
      const data = await fetchJson<UsageAllResponse>(usageAllKey("live"), {
        signal: ctrl.signal,
      });
      await mutateUsage(data, { revalidate: false });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setLiveError(errorMessage(err));
      setLiveDetails(errorDetails(err));
    } finally {
      if (liveAbort.current === ctrl) {
        liveAbort.current = null;
        setLiveRefreshing(false);
      }
    }
  }

  function cancelLiveRefresh() {
    liveAbort.current?.abort();
  }

  async function handleCachedRefresh() {
    try {
      await mutateUsage();
      setLiveError(null);
      setLiveDetails(null);
    } catch {
      // Failure surfaces via usageError banner.
    }
  }

  // ---- Rotation change: optimistic with rollback, works even if health failed
  async function handleRotationChange(strategy: RotationStrategy) {
    setRotationBusy(true);
    setRotationError(null);
    try {
      await mutateRotation(
        async () => {
          const res = await fetchJson<RotationResponse>(rotationKey, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ strategy }),
          });
          return res;
        },
        {
          optimisticData: { strategy, fetchedAt: new Date().toISOString() },
          rollbackOnError: true,
          revalidate: false,
        },
      );
    } catch (err) {
      setRotationError(errorMessage(err));
    } finally {
      setRotationBusy(false);
    }
  }

  // ---- Revalidate once when the nearest cooldown/reset expires while visible
  const nextExpiry = useMemo(() => {
    let min: number | null = null;
    for (const item of items) {
      const quota = quotaOf(item);
      const candidates: (number | null)[] = [
        item.account.cooldown_until ? Date.parse(item.account.cooldown_until) : null,
        resetTimestamp(quota?.rate_limit),
        resetTimestamp(quota?.secondary_rate_limit),
      ];
      for (const t of candidates) {
        if (t === null || Number.isNaN(t) || t <= now) continue;
        if (min === null || t < min) min = t;
      }
    }
    return min;
  }, [items, now]);

  useEffect(() => {
    if (!autoRefresh || nextExpiry === null) return;
    const delay = nextExpiry - Date.now() + 1000;
    if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return;
    const timer = setTimeout(() => {
      void mutateUsage();
    }, delay);
    return () => clearTimeout(timer);
  }, [nextExpiry, autoRefresh, mutateUsage]);

  // ---- Derived: counts, filter, sort
  const counts = useMemo(() => summarize(items, now), [items, now]);

  const filterCounts = useMemo(() => {
    const c: Record<AccountFilter, number> = {
      all: items.length,
      eligible: 0,
      exhausted: 0,
      cooldown: 0,
      error: 0,
      disabled: 0,
    };
    for (const item of items) {
      if (item.account.eligible_now) c.eligible += 1;
      if (isExhausted(item)) c.exhausted += 1;
      if (isCoolingDown(item.account, now)) c.cooldown += 1;
      if (item.error) c.error += 1;
      if (item.account.status === "disabled") c.disabled += 1;
    }
    return c;
  }, [items, now]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      switch (filter) {
        case "eligible":
          if (!item.account.eligible_now) return false;
          break;
        case "exhausted":
          if (!isExhausted(item)) return false;
          break;
        case "cooldown":
          if (!isCoolingDown(item.account, now)) return false;
          break;
        case "error":
          if (!item.error && !item.account.last_error) return false;
          break;
        case "disabled":
          if (item.account.status !== "disabled") return false;
          break;
        case "all":
          break;
      }
      if (!q) return true;
      const haystack = [
        item.account.label ?? "",
        item.account.email ?? "",
        item.account.id,
        item.account.upstream_account_id,
        item.account.user_id ?? "",
        item.account.plan_type ?? "",
        item.account.last_error ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    const num = (v: number | null | undefined) => (v === null || v === undefined ? -1 : v);
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "secondary-desc":
          return (
            num(quotaOf(b)?.secondary_rate_limit?.used_percent) -
            num(quotaOf(a)?.secondary_rate_limit?.used_percent)
          );
        case "reset-soonest": {
          const ra = resetTimestamp(quotaOf(a)?.rate_limit) ?? Number.MAX_SAFE_INTEGER;
          const rb = resetTimestamp(quotaOf(b)?.rate_limit) ?? Number.MAX_SAFE_INTEGER;
          return ra - rb;
        }
        case "label":
          return accountDisplayName(a.account).localeCompare(
            accountDisplayName(b.account),
          );
        case "primary-desc":
        default:
          return (
            num(quotaOf(b)?.rate_limit.used_percent) -
            num(quotaOf(a)?.rate_limit.used_percent)
          );
      }
    });
  }, [items, filter, sort, query, now]);

  const usageErrorMessage = usageError ? errorMessage(usageError) : null;
  const stale = failures > 0 || items.some((i) => i.error);
  const dot = !usageData && usageLoading
    ? "bg-zinc-600"
    : proxyDown && items.length === 0
      ? "bg-red-500"
      : proxyDown || stale || liveError
        ? "bg-amber-500"
        : "bg-emerald-500";
  const dotTitle = proxyDown && items.length === 0
    ? "Proxy unreachable"
    : proxyDown
      ? "Proxy unreachable — showing stale cached data"
      : stale
        ? "Some accounts failed to refresh"
        : usageData
          ? "Proxy reachable"
          : "Loading…";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-9">
      <header className="rounded-2xl border border-zinc-800/90 bg-zinc-900/45 px-5 py-5 shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`inline-block size-2 rounded-full ring-4 ring-zinc-950/40 ${dot}`} title={dotTitle} />
              <h1 className="text-xl font-semibold tracking-[-0.035em] text-zinc-100 sm:text-2xl">Usage</h1>
              {usageValidating && usageData && <span className="text-xs text-zinc-500">Updating</span>}
            </div>
            <p className="mt-1.5 text-sm text-zinc-500">
              {fetchedAt ? `${usageData?.mode === "live" ? "Live" : "Cached"} ${formatAgo(fetchedAt, now)}` : "Connecting to usage data"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => void handleCachedRefresh()} className="rounded-xl border border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800">Refresh</button>
            {liveRefreshing ? (
              <button onClick={cancelLiveRefresh} className="rounded-xl bg-amber-300 px-3.5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200">Cancel live update</button>
            ) : (
              <button onClick={() => void handleLiveRefreshAll()} className="rounded-xl bg-indigo-200 px-3.5 py-2 text-sm font-semibold text-indigo-950 transition hover:bg-indigo-100">Live update</button>
            )}
            <button onClick={() => setShowAdd(true)} className="rounded-xl bg-teal-300 px-3.5 py-2 text-sm font-semibold text-teal-950 transition hover:bg-teal-200">Add account</button>
          </div>
        </div>
        <details className="mt-5 border-t border-zinc-800/90 pt-4">
          <summary className="w-fit cursor-pointer text-xs font-medium text-zinc-500 transition hover:text-zinc-300">Advanced refresh settings</summary>
          <div className="mt-3 flex flex-col gap-3 rounded-xl bg-zinc-950/50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <RotationControl rotation={rotation} onChange={(strategy) => void handleRotationChange(strategy)} busy={rotationBusy} error={rotationError} />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-400"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} className="accent-indigo-300" />Auto-refresh</label>
              <select value={pollMs} onChange={(event) => setPollMs(Number(event.target.value))} disabled={!autoRefresh} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 outline-none disabled:opacity-50" aria-label="Auto-refresh interval">
                {POLL_OPTIONS.map((ms) => <option key={ms} value={ms}>{ms >= 60_000 ? `${ms / 60_000}m` : `${ms / 1000}s`}</option>)}
              </select>
            </div>
          </div>
        </details>
      </header>

      {rotationError && (
        <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Rotation change failed: {rotationError}
        </div>
      )}

      <div className="mt-5 space-y-5">
        {proxyDown && (
          <ErrorBanner
            title="Proxy unreachable"
            message={health?.error ?? "Could not reach the proxy."}
            details={health?.code ? `code: ${health.code}` : null}
            hint={items.length > 0 ? "Last saved account data may still be available." : "Try again when the service is available."}
          />
        )}
        {liveError && (
          <ErrorBanner
            title="Live refresh failed"
            message={liveError}
            details={liveDetails}
            hint="Your existing account data is still shown."
            onRetry={() => void handleLiveRefreshAll()}
            onDismiss={() => {
              setLiveError(null);
              setLiveDetails(null);
            }}
          />
        )}
        {usageErrorMessage && (
          <ErrorBanner
            title="Refresh failed"
            message={usageErrorMessage}
            details={errorDetails(usageError)}
            hint="Try again in a moment."
            onRetry={() => void handleCachedRefresh()}
          />
        )}
        {failures > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            {failures} account{failures === 1 ? "" : "s"} could not be updated. Saved values are shown.
          </div>
        )}

        {usageLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 && !usageErrorMessage && !proxyDown ? (
          <EmptyState onAddAccount={() => setShowAdd(true)} />
        ) : (
          items.length > 0 && (
            <>
              <OverviewStats counts={counts} onFilter={setFilter} />
              <FilterBar
                filter={filter}
                onFilter={setFilter}
                sort={sort}
                onSort={setSort}
                query={query}
                onQuery={setQuery}
                counts={filterCounts}
              />
              <FilterCount visible={visible.length} total={items.length} />
              {visible.length === 0 ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
                  No accounts match this filter.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visible.map((item) => (
                    <AccountCard key={item.account.id} item={item} />
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>

      {showAdd && (
        <AddAccount
          onAdded={() => {
            setShowAdd(false);
            void mutateUsage();
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
