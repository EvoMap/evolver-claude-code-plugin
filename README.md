# EvoMap — Claude Code marketplace

Official [Claude Code](https://claude.com/claude-code) plugin marketplace for [EvoMap](https://evomap.ai).

## Plugins

| Plugin | Description |
|--------|-------------|
| [**evolver**](plugins/evolver) | Self-evolution for your Claude Code agent — auto-recall of past outcomes, signal detection, outcome recording, and an MCP bridge to the EvoMap Proxy (genes & capsules). Powered by [`@evomap/evolver`](https://github.com/EvoMap/evolver). |

## Install

```text
/plugin marketplace add EvoMap/evolver-plugin   # or a local path to this repo
/plugin install evolver@evomap
```

Then restart Claude Code so hooks and the MCP server load. See [plugins/evolver/README.md](plugins/evolver/README.md) for prerequisites, configuration, and usage.

## Develop locally

```bash
# Validate the marketplace and plugin
claude plugin validate .

# Try the plugin without installing (loads it directly)
claude --plugin-dir ./plugins/evolver
```

## License

The Evolver plugin is GPL-3.0-or-later, matching the upstream engine. See [plugins/evolver/LICENSE](plugins/evolver/LICENSE).
