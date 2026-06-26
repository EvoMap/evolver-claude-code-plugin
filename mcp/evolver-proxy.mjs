#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 EvoMap
/**
 * Evolver Proxy MCP bridge (stdio, zero dependencies).
 *
 * Exposes the EvoMap local Proxy mailbox — genes, capsules, status — as MCP
 * tools so Claude can search/reuse/publish evolution assets natively.
 *
 * Transport: newline-delimited JSON-RPC 2.0 over stdin/stdout (MCP stdio).
 * All diagnostics go to stderr; stdout carries protocol traffic ONLY.
 *
 * The Proxy is a separate local process started by the @evomap/evolver CLI.
 * This bridge never spawns it; when it is down, tools return a helpful error.
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const SERVER = { name: 'evolver-proxy', version: '0.2.0' };
const DEFAULT_PROTOCOL = '2025-06-18';

function log(...a) { process.stderr.write('[evolver-proxy-mcp] ' + a.join(' ') + '\n'); }

function defaultProxyUrl() {
  return `http://127.0.0.1:${process.env.EVOMAP_PROXY_PORT || '19820'}`;
}

function isLoopbackHost(hostname) {
  const value = String(hostname || '').toLowerCase();
  return (
    value === 'localhost' ||
    value === '127.0.0.1' ||
    value === '::1' ||
    value.endsWith('.localhost')
  );
}

function normalizeLocalProxyUrl(raw) {
  try {
    const parsed = new URL(String(raw));
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (!isLoopbackHost(parsed.hostname)) return null;
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/**
 * Resolve the live Proxy connection. ~/.evolver/settings.json is authoritative:
 * the running Proxy writes both its url and a per-instance auth token there.
 * Recent Proxy builds reject unauthenticated local requests with 401, so we
 * send `Authorization: Bearer <token>`. Re-read every call — the token rotates
 * whenever the Proxy restarts. Never log or echo the token.
 */
function readProxySettings() {
  let url = null, token = null;
  try {
    const s = JSON.parse(readFileSync(join(homedir(), '.evolver', 'settings.json'), 'utf8'));
    if (s?.proxy?.url) url = normalizeLocalProxyUrl(s.proxy.url);
    if (s?.proxy?.token) token = String(s.proxy.token);
  } catch { /* not running / unreadable — fall through */ }
  if (!url) {
    url = defaultProxyUrl();
    token = null;
  }
  return { url, token };
}

async function proxyFetch(method, path, body) {
  const { url: base, token } = readProxySettings();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(base + path, {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) {
      // Make auth/connection failures actionable. Never echo the token.
      let hint = '';
      if ([401, 403].includes(res.status)) {
        hint = token
          ? ' The Proxy token in ~/.evolver/settings.json looks stale (the Proxy mints a fresh token on restart). Restart this Claude session so the bridge re-reads it, or run /evolver:status.'
          : ` No Proxy token found in ~/.evolver/settings.json and the request was rejected — another process may be using ${base}. Start the Proxy (run \`evolver\` once in a git repo) or set EVOMAP_PROXY_PORT, then run /evolver:status.`;
      } else if (res.status === 404) {
        hint = ` Endpoint not found at ${base} — it may not be the Evolver Proxy. Confirm with /evolver:status.`;
      }
      return { ok: false, error: `Proxy at ${base} returned HTTP ${res.status}: ${typeof data === 'object' ? JSON.stringify(data) : text}.${hint}` };
    }
    return { ok: true, data };
  } catch (e) {
    const hint = `Evolver Proxy not reachable at ${base}. Start it by running \`evolver\` once inside a git repo (the CLI launches the Proxy), or run /evolver:status. Set EVOMAP_PROXY_PORT if you use a non-default port.`;
    return { ok: false, error: `${e.name === 'AbortError' ? 'Proxy request timed out' : 'Proxy connection failed: ' + e.message}. ${hint}` };
  } finally {
    clearTimeout(timer);
  }
}

// ---- Tool registry -------------------------------------------------------

