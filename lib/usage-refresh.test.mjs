import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./usage-refresh.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const { loadUsageItems } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

function quota(source, usedPercent) {
  return {
    plan_type: "plus",
    rate_limit: {
      allowed: true,
      limit_reached: false,
      used_percent: usedPercent,
    },
    source,
    fetched_at: "2026-09-19T20:00:00.000Z",
  };
}

function account(id, status = "active", cachedQuota = quota("cache", 10)) {
  return {
    id,
    upstream_account_id: `upstream-${id}`,
    status,
    eligible_now: status === "active",
    cached_quota: cachedQuota,
    oauth_expires: "2026-09-20T20:00:00.000Z",
    created_at: "2026-09-19T20:00:00.000Z",
    updated_at: "2026-09-19T20:00:00.000Z",
  };
}

test("cached refresh returns saved quota without calling the usage endpoint", async () => {
  const accounts = [account("active"), account("disabled", "disabled")];
  let calls = 0;

  const result = await loadUsageItems(accounts, false, async () => {
    calls += 1;
    throw new Error("should not be called");
  });

  assert.equal(calls, 0);
  assert.equal(result.failures, 0);
  assert.deepEqual(
    result.items.map((item) => item.quota?.source),
    ["cache", "cache"],
  );
});

test("force pull skips disabled accounts and keeps their cached quota", async () => {
  const accounts = [account("active"), account("disabled", "disabled")];
  const calledIds = [];

  const result = await loadUsageItems(accounts, true, async (accountId) => {
    calledIds.push(accountId);
    const freshQuota = quota("usage_endpoint", 42);
    return {
      account_id: accountId,
      upstream_account_id: `upstream-${accountId}`,
      status: "active",
      eligible_now: true,
      cached_quota: freshQuota,
      quota_runtime: freshQuota,
      quota_source: freshQuota.source,
      quota_fetched_at: freshQuota.fetched_at,
      oauth_expires: "2026-09-21T20:00:00.000Z",
    };
  });

  assert.deepEqual(calledIds, ["active"]);
  assert.equal(result.failures, 0);
  assert.equal(result.items[0].quotaSource, "usage_endpoint");
  assert.equal(result.items[1].quotaSource, "cache");
  assert.equal(result.items[1].error, undefined);
});

test("force pull preserves cached quota and counts only attempted account failures", async () => {
  const accounts = [
    account("good"),
    account("bad"),
    account("disabled", "disabled"),
  ];

  const result = await loadUsageItems(accounts, true, async (accountId) => {
    if (accountId === "bad") throw new Error("upstream unavailable");
    const freshQuota = quota("usage_endpoint", 55);
    return {
      account_id: accountId,
      upstream_account_id: `upstream-${accountId}`,
      status: "active",
      eligible_now: true,
      quota_runtime: freshQuota,
      quota_source: freshQuota.source,
      quota_fetched_at: freshQuota.fetched_at,
      oauth_expires: "2026-09-21T20:00:00.000Z",
    };
  });

  assert.equal(result.failures, 1);
  assert.equal(result.items[0].quotaSource, "usage_endpoint");
  assert.equal(result.items[1].quotaSource, "cache");
  assert.equal(result.items[1].error, "upstream unavailable");
  assert.equal(result.items[2].error, undefined);
});
