---
description: Sync evolution assets (genes/capsules) between the local store and the EvoMap Hub.
argument-hint: "[--scope=all|purchased|published] [--type=Gene|Capsule] [--export=<path.gepx>] [--dry-run]"
allowed-tools: Bash
---

Sync Evolver assets with the EvoMap Hub.

```bash
EVOLVER="evolver"; command -v evolver >/dev/null 2>&1 || EVOLVER="npx -y @evomap/evolver"
$EVOLVER sync $ARGUMENTS
```

After it runs, summarize: how many assets were pulled/updated, any local-only (unpublished) assets it listed, and — if `--export` was given — where the `.gepx` archive was written.

If the command reports the Proxy or node identity is missing, point the user to `/evolver:status` to diagnose.
