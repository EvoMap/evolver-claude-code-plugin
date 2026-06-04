---
name: evolution-loop
description: Drive Evolver's self-evolution loop in Claude Code — recall proven genes/capsules before substantive work, watch for evolution signals while working, and record/solidify outcomes after. Use when the user is doing non-trivial engineering (fixing recurring bugs, perf work, adding capabilities) in a git repo where Evolver is active, or explicitly asks to evolve, solidify, recall, or publish evolution assets.
allowed-tools:
  - Bash
  - Read
  - mcp__evolver-proxy__evolver_status
  - mcp__evolver-proxy__evolver_search_assets
  - mcp__evolver-proxy__evolver_fetch_asset
  - mcp__evolver-proxy__evolver_publish_asset
  - mcp__evolver-proxy__evolver_poll
---

# Evolver evolution loop

Evolver turns ad-hoc problem solving into **auditable, reusable evolution assets** under the Genome Evolution Protocol (GEP): compact **Genes** (strategy) and **Capsules** (concrete episodes). This plugin wires that loop into Claude Code so the agent gets measurably better at recurring work over time, and can share/reuse improvements across the EvoMap network.

The passive half runs automatically via hooks (no action needed):
- **SessionStart** injects the last few evolution outcomes as context.
- **PostToolUse (Write/Edit)** flags evolution signals it sees in your edits.
- **Stop** records a git-diff-derived outcome to the EvoMap Hub (if credentials are set) or local memory.

Your job is the **active half** — apply judgment at the right moments:

## 1. Before substantive work — recall

When the user starts a non-trivial task (a recurring bug, a performance problem, a capability gap, flaky tests), **search for prior art first**:

- Call `evolver_search_assets` with the relevant signals (e.g. `["test_failure","recurring_error"]`).
- If a Gene/Capsule looks applicable, `evolver_fetch_asset` it and adapt the proven approach instead of starting cold.

Recognized signals: `log_error`, `perf_bottleneck`, `test_failure`, `capability_gap`, `user_feature_request`, `recurring_error`, `deployment_issue`.

## 2. While working — notice signals

If you hit the same error twice, fight a perf bottleneck, or discover a missing capability, name the signal explicitly. It both helps the user and improves the end-of-session outcome record.

## 3. After substantive work — solidify & contribute

When a non-trivial change lands and tests pass:
- Suggest `/evolver:solidify` to capture the working approach as a durable gene/capsule (with rollback safety).
- If the result is genuinely reusable, offer to publish it with `evolver_publish_asset` (queued to the Hub for review). Only publish assets that came from real evolution work — never fabricate them.

## Don't

- Don't run a full `/evolver:run` cycle unless the user asks — it can propose code changes that need review.
- Don't auto-approve pending evolved changes; route approval through `/evolver:review`.
- Don't block on the Proxy: if `evolver_status` shows it's down, proceed with the task and mention the user can start it by running `evolver` once in a git repo.

## Quick reference

| Goal | Use |
|------|-----|
| Check Proxy / node / memory health | `/evolver:status` |
| Find reusable assets | `evolver_search_assets` or `/evolver:search` |
| Run one evolution cycle | `/evolver:run` |
| Capture current change as a gene | `/evolver:solidify` |
| Accept/reject pending evolved changes | `/evolver:review` |
| Pull/sync assets from the Hub | `/evolver:sync` |
| Distill a skill from history | `/evolver:distill` |
