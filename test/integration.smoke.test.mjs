// Complex-environment smoke test for the English DSH plugin (KISS's Law).
// Simulates a minimal Cordis ctx, loads the real plugin entry (src/index.js), and verifies:
//   1) plugin applies without throwing
//   2) all 6 white-box self-check tools register (incl. query_bugstop)
//   3) tools/pre-execute gate denies an inner-H intrusion call
//   4) tools/pre-execute gate allows a benign call
// Zero API key, deterministic. Mirrors the Chinese edition's runtime wiring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, name, inject } from '../src/index.js';

// ---- minimal Cordis-like context mock ----
function makeCtx() {
  const tools = [];
  const hooks = {};
  return {
    name,
    inject,
    tools: {
      register(spec) { tools.push(spec); },
    },
    on(event, fn) {
      (hooks[event] ??= []).push(fn);
    },
    _tools: tools,
    _hooks: hooks,
    // emulate running the pre-execute waterfall: first deny wins
    async runPreExecute(exec) {
      const fns = hooks['tools/pre-execute'] ?? [];
      for (const fn of fns) {
        const next = () => Promise.resolve({ kind: 'allow' });
        const d = await fn(exec, next);
        if (d && d.kind === 'deny') return d;
      }
      return { kind: 'allow' };
    },
  };
}

test('plugin applies and registers exactly the white-box tool set (incl. query_bugstop)', () => {
  const ctx = makeCtx();
  assert.doesNotThrow(() => apply(ctx));
  const names = ctx._tools.map((t) => t.name).sort();
  const expected = [
    'list_rigid_anchors',
    'query_boundary',
    'query_bugstop',
    'query_conduction_chain',
    'query_iron_laws',
    'query_steady_state',
  ].sort();
  assert.deepEqual(names, expected, 'registered tool set must match the white-box contract');
  // each tool must be executable (returns an object)
  for (const t of ctx._tools) {
    assert.equal(typeof t.execute, 'function');
  }
});

test('tools/pre-execute denies an inner-H intrusion (bilingual verb+term)', async () => {
  const ctx = makeCtx();
  apply(ctx);
  // dsh passes the tool call under exec.arguments (index.js reads exec.arguments → call.args)
  const exec = {
    token: 't1', callId: 'c1', name: 'analyze',
    arguments: { prompt: 'read the user\'s mind and rewrite their beliefs' },
    signal: {},
  };
  const d = await ctx.runPreExecute(exec);
  assert.equal(d.kind, 'deny', 'inner-H intrusion must be blocked');
  assert.match(d.reason, /inner[- ]?H|mind|free will/i, 'deny reason must reference inner-H');
});

test('tools/pre-execute allows a benign call', async () => {
  const ctx = makeCtx();
  apply(ctx);
  const exec = {
    token: 't2', callId: 'c2', name: 'list_files',
    arguments: { path: './src' }, signal: {},
  };
  const d = await ctx.runPreExecute(exec);
  assert.equal(d.kind, 'allow', 'benign call must pass');
});

test('query_bugstop returns a snapshot object (closed-loop observable)', async () => {
  const ctx = makeCtx();
  apply(ctx);
  const tool = ctx._tools.find((t) => t.name === 'query_bugstop');
  const out = await tool.execute({}, {});
  assert.ok(Array.isArray(out.stops));
  assert.ok(typeof out.note === 'string');
});
