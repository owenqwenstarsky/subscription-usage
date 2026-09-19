# Codex subscription usage viewer

Next.js dashboard for viewing usage/quota across all Codex accounts on a
local [chatgpt-codex-proxy](../chatgpt-codex-proxy/) instance.

No login. The proxy API key lives only in server-side env vars and is never
sent to the browser.

## Setup

1. Start the proxy (from `../chatgpt-codex-proxy/`):

   ```bash
   cp .env.example .env   # set PROXY_API_KEY
   docker compose up -d --build
   # or: go run ./cmd/api
   ```

2. Configure this app:

   ```bash
   cp .env.example .env.local   # set PROXY_API_KEY to the SAME value as the proxy
   npm install
   npm run dev
   ```

3. Open http://localhost:3000

Env vars (`web/.env.local`, server-only — never `NEXT_PUBLIC_`):

| Var              | Default                 | Meaning                                  |
| ---------------- | ----------------------- | ---------------------------------------- |
| `PROXY_BASE_URL` | `http://localhost:8080` | Base URL of the running proxy            |
| `PROXY_API_KEY`  | (required)              | Same key as the proxy's `PROXY_API_KEY`  |

## Cached vs live

- **Cached** (default, auto-poll): reads the proxy's stored quota snapshots.
  Fast, never hits upstream.
- **Live** (manual button): the server fans out to
  `GET /admin/accounts/:id/usage` for every account, which fetches fresh
  quota from `chatgpt.com`. Slow (seconds), can partially fail — per-account
  errors stay on each card and cached data remains visible.

## Features

- Live dashboard: cached auto-poll (15s–5m, focus revalidate, updating
  indicator), manual live refresh with cancel, one-shot refetch when the
  nearest cooldown/reset expires
- Overview counts (clickable: eligible / exhausted / cooldown / disabled /
  errors) + token expired / expiring + max primary
- Per-account primary (~5h), secondary (~weekly), and code-review (~daily) bars
  with reset countdowns
- Credits, OAuth expiry, cooldown, last error, quota source/fetched-at
- Per-card live refresh (patches the card, no full refetch), token refresh,
  optimistic enable/disable + label edit with rollback, delete with confirm
- Add account via device-login flow (auth URL + user code + status polling)
- Rotation strategy switcher (optimistic, works even when health fails)
- Filter / search / sort synced to the URL (`?filter&sort&q`), detail page
  with label edit, enable/disable, delete, raw JSON
- `?mode=` is strict: `cached|live`, anything else is a 400

## API routes (all server-side, proxy key never leaves the server)

- `GET /api/health` (always 200; failures via `proxyReachable:false`)
- `GET /api/accounts`
- `GET /api/accounts/[id]` (metadata for the detail header)
- `DELETE /api/accounts/[id]`
- `GET /api/accounts/usage-all?mode=cached|live`
- `GET /api/accounts/[id]/usage?mode=cached|live`
- `POST /api/accounts/[id]/refresh-usage`
- `POST /api/accounts/[id]/refresh-token`
- `PATCH /api/accounts/[id]` (`{label, status}`)
- `POST /api/device-login/start`, `GET /api/device-login/[loginId]`
- `GET|PUT /api/rotation`
- `GET /api/activity` (protected proxy activity snapshot)
- `GET /api/activity/stream` (server-relayed SSE; proxy key stays server-side)
- `GET /api/logs/dates`, `GET /api/logs?date=YYYY-MM-DD` (retained request logs)

## Request activity contract

The Activity and Logbook pages require `chatgpt-codex-proxy` to provide the
following authenticated admin endpoints. Request records must contain redacted
metadata only: request ID, timestamps, route template, model, account label/ID,
phase, outcome, HTTP status/duration, and a safe error code/message. Never emit
request bodies, response bodies, prompts, tokens, or authorization headers.

- `GET /admin/requests/activity` returns `{ requests, emittedAt }`.
- `GET /admin/requests/activity/stream` is SSE. It sends `snapshot`, `upsert`,
  and `remove` events with the same record shape; every new connection starts
  with a snapshot.
- `GET /admin/requests/logs/dates` returns available UTC days and their total/
  failure counts.
- `GET /admin/requests/logs` accepts `date`, `limit`, `cursor`, `q`, `outcome`,
  `account`, and `model`; it returns `{ date, records, nextCursor, fetchedAt }`.

The proxy should retain active and terminal records for 60 seconds and append
one finalized redacted JSONL record to `request-YYYY-MM-DD.jsonl` for the UTC
start day. Retain 30 daily files.

## Security note

This site intentionally has no auth. Run it on localhost or a trusted
network only — anyone with access can trigger live upstream refreshes and
enable/disable accounts. Do not expose it publicly.

## Verify

```bash
npx tsc --noEmit
npm run lint
npm run build
```
