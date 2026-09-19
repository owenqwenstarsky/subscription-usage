"use client";

import { useState } from "react";
import Link from "next/link";
import {
  accountDisplayName,
  formatAgo,
  formatDateTime,
  truncateMiddle,
} from "@/lib/format";
import {
  deleteAccountById,
  liveRefreshAccount,
  patchAccountLabel,
  patchAccountStatus,
  tokenRefreshAccount,
} from "@/lib/account-actions";
import { Countdown } from "./Countdown";
import { useNow } from "./Now";
import { EligibilityBadge, LimitBadge, StatusBadge } from "./StatusBadge";
import { UsageBar } from "./UsageBar";
import { QuotaSnapshot, UsageAllItem } from "@/lib/types";
import {
  applyLiveUsage,
  isCoolingDown,
  isExhausted,
  liveQuotaFetchedAt,
  liveQuotaOfUsage,
  liveQuotaSource,
} from "@/lib/usage";

function CreditsLine({ quota }: { quota: QuotaSnapshot | null }) {
  const credits = quota?.credits;
  if (!credits) return null;
  return (
    <div className="text-xs text-zinc-400">
      <span className="font-medium text-zinc-300">Credits:</span>{" "}
      {credits.unlimited ? (
        <span className="text-emerald-300">unlimited</span>
      ) : credits.balance !== null && credits.balance !== undefined ? (
        <span className="font-mono">${credits.balance}</span>
      ) : credits.has_credits ? (
        "available"
      ) : (
        "none"
      )}
      {credits.active_limit ? (
        <span className="text-zinc-500"> · limit {credits.active_limit}</span>
      ) : null}
    </div>
  );
}

interface Busy {
  live: boolean;
  token: boolean;
  toggle: boolean;
  label: boolean;
  del: boolean;
}

const IDLE: Busy = { live: false, token: false, toggle: false, label: false, del: false };

