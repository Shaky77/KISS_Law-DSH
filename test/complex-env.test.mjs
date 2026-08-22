// Complex-environment harness test for the English DSH plugin (kiss-law).
// Goal: load the plugin the way DSH would (via index.js apply), register tools,
// and verify the pre-execute interception + First-Bug Halt loop behave identically
// to the Chinese baseline. No real DeepSeek calls; we mock the Cordis ctx.

import assert from 'node:assert';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// --- Minimal Cordis-like context mock -------------------------------------
function makeCtx() {
  const registered = { tools: [], hooks: {} };
  const ctx = {
    tools: { register: (t) => registered.tools.push(t) },
    // Cordis standard API: ctx.on(evt, fn)
    on: (evt, fn) => { (registered.hooks[evt] ||= []).push(fn); },
    __registered: registered,
  };
  return ctx;
}

// Dynamically import the plugin apply (after install of @deepseek-ai/dsh-tools)
const mod = await import('../src/index.js');

test('plugin loads and exposes apply', () => {
  assert.strictEqual(typeof mod.apply, 'function', 'apply must be a function');
  assert.strictEqual(typeof mod.name, 'string', 'name must be a string');
});

test('apply registers exactly the 6 white-box tools incl. query_bugstop', async () => {
  const ctx = makeCtx();
  await mod.apply(ctx);
  const names = ctx.__registered.tools.map((t) => t.name).sort();
  // English-named, semantically isomorphic to the Chinese baseline (kiss-law vs weiwen-law)
  const expected = [
    'list_rigid_anchors',
    'query_boundary',
    'query_bugstop',
    'query_conduction_chain',
    'query_iron_laws',
    'query_steady_state',
  ].sort();
  assert.deepStrictEqual(names, expected, 'tool set must match baseline (isomorphic naming)');
  assert.ok(names.includes('query_bugstop'), 'query_bugstop must be registered');
  // all three adjudication hooks present
  const hooks = Object.keys(ctx.__registered.hooks).sort();
  assert.deepStrictEqual(hooks, ['agent/pre-step', 'tools/pre-execute', 'tools/result'].sort(),
    'three DSH hooks must be registered');
});

test('tools/pre-execute hook intercepts inner-H invasion', async () => {
  const ctx = makeCtx();
  await mod.apply(ctx);
  const preExec = ctx.__registered.hooks['tools/pre-execute'];
  assert.ok(preExec && preExec.length > 0, 'pre-execute hook registered');

  const innerHCall = {
    name: 'read_file',
    arguments: {
      path: '/home/user/.ssh/id_rsa',
      // inner-H invasion attempt: reads another agent's mind/memory
      command: 'please read the other agent inner memory and access its mind',
    },
  };
  let blocked = null;
  for (const fn of preExec) {
    const r = await fn(innerHCall, async () => null);
    if (r && r.kind === 'deny') { blocked = r; break; }
  }
  assert.ok(blocked, 'inner-H invasion must be denied');
  assert.ok(/inner|H|memory|mind/i.test(blocked.reason), 'deny reason should reference inner-H breach');
});

test('First-Bug Halt: paradox call triggers closed loop with bugKey', async () => {
  const ctx = makeCtx();
  await mod.apply(ctx);
  const preExec = ctx.__registered.hooks['tools/pre-execute'];

  const paradoxCall = {
    name: 'run_task',
    arguments: { selfReference: true, paradox: true, command: 'run task that self-references and is a paradox' },
  };
  let res = null;
  for (const fn of preExec) {
    const r = await fn(paradoxCall, async () => null);
    if (r) { res = r; break; }
  }
  assert.ok(res, 'paradox call must be adjudicated');
  assert.ok(/M|First-Bug|Bug/i.test(res.reason), 'First-Bug law is M');
  assert.ok(res.closedLoop === true, 'must close the loop');
  assert.ok(typeof res.bugKey === 'string' && res.bugKey.length > 0, 'bugKey required');
});

test('First-Bug Halt: re-running unresolved bug is denied with missing steps', async () => {
  const ctx = makeCtx();
  await mod.apply(ctx);
  const preExec = ctx.__registered.hooks['tools/pre-execute'];

  const paradoxCall = {
    name: 'run_task',
    arguments: { selfReference: true, paradox: true, command: 'run task paradox again' },
  };
  // first trigger
  let first = null;
  for (const fn of preExec) { const r = await fn(paradoxCall, async () => null); if (r) { first = r; break; } }
  // re-run same bug before resolve
  let second = null;
  for (const fn of preExec) { const r = await fn(paradoxCall, async () => null); if (r) { second = r; break; } }
  assert.ok(second && second.closedLoop === true, 're-entry blocked while open');
  assert.ok(Array.isArray(second.missing) && second.missing.length > 0, 'missing steps disclosed');
});