const TOOLS = [
  {
    name: 'evolver_status',
    description: 'Get the EvoMap Proxy status: running state, node_id, pending inbound/outbound message counts, and last Hub sync time. Use this first to confirm the Proxy is up.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => proxyFetch('GET', '/proxy/status'),
  },
  {
    name: 'evolver_search_assets',
    description: 'Search the EvoMap network for reusable evolution assets (Genes and Capsules). Pass `query` to describe your current task/situation in natural language (semantic search — recommended when you are unsure which signal keywords apply) and/or `signals` to match on known signal keywords; provide at least one. Call this BEFORE starting substantive work to reuse proven approaches instead of reinventing them.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text description of the current task/situation, e.g. "restore quoted reply text in a feishu bot". Runs natural-language semantic search over the network. Provide query and/or signals.' },
        signals: { type: 'array', items: { type: 'string' }, description: 'Signal keywords, e.g. ["log_error","perf_bottleneck","test_failure"]. Provide query and/or signals.' },
        mode: { type: 'string', enum: ['semantic', 'exact'], default: 'semantic' },
        limit: { type: 'integer', minimum: 1, maximum: 25, default: 5 },
      },
      additionalProperties: false,
    },
    handler: (a) => proxyFetch('POST', '/asset/search', {
      query: a.query, signals: a.signals, mode: a.mode || 'semantic', limit: a.limit || 5,
    }),
  },
  {
    name: 'evolver_fetch_asset',
    description: 'Fetch the full content of one or more evolution assets by their IDs (e.g. "sha256:abc..."), as returned by evolver_search_assets. After you actually reuse any of these in your work, call evolver_report_reuse with their IDs so the original author gets credit.',
    inputSchema: {
      type: 'object',
      properties: { asset_ids: { type: 'array', items: { type: 'string' }, minItems: 1 } },
      required: ['asset_ids'],
      additionalProperties: false,
    },
    handler: async (a) => {
      const res = await proxyFetch('POST', '/asset/fetch', { asset_ids: a.asset_ids });
      // Close the reuse-reward loop: nudge the agent, in-context, to report
      // what it reuses. Additive top-level field -- does not alter results.
      return (res && typeof res === 'object' && !Array.isArray(res))
        ? { ...res, _reuse_hint: 'If you build on any of these assets, call evolver_report_reuse with the asset_ids you reused so the author gets credit.' }
        : res;
    },
  },
  {
    name: 'evolver_report_reuse',
    description: 'Report that you actually REUSED one or more fetched Gene/Capsule assets in your work (not just viewed them). This credits the original authors and feeds the reuse-reward network. Call it after you build on an asset fetched via evolver_fetch_asset; pass the asset_ids you genuinely reused.',
    inputSchema: {
      type: 'object',
      properties: {
        asset_ids: { type: 'array', items: { type: 'string' }, minItems: 1, description: 'The asset IDs you reused (as returned by evolver_fetch_asset).' },
        outcome: { type: 'string', enum: ['success', 'failed'], description: 'Whether reusing them worked out. Defaults to success.' },
        signals: { type: 'array', items: { type: 'string' }, description: 'Optional signal keywords describing the task you reused them on.' },
      },
      required: ['asset_ids'],
      additionalProperties: false,
    },
    handler: (a) => proxyFetch('POST', '/asset/report-reuse', { used_asset_ids: a.asset_ids, status: a.outcome || 'success', signals: a.signals }),
  },
  {
    name: 'evolver_publish_asset',
    description: 'Publish one or more evolution assets (Genes/Capsules) to the EvoMap Hub for review. Queued locally and synced by the Proxy in the background; poll asset_submit_result with evolver_poll to see the Hub decision.',
    inputSchema: {
      type: 'object',
      properties: {
        assets: {
          type: 'array', minItems: 1,
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['Gene', 'Capsule'] },
              content: { type: 'string' },
              summary: { type: 'string' },
              signals: { type: 'array', items: { type: 'string' } },
            },
            required: ['type', 'content'],
          },
        },
      },
      required: ['assets'],
      additionalProperties: false,
    },
    handler: (a) => proxyFetch('POST', '/asset/submit', { assets: a.assets }),
  },
  {
    name: 'evolver_distill_conversation',
    description: 'Distill a reusable Gene/Capsule from the current Claude Code conversation. Provide a concrete summary, strategy/evidence, artifacts, and validation; the Proxy gates quality, stores locally, and queues Hub publishing.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        summary: { type: 'string', description: 'Concrete reusable lesson or capability distilled from the conversation.' },
        platform: { type: 'string', default: 'claude-code' },
        thread_id: { type: 'string' },
        user_prompt: { type: 'string' },
        assistant_summary: { type: 'string' },
        transcript: { type: 'string' },
        signals: { type: 'array', items: { type: 'string' } },
        strategy: { type: 'array', items: { type: 'string' } },
        artifacts: { type: 'array', items: { type: 'string' } },
        validation: { type: 'array', items: { type: 'string' } },
        persist: { type: 'boolean', default: true },
        publish: { type: 'boolean', default: true },
        min_score: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
      },
      required: ['summary'],
      additionalProperties: false,
    },
    handler: (a) => proxyFetch('POST', '/conversation/distill', { ...a, platform: a.platform || 'claude-code' }),
  },
  {
    name: 'evolver_poll',
    description: 'Poll the local mailbox for inbound messages by type, e.g. "asset_submit_result" (Hub review decisions), "hub_event", or "task_available". Returns and does not auto-acknowledge.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Message type filter, e.g. "asset_submit_result".' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
      },
      additionalProperties: false,
    },
    handler: (a) => proxyFetch('POST', '/mailbox/poll', { type: a.type, limit: a.limit || 10 }),
  },
];

