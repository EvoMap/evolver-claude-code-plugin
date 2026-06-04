<p align="center">
  <img src="assets/logo.png" alt="Evolver" width="96" height="96" />
</p>

# Evolver — Self-Evolving Agent Memory (Claude Code Plugin)

Give the Claude Code agent a **persistent, auditable evolution memory**. Instead
of re-solving the same problem every session, the agent recalls what worked
before, notices improvement signals as it edits, and records how each task
turned out — so the next session starts smarter.

Powered by the [Genome Evolution Protocol (GEP)](https://evomap.ai) and the
[`@evomap/evolver`](https://github.com/EvoMap/evolver) engine. Sibling of the
[Evolver Cursor plugin](https://github.com/EvoMap/evolver-cursor-plugin) — same
memory format, same clean-room hooks.

> **Status:** v0.1.0 — hooks + skill + commands. Works standalone (local
> memory). The MCP tool surface is provided separately by
> [`@evomap/gep-mcp-server`](https://github.com/EvoMap/gep-mcp-server) and is
> intentionally **not** bundled here (see *Architecture* below).

## What it does

Three hooks run automatically — you don't invoke them:

| Hook | Event | Effect |
|---|---|---|
| `session-start.js` | `SessionStart` | Injects a summary of recent **successful** outcomes for this workspace (score ≥ 0.5, < 7 days, max 3) as context. |
| `signal-detect.js` | `PostToolUse` (Write/Edit) | Detects improvement signals (`log_error`, `perf_bottleneck`, `capability_gap`, …) in edits. |
| `session-end.js` | `Stop` | Classifies the task's git diff and appends the outcome to the evolution memory graph. |

Memory is **workspace-scoped** (via a forge-resistant `.evolver/workspace-id`),
so one project's outcomes never leak into another's session.

It also ships:

- A **`capability-evolver` skill** describing the recall → work → record loop.
- Slash commands: **`/evolver:evolve`** (deliberate checkpoint), **`/evolver:status`**
  (health), and — when `@evomap/evolver` is installed — **`/evolver:run`**,
  **`/evolver:solidify`**, **`/evolver:review`**, **`/evolver:sync`**,
  **`/evolver:distill`** wrapping the engine CLI.

## Install

```text
/plugin marketplace add EvoMap/evolver-claude-code-plugin
/plugin install evolver@evolver
```

Restart Claude Code (or `/reload-plugins`). The hooks activate on the next session.

### Local development

```bash
git clone https://github.com/EvoMap/evolver-claude-code-plugin
claude --plugin-dir ./evolver-claude-code-plugin
```

## Requirements

- **Node.js** ≥ 18 (the hooks are Node scripts; Claude Code invokes them via `node`).
- **Git** — outcomes are derived from the project's git diff.
- Nothing else for local memory.

## Modes

### Local mode (default, zero config)

Out of the box the hooks write outcomes to
`~/.evolver/memory/evolution/memory_graph.jsonl` (or, inside an evolver-managed
project, that project's `memory/evolution/`). Recall and record work
immediately. **No account, no key, no network.**

### Full engine

```bash
npm install -g @evomap/evolver
```

The bundled hooks always do lightweight **local** recall/record. Installing
`@evomap/evolver` does **not** change what the hooks do and they never shell out
to it. What it adds is the engine's **CLI** — `evolver run` (the full automated
review-and-solidify pipeline), `evolver review`, etc. — surfaced here as
`/evolver:*` commands. The memory the hooks record feeds that pipeline, so the
two compose cleanly.

### EvoMap Hub (community strategies)

To record outcomes to the Hub, set credentials in your environment:

```bash
export EVOMAP_HUB_URL="https://evomap.ai"
export EVOMAP_API_KEY="…"     # from your EvoMap node
export EVOMAP_NODE_ID="…"
```

The `Stop` hook then records to the Hub (with a local fallback if it's
unreachable). See the [evolver docs](https://evomap.ai) for node registration.

## Architecture (why no bundled MCP server)

EvoMap deliberately splits two products:

- **`@evomap/evolver`** — the GPL-licensed, source-available evolution engine
  (daemon + CLI). This plugin does **not** bundle it; the plugin's own hooks are
  an independent MIT clean-room implementation that records memory in the same
  format the engine reads, so the two interoperate when you install it.
- **`@evomap/gep-mcp-server`** — an Apache-licensed, standalone **protocol
  layer** that exposes GEP capabilities as MCP tools to any MCP client.

This plugin ships only the lightweight session-lifecycle hooks (the glue Claude
Code needs), which work standalone and degrade gracefully. If you also want the
`gep_*` MCP tools, add `@evomap/gep-mcp-server` to your Claude Code MCP config
directly — it is not re-bundled here to avoid duplicating a separately
maintained product.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `MEMORY_GRAPH_PATH` | (auto) | Override the memory graph file location. |
| `EVOMAP_HUB_URL` / `EVOMAP_API_KEY` / `EVOMAP_NODE_ID` | (unset) | Enable Hub recording. |
| `EVOLVER_WORKSPACE_ID` | (auto) | Override the workspace scoping id. |

## License

MIT © EvoMap. The bundled hook scripts are an original, clean-room
implementation written against the hook behavior spec — they are **not** derived
from the GPL-licensed `@evomap/evolver` source. Installing `@evomap/evolver`
(itself GPL) to unlock the full pipeline is an independent, optional step. See
[`LICENSE`](LICENSE).
