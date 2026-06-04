#!/usr/bin/env node
// evolver-signal-detect.js  (Claude Code plugin edition)
// PostToolUse hook (Write|Edit|MultiEdit): lightweight keyword scan of edited
// content for Evolver evolution signals. Pure function, no I/O beyond stdin/out.
// Always exits 0 quickly with JSON on stdout.

const SIGNAL_KEYWORDS = {
  perf_bottleneck: ['timeout', 'slow', 'latency', 'bottleneck', 'oom', 'out of memory', 'performance'],
  capability_gap: ['not supported', 'unsupported', 'not implemented', 'missing feature', 'not available'],
  log_error: ['error:', 'exception:', 'typeerror', 'referenceerror', 'syntaxerror', 'failed'],
  user_feature_request: ['add feature', 'implement', 'new function', 'new module', 'please add'],
  recurring_error: ['same error', 'still failing', 'not fixed', 'keeps failing', 'repeatedly'],
  deployment_issue: ['deploy failed', 'build failed', 'ci failed', 'pipeline', 'rollback'],
  test_failure: ['test failed', 'test failure', 'assertion', 'expect(', 'assert.'],
};

function detectSignals(text) {
  if (!text || typeof text !== 'string') return [];
  const lower = text.toLowerCase();
  const found = [];
  for (const [signal, keywords] of Object.entries(SIGNAL_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) found.push(signal);
  }
  return [...new Set(found)];
}

function main() {
  let inputData = '';
  let handled = false;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { inputData += c; });
  process.stdin.on('end', () => {
    if (handled) return;
    handled = true;
    try {
      const input = inputData.trim() ? JSON.parse(inputData) : {};
      // Claude Code nests tool args under tool_input; support flat shapes too.
      const ti = input.tool_input || {};
      const tr = input.tool_response || {};
      const content = ti.content || ti.new_string || ti.file_text || ti.file_content
        || input.content || input.file_content || input.diff || '';
      const filePath = ti.file_path || tr.filePath || input.path || input.file_path || '';

      const signals = detectSignals(content);
      if (signals.length === 0) { process.stdout.write('{}'); return; }

      const ctx = `[Evolution Signal] Detected [${signals.join(', ')}] in ${filePath || 'edited file'}. Note this for the end-of-session evolution outcome.`;
      process.stdout.write(JSON.stringify({
        additionalContext: ctx,
        hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: ctx },
      }));
    } catch {
      process.stdout.write('{}');
    }
  });

  setTimeout(() => {
    if (handled) return;
    handled = true;
    process.stdout.write('{}');
    process.exit(0);
  }, 1500);
}

main();
