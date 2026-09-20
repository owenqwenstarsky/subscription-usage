import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./usage.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const { hasAccountError, summarize } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

function item({ refreshError, lastError } = {}) {
  return {
    account: {
      id: "account-1",
      upstream_account_id: "upstream-1",
      status: "active",
      eligible_now: true,
      last_error: lastError,
      oauth_expires: "2026-09-21T20:00:00.000Z",
      created_at: "2026-09-19T20:00:00.000Z",
      updated_at: "2026-09-19T20:00:00.000Z",
    },
    quota: null,
    quotaSource: "",
    quotaFetchedAt: null,
    error: refreshError,
  };
}

test("account errors include transient refresh failures", () => {
  assert.equal(hasAccountError(item({ refreshError: "refresh failed" })), true);
});

test("account errors include a persisted proxy last error", () => {
  assert.equal(hasAccountError(item({ lastError: "previous rate limit" })), true);
});

test("account errors exclude empty and missing error fields", () => {
  assert.equal(hasAccountError(item()), false);
  assert.equal(hasAccountError(item({ refreshError: "", lastError: "" })), false);
});

test("summary error count uses the same account-error definition", () => {
  const items = [
    item({ refreshError: "refresh failed" }),
    item({ lastError: "previous rate limit" }),
    item(),
  ];

  assert.equal(summarize(items, Date.parse("2026-09-20T12:00:00.000Z")).errors, 2);
});
