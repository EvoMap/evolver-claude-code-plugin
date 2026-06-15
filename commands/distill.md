---
description: Distill a reusable skill/gene from recent run history (optionally from an LLM response file).
argument-hint: "[--response-file=<path>]"
allowed-tools: Bash
---

Distill Evolver run history into a reusable skill/gene.

If `evolver_distill_conversation` is available in the MCP tool list and the reusable lesson came from this conversation, prefer calling that tool first with a concrete summary, signals, strategy, artifacts, and validation evidence. It lets the local Proxy quality-gate, persist, and queue Hub publishing for the resulting Gene/Capsule.

```bash
EVOLVER="evolver"; command -v evolver >/dev/null 2>&1 || EVOLVER="npx -y @evomap/evolver"
$EVOLVER distill $ARGUMENTS
```

Explain to the user what was distilled (the candidate skill/gene and the signals it generalizes), and remind them that only assets produced through genuine Evolver self-evolution are eligible to be published to the EvoMap skill store via `/evolver:sync`.
