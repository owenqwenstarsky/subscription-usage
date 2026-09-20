<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Testing requirement

Always add or update automated tests for every code change. Tests must cover the
new or changed behavior and relevant failure or edge cases. Run the applicable
test suite before finishing. If an automated test is genuinely impossible,
state why and document the manual verification performed instead.

# Documentation maintenance

Always update the documentation when a change affects behavior, configuration,
routes or data contracts, setup, operations, security assumptions, or the
developer workflow. Keep `README.md` and any relevant files under `docs/`
accurate in the same change; do not leave documentation updates for later.

# Repository boundary hard stop

This repository is the `subscription-usage` web UI. The proxy/backend is a
separate project at <https://github.com/owenqwenstarsky/chatgpt-codex-proxy>.
Use the GitHub API to read that repository's `main` branch as the source of
truth for proxy behavior, APIs, and implementation details. This read-only
inspection does not require confirmation. If a request appears to require
proposing or performing changes in the proxy/backend repository, stop and ask
the user exactly:

> Hey — are you aware this is a separate fucking project?

Continue with proxy/backend changes only after the user explicitly confirms they
intend to work on the separate project.
