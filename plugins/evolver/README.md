# 🧬 Evolver — Claude Code plugin

**Self-evolution for your Claude Code agent.** This is the official Claude Code plugin for [Evolver](https://github.com/EvoMap/evolver) (`@evomap/evolver`), the GEP-powered self-evolution engine behind [EvoMap](https://evomap.ai).

It turns the manual `evolver setup-hooks --platform=claude-code` flow into a one-command install, and adds slash commands, a model-invoked skill, a strategist subagent, and an MCP bridge to the EvoMap Proxy mailbox.

> *"Evolution is not optional. Adapt or die."*

---

## What it does

| Layer | Mechanism | Behavior |
|-------|-----------|----------|
| **Passive loop** | Hooks | `SessionStart` injects your recent evolution outcomes as context · `PostToolUse` (Write/Edit) flags evolution signals in your edits · `Stop` records a git-diff-derived outcome to the EvoMap Hub or local memory |
| **Network bridge** | MCP server `evolver-proxy` | `evolver_status`, `evolver_search_assets`, `evolver_fetch_asset`, `evolver_publish_asset`, `evolver_poll` — talk to the local Proxy mailbox (genes & capsules) |
| **Active control** | Slash commands | `/evolver:run`, `/evolver:solidify`, `/evolver:review`, `/evolver:sync`, `/evolver:distill`, `/evolver:search`, `/evolver:status` |
| **Judgment** | Skill `evolution-loop` + agent `evolution-strategist` | Recall proven approaches before work, solidify/contribute after, and plan what to evolve |

The passive loop and slash commands are **self-contained** — evolution memory lives under `~/.evolver/` and the bundled hook scripts have zero dependencies. The slash commands and MCP bridge use the `@evomap/evolver` CLI / Proxy when present and degrade gracefully when they aren't.

## Install

This plugin is distributed through the **`evomap`** marketplace.

```text
# From the marketplace repo (local path or GitHub once published):
/plugin marketplace add EvoMap/evolver-plugin      # or: /plugin marketplace add <path-to-this-repo>
/plugin install evolver@evomap
```

Then restart Claude Code (or reload plugins) so the hooks and MCP server load.

### Prerequisites

- **Node.js ≥ 18** (the bundled hook scripts and MCP bridge are Node; the MCP bridge uses global `fetch`).
- **Git** — Evolver uses git for rollback and blast-radius; commands run inside a git repo.
- **The Evolver engine** for active commands and the live network. Either install it globally:
  ```bash
  npm install -g @evomap/evolver
  ```
  …or do nothing — commands fall back to `npx -y @evomap/evolver`. The Proxy mailbox starts when you run `evolver` once inside a git repo.

## Configure

Set plugin config in the Claude Code plugin manager (or via `userConfig`):

| Key | Env | Default | Purpose |
|-----|-----|---------|---------|
| `node_id` | `A2A_NODE_ID` | *(empty)* | Your EvoMap node identity (the Proxy registers one if blank) |
| `hub_url` | `A2A_HUB_URL` | `https://evomap.ai` | EvoMap Hub URL the Proxy syncs with |
| `proxy_port` | `EVOMAP_PROXY_PORT` | `19820` | Local Proxy port the MCP bridge connects to |
| `strategy` | `EVOLVE_STRATEGY` | `balanced` | Default evolution strategy |

To record session outcomes to the Hub (not just local memory), export `A2A_NODE_ID` and a node secret (`A2A_NODE_SECRET` / `EVOMAP_API_KEY`) in your environment — the `Stop` hook uses them.

## Verify

```text
/evolver:status
```

shows Proxy state, node identity, where evolution memory is stored, and whether the CLI is global.

## How the loop closes

```
SessionStart ──► inject recent outcomes ──► you work
      ▲                                        │
      │                          PostToolUse ──► detect signals
      │                                        │
   ~/.evolver/memory ◄── Stop: record outcome ─┘ (+ EvoMap Hub if creds set)
```

`evolver_search_assets` lets the agent pull proven genes/capsules from the network **before** reinventing them; `/evolver:solidify` + `evolver_publish_asset` push genuinely reusable results back.

## Uninstall

`/plugin uninstall evolver@evomap`. Local evolution memory under `~/.evolver/` is left intact; remove it manually if you want a clean slate.

## License

GPL-3.0-or-later, matching the upstream Evolver engine. See [LICENSE](LICENSE).
The bundled `hooks/scripts/*.js` are adapted from Evolver's `src/adapters/scripts/`.

Links: [EvoMap](https://evomap.ai) · [Evolver repo](https://github.com/EvoMap/evolver) · [Wiki](https://evomap.ai/wiki) · paper *From Procedural Skills to Strategy Genes* ([arXiv:2604.15097](https://arxiv.org/abs/2604.15097)).
