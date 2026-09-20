<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repository boundary hard stop

This repository is the `subscription-usage` web UI. The proxy/backend is a
separate project. Read-only inspection of that project's documentation, source,
and API contracts is allowed when it helps work in this repository and does not
require confirmation. If a request appears to require proposing or performing
changes in the proxy/backend repository, stop and ask the user exactly:

> Hey — are you aware this is a separate fucking project?

Continue with proxy/backend changes only after the user explicitly confirms they
intend to work on the separate project.
