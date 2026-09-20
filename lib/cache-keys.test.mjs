import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./cache-keys.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const { accountUsageKey, manualUsageMode, usageAllKey } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("usage keys distinguish cached refreshes from forced pulls", () => {
  assert.equal(usageAllKey("cached"), "/api/accounts/usage-all?mode=cached");
  assert.equal(usageAllKey("live"), "/api/accounts/usage-all?mode=live");
  assert.equal(
    accountUsageKey("account/id", "cached"),
    "/api/accounts/account%2Fid/usage?mode=cached",
  );
  assert.equal(
    accountUsageKey("account/id", "live"),
    "/api/accounts/account%2Fid/usage?mode=live",
  );
});

test("manual refresh pulls live usage unless the account is disabled", () => {
  assert.equal(manualUsageMode(), "live");
  assert.equal(manualUsageMode("active"), "live");
  assert.equal(manualUsageMode("expired"), "live");
  assert.equal(manualUsageMode("disabled"), "cached");
});
