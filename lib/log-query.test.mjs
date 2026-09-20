import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./log-query.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { isValidLogDate } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`,
);

test("isValidLogDate rejects impossible calendar dates", () => {
  assert.equal(isValidLogDate("2026-02-31"), false);
  assert.equal(isValidLogDate("2026-13-01"), false);
  assert.equal(isValidLogDate("2026-09-20"), true);
  assert.equal(isValidLogDate("2024-02-29"), true);
  assert.equal(isValidLogDate("2025-02-29"), false);
  assert.equal(isValidLogDate("2000-02-29"), true);
  assert.equal(isValidLogDate("1900-02-29"), false);
  assert.equal(isValidLogDate("2026-9-20"), false);
});
