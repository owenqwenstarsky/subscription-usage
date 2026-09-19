import type { ActivityEvent, ActivitySnapshot, ProxyRequestRecord } from "@/lib/types";

export interface ActivityState {
  records: Record<string, ProxyRequestRecord>;
  emittedAt: string | null;
}

export const EMPTY_ACTIVITY_STATE: ActivityState = { records: {}, emittedAt: null };

function sortRecords(records: ProxyRequestRecord[]): ProxyRequestRecord[] {
  return records.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export function activityReducer(state: ActivityState, event: ActivityEvent): ActivityState {
  if (event.type === "snapshot") {
    if (state.emittedAt && Date.parse(event.snapshot.emittedAt) < Date.parse(state.emittedAt)) {
      return state;
    }
    return {
      records: Object.fromEntries(event.snapshot.requests.map((record) => [record.id, record])),
      emittedAt: event.snapshot.emittedAt,
    };
  }
  if (event.type === "remove") {
    const records = { ...state.records };
    delete records[event.id];
    return { records, emittedAt: event.emittedAt };
  }
  return {
    records: { ...state.records, [event.record.id]: event.record },
    emittedAt: event.emittedAt,
  };
}

/** Hide terminal events even if an SSE remove message was missed during reconnect. */
export function pruneExpiredActivity(state: ActivityState, now = Date.now()): ActivityState {
  let changed = false;
  const records: Record<string, ProxyRequestRecord> = {};
  for (const [id, record] of Object.entries(state.records)) {
    const expiresAt = record.endedAt ? Date.parse(record.endedAt) + 60_000 : Number.POSITIVE_INFINITY;
    if (expiresAt <= now) {
      changed = true;
      continue;
    }
    records[id] = record;
  }
  return changed ? { ...state, records } : state;
}

export function activityRecords(state: ActivityState): ProxyRequestRecord[] {
  return sortRecords(Object.values(state.records));
}

export function snapshotEvent(snapshot: ActivitySnapshot): ActivityEvent {
  return { type: "snapshot", snapshot };
}

export function isFailure(record: ProxyRequestRecord): boolean {
  return record.outcome === "failed" || record.outcome === "timed_out";
}
