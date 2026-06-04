# Changelog

All notable changes to the Evolver Claude Code plugin are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-06-05

Initial public release. Mirrors the
[Evolver Cursor plugin](https://github.com/EvoMap/evolver-cursor-plugin): same
MIT clean-room hooks, same memory format, no bundled MCP.

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
- **Skill** `capability-evolver` (recall → work → record loop).
- **Commands**: `/evolve`, `/status`, and engine wrappers `/run`, `/solidify`,
  `/review`, `/sync`, `/distill` (the latter use the `@evomap/evolver` CLI when
  installed, else fall back to `npx -y @evomap/evolver`).
- MIT license; EvoMap logo.

### Architecture
- **No bundled MCP server** — the `gep_*` MCP tool surface is the separately
  maintained [`@evomap/gep-mcp-server`](https://github.com/EvoMap/gep-mcp-server).
- Single-plugin repository layout (`.claude-plugin/` at root; `source: "./"`),
  matching the Cursor plugin.
