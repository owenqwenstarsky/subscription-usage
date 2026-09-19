"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { activityRecords, activityReducer, EMPTY_ACTIVITY_STATE, isFailure, pruneExpiredActivity, snapshotEvent } from "@/lib/activity";
import { fetchJson } from "@/lib/fetch-json";
import { formatAgo, formatDateTime } from "@/lib/format";
import { useNow } from "@/components/Now";
import { ActivityEvent, ActivitySnapshot, ProxyRequestRecord } from "@/lib/types";

type ConnectionState = "connecting" | "live" | "reconnecting" | "error";

function duration(record: ProxyRequestRecord, now: number): string {
  const value = record.durationMs ?? Math.max(0, now - Date.parse(record.startedAt));
  if (value < 1_000) return `${value}ms`;
  if (value < 60_000) return `${(value / 1_000).toFixed(1)}s`;
  return `${Math.floor(value / 60_000)}m ${Math.floor((value % 60_000) / 1_000)}s`;
}

function parseEvent(raw: string): ActivityEvent | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("type" in value)) return null;
    const event = value as ActivityEvent;
    if (event.type === "snapshot" || event.type === "upsert" || event.type === "remove") return event;
  } catch {
    // A malformed event must not take down the operator's live view.
  }
  return null;
}

function Outcome({ record }: { record: ProxyRequestRecord }) {
  const failure = isFailure(record);
  const tone = record.outcome === "active"
    ? "border-teal-400/25 bg-teal-400/10 text-teal-200"
    : failure
      ? "border-red-400/30 bg-red-400/10 text-red-200"
      : "border-zinc-700 bg-zinc-800/80 text-zinc-300";
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{record.outcome}</span>;
}

