// Instrument self-reference regression lock — 2026-10-27, forced by xiaoD's measurement
//
// Defect: `query_causal_chain` read `engine.causalChain` (which stores only "the most recent decision").
//   But the query tool **also passes through the gate** ⇒ its own decision overwrites "the most recent one"
//   ⇒ what it reads back is **itself**.
//   Measured sequence (xiaoD): glob → deny/R, then query the chain; it reported
//   allow / law:推演 / layer=file-read / vacuum.
//   ⇒ That was not the previous chain, it was the query's own chain this time.
//   **Every "look at the chain" self-check was a self-portrait before the fix.**
//
// Fix (structural, not a band-aid):
//   · The engine side stores a **decision history** (judged tool name + seq + timestamp), not just the last one;
//   · `lastCausalChainExcluding(excludeTools)` returns "the most recent decision not in excludeTools";
//   · "which tools count as self-audit tools" is **knowledge only available at plugin registration time**, so
//     index.js registers it explicitly (SELF_AUDIT_TOOL_NAMES); the engine side does not recognise a `query_`
//     prefix (a word-form criterion is enumeration — add a `get_`/`inspect_` tool and it slips through).
//
// ⚠️ Group ❷ below is a **counter-example lock**: it proves that *without* the exclusion you do read yourself.
//   Remove ❷ and ❶ could be falsely green — if the history ever held only one entry, ❶ would pass by accident.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine, DEFAULT_RIGID_ANCHORS } from '../src/core/engine.mjs';

const ENG = () => new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });

/** A call that reliably judges deny (rigid-anchor R domain, objective rule — no pass can buy it) */
const DENY_CALL = { name: 'run_task', args: { command: 'rm -rf /etc' } };
/** A typical self-audit tool call (read-only, normally allow) */
const AUDIT_CALL = { name: 'query_causal_chain', args: {} };
const AUDIT_SET = new Set(['query_causal_chain']);

/** Build the "one real action, then one self-audit action" sequence — self-reference only shows up on two-in-a-row */
function twoStep() {
  const eng = ENG();
  const action = eng.decideToolCall({ ...DENY_CALL });
  const audit = eng.decideToolCall({ ...AUDIT_CALL });
  return { eng, action, audit };
}

// ─────────────────────────────────────────────────────────────
// ❶ Main effect: with self-audit tools excluded, you read the **previous real action**, not the audit itself
// ─────────────────────────────────────────────────────────────
test('❶ excluding self-audit tools yields the previous real action (deny), not the query itself (allow)', () => {
  const { eng, action, audit } = twoStep();

  // Precondition: the two verdicts must actually differ, otherwise this test has no discriminating power
  assert.equal(action.kind, 'deny', 'precondition: the real action should be deny');
  assert.equal(audit.kind, 'allow', 'precondition: the self-audit tool should be allow');
  assert.notEqual(action.kind, audit.kind, 'precondition: the verdicts must differ for the test to discriminate');

  const sub = eng.lastCausalChainExcluding(AUDIT_SET);
  assert.ok(sub, 'should retrieve one decision');
  assert.equal(sub.tool, 'run_task', `should retrieve the real action, got ${sub.tool}`);
  assert.equal(sub.kind, 'deny', `verdict should be deny, got ${sub.kind}`);
  assert.ok(Array.isArray(sub.causalChain) && sub.causalChain.length > 0, 'should carry the full chain landing');
});

// ─────────────────────────────────────────────────────────────
// ❷ Counter-example lock: same engine, same history — without the exclusion you read the self-audit itself
//    Once this fails, the self-reference is gone (or the history holds only one entry), and ❶'s green means nothing
// ─────────────────────────────────────────────────────────────
test('❷ counter-example lock: without excluding self-audit tools you read the query itself (allow) — proving ❶ is not falsely green', () => {
  const { eng } = twoStep();
  const raw = eng.lastCausalChainExcluding(new Set());
  assert.ok(raw, 'should retrieve one decision');
  assert.equal(raw.tool, 'query_causal_chain', `without exclusion it should read itself, got ${raw.tool}`);
  assert.equal(raw.kind, 'allow');

  // And it must differ from ❶'s reading — the difference comes only from the wiring, not from the capability
  const sub = eng.lastCausalChainExcluding(AUDIT_SET);
  assert.notEqual(raw.kind, sub.kind, 'same history, two retrieval methods must give different conclusions');
});

