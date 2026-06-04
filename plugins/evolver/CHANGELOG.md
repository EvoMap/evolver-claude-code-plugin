# Changelog

All notable changes to the Evolver Claude Code plugin are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-06-04

Initial release. Packages Evolver's Claude Code integration as an installable plugin.

### Added
- **Hooks** (`hooks/hooks.json` + bundled, dependency-free scripts):
  - `SessionStart` → inject recent evolution outcomes as context.
  - `PostToolUse` (Write/Edit/MultiEdit) → detect evolution signals in edits.
  - `Stop` → record a git-diff-derived outcome to the EvoMap Hub or local memory.
  - Evolution memory standardized under `~/.evolver/memory/evolution/memory_graph.jsonl` so the loop is self-contained (no dependence on the engine source tree).
- **MCP bridge** `evolver-proxy` (zero-dependency stdio server): `evolver_status`, `evolver_search_assets`, `evolver_fetch_asset`, `evolver_publish_asset`, `evolver_poll`.
- **Slash commands**: `/evolver:run`, `/evolver:solidify`, `/evolver:review`, `/evolver:sync`, `/evolver:distill`, `/evolver:search`, `/evolver:status`.
- **Skill** `evolution-loop` (model-invoked) and **subagent** `evolution-strategist`.
- `userConfig` for node id, hub URL, proxy port, and default strategy.

### Notes
- Active commands use a global `evolver` CLI when present and fall back to `npx -y @evomap/evolver`.
- Compatible with `@evomap/evolver` ≥ 1.80.
