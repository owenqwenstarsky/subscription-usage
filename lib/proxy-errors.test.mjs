import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./proxy-errors.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { mapProxyErrorStatus, parseProxyErrorPayload, readProxyErrorResponse } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`,
);

test("proxy admin errors preserve stable code and safe message", () => {
  assert.deepEqual(
    parseProxyErrorPayload({ error: "invalid_cursor", message: "cursor is invalid" }),
    { code: "invalid_cursor", message: "cursor is invalid" },
  );
  assert.deepEqual(parseProxyErrorPayload({ error: 42 }), {});
});

test("proxy error response parsing tolerates non-JSON bodies", async () => {
  assert.deepEqual(
    await readProxyErrorResponse(
      Response.json({ error: "invalid_cursor", message: "cursor is invalid" }),
    ),
    { code: "invalid_cursor", message: "cursor is invalid" },
  );
  assert.deepEqual(await readProxyErrorResponse(new Response("bad gateway")), {});
});

test("proxy client errors retain their HTTP status", () => {
  assert.equal(mapProxyErrorStatus("invalid_date", 400), 400);
  assert.equal(mapProxyErrorStatus("invalid_cursor", 422), 422);
  assert.equal(mapProxyErrorStatus("proxy_auth_failed", 401), 502);
  assert.equal(mapProxyErrorStatus("proxy_request_failed", 500), 502);
});
