---
description: Show Evolver health — evolution memory location & size, recent log, and whether the full engine is installed.
allowed-tools: Bash
---

Report the current Evolver status as a short checklist. This plugin records
memory locally via hooks; there is no MCP server or proxy to query.

1. **Evolution memory** — does the local graph exist and how many outcomes does it hold?

```bash
F=~/.evolver/memory/evolution/memory_graph.jsonl
[ -f "$F" ] && echo "memory graph: $F ($(wc -l < "$F" | tr -d ' ') outcomes)" || echo "no local evolution memory yet (it appears after a session ends with changes in a git repo)"
```

2. **This workspace's id** — the forge-resistant scoping key (only in a git repo):

```bash
R=$(git rev-parse --show-toplevel 2>/dev/null); [ -n "$R" ] && { [ -f "$R/.evolver/workspace-id" ] && echo "workspace-id: present" || echo "workspace-id: not yet created (made on first recorded outcome)"; } || echo "not a git repo — memory inactive here"
```

3. **Recent activity** — last few evolution-log lines:

```bash
tail -n 5 ~/.evolver/logs/evolution.log 2>/dev/null || echo "no evolution log yet"
```

4. **Full engine (optional)** — is the `@evomap/evolver` CLI installed?

```bash
command -v evolver >/dev/null 2>&1 && evolver --version 2>/dev/null | head -1 || echo "evolver CLI not installed — hooks still work standalone; 'npm i -g @evomap/evolver' unlocks /evolver:run etc."
```

Finish with one line on overall readiness.