export function ActivityFeed() {
  const now = useNow();
  const [state, dispatch] = useReducer(activityReducer, EMPTY_ACTIVITY_STATE);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<"all" | ProxyRequestRecord["outcome"]>("all");

  useEffect(() => {
    let alive = true;
    void fetchJson<ActivitySnapshot>("/api/activity")
      .then((snapshot) => alive && dispatch(snapshotEvent(snapshot)))
      .catch((error: unknown) => alive && setStreamError(error instanceof Error ? error.message : "Could not load activity."));

    const source = new EventSource("/api/activity/stream");
    const receive = (event: MessageEvent<string>) => {
      const parsed = parseEvent(event.data);
      if (parsed) dispatch(parsed);
    };
    source.addEventListener("snapshot", receive as EventListener);
    source.addEventListener("upsert", receive as EventListener);
    source.addEventListener("remove", receive as EventListener);
    source.onmessage = receive;
    source.onopen = () => {
      setConnection("live");
      setStreamError(null);
    };
    source.onerror = () => {
      setConnection(source.readyState === EventSource.CLOSED ? "error" : "reconnecting");
      setStreamError("Live stream disconnected; reconnecting automatically.");
    };
    return () => {
      alive = false;
      source.close();
    };
  }, []);

  const records = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return activityRecords(pruneExpiredActivity(state, now)).filter((record) => {
      if (outcome !== "all" && record.outcome !== outcome) return false;
      if (!lower) return true;
      return [record.id, record.route, record.model, record.accountId, record.accountLabel, record.errorCode, record.errorMessage]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(lower);
    });
  }, [state, now, query, outcome]);

  const failed = records.filter(isFailure).length;
  const active = records.filter((record) => record.outcome === "active").length;
  const connectionTone = connection === "live" ? "bg-teal-400" : connection === "error" ? "bg-red-400" : "bg-amber-400";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:py-10">
      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/45 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)]">
        <div className="border-b border-zinc-800 bg-[linear-gradient(120deg,rgba(45,212,191,.08),transparent_42%,rgba(99,102,241,.1))] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-300/80"><span className={`size-2 rounded-full ${connectionTone}`} /> Live telemetry</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-zinc-100">Request activity</h1>
              <p className="mt-2 text-sm text-zinc-500">Public proxy traffic only. Finished requests remain visible for one minute.</p>
            </div>
            <div className="flex gap-2">
              <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-4 py-2.5"><div className="text-xs text-zinc-500">Active now</div><div className="mt-0.5 font-mono text-xl font-semibold text-teal-200">{active}</div></div>
              <div className={`rounded-xl border px-4 py-2.5 ${failed ? "border-red-500/35 bg-red-500/10" : "border-zinc-700/80 bg-zinc-950/60"}`}><div className="text-xs text-zinc-500">Failed, last minute</div><div className={`mt-0.5 font-mono text-xl font-semibold ${failed ? "text-red-200" : "text-zinc-300"}`}>{failed}</div></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-zinc-800 px-5 py-4 sm:flex-row sm:items-center sm:px-7">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter route, model, account, error…" aria-label="Filter live requests" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-400/70 sm:max-w-md" />
          <select value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)} aria-label="Filter request outcome" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-teal-400/70">
            <option value="all">All outcomes</option><option value="active">Active</option><option value="succeeded">Succeeded</option><option value="failed">Failed</option><option value="timed_out">Timed out</option><option value="cancelled">Cancelled</option>
          </select>
          <span className="text-xs text-zinc-500 sm:ml-auto">{connection === "live" ? "Connected" : connection === "connecting" ? "Connecting" : "Reconnecting"}</span>
        </div>

        {streamError && <div className="mx-5 mt-4 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-100 sm:mx-7">{streamError}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full text-left text-sm">
            <thead className="border-b border-zinc-800 text-[11px] uppercase tracking-[0.12em] text-zinc-500"><tr><th className="px-5 py-3 sm:px-7">Started</th><th className="px-3 py-3">Route / model</th><th className="px-3 py-3">Account</th><th className="px-3 py-3">Phase</th><th className="px-3 py-3">Duration</th><th className="px-5 py-3 sm:px-7">Outcome</th></tr></thead>
            <tbody className="divide-y divide-zinc-800/80">
              {records.map((record) => <tr key={record.id} className={isFailure(record) ? "bg-red-500/[0.055]" : "hover:bg-zinc-800/35"}>
                <td className="whitespace-nowrap px-5 py-3.5 align-top text-xs text-zinc-500 sm:px-7"><div>{formatAgo(record.startedAt, now)}</div><div className="mt-1 font-mono text-[10px] text-zinc-600">{record.id.slice(0, 10)}</div></td>
                <td className="px-3 py-3.5 align-top"><div className="font-mono text-xs text-zinc-200">{record.route}</div>{record.model && <div className="mt-1 text-xs text-zinc-500">{record.model}</div>}{record.errorMessage && <div className="mt-1 max-w-xs truncate text-xs text-red-200/80" title={record.errorMessage}>{record.errorMessage}</div>}</td>
                <td className="px-3 py-3.5 align-top text-xs text-zinc-400">{record.accountLabel ?? record.accountId ?? "—"}</td>
                <td className="px-3 py-3.5 align-top"><span className="font-mono text-xs text-zinc-400">{record.phase}</span></td>
                <td className="px-3 py-3.5 align-top font-mono text-xs text-zinc-300">{duration(record, now)}</td>
                <td className="px-5 py-3.5 align-top sm:px-7"><Outcome record={record} />{record.status && <div className="mt-1 font-mono text-[10px] text-zinc-600">HTTP {record.status}</div>}</td>
              </tr>)}
              {records.length === 0 && <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-zinc-500">No requests match the current view.</td></tr>}
            </tbody>
          </table>
        </div>
        {state.emittedAt && <div className="border-t border-zinc-800 px-5 py-3 text-xs text-zinc-600 sm:px-7">Last stream event {formatDateTime(state.emittedAt)}</div>}
      </section>
    </main>
  );
}
