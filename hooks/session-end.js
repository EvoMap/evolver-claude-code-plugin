// SPDX-License-Identifier: MIT
// Copyright (c) 2026 EvoMap
//
// Claude Code hook: Stop.
// Records the outcome of the session by inspecting the git diff of the project
// directory, writing a memory-graph entry (and optionally posting to a Hub),
// and leaving a breadcrumb in the evolution log.
//
// Invocation: `node session-end.js` with a JSON object on stdin.
// Output: a JSON object on stdout, exit 0. On any failure: `{}`.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const { resolveProjectDir, findMemoryGraph, resolveWorkspaceId } = require('./_paths');
const { detectSignals } = require('./_signals');

const STDIN_WATCHDOG_MS = parsePositiveInt(
  process.env.EVOLVER_SESSION_END_STDIN_WATCHDOG_MS,
  7000
);
const GIT_TIMEOUT_MS = 5000;
const GIT_MAX_BUFFER = 10 * 1024 * 1024; // 10 MB
const HUB_TIMEOUT_MS = 8000;
const SESSION_END_DEDUPE_TTL_MS = parsePositiveInt(
  process.env.EVOLVER_SESSION_END_DEDUPE_TTL_MS,
  6 * 60 * 60 * 1000
);
const SESSION_END_PRUNE_MS = Math.max(
  SESSION_END_DEDUPE_TTL_MS,
  24 * 60 * 60 * 1000
);

let alreadyEmitted = false;

/** Emit JSON exactly once and exit. */
function emit(obj) {
  if (alreadyEmitted) {
    return;
  }
  alreadyEmitted = true;
  let text = '{}';
  try {
    text = JSON.stringify(obj);
  } catch (_err) {
    text = '{}';
  }
  process.stdout.write(text);
  process.exit(0);
}

/**
 * Append a timestamped line to the evolution log. Best effort; never throws.
 */
