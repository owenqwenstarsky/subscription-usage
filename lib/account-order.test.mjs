import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./account-order.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const { readAccountOrder, reconcileAccountOrder, sameAccountOrder } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("readAccountOrder falls back safely for malformed or unavailable storage", () => {
  globalThis.window = {
    localStorage: {
      getItem() {
        return "not-json";
      },
    },
  };
  assert.deepEqual(readAccountOrder(), []);

  globalThis.window = {
    localStorage: {
      getItem() {
        throw new Error("storage unavailable");
      },
    },
  };
  assert.deepEqual(readAccountOrder(), []);
  delete globalThis.window;
});

test("readAccountOrder accepts only unique, non-empty string IDs", () => {
  globalThis.window = {
    localStorage: {
      getItem() {
        return JSON.stringify(["account-b", "", 12, "account-b", "account-a"]);
      },
    },
  };
  assert.deepEqual(readAccountOrder(), ["account-b", "account-a"]);
  delete globalThis.window;
});

test("reconcileAccountOrder preserves saved positions and appends new accounts", () => {
  assert.deepEqual(
    reconcileAccountOrder(["account-b", "account-a"], ["account-a", "account-b", "account-c"]),
    ["account-b", "account-a", "account-c"],
  );
});

test("reconcileAccountOrder drops deleted, duplicate, and invalid entries", () => {
  assert.deepEqual(
    reconcileAccountOrder(
      ["deleted", "account-b", "account-b", "", 42],
      ["account-a", "account-b", "account-a"],
    ),
    ["account-b", "account-a"],
  );
});

test("sameAccountOrder compares positions as well as membership", () => {
  assert.equal(sameAccountOrder(["a", "b"], ["a", "b"]), true);
  assert.equal(sameAccountOrder(["a", "b"], ["b", "a"]), false);
});
