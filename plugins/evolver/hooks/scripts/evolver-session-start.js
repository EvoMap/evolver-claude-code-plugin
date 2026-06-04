#!/usr/bin/env node
// evolver-session-start.js  (Claude Code plugin edition)
// SessionStart hook: reads recent Evolver evolution memory and injects it as
// additional context for the new agent session.
//
// Self-contained by design: no cross-requires (the file is run flat from the
// plugin's hooks/scripts dir, so relative requires into the engine would break).
// Reads only; never creates files. Always exits 0 with JSON on stdout.

const fs = require('fs');
const path = require('path');
const os = require('os');

// Stable, plugin-owned location for the evolution memory graph. session-start
// (read) and session-end (write) must agree on this path WITHOUT depending on
// the @evomap/evolver source tree being a parent directory.
function resolveMemoryGraph() {
  // Explicit env overrides are authoritative — returned as-is (readLastN
  // tolerates a missing file). Implicit locations are gated on existence so we
  // only inject memory that actually exists.
  if (process.env.MEMORY_GRAPH_PATH) return process.env.MEMORY_GRAPH_PATH;
  if (process.env.EVOLVER_ROOT) {
    return path.join(process.env.EVOLVER_ROOT, 'memory', 'evolution', 'memory_graph.jsonl');
  }
  const implicit = [
    path.join(os.homedir(), '.evolver', 'memory', 'evolution', 'memory_graph.jsonl'),
    path.join(os.homedir(), 'skills', 'evolver', 'memory', 'evolution', 'memory_graph.jsonl'),
  ];
  for (const c of implicit) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function readLastN(filePath, n) {
  try {
    const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-n).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

function formatOutcome(entry) {
  const o = entry.outcome || {};
  const status = o.status || 'unknown';
  const score = o.score != null ? o.score : '?';
  const note = o.note || '';
  const signals = Array.isArray(entry.signals) ? entry.signals.slice(0, 3).join(', ') : '';
  const ts = entry.timestamp ? entry.timestamp.slice(0, 10) : '';
  const icon = status === 'success' ? '+' : status === 'failed' ? '-' : '?';
  return `[${icon}] ${ts} score=${score} signals=[${signals}] ${note}`.slice(0, 200);
}

function emit(context) {
  if (!context) { process.stdout.write('{}'); return; }
  process.stdout.write(JSON.stringify({
    additionalContext: context,
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
  }));
}

function main() {
  const graphPath = resolveMemoryGraph();
  if (!graphPath) return emit(null);

  const entries = readLastN(graphPath, 5);
  if (entries.length === 0) return emit(null);

  const successCount = entries.filter(e => e.outcome && e.outcome.status === 'success').length;
  const failCount = entries.filter(e => e.outcome && e.outcome.status === 'failed').length;

  const summary = [
    `[Evolution Memory] Recent ${entries.length} outcomes (${successCount} success, ${failCount} failed):`,
    ...entries.map(formatOutcome),
    '',
    'Reuse approaches that succeeded. Avoid repeating failed patterns. For substantive work, call the evolver_search_assets MCP tool before starting to look for reusable genes/capsules.',
  ].join('\n');

  emit(summary);
}

try { main(); } catch { process.stdout.write('{}'); }
