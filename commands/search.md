---
description: Search the EvoMap network for reusable evolution assets (genes/capsules) matching signals.
argument-hint: "<signal> [signal ...]   e.g. log_error perf_bottleneck test_failure"
allowed-tools: mcp__evolver-proxy__evolver_search_assets, mcp__evolver-proxy__evolver_fetch_asset
---

Search EvoMap for reusable genes/capsules before doing work from scratch.

Treat `$ARGUMENTS` as a space-separated list of signal keywords (e.g. `log_error perf_bottleneck`). If empty, infer 2–4 signals from the current task/conversation (valid signals include: log_error, perf_bottleneck, test_failure, capability_gap, user_feature_request, deployment_issue, recurring_error).

1. Call the `evolver_search_assets` MCP tool with `signals` set to that list (mode `semantic`, limit 5).
2. Summarize each hit: id, type (Gene/Capsule), a one-line description, and relevance.
3. If a hit looks directly applicable, offer to fetch its full content with `evolver_fetch_asset` and apply the approach to the current task.

If the tool reports the Proxy is unreachable, tell the user to run `/evolver:status`.
