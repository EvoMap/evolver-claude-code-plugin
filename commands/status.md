---
description: Show Evolver health — Proxy/MCP status, evolution memory, workspace id, and whether the full engine is installed.
allowed-tools: Bash, mcp__evolver-proxy__evolver_status
---

Report Evolver health as a short checklist.

1. **Proxy / MCP** — call the `evolver_status` MCP tool (from the `evolver-proxy`
   server). If it returns status, show `node_id`, `outbound_pending`,
   `inbound_pending`, `last_sync_at`. If it errors, the Proxy is down — note it
   starts when you run `evolver` once in a git repo, and that the local memory
   hooks keep working regardless.

2. **Evolution memory** — does the local graph exist and how many outcomes?

```bash
F=~/.evolver/memory/evolution/memory_graph.jsonl
[ -f "$F" ] && echo "memory graph: $F ($(wc -l < "$F" | tr -d ' ') outcomes)" || echo "no local evolution memory yet (appears after a session ends with changes in a git repo)"
```

3. **This workspace's id** — the forge-resistant scoping key (only in a git repo):

```bash
R=$(git rev-parse --show-toplevel 2>/dev/null); [ -n "$R" ] && { [ -f "$R/.evolver/workspace-id" ] && echo "workspace-id: present" || echo "workspace-id: not yet created"; } || echo "not a git repo — memory inactive here"
```

4. **Full engine (optional)** — is the `@evomap/evolver` CLI installed?

```bash
command -v evolver >/dev/null 2>&1 && evolver --version 2>/dev/null | head -1 || echo "evolver CLI not installed — hooks + MCP still work; 'npm i -g @evomap/evolver' unlocks /evolver:run etc."
```

Finish with one line on overall readiness.