// ─────────────────────────────────────────────────────────────
// ❸ null is a positive reading; it must never fall back to "the last one"
// ─────────────────────────────────────────────────────────────
test('❸ empty history returns null (not an error, no fallback)', () => {
  const eng = ENG();
  assert.equal(eng.lastCausalChainExcluding(AUDIT_SET), null);
  assert.equal(eng.lastCausalChainExcluding(new Set()), null);
});

test('❹ history consisting only of self-audit tools returns null — never degrades into "then return myself"', () => {
  const eng = ENG();
  eng.decideToolCall({ ...AUDIT_CALL });
  eng.decideToolCall({ ...AUDIT_CALL });
  assert.equal(eng.lastCausalChainExcluding(AUDIT_SET), null, 'when all entries are self-audits it must return null, not the last one');
});

// ─────────────────────────────────────────────────────────────
// ❺ The history is an append-only ledger, not a "most recent" replacement
// ─────────────────────────────────────────────────────────────
test('❺ decision history only grows: seq is monotonically increasing, tool names are recorded faithfully (no word-form judgement)', () => {
  const eng = ENG();
  eng.decideToolCall({ ...DENY_CALL });
  eng.decideToolCall({ ...AUDIT_CALL });
  eng.decideToolCall({ name: 'read_file', args: { path: '/tmp/a.txt' } });

  const hist = eng.causalChainHistory;
  assert.equal(hist.length, 3, `should record 3 entries, got ${hist.length}`);
  assert.deepEqual(hist.map((e) => e.seq), [1, 2, 3], 'seq must be monotonically increasing and start at 1');
  assert.deepEqual(
    hist.map((e) => e.tool),
    ['run_task', 'query_causal_chain', 'read_file'],
    'tool names must be recorded verbatim — the engine does not decide who counts as a "self-audit"',
  );
  // Each entry's kind matches that decide's own return value (it is not overwritten by later calls)
  assert.equal(hist[0].kind, 'deny');
  assert.equal(hist[1].kind, 'allow');
});

// ─────────────────────────────────────────────────────────────
// ❻ Ring cap: past 32 entries you can still retrieve "the most recent non-self-audit", and memory does not grow without bound
// ─────────────────────────────────────────────────────────────
test('❻ ring cap of 32: past the cap the target after the most recent self-audit is still reachable, memory stops growing', () => {
  const eng = ENG();
  eng.decideToolCall({ ...DENY_CALL });                                  // seq 1: the real action
  for (let i = 0; i < 40; i += 1) eng.decideToolCall({ ...AUDIT_CALL }); // 40 self-audits

  const hist = eng.causalChainHistory;
  assert.equal(hist.length, 32, `history should be trimmed to 32, got ${hist.length}`);
  // seq 1 has been pushed out of the window ⇒ it must return null, not "any entry will do"
  assert.equal(
    eng.lastCausalChainExcluding(AUDIT_SET),
    null,
    'when the window holds no real action it must return null (say plainly "I can no longer see it", do not invent)',
  );
  // But once the window rolls, the new real action becomes visible immediately
  eng.decideToolCall({ ...DENY_CALL });
  const sub = eng.lastCausalChainExcluding(AUDIT_SET);
  assert.ok(sub);
  assert.equal(sub.tool, 'run_task');
});

// ─────────────────────────────────────────────────────────────
// ❼ Multi-tool exclusion set: register three, skip three (by set membership, not by name shape)
// ─────────────────────────────────────────────────────────────
test('❼ the exclusion set is set-semantics: as many registered self-audit tools as you list get skipped, regardless of name shape', () => {
  const eng = ENG();
  eng.decideToolCall({ ...DENY_CALL });
  eng.decideToolCall({ name: 'query_steady_state', args: {} });
  eng.decideToolCall({ name: 'inspect_something_new', args: {} }); // no query_ prefix, still excludable

  const skip = new Set(['query_steady_state', 'inspect_something_new']);
  const sub = eng.lastCausalChainExcluding(skip);
  assert.equal(sub.tool, 'run_task', 'should skip both registered entries and fall back to the real action');
  assert.equal(sub.kind, 'deny');

  // An array form is accepted too (convenient for callers passing a literal)
  const sub2 = eng.lastCausalChainExcluding(['query_steady_state', 'inspect_something_new']);
  assert.equal(sub2.tool, 'run_task');
});
