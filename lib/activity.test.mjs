import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./activity.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const { activityReducer, EMPTY_ACTIVITY_STATE } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

function record(id) {
  return {
    id,
    startedAt: "2026-09-19T20:00:00.000Z",
    route: "/v1/responses",
    phase: "streaming",
    outcome: "active",
  };
}

function snapshot(requests, emittedAt) {
  return { requests, emittedAt };
}

test("activityReducer ignores a REST snapshot older than an applied stream event", () => {
  const initial = activityReducer(EMPTY_ACTIVITY_STATE, {
    type: "snapshot",
    snapshot: snapshot([record("initial")], "2026-09-19T20:00:01.000Z"),
  });
  const afterStreamEvent = activityReducer(initial, {
    type: "upsert",
    record: record("from-stream"),
    emittedAt: "2026-09-19T20:00:03.000Z",
  });

  const afterStaleSnapshot = activityReducer(afterStreamEvent, {
    type: "snapshot",
    snapshot: snapshot([record("initial")], "2026-09-19T20:00:02.000Z"),
  });

  assert.strictEqual(afterStaleSnapshot, afterStreamEvent);
  assert.deepEqual(Object.keys(afterStaleSnapshot.records), ["initial", "from-stream"]);
});

test("activityReducer applies a snapshot newer than the current state", () => {
  const current = activityReducer(EMPTY_ACTIVITY_STATE, {
    type: "upsert",
    record: record("old"),
    emittedAt: "2026-09-19T20:00:01.000Z",
  });

  const updated = activityReducer(current, {
    type: "snapshot",
    snapshot: snapshot([record("new")], "2026-09-19T20:00:02.000Z"),
  });

  assert.deepEqual(Object.keys(updated.records), ["new"]);
  assert.equal(updated.emittedAt, "2026-09-19T20:00:02.000Z");
});
