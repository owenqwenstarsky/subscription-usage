<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repository boundary hard stop

This repository is the `subscription-usage` web UI. The proxy/backend is a
separate project at <https://github.com/owenqwenstarsky/chatgpt-codex-proxy>.
Use the GitHub API to read that repository's `main` branch as the source of
truth for proxy behavior, APIs, and implementation details. If a request
appears to require changing the proxy/backend, stop before proposing or
performing that work and ask the user exactly:

> Hey — are you aware this is a separate fucking project?

Continue across that repository boundary only after the user explicitly
confirms they intend to work on the separate project.