function appendEvolutionLog(line) {
  try {
    const dir =
      process.env.EVOLVER_HOOK_LOG_DIR ||
      path.join(os.homedir(), '.evolver', 'logs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'evolution.log');
    fs.appendFileSync(file, `${new Date().toISOString()} ${line}\n`);
  } catch (_err) {
    // best effort
  }
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Run a git subcommand in `cwd`, returning { status, stdout } (stdout = ''). */
function git(args, cwd) {
  try {
    const result = spawnSync('git', args, {
      cwd,
      shell: false,
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_BUFFER,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {
      status: typeof result.status === 'number' ? result.status : 1,
      stdout: typeof result.stdout === 'string' ? result.stdout : '',
    };
  } catch (_err) {
    return { status: 1, stdout: '' };
  }
}

/**
 * Collect the git diff for the session.
 *   - statText/body cover the current working tree and staged diff only.
 *   - isRepo: whether we're inside a git work tree.
 */
function collectDiff(projectDir) {
  const insideTree = git(['rev-parse', '--is-inside-work-tree'], projectDir);
  const isRepo = insideTree.status === 0 && insideTree.stdout.trim() === 'true';
  if (!isRepo) {
    return {
      isRepo,
      statText: '',
      body: '',
    };
  }

  const statParts = [];
  const unstagedStat = git(['diff', '--stat', '--'], projectDir);
  if (unstagedStat.status === 0 && unstagedStat.stdout.trim().length > 0) {
    statParts.push(unstagedStat.stdout);
  }
  const stagedStat = git(['diff', '--cached', '--stat', '--'], projectDir);
  if (stagedStat.status === 0 && stagedStat.stdout.trim().length > 0) {
    statParts.push(stagedStat.stdout);
  }

  const bodyParts = [];
  const unstagedBody = git(['diff', '--no-color', '--'], projectDir);
  if (unstagedBody.status === 0 && unstagedBody.stdout.trim().length > 0) {
    bodyParts.push(unstagedBody.stdout);
  }
  const stagedBody = git(['diff', '--cached', '--no-color', '--'], projectDir);
  if (stagedBody.status === 0 && stagedBody.stdout.trim().length > 0) {
    bodyParts.push(stagedBody.stdout);
  }

  return {
    isRepo,
    statText: statParts.join('\n'),
    body: bodyParts.join('\n'),
  };
}

/**
 * Parse "N files changed, A insertions(+), D deletions(-)" from a --stat tail.
 * Missing pieces default to 0.
 */
function parseStat(statText) {
  function sum(regex) {
    let total = 0;
    for (const match of statText.matchAll(regex)) {
      total += parseInt(match[1], 10);
    }
    return total;
  }
  return {
    files: sum(/(\d+)\s+files?\s+changed/g),
    insertions: sum(/(\d+)\s+insertions?\(\+\)/g),
    deletions: sum(/(\d+)\s+deletions?\(-\)/g),
  };
}

function hashText(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

function parseInput(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_err) {
    return {};
  }
}

function extractSessionId(input) {
  const props = input && input.properties && typeof input.properties === 'object'
    ? input.properties
    : {};
  const info = props.info && typeof props.info === 'object' ? props.info : {};
  const session = input && input.session && typeof input.session === 'object'
    ? input.session
    : {};
  const candidates = [
    input && input.session_id,
    input && input.sessionId,
    input && input.sessionID,
    session.id,
    session.session_id,
    props.session_id,
    props.sessionId,
    props.sessionID,
    info.id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

function claimSessionRecord({ projectDir, workspaceId, sessionId, diffHash }) {
  try {
    const base =
      process.env.EVOLVER_SESSION_STATE_DIR ||
      path.join(os.homedir(), '.evolver');
    const stateFile = path.join(base, 'session-end-state.json');

    let state = {};
    try {
      state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      if (!state || typeof state !== 'object' || Array.isArray(state)) {
        state = {};
      }
    } catch (_err) {
      state = {};
    }

    const now = Date.now();
    const key = sessionId
      ? `session:${sessionId}`
      : `workspace:${workspaceId || projectDir}:diff:${diffHash}`;
    const previous = state[key];
    const previousTs = typeof previous === 'number'
      ? previous
      : previous && typeof previous.ts === 'number'
        ? previous.ts
        : 0;
    if (previousTs > 0 && now - previousTs < SESSION_END_DEDUPE_TTL_MS) {
      return { claimed: false, key };
    }

    state[key] = { ts: now, diff_hash: diffHash };
    for (const existingKey of Object.keys(state)) {
      const value = state[existingKey];
      const ts = typeof value === 'number'
        ? value
        : value && typeof value.ts === 'number'
          ? value.ts
          : 0;
      if (ts <= 0 || now - ts > SESSION_END_PRUNE_MS) {
        delete state[existingKey];
      }
    }

    fs.mkdirSync(base, { recursive: true });
    const tmp = `${stateFile}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state), { mode: 0o600 });
    fs.renameSync(tmp, stateFile);
    return { claimed: true, key };
  } catch (_err) {
    return { claimed: true, key: null };
  }
}

/** Attempt to POST the outcome to a configured Hub. Never throws. */
async function recordToHub(payload) {
  try {
    const hubUrl = process.env.EVOMAP_HUB_URL || process.env.A2A_HUB_URL;
    const apiKey = process.env.EVOMAP_API_KEY || process.env.A2A_NODE_SECRET;
    if (!hubUrl || !apiKey || typeof fetch !== 'function') {
      return false;
    }
    const url = new URL('/a2a/evolution/record', `${hubUrl.replace(/\/+$/, '')}/`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HUB_TIMEOUT_MS);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      return response.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch (_err) {
    return false;
  }
}

/**
 * Append one JSON entry to the memory graph. The field shape here is a hard
 * contract consumed by external tooling (the @evomap/evolver engine and the
 * sibling Cursor plugin) — keep it exact. Returns true on success.
 */
function recordToLocal(entry, projectDir) {
  try {
    const graphPath = findMemoryGraph(projectDir);
    fs.mkdirSync(path.dirname(graphPath), { recursive: true });
    fs.appendFileSync(graphPath, `${JSON.stringify(entry)}\n`);
    return true;
  } catch (_err) {
    return false;
  }
}

async function finish(projectDir, diff, input) {
  const stats = parseStat(diff.statText);
  const hasChanges =
    diff.statText.trim().length > 0 || diff.body.trim().length > 0;

  // No changes: just leave a breadcrumb, never a memory-graph entry.
  if (!hasChanges) {
    const reason = diff.isRepo
      ? 'no changes detected this session'
      : 'not a git workspace';
    appendEvolutionLog(`[Evolution] Session end: nothing recorded (${reason}).`);
    emit({});
    return;
  }

  const workspaceId = resolveWorkspaceId(projectDir);
  const sessionId = extractSessionId(input || {});
  const diffHash = hashText(diff.body || diff.statText);
  const claim = claimSessionRecord({
    projectDir,
    workspaceId,
    sessionId,
    diffHash,
  });
  if (!claim.claimed) {
    appendEvolutionLog(
      `[Evolution] Session end: duplicate outcome suppressed (${claim.key}).`
    );
    emit({});
    return;
  }

  // Changes present: derive signals / status / score.
  let signals = detectSignals(diff.body);
  if (signals.length === 0) {
    signals = ['stable_success_plateau'];
  }
  const failed = signals.includes('log_error') || signals.includes('test_failure');
  const status = failed ? 'failed' : 'success';
  const score = failed ? 0.3 : 0.8;

  const summary =
    `Session end: ${stats.files} files changed, ` +
    `+${stats.insertions}/-${stats.deletions}. Signals: [${signals.join(', ')}]`;

  // Try the Hub first (if configured).
  const hubOk = await recordToHub({
    gene_id: 'ad_hoc',
    signals,
    status,
    score,
    summary,
    session_id: sessionId,
    workspace_id: workspaceId,
    diff_hash: diffHash,
    sender_id: process.env.EVOMAP_NODE_ID || process.env.A2A_NODE_ID,
  });

  // Always also attempt a local record.
  const localOk = recordToLocal(
    {
      timestamp: new Date().toISOString(),
      gene_id: 'ad_hoc',
      signals,
      outcome: { status, score, note: summary },
      cwd: projectDir,
      workspace_id: workspaceId,
      session_id: sessionId,
      diff_hash: diffHash,
      diff_scope: 'working_tree',
      source: 'hook:session-end',
    },
    projectDir
  );

  let destination;
  if (hubOk) {
    destination = 'Hub';
  } else if (localOk) {
    destination = 'local memory';
  } else {
    destination = 'nowhere (no Hub or local path)';
  }
  const receipt = `[Evolution] Session outcome recorded to ${destination}: ${summary}`;
  appendEvolutionLog(receipt);
  emit({ systemMessage: receipt });
}

// Drain stdin with a watchdog, then do the work.
(function run() {
  try {
    let buffer = '';
    let done = false;

    const proceed = () => {
      if (done) {
        return;
      }
      done = true;
      try {
        const input = parseInput(buffer);
        const projectDir = resolveProjectDir(input);
        const diff = collectDiff(projectDir);
        Promise.resolve(finish(projectDir, diff, input)).catch(() => {
          emit({});
        });
      } catch (_err) {
        emit({});
      }
    };

    const watchdog = setTimeout(() => {
      // Stdin never closed in time — still do the work (proceed() is guarded
      // by `done`, so it runs at most once whether the timeout or `end` fires).
      proceed();
    }, STDIN_WATCHDOG_MS);
    if (typeof watchdog.unref === 'function') {
      watchdog.unref();
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(watchdog);
      proceed();
    });
    process.stdin.on('error', () => {
      clearTimeout(watchdog);
      proceed();
    });
    process.stdin.resume();
  } catch (_err) {
    emit({});
  }
})();
