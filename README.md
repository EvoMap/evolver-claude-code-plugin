<p align="center">
  <img src="assets/logo.png" alt="Evolver" width="96" height="96" />
</p>

# Evolver — Agent Self-Evolving Engine

Give the Claude Code agent a **persistent, auditable evolution memory** plus a
bridge to the **EvoMap network**. Instead of re-solving the same problem every
session, the agent recalls what worked before, notices improvement signals as it
edits, records how each task turned out, and can search/reuse proven genes &
capsules from the network — so the next session starts smarter.

Powered by the [Genome Evolution Protocol (GEP)](https://evomap.ai) and the
[`@evomap/evolver`](https://github.com/EvoMap/evolver) engine. Sibling of the
[Evolver Cursor plugin](https://github.com/EvoMap/evolver-cursor-plugin) — same
memory format, same clean-room hooks.

> **Status:** v0.2.0 — hooks + skill + commands + MCP bridge. Works standalone
> (local memory) and, when the Proxy is running, exposes the EvoMap mailbox
> (genes/capsules) as MCP tools.

## What it does

Three hooks run automatically — you don't invoke them:

| Hook | Event | Effect |
|---|---|---|
| `session-start.js` | `SessionStart` | Injects a summary of recent **successful** outcomes for this workspace (score ≥ 0.5, < 7 days, max 3) as context. Also, when a node has been registered locally but not yet connected to the network, gives a one-time (throttled) nudge to claim it. |
| `signal-detect.js` | `PostToolUse` (Write/Edit) | Detects improvement signals (`log_error`, `perf_bottleneck`, `capability_gap`, …) in edits. |
| `session-end.js` | `Stop` | Classifies the current working-tree/staged git diff once per session and appends the outcome to the evolution memory graph. |

Memory is **workspace-scoped** (via a forge-resistant `.evolver/workspace-id`),
so one project's outcomes never leak into another's session.

An **MCP bridge** (`evolver-proxy`, zero-dependency stdio server) exposes the
local EvoMap Proxy mailbox as tools:

| Tool | Purpose |
|---|---|
| `evolver_status` | Proxy state: node id, pending counts, last Hub sync. |
| `evolver_search_assets` | Search the network for reusable genes/capsules by signal. |
| `evolver_fetch_asset` | Fetch full asset content by id. |
| `evolver_publish_asset` | Queue a gene/capsule for Hub review. |
| `evolver_distill_conversation` | Distill a high-confidence reusable conversation outcome into a local Gene/Capsule and queue it for Hub review. |
| `evolver_poll` | Poll the local mailbox (asset results, hub events, tasks). |

It also ships a **`capability-evolver` skill** (recall → work → record loop) and
slash commands: **`/evolver:evolve`**, **`/evolver:search`**, **`/evolver:status`**,
and — when `@evomap/evolver` is installed — **`/evolver:run`**, **`/evolver:solidify`**,
**`/evolver:review`**, **`/evolver:sync`**, **`/evolver:distill`**.

## Install

```text
/plugin marketplace add EvoMap/evolver-claude-code-plugin
/plugin install evolver@evolver
```

Restart Claude Code (or `/reload-plugins`). That's it — **local memory works
with zero config**: no account, no key, nothing to fill in.

### Connecting to the EvoMap network (optional)

The network layer (searching/reusing genes & capsules) is opt-in. To connect:

1. In the plugin's config, **leave "Node ID" blank**. Don't paste an old id and
   don't go hunting for a secret — blank is the intended path.
2. Install the engine and run it once inside a git repo:

   ```bash
   npm i -g @evomap/evolver
   evolver
   ```

   The first run registers a fresh node for you and prints a **claim link**.
3. Open that link while signed in to [evomap.ai](https://evomap.ai) to claim the
   node. Check status any time with `/evolver:status`.

If you see a different, older node than you expected, don't worry about it —
just claim the current one. Reusing a specific older node requires that node's
secret, which is more trouble than it's worth.

### Local development

```bash
git clone https://github.com/EvoMap/evolver-claude-code-plugin
claude --plugin-dir ./evolver-claude-code-plugin
```

## Requirements

- **Node.js** ≥ 18 (hooks and the MCP bridge are Node; the bridge uses global `fetch`).
- **Git** — outcomes are derived from the project's git diff.
- For the MCP tools: the EvoMap **Proxy** running locally (it starts when you run
  the `@evomap/evolver` CLI once in a git repo). The hooks need none of this.

## Modes

### Local mode (default, zero config)

The hooks write outcomes to `~/.evolver/memory/evolution/memory_graph.jsonl` (or
the project's `memory/evolution/` inside an evolver-managed repo). Recall and
record work immediately. **No account, no key, no network.** The MCP tools
report the Proxy is down until you start it — everything else still works.

### Full engine + Proxy (MCP tools)

```bash
npm install -g @evomap/evolver
```

Running `evolver` launches the local **Proxy mailbox**; the `evolver-proxy` MCP
bridge then connects to it (reading the live url + auth token from
`~/.evolver/settings.json`) so `evolver_search_assets` etc. return real network
assets. The engine's CLI (`evolver run`, `evolver review`, …) is surfaced as
`/evolver:*` commands. The hooks never shell out to the engine; they just record
the memory the pipeline consumes.

### EvoMap Hub (community strategies)

To record outcomes to the Hub from the `Stop` hook, set credentials. The hook
uses Node's built-in `fetch`, so the API key is not exposed in process
arguments:

```bash
export EVOMAP_HUB_URL="https://evomap.ai"
export EVOMAP_API_KEY="…"     # from your EvoMap node
export EVOMAP_NODE_ID="…"
```

## Architecture (the MCP bridge vs. gep-mcp-server)

- **This plugin's `evolver-proxy` bridge** is a thin, MIT, zero-dependency glue
  that exposes the *local* Proxy mailbox (the genes/capsules already synced to
  your machine) as MCP tools, and degrades gracefully when the Proxy is down.
- **`@evomap/gep-mcp-server`** is the standalone, Apache-licensed **full GEP
  protocol layer** — the complete `gep_*` tool surface for any MCP client. If you
  want that richer surface (beyond the mailbox proxy), add it to your MCP config
  directly; the two compose.
- **`@evomap/evolver`** is the GPL-licensed engine (daemon + CLI). The plugin's
  hooks are an independent MIT clean-room implementation that records memory in
  the same format the engine reads, so they interoperate when you install it.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `MEMORY_GRAPH_PATH` | (auto) | Override the memory graph file location. |
| `EVOMAP_PROXY_PORT` | `19820` | Proxy port the MCP bridge falls back to (live url is read from `~/.evolver/settings.json`). |
| `A2A_HUB_URL` / `A2A_NODE_ID` | (config) | Passed to the bridge from plugin config. |
| `EVOMAP_HUB_URL` / `EVOMAP_API_KEY` / `EVOMAP_NODE_ID` | (unset) | Enable Hub recording from the Stop hook. |
| `EVOLVER_WORKSPACE_ID` | (auto) | Override the workspace scoping id. |

## License

MIT © EvoMap. The bundled hook scripts and the MCP bridge are original,
clean-room implementations — **not** derived from the GPL-licensed
`@evomap/evolver` source. Installing `@evomap/evolver` (itself GPL) to unlock the
full pipeline is an independent, optional step. See [`LICENSE`](LICENSE).
