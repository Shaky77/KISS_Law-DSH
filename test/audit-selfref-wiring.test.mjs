// audit-selfref-wiring.test.mjs — the wiring half of the self-reference lock (2026-10-28)
// ---------------------------------------------------------------------------
// Why this file exists (measured, not imagined):
//   `audit-selfref.test.mjs` locks the engine-side capability (`lastConductionExcluding`). It does **not**
//   lock whether the adapter actually calls it. A mutation check proved the gap: replacing
//   `lastConductionExcluding(SELF_AUDIT_TOOL_NAMES)` with `lastConductionExcluding(new Set())` inside
//   index.js — i.e. reverting the fix — left all seven engine tests green.
//   ⇒ "the criterion is present" is not "the criterion is called". Ability and wiring are two separate
//     failures, and only one of them was covered.
//
// What is locked here, through the real adapter entry `apply(ctx)`:
//   ❶ after a real action (deny) followed by the audit tool's own pass through the gate, the tool reports
//     the **real action's** chain and names it — not itself;
//   ❷ every tool actually registered is recorded as a self-audit tool in the same action (so "registered but
//     forgot to record" cannot happen), and the count of excluded entries is visible rather than silent.

import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../src/index.js';

function mockCtx() {
  const handlers = {};
  const tools = [];
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: (t) => { tools.push(t); } },
  };
  return { ctx, handlers, tools };
}

const exec = (name, args) => ({ token: 't', callId: 'c1', name, arguments: args, signal: null });
const next = async () => 'NEXT';
const toolNamed = (tools, n) => tools.find((t) => t.name === n);

test('❶ wiring lock: the chain query reports the previous real action and names it — with the exclusion removed it reports itself', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const pre = handlers['tools/pre-execute'];
  assert.ok(pre, 'the adapter must register a tools/pre-execute gate');

  // Step 1: a real action that the engine refuses (rigid anchor, R domain)
  const d1 = await pre(exec('run_task', { command: 'rm -rf /etc' }), next);
  assert.equal(d1?.kind, 'deny', 'precondition: the real action must be denied, otherwise the test cannot discriminate');

  // Step 2: the audit tool itself passes through the same gate — this is exactly what creates the self-reference
  //   Note on the allow shape: on release the gate returns `next()`'s value, not a decision object. Asserting
  //   `kind === 'allow'` here was wrong and was caught by the test failing — keep the weaker, true assertion.
  const d2 = await pre(exec('query_conduction_chain', {}), next);
  assert.notEqual(d2?.kind, 'deny', 'precondition: the read-only audit call must pass the gate');

  // Step 3: what does it actually report?
  const out = await toolNamed(tools, 'query_conduction_chain').execute();

  assert.ok(out.lastConductionSubject, 'the subject must be named — an unnamed chain cannot be told apart from the instrument itself');
  assert.equal(
    out.lastConductionSubject.tool,
    'run_task',
    `must report the real action, not the query itself (got ${out.lastConductionSubject.tool})`,
  );
  assert.equal(out.lastConductionSubject.kind, 'deny', 'the reported verdict must be the real action\'s deny');

  // The chain itself must be carried, not just the label
  assert.ok(Array.isArray(out.lastConduction) && out.lastConduction.length > 0, 'the full chain landing must be carried back');
  assert.ok(out.selfAuditExcluded >= 1, 'how many entries were excluded must be visible, not silently handled');
  assert.ok(out.selfAuditTools.includes('query_conduction_chain'), 'the registry must contain the audit tool itself');
});

test('❷ registration and recording are one action: every registered tool is in the self-audit registry', async () => {
  const { ctx, tools } = mockCtx();
  apply(ctx);
  assert.ok(tools.length > 0, 'the adapter must register tools');

  const out = await toolNamed(tools, 'query_conduction_chain').execute();
  const registered = tools.map((t) => t.name).sort();
  const recorded = [...out.selfAuditTools].sort();

  assert.deepEqual(
    recorded,
    registered,
    'the self-audit registry must equal the set of registered tools exactly — a tool registered but not recorded is an invisible self-reference',
  );
});

test('❸ with a history of only self-audit calls, the answer is null and says so — never a fabricated chain', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const pre = handlers['tools/pre-execute'];

  await pre(exec('query_steady_state', {}), next);
  await pre(exec('query_conduction_chain', {}), next);

  const out = await toolNamed(tools, 'query_conduction_chain').execute();
  assert.equal(out.lastConductionSubject, null, 'no non-self-audit decision yet ⇒ subject must be null');
  assert.deepEqual(out.lastConduction, [], 'the chain must be empty rather than borrowed from some other call');
  assert.match(out.lastConductionNote, /positive reading|nothing to look at/i, 'the note must say this is a positive reading, not an error');
});
