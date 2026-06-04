---
description: Distill a reusable skill/gene from recent run history (optionally from an LLM response file).
argument-hint: "[--response-file=<path>]"
allowed-tools: Bash
---

Distill Evolver run history into a reusable skill/gene.

```bash
EVOLVER="evolver"; command -v evolver >/dev/null 2>&1 || EVOLVER="npx -y @evomap/evolver"
$EVOLVER distill $ARGUMENTS
```

Explain to the user what was distilled (the candidate skill/gene and the signals it generalizes), and remind them that only assets produced through genuine Evolver self-evolution are eligible to be published to the EvoMap skill store via `/evolver:sync`.