const TOOL_BY_NAME = Object.fromEntries(TOOLS.map(t => [t.name, t]));

// ---- JSON-RPC plumbing ---------------------------------------------------

function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }
function reply(id, result) { send({ jsonrpc: '2.0', id, result }); }
function replyError(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }

async function handleToolCall(id, params) {
  const tool = TOOL_BY_NAME[params?.name];
  if (!tool) return replyError(id, -32602, `Unknown tool: ${params?.name}`);
  let out;
  try {
    out = await tool.handler(params.arguments || {});
  } catch (e) {
    out = { ok: false, error: `Tool execution failed: ${e.message}` };
  }
  const text = out.ok ? JSON.stringify(out.data, null, 2) : out.error;
  reply(id, { content: [{ type: 'text', text }], isError: !out.ok });
}

async function dispatch(req) {
  const { id, method, params } = req;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: params?.protocolVersion || DEFAULT_PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: SERVER,
        instructions: 'Evolver Proxy bridge. Use evolver_search_assets before substantive work to reuse proven genes/capsules; evolver_status to check the Proxy; evolver_publish_asset to contribute new ones.',
      });
    case 'notifications/initialized':
    case 'initialized':
      return; // notification — no response
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case 'tools/call':
      return handleToolCall(id, params);
    default:
      if (isNotification) return; // ignore unknown notifications
      return replyError(id, -32601, `Method not found: ${method}`);
  }
}

// Track in-flight (async) requests so we never exit on stdin close while a
// tool call's reply is still pending — otherwise the last response is dropped.
let pending = 0;
let closed = false;
function maybeExit() { if (closed && pending === 0) process.exit(0); }

const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req;
  try { req = JSON.parse(trimmed); } catch { log('dropping non-JSON line'); return; }
  pending++;
  Promise.resolve(dispatch(req))
    .catch(e => {
      log('dispatch error:', e.message);
      if (req && req.id != null) replyError(req.id, -32603, `Internal error: ${e.message}`);
    })
    .finally(() => { pending--; maybeExit(); });
});
rl.on('close', () => { closed = true; maybeExit(); });

log(`ready (server ${SERVER.version}); proxy base ${readProxySettings().url}`);