export function AccountCard({
  item,
  onPatchItem,
  onRemoveItem,
  onRefetch,
}: {
  item: UsageAllItem;
  onPatchItem: (id: string, patch: (item: UsageAllItem) => UsageAllItem) => void;
  onRemoveItem: (id: string) => void;
  onRefetch: () => void;
}) {
  const { account } = item;
  const quota = item.quota ?? account.cached_quota ?? null;
  const [showJson, setShowJson] = useState(false);
  const [busy, setBusy] = useState<Busy>(IDLE);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(account.label ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const now = useNow();

  const coolingDown = isCoolingDown(account, now);

  function setOne(key: keyof Busy, value: boolean) {
    setBusy((b) => ({ ...b, [key]: value }));
  }

  // Live refresh: patch this card from the fresh response (no full refetch).
  async function handleLiveRefresh() {
    setOne("live", true);
    setActionError(null);
    try {
      const data = await liveRefreshAccount(account.id);
      const fresh = liveQuotaOfUsage(data.usage);
      onPatchItem(account.id, (it) => ({
        ...it,
        account: applyLiveUsage(it.account, data.usage),
        quota: fresh,
        quotaSource: liveQuotaSource(data.usage, fresh),
        quotaFetchedAt: liveQuotaFetchedAt(data.usage, fresh),
        error: undefined,
      }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setOne("live", false);
    }
  }

  // Token refresh: patch oauth/token-driven fields from the returned account.
  async function handleTokenRefresh() {
    setOne("token", true);
    setActionError(null);
    try {
      const updated = await tokenRefreshAccount(account.id);
      onPatchItem(account.id, (it) => ({
        ...it,
        account: {
          ...it.account,
          status: updated.status,
          eligible_now: updated.eligible_now,
          cooldown_until: updated.cooldown_until ?? null,
          last_error: updated.last_error ?? "",
          oauth_expires: updated.oauth_expires,
        },
      }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setOne("token", false);
    }
  }

  // Enable/disable: optimistic toggle with rollback on failure.
  async function handleToggleStatus() {
    const next = account.status === "disabled" ? "active" : "disabled";
    const prev = item;
    setOne("toggle", true);
    setActionError(null);
    onPatchItem(account.id, (it) => ({
      ...it,
      account: { ...it.account, status: next },
    }));
    try {
      const updated = await patchAccountStatus(account.id, next);
      onPatchItem(account.id, (it) => ({
        ...it,
        account: { ...it.account, ...updated },
      }));
    } catch (err) {
      onPatchItem(account.id, () => prev);
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setOne("toggle", false);
    }
  }

  async function handleSaveLabel() {
    const trimmed = labelDraft.trim();
    if (trimmed === (account.label ?? "")) {
      setEditingLabel(false);
      return;
    }
    const prev = item;
    setOne("label", true);
    setActionError(null);
    onPatchItem(account.id, (it) => ({
      ...it,
      account: { ...it.account, label: trimmed },
    }));
    try {
      const updated = await patchAccountLabel(account.id, trimmed);
      onPatchItem(account.id, (it) => ({
        ...it,
        account: { ...it.account, ...updated },
      }));
      setEditingLabel(false);
    } catch (err) {
      onPatchItem(account.id, () => prev);
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setOne("label", false);
    }
  }

  async function handleDelete() {
    setOne("del", true);
    setActionError(null);
    try {
      await deleteAccountById(account.id);
      onRemoveItem(account.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      // List may be out of sync; revalidate to be sure.
      onRefetch();
    } finally {
      setOne("del", false);
      setConfirmingDelete(false);
    }
  }

  function copyId() {
    void navigator.clipboard
      ?.writeText(account.id)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  }

  const exhausted = isExhausted(item);
  const toggleBlocked =
    account.status === "expired" || account.status === "banned";

  return (
    <article
      className={`rounded-xl border bg-zinc-900/60 p-5 ${
        exhausted ? "border-red-500/30" : "border-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
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
                    setLabelDraft(account.label ?? "");
                  }
                }}
                className="w-48 rounded-md bg-zinc-950 px-2 py-1 text-sm text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-zinc-500"
                placeholder="Label"
                autoFocus
              />
              <button
                onClick={() => void handleSaveLabel()}
                disabled={busy.label}
                className="rounded-md bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-100 hover:bg-zinc-600 disabled:opacity-50"
              >
                {busy.label ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditingLabel(false);
                  setLabelDraft(account.label ?? "");
                }}
                className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setLabelDraft(account.label ?? "");
                setEditingLabel(true);
              }}
              className="truncate text-left text-base font-semibold text-zinc-100 hover:text-zinc-300"
              title="Click to edit label"
            >
              {accountDisplayName(account)}
            </button>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            <button
              onClick={copyId}
              className="font-mono hover:text-zinc-300"
              title={copied ? "Copied!" : `Copy full ID: ${account.id}`}
            >
              {copied ? "Copied" : truncateMiddle(account.id, 22)}
            </button>
            {account.email && account.email !== accountDisplayName(account) && (
              <span className="truncate">{account.email}</span>
            )}
            {account.plan_type && (
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                {quota?.plan_type || account.plan_type}
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/accounts/${encodeURIComponent(account.id)}`}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-400 ring-1 ring-zinc-700 hover:text-zinc-200 hover:ring-zinc-600"
        >
          Detail
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={account.status} />
        <EligibilityBadge eligible={account.eligible_now} />
        <LimitBadge reached={exhausted} />
        {coolingDown && account.cooldown_until && (
          <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30">
            cooldown <Countdown target={account.cooldown_until} prefix="ends in" className="ml-1" />
          </span>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <UsageBar
          title="Primary"
          subtitle="~5h"
          window={quota?.rate_limit}
        />
        {quota?.secondary_rate_limit && (
          <UsageBar
            title="Secondary"
            subtitle="~weekly"
            window={quota.secondary_rate_limit}
          />
        )}
        {quota?.code_review_rate_limit && (
          <UsageBar
            title="Code review"
            subtitle="daily · routing-agnostic"
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

      <div className="mt-4 space-y-1.5 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
        <CreditsLine quota={quota} />
        <div>
          OAuth expires{" "}
          <span className="text-zinc-300">
            <Countdown target={account.oauth_expires} prefix="in" />
          </span>{" "}
          <span className="text-zinc-600">({formatDateTime(account.oauth_expires)})</span>
        </div>
        <div>
          Quota {item.quotaSource ? (
            <>
              from <span className="font-mono text-zinc-400">{item.quotaSource}</span>
            </>
          ) : (
            "source unknown"
          )}{" "}
          {item.quotaFetchedAt ? (
            <span>· {formatAgo(item.quotaFetchedAt, now)}</span>
          ) : null}
        </div>
        {account.last_error && (
          <div className="break-words text-amber-300/80">
            Last error: {account.last_error}
          </div>
        )}
        {item.error && (
          <div className="break-words text-red-300/90">
            Live fetch failed: {item.error}
          </div>
        )}
        {actionError && (
          <div className="break-words text-red-300/90">{actionError}</div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => void handleLiveRefresh()}
          disabled={busy.live}
          className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
        >
          {busy.live ? "Refreshing…" : "Live refresh"}
        </button>
        <button
          onClick={() => void handleTokenRefresh()}
          disabled={busy.token}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-zinc-700 hover:ring-zinc-500 disabled:opacity-50"
        >
          {busy.token ? "Refreshing…" : "Refresh token"}
        </button>
        <button
          onClick={() => void handleToggleStatus()}
          disabled={busy.toggle || toggleBlocked}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-zinc-700 hover:ring-zinc-500 disabled:opacity-50"
          title={
            toggleBlocked
              ? `Cannot re-enable an ${account.status} account from here`
              : account.status === "disabled"
                ? "Enable account"
                : "Disable account"
          }
        >
          {busy.toggle
            ? "Saving…"
            : account.status === "disabled"
              ? "Enable"
              : "Disable"}
        </button>
        {confirmingDelete ? (
          <>
            <button
              onClick={() => void handleDelete()}
              disabled={busy.del}
              className="rounded-md bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-100 ring-1 ring-inset ring-red-500/40 hover:bg-red-500/30 disabled:opacity-50"
            >
              {busy.del ? "Deleting…" : "Confirm delete"}
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
            Delete
          </button>
        )}
        <button
          onClick={() => setShowJson((v) => !v)}
          className="rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          {showJson ? "Hide JSON" : "JSON"}
        </button>
      </div>

      {showJson && (
        <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-300 ring-1 ring-zinc-800">
          {JSON.stringify({ account, quota }, null, 2)}
        </pre>
      )}
    </article>
  );
}
