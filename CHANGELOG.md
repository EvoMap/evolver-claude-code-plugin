# Changelog

All notable changes to the Evolver Claude Code plugin are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.2] — 2026-06-25

### Fixed
- `Stop` outcome recording now inspects only current working-tree and staged
  changes, not `HEAD~1`, and suppresses duplicate records for the same session
  or unchanged diff.
- Optional Hub recording now uses Node `fetch`, so API keys are not exposed in
  `curl` process arguments.
- The MCP bridge now only sends the Proxy bearer token to loopback/local
  `http(s)` URLs from `~/.evolver/settings.json`; invalid or non-local URLs
  fall back to the default local Proxy address without a token.

## [0.2.1] — 2026-06-07

### Changed
- `evolver_search_assets` now accepts a free-text `query` parameter for
  natural-language semantic search ("what asset fits my current situation?"),
  alongside the existing `signals` keyword array — provide either or both;
  `signals` is no longer required. Pairs with the companion proxy change
  (EvoMap/evolver-private-dev#208) that routes a free-text `query` to the hub's
  existing `semantic-search` endpoint.

## [0.2.0] — 2026-06-05

### Added
- **MCP bridge** `evolver-proxy` (MIT, zero-dependency stdio server) exposing the
  local EvoMap Proxy mailbox as tools: `evolver_status`, `evolver_search_assets`,
  `evolver_fetch_asset`, `evolver_publish_asset`, `evolver_poll`. Reads the live
  Proxy url + auth token from `~/.evolver/settings.json`, sends
  `Authorization: Bearer`, and degrades gracefully when the Proxy is down. (The
  full `gep_*` surface remains the separate `@evomap/gep-mcp-server`.)
- `/evolver:search` command (drives `evolver_search_assets`).
- `userConfig` for node id, hub url, proxy port, and default strategy (wired into
  the bridge env).

### Notes
- The MCP bridge was validated end-to-end against a real EvoMap Proxy: token auth,
  `evolver_status` and `evolver_search_assets` returning real network assets.
- Restores the MCP surface that the v0.1.0 mirror had dropped — it was only
  omitted to match the Cursor plugin, which had unrelated load issues; with the
  bridge working it belongs in both.

## [0.1.0] — 2026-06-05

Initial public release. Mirrors the
[Evolver Cursor plugin](https://github.com/EvoMap/evolver-cursor-plugin): same
MIT clean-room hooks, same memory format.

### Added
- **Hooks** (MIT, clean-room — not derived from the GPL `@evomap/evolver` source):
  - `SessionStart` → inject recent, **workspace-scoped**, successful outcomes
    (score ≥ 0.5, < 7 days, max 3).
  - `PostToolUse` (Write/Edit/MultiEdit) → detect evolution signals in edits.
  - `Stop` → classify the git diff and append the outcome to the memory graph.
  - Shared helpers `_paths.js` / `_filter.js` / `_signals.js`.
- **Forge-resistant workspace scoping**: `<root>/.evolver/workspace-id`
  (16-byte hex, `0600`, `O_EXCL`+`O_NOFOLLOW`) and `workspace_id`/`cwd`-tagged
  memory entries — interoperable with the `@evomap/evolver` engine and the
  Cursor plugin, and preventing cross-project memory leakage.
- **Skill** `capability-evolver`; commands `/evolve`, `/status`, `/run`,
  `/solidify`, `/review`, `/sync`, `/distill`.
- MIT license; EvoMap logo; single-plugin repository layout.
