---
name: capability-evolver
description: Self-evolution workflow for the agent. Before a substantive task, recall what worked on similar past tasks from evolution memory; after it, record the outcome so future sessions learn from it. Use when the user starts non-trivial work (a feature, a fix, a refactor) or asks the agent to "evolve", "learn from this", or "remember how this went".
---

# Capability Evolver

This plugin gives the agent a **persistent, auditable evolution memory** built on the
Genome Evolution Protocol (GEP). The goal is simple: stop re-solving the same
problem from scratch. Past outcomes — what worked, what failed — are carried
forward into future sessions.

## How it works (automatic)

Three hooks run on their own; you don't invoke them:

- **`SessionStart`** — injects a short summary of recent **successful** outcomes
  for *this workspace* (filtered to score ≥ 0.5, < 7 days old, max 3) as
  context. The agent sees "here's what worked recently" before it starts.
- **`PostToolUse`** (Write/Edit) — scans edits for improvement signals
  (`log_error`, `perf_bottleneck`, `capability_gap`, `test_failure`, …) and
  nudges the agent to record the outcome when relevant.
- **`Stop`** — at the end of a task, collects the git diff, classifies the
  outcome, and appends it to the evolution memory graph (scoped to the
  workspace so other projects' memory never leaks in).

Memory is written to a local JSONL graph. With no extra setup it lands in
`~/.evolver/memory/evolution/memory_graph.jsonl`; inside an evolver-managed
project it lands under that project's `memory/evolution/`.

## What you (the agent) should do

For any **substantive** task — a feature, a non-trivial fix, a refactor:

1. **Before starting**, check the injected evolution memory (it arrives as
   session-start context). If a recent successful outcome matches the task,
   reuse that approach. If a recent *failure* matches, avoid repeating it.
2. **Do the work.**
3. **After finishing**, the `Stop` hook records the outcome automatically. You
   don't need to call anything — but if the task had a clear lesson worth a
   one-line note, say so in your final message so it's captured in the diff
   context the hook reads.

Trivial or purely conversational turns don't need this — skip it.

## Signals

The hooks classify work by signal. Knowing the vocabulary helps you describe
outcomes in terms the memory graph indexes well:

| Signal | Fires on |
|---|---|
| `log_error` | errors, exceptions, failures in the diff |
| `perf_bottleneck` | timeout / slow / latency / OOM |
| `capability_gap` | "not supported" / "not implemented" |
| `user_feature_request` | adding a feature / new module |
| `test_failure` | failing tests / assertions |
| `deployment_issue` | build / CI / pipeline / rollback |

## Full pipeline (optional)

The bundled hooks record outcomes and recall them — that works on its own. To
get the **full evolution engine** (automated log analysis, the
review-and-solidify cycle that proposes and applies code improvements), install
it:

```bash
npm install -g @evomap/evolver
```

This gives you the engine's CLI (e.g. `evolver run`, surfaced by the
`/evolver:run` command) to run that pipeline separately — the hooks do not
auto-detect or invoke it. The memory the hooks record is what the pipeline
consumes. See the plugin README for connecting an EvoMap Hub node for community
strategies.

## MCP tools

This plugin bundles a lightweight MCP bridge (`evolver-proxy`) exposing the local
EvoMap Proxy mailbox:

- `evolver_search_assets` — find reusable genes/capsules by signal. **Call this
  before substantive work** to reuse proven approaches instead of reinventing them.
- `evolver_status` — Proxy state (node id, pending counts, last sync).
- `evolver_fetch_asset` / `evolver_publish_asset` / `evolver_poll`.

The tools degrade gracefully when the Proxy isn't running (the local memory hooks
still work). The richer, full `gep_*` surface is the separate
[`@evomap/gep-mcp-server`](https://github.com/EvoMap/gep-mcp-server) — add it to
your MCP config if you want it; the two compose.
