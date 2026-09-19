"use client";

import { useDeferredValue, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetch-json";
import { formatDateTime } from "@/lib/format";
import { ActivityLogDatesResponse, ActivityLogResponse, ProxyRequestRecord } from "@/lib/types";

type OutcomeFilter = "" | ProxyRequestRecord["outcome"];

function toQuery({ date, q, outcome, account, model, cursor }: { date: string; q: string; outcome: OutcomeFilter; account: string; model: string; cursor: string }) {
  const params = new URLSearchParams({ date, limit: "50" });
  if (q.trim()) params.set("q", q.trim());
  if (outcome) params.set("outcome", outcome);
  if (account.trim()) params.set("account", account.trim());
  if (model.trim()) params.set("model", model.trim());
  if (cursor) params.set("cursor", cursor);
  return `/api/logs?${params.toString()}`;
}

function result(record: ProxyRequestRecord): string {
  if (record.outcome === "failed" || record.outcome === "timed_out") return record.errorCode ?? record.outcome;
  return record.status ? `HTTP ${record.status}` : record.outcome;
}

export function Logbook() {
  const { data: daysData, error: daysError } = useSWR<ActivityLogDatesResponse>("/api/logs/dates", fetcher);
  const [date, setDate] = useState("");
  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState<OutcomeFilter>("");
  const [account, setAccount] = useState("");
  const [model, setModel] = useState("");
  const [paging, setPaging] = useState({ key: "", cursors: [""] });
  const deferredQ = useDeferredValue(q);
  const deferredAccount = useDeferredValue(account);
  const deferredModel = useDeferredValue(model);
  const effectiveDate = date || daysData?.days[0]?.date || "";
  const filterKey = [effectiveDate, deferredQ, outcome, deferredAccount, deferredModel].join("\u0000");
  const cursors = paging.key === filterKey ? paging.cursors : [""];
  const cursor = cursors[cursors.length - 1] ?? "";
  const logKey = effectiveDate ? toQuery({ date: effectiveDate, q: deferredQ, outcome, account: deferredAccount, model: deferredModel, cursor }) : null;
  const { data, error, isLoading } = useSWR<ActivityLogResponse>(logKey, fetcher, { keepPreviousData: true });
  const selectedDay = useMemo(() => daysData?.days.find((day) => day.date === effectiveDate) ?? null, [daysData, effectiveDate]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:py-10">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/45 shadow-[0_28px_80px_-48px_rgba(0,0,0,.95)]">
        <div className="border-b border-zinc-800 bg-[linear-gradient(120deg,rgba(129,140,248,.12),transparent_45%,rgba(45,212,191,.06))] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300/80">Retained proxy telemetry</div><h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-zinc-100">Request logbook</h1><p className="mt-2 text-sm text-zinc-500">Read-only, redacted request records grouped by the UTC day they began.</p></div>
            {selectedDay && <div className="flex gap-2"><div className="rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-4 py-2.5"><div className="text-xs text-zinc-500">Requests</div><div className="mt-0.5 font-mono text-xl font-semibold text-zinc-200">{selectedDay.total}</div></div><div className={`rounded-xl border px-4 py-2.5 ${selectedDay.failed ? "border-red-500/35 bg-red-500/10" : "border-zinc-700/80 bg-zinc-950/60"}`}><div className="text-xs text-zinc-500">Failures</div><div className={`mt-0.5 font-mono text-xl font-semibold ${selectedDay.failed ? "text-red-200" : "text-zinc-300"}`}>{selectedDay.failed}</div></div></div>}
          </div>
        </div>

        <div className="grid gap-3 border-b border-zinc-800 p-5 sm:grid-cols-2 lg:grid-cols-[180px_minmax(220px,1fr)_160px_180px_180px] sm:px-7">
          <label className="text-xs text-zinc-500">UTC day<select value={effectiveDate} onChange={(event) => setDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-400/70"><option value="">Select a day</option>{daysData?.days.map((day) => <option key={day.date} value={day.date}>{day.date}</option>)}</select></label>
          <label className="text-xs text-zinc-500">Search metadata<input value={q} onChange={(event) => setQ(event.target.value)} placeholder="route, request ID, safe error…" className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-400/70" /></label>
          <label className="text-xs text-zinc-500">Outcome<select value={outcome} onChange={(event) => setOutcome(event.target.value as OutcomeFilter)} className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-400/70"><option value="">All outcomes</option><option value="succeeded">Succeeded</option><option value="failed">Failed</option><option value="timed_out">Timed out</option><option value="cancelled">Cancelled</option></select></label>
          <label className="text-xs text-zinc-500">Account<input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="label or ID" className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-400/70" /></label>
          <label className="text-xs text-zinc-500">Model<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="model name" className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-400/70" /></label>
        </div>

        {daysError && <div className="m-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 sm:mx-7">Could not list retained logs: {daysError.message}</div>}
        {error && <div className="m-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 sm:mx-7">Could not read this log: {error.message}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-[930px] w-full text-left text-sm"><thead className="border-b border-zinc-800 text-[11px] uppercase tracking-[0.12em] text-zinc-500"><tr><th className="px-5 py-3 sm:px-7">Started</th><th className="px-3 py-3">Route / model</th><th className="px-3 py-3">Account</th><th className="px-3 py-3">Duration</th><th className="px-5 py-3 sm:px-7">Result</th></tr></thead><tbody className="divide-y divide-zinc-800/80">
            {data?.records.map((record) => <tr key={record.id} className={record.outcome === "failed" || record.outcome === "timed_out" ? "bg-red-500/[0.055]" : "hover:bg-zinc-800/35"}><td className="whitespace-nowrap px-5 py-3.5 align-top text-xs text-zinc-400 sm:px-7"><div>{formatDateTime(record.startedAt)}</div><div className="mt-1 font-mono text-[10px] text-zinc-600">{record.id}</div></td><td className="px-3 py-3.5 align-top"><div className="font-mono text-xs text-zinc-200">{record.route}</div>{record.model && <div className="mt-1 text-xs text-zinc-500">{record.model}</div>}</td><td className="px-3 py-3.5 align-top text-xs text-zinc-400">{record.accountLabel ?? record.accountId ?? "—"}</td><td className="px-3 py-3.5 align-top font-mono text-xs text-zinc-300">{record.durationMs === undefined || record.durationMs === null ? "—" : `${(record.durationMs / 1000).toFixed(2)}s`}</td><td className="px-5 py-3.5 align-top sm:px-7"><div className={record.outcome === "failed" || record.outcome === "timed_out" ? "font-medium text-red-200" : "font-medium text-zinc-300"}>{result(record)}</div>{record.errorMessage && <div className="mt-1 max-w-sm text-xs text-red-200/75">{record.errorMessage}</div>}</td></tr>)}
            {effectiveDate && !isLoading && data?.records.length === 0 && <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-zinc-500">No retained requests match these filters.</td></tr>}
            {!effectiveDate && <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-zinc-500">No retained request logs are available yet.</td></tr>}
          </tbody></table>
        </div>
        {effectiveDate && <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-4 sm:px-7"><span className="text-xs text-zinc-500">{isLoading ? "Loading records…" : `Page ${cursors.length}`}</span><div className="flex gap-2"><button disabled={cursors.length === 1} onClick={() => setPaging({ key: filterKey, cursors: cursors.slice(0, -1) })} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-zinc-800">Previous</button><button disabled={!data?.nextCursor} onClick={() => data?.nextCursor && setPaging({ key: filterKey, cursors: [...cursors, data.nextCursor] })} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-zinc-800">Next</button></div></div>}
      </section>
    </main>
  );
}
