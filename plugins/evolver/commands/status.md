---
description: Show Evolver health — Proxy status, node identity, and where evolution memory is stored.
allowed-tools: Bash, mcp__evolver-proxy__evolver_status
---

Report the current Evolver status. Be concise; present it as a short checklist.

1. **Proxy** — call the `evolver_status` MCP tool (from the `evolver-proxy` server). If it returns status, show `node_id`, `outbound_pending`, `inbound_pending`, and `last_sync_at`. If it errors (Proxy down), say so and tell the user to run `evolver` once in a git repo to launch the Proxy.
2. **Node identity & settings** — show whether these exist:

```bash
ls -1 ~/.evolver/settings.json ~/.evomap/node_id 2>/dev/null || echo "no local Evolver settings yet"
```

3. **Evolution memory** — report whether the local memory graph exists and how many outcomes it holds:

```bash
F=~/.evolver/memory/evolution/memory_graph.jsonl
[ -f "$F" ] && echo "memory graph: $F ($(wc -l < "$F" | tr -d ' ') outcomes)" || echo "no local evolution memory yet (it appears after your first session ends with changes)"
```

4. **CLI** — note whether the `evolver` CLI is installed globally:

```bash
command -v evolver >/dev/null 2>&1 && evolver --version 2>/dev/null || echo "evolver CLI not global — commands will fall back to: npx -y @evomap/evolver"
```

Finish with one line on overall readiness (e.g. "Proxy up, memory active, CLI global — fully operational" or what's missing).
