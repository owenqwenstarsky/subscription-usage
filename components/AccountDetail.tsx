"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Countdown } from "@/components/Countdown";
import { useNow } from "@/components/Now";
import { EligibilityBadge, LimitBadge, StatusBadge } from "@/components/StatusBadge";
import { ErrorBanner } from "@/components/States";
import { UsageBar } from "@/components/UsageBar";
import {
  accountMetaKey,
  accountUsageKey,
} from "@/lib/cache-keys";
import {
  deleteAccountById,
  liveRefreshAccount,
  patchAccountLabel,
  patchAccountStatus,
  tokenRefreshAccount,
} from "@/lib/account-actions";
import { fetcher, ApiHttpError } from "@/lib/fetch-json";
import { accountDisplayName, formatAgo, formatDateTime } from "@/lib/format";
import {
  AccountMetaResponse,
  SingleUsageResponse,
} from "@/lib/types";

function isNotFound(err: unknown): boolean {
  return err instanceof ApiHttpError && err.code === "proxy_not_found";
}

export function AccountDetail({ accountId }: { accountId: string }) {
  const router = useRouter();
  const now = useNow();
  const [busyLive, setBusyLive] = useState(false);
  const [busyToken, setBusyToken] = useState(false);
  const [busyToggle, setBusyToggle] = useState(false);
  const [busyLabel, setBusyLabel] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<SingleUsageResponse>(accountUsageKey(accountId, "cached"), fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  const { data: meta, mutate: mutateMeta } = useSWR<AccountMetaResponse>(
    accountMetaKey(accountId),
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false },
  );

  const usage = data?.usage ?? null;
  const fetchedAt = data?.fetchedAt ?? null;
  const account = meta?.account ?? null;
  const loadError = error
    ? error instanceof Error
      ? error.message
      : String(error)
    : null;

  async function handleLive() {
    setBusyLive(true);
    setActionError(null);
    try {
      const refreshed = await liveRefreshAccount(accountId);
      await mutate(refreshed, { revalidate: false });
      void mutateMeta();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyLive(false);
    }
  }

  async function handleToken() {
    setBusyToken(true);
    setActionError(null);
    try {
      await tokenRefreshAccount(accountId);
      await mutate();
      void mutateMeta();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyToken(false);
    }
  }

  async function handleToggle() {
    if (!usage) return;
    const next = usage.status === "disabled" ? "active" : "disabled";
    setBusyToggle(true);
    setActionError(null);
    try {
      await patchAccountStatus(accountId, next);
      await mutate();
      void mutateMeta();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyToggle(false);
    }
  }

  async function handleSaveLabel() {
    const trimmed = labelDraft.trim();
    if (trimmed === (account?.label ?? "")) {
      setEditingLabel(false);
      return;
    }
    setBusyLabel(true);
    setActionError(null);
    try {
      await patchAccountLabel(accountId, trimmed);
      setEditingLabel(false);
      void mutateMeta();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyLabel(false);
    }
  }

  async function handleDelete() {
    setBusyDelete(true);
    setActionError(null);
    try {
      await deleteAccountById(accountId);
      router.push("/");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      setBusyDelete(false);
      setConfirmingDelete(false);
    }
  }

  const quota = usage?.quota_runtime ?? usage?.cached_quota ?? null;
  const exhausted =
    quota?.rate_limit.limit_reached === true ||
    quota?.secondary_rate_limit?.limit_reached === true;
  const toggleBlocked =
    usage?.status === "expired" || usage?.status === "banned";
  const displayName = account
    ? accountDisplayName(account)
    : usage
      ? usage.account_id
      : accountId;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← All accounts
      </Link>

      <div className="mt-4">
        {isLoading && !usage ? (
          <div className="animate-pulse space-y-3">
            <div className="h-7 w-1/2 rounded bg-zinc-800" />
            <div className="h-40 rounded-xl bg-zinc-900" />
          </div>
        ) : loadError && !usage ? (
          isNotFound(error) ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8 text-center">
              <div className="text-lg font-medium text-zinc-200">
                Account not found
              </div>
              <p className="mx-auto mt-2 max-w-md break-all font-mono text-xs text-zinc-500">
                {accountId}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                It may have been deleted on the proxy. Go back and refresh the list.
              </p>
              <Link
                href="/"
                className="mt-4 inline-block rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
              >
                Back to all accounts
              </Link>
            </div>
          ) : (
            <ErrorBanner
              title="Failed to load account"
              message={loadError}
              onRetry={() => void mutate()}
            />
          )
        ) : usage ? (
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                {editingLabel ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleSaveLabel();
                        if (e.key === "Escape") {
                          setEditingLabel(false);
                          setLabelDraft(account?.label ?? "");
                        }
                      }}
                      className="w-56 rounded-md bg-zinc-950 px-2 py-1 text-xl font-semibold text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-zinc-500"
                      placeholder="Label"
                      autoFocus
                    />
                    <button
                      onClick={() => void handleSaveLabel()}
                      disabled={busyLabel}
                      className="rounded-md bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-100 hover:bg-zinc-600 disabled:opacity-50"
                    >
                      {busyLabel ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingLabel(false);
                        setLabelDraft(account?.label ?? "");
                      }}
                      className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setLabelDraft(account?.label ?? "");
                      setEditingLabel(true);
                    }}
                    className="break-all text-left text-xl font-semibold text-zinc-100 hover:text-zinc-300"
                    title="Click to edit label"
                  >
                    {displayName}
                  </button>
                )}
                <div className="mt-1 font-mono text-xs text-zinc-500">
                  id {usage.account_id} · upstream {usage.upstream_account_id}
                  {usage.user_id ? ` · user ${usage.user_id}` : ""}
                  {account?.email ? ` · ${account.email}` : ""}
                  {account?.plan_type ? ` · ${account.plan_type}` : ""}
                </div>
                {fetchedAt && (
                  <div className="mt-1 text-xs text-zinc-500">
                    cached {formatAgo(fetchedAt, now)}
                    {isValidating && " · updating…"}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void mutate()}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-zinc-700 hover:ring-zinc-500"
                >
                  Refresh cached
                </button>
                <button
                  onClick={() => void handleLive()}
                  disabled={busyLive}
                  className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
                >
                  {busyLive ? "Refreshing…" : "Live refresh"}
                </button>
                <button
                  onClick={() => void handleToken()}
                  disabled={busyToken}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-zinc-700 hover:ring-zinc-500 disabled:opacity-50"
                >
                  {busyToken ? "Refreshing…" : "Refresh token"}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={usage.status} />
              <EligibilityBadge eligible={usage.eligible_now} />
              <LimitBadge reached={exhausted} />
            </div>

            {actionError && (
              <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {actionError}
              </div>
            )}

            <div className="mt-6 space-y-5">
              <UsageBar title="Primary" subtitle="~5h window" window={quota?.rate_limit} />
              {quota?.secondary_rate_limit && (
                <UsageBar
                  title="Secondary"
                  subtitle="~weekly window"
                  window={quota.secondary_rate_limit}
                />
              )}
              {quota?.code_review_rate_limit && (
                <UsageBar
                  title="Code review"
                  subtitle="daily · does not affect routing"
                  window={quota.code_review_rate_limit}
                  deemphasized
                />
              )}
              {!quota && (
                <div className="rounded-md bg-zinc-950 p-3 text-sm text-zinc-500 ring-1 ring-zinc-800">
                  No quota data yet. Run a live refresh to fetch it from upstream.
                </div>
              )}
            </div>

            <dl className="mt-6 grid gap-3 border-t border-zinc-800 pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">Plan</dt>
                <dd className="mt-1 text-zinc-200">
                  {quota?.plan_type || account?.plan_type || "unknown"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">Credits</dt>
                <dd className="mt-1 text-zinc-200">
                  {!quota?.credits
                    ? "—"
                    : quota.credits.unlimited
                      ? "unlimited"
                      : quota.credits.balance !== null &&
                          quota.credits.balance !== undefined
                        ? `$${quota.credits.balance}`
                        : quota.credits.has_credits
                          ? "available"
                          : "none"}
                  {quota?.credits?.active_limit
                    ? ` · limit ${quota.credits.active_limit}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">OAuth expires</dt>
                <dd className="mt-1 text-zinc-200">
                  <Countdown target={usage.oauth_expires} prefix="in" />{" "}
                  <span className="text-zinc-500">
                    ({formatDateTime(usage.oauth_expires)})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">Cooldown</dt>
                <dd className="mt-1 text-zinc-200">
                  {usage.cooldown_until ? (
                    <>
                      <Countdown target={usage.cooldown_until} prefix="ends in" />{" "}
                      <span className="text-zinc-500">
                        ({formatDateTime(usage.cooldown_until)})
                      </span>
                    </>
                  ) : (
                    "none"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">Quota source</dt>
                <dd className="mt-1 font-mono text-zinc-200">
                  {usage.quota_source || quota?.source || "unknown"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">Quota fetched</dt>
                <dd className="mt-1 text-zinc-200">
                  {usage.quota_fetched_at || quota?.fetched_at
                    ? formatDateTime(usage.quota_fetched_at ?? quota?.fetched_at)
                    : "unknown"}
                </dd>
              </div>
            </dl>

            {usage.last_error && (
              <div className="mt-4 rounded-md bg-amber-500/10 p-3 text-sm text-amber-200 ring-1 ring-inset ring-amber-500/30">
                Last error: {usage.last_error}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void handleToggle()}
                disabled={busyToggle || toggleBlocked}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-zinc-700 hover:ring-zinc-500 disabled:opacity-50"
                title={
                  toggleBlocked
                    ? `Cannot re-enable a ${usage.status} account from here`
                    : usage.status === "disabled"
                      ? "Enable account"
                      : "Disable account"
                }
              >
                {busyToggle
                  ? "Saving…"
                  : usage.status === "disabled"
                    ? "Enable account"
                    : "Disable account"}
              </button>
              {confirmingDelete ? (
                <>
                  <button
                    onClick={() => void handleDelete()}
                    disabled={busyDelete}
                    className="rounded-md bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-100 ring-1 ring-inset ring-red-500/40 hover:bg-red-500/30 disabled:opacity-50"
                  >
                    {busyDelete ? "Deleting…" : "Confirm delete"}
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Keep
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 ring-1 ring-zinc-800 hover:text-red-200 hover:ring-red-500/40"
                >
                  Delete account
                </button>
              )}
            </div>

            <button
              onClick={() => setShowJson((v) => !v)}
              className="mt-4 rounded-md px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-zinc-700 hover:text-zinc-200"
            >
              {showJson ? "Hide raw JSON" : "Show raw JSON"}
            </button>
            {showJson && (
              <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-300 ring-1 ring-zinc-800">
                {JSON.stringify({ meta: account, usage }, null, 2)}
              </pre>
            )}
          </article>
        ) : null}
      </div>
    </div>
  );
}
