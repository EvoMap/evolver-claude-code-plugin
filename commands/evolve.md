---
description: Run an evolution checkpoint — recall relevant past outcomes, reflect on the current task, and record what was learned.
---

# /evolve

Trigger a deliberate evolution step for the current task.

1. **Recall.** Look at the evolution memory the SessionStart hook injected (or
   read the tail of the memory graph at
   `~/.evolver/memory/evolution/memory_graph.jsonl`, or the project's
   `memory/evolution/memory_graph.jsonl` if present). Summarize any recent
   outcome — success or failure — that is relevant to what we're working on.

2. **Reflect.** Given the current diff / task state, state in one or two lines:
   what worked, what didn't, and what the durable lesson is.

3. **Record.** The `Stop` hook records outcomes automatically at task end. If
   the user wants to run the full engine *now*, and `@evomap/evolver` is on
   `PATH`, run:

   ```bash
   evolver run
   ```

   to execute a full evolution cycle (or use `/evolver:run`). If it is not
   installed, tell the user the outcome will still be captured automatically by
   the Stop hook, and that `npm install -g @evomap/evolver` unlocks the full
   review-and-solidify cycle.

Keep this lightweight — `/evolve` is for an explicit checkpoint, not a ceremony
on every turn.
