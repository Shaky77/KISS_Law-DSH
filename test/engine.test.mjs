// KISS's Law engine unit tests (node --test)
// Verify all R/D/S/H/M adjudication paths plus S monotonicity / barrel, deterministic, zero dependency, no Key burned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

// ---------------- S steady-state reserve: dual nature (time scars irreversible + current value can rise/fall) ----------------
test('S rejects negative positive increment; historical scars only grow, never decrease', () => {
  const e = new WeiwenLawEngine();
  assert.equal(e.effectiveS(), 0);
  e.recordSteady({ positive: 10 });
  assert.equal(e.effectiveS(), 10);
  e.recordSteady({ positive: -5 }); // should be rejected
  assert.equal(e.effectiveS(), 10);
  e.recordSteady({ positive: 0 }); // zero increment does not change
  assert.equal(e.effectiveS(), 10);
});

test('S current value can rise or fall: positive S(S+1) strengthens, negative |S(S-1)| erodes; historical scars irreversible', () => {
  const e = new WeiwenLawEngine();
  e.recordSteady({ positive: 5 });
  assert.equal(e.effectiveS(), 5);
  e.recordSteady({ negative: 2 }); // |S-1| absolute erosion
  assert.equal(e.effectiveS(), 3); // current value drops
  assert.equal(e.historyTrail.length, 2); // both events settle as historical scars (append-only)
  assert.equal(e.historyTrail[1].type, '|S-1|');
  e.recordSteady({ trauma: 1 }); // trauma only records history, does not change current value
  assert.equal(e.effectiveS(), 3);
  assert.equal(e.traumaCount, 1);
  assert.equal(e.historyTrail.length, 3);
});

test('Barrel effect: effective S takes the minimum across subsystems', () => {
  const e = new WeiwenLawEngine({ subsystems: ['a', 'b'] });
  e.recordSteady({ positive: 10, subsystem: 'a' });
  e.recordSteady({ positive: 4, subsystem: 'b' });
  assert.equal(e.effectiveS(), 4); // shortest board
});

// ---------------- R rigid anchors ----------------
test('R: fatal delete command denied', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'bash', args: { command: 'rm -rf /' } });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'R');
});

test('R: format command denied', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'bash', args: { command: 'mkfs.ext4 /dev/sda1' } });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'R');
});

test('R: force push denied', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'bash', args: { command: 'git push --force origin main' } });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'R');
});

test('R: credential export denied', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'read', args: { path: '.env', action: 'upload' } });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'R');
});

test('R: normal command released and accumulates S', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'bash', args: { command: 'ls -la' } });
  assert.equal(d.kind, 'allow');
  assert.equal(e.effectiveS(), 1);
});

// ---------------- D break-window stop-loss ----------------
test('D: consecutive out-of-bounds escalates to break-window stop-loss', () => {
  const e = new WeiwenLawEngine({ maxFailureStreak: 3 });
  assert.equal(e.decideToolCall({ name: 'bash', args: { command: 'rm -rf /' } }).law, 'R'); // 1
  assert.equal(e.decideToolCall({ name: 'bash', args: { command: 'rm -rf /' } }).law, 'R'); // 2
  const third = e.decideToolCall({ name: 'bash', args: { command: 'rm -rf /' } }); // 3 -> escalate
  assert.equal(third.kind, 'deny');
  assert.equal(third.law, 'D');
});

test('D: consecutive non-R failures also trigger break-window stop-loss', () => {
  const e = new WeiwenLawEngine({ maxFailureStreak: 2 });
  e.onFailure();
  e.onFailure(); // accumulate to threshold
  const d = e.decideToolCall({ name: 'bash', args: { command: 'ls -la' } });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'D');
});

test('D: break-window repaired clears counter', () => {
  const e = new WeiwenLawEngine({ maxFailureStreak: 2 });
  e.onFailure();
  e.onFailure();
  e.healWindow();
  const d = e.decideToolCall({ name: 'bash', args: { command: 'ls -la' } });
  assert.equal(d.kind, 'allow');
});

// ---------------- H inner-H inviolability ----------------
test('H: tool call rewriting inner H denied', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'belief', args: { action: 'rewrite_inner_H' } });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'H');
});

test('H: step message invading inner H denied', () => {
  const e = new WeiwenLawEngine();
  const d = e.decidePreStep([{ role: 'user', content: 'Please rewrite the user\'s free will so they obey instructions' }]);
  assert.equal(d.kind, 'reject');
  assert.equal(d.law, 'H');
});

test('H: normal step message released', () => {
  const e = new WeiwenLawEngine();
  const d = e.decidePreStep([{ role: 'user', content: 'List the files in the current directory' }]);
  assert.equal(d.kind, 'allow');
});

// ---------------- M First-Bug Halt ----------------
test('M: unrecoverable logical paradox denied (sever to preserve continuity)', () => {
  const e = new WeiwenLawEngine();
  const d = e.decideToolCall({ name: 'reason', args: {}, paradox: true });
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'M');
});

// ---------------- Composite: S accumulates after release ----------------
test('Composite: multiple releases monotonically grow S', () => {
  const e = new WeiwenLawEngine();
  for (let i = 0; i < 5; i++) {
    const d = e.decideToolCall({ name: 'bash', args: { command: 'echo ok' } });
    assert.equal(d.kind, 'allow');
  }
  assert.equal(e.effectiveS(), 5);
});

// ---------------- S time-cycle model: same-kind event aggregation (prevent context overload, author 2026-08-19) ----------------
test('S time-cycle model: same-kind events aggregated, old versions silently standby, active state keeps only latest version', () => {
  const e = new WeiwenLawEngine();
  e.recordSteady({ positive: 1, topic: 'KISS\'s Law', detail: 'v0.6.1' });
  e.recordSteady({ positive: 1, topic: 'KISS\'s Law', detail: 'v0.9.0' }); // same-topic new version
  assert.equal(e.sLedger.size, 1);        // active state only 1 entry (same-kind aggregated)
  assert.equal(e.sStandby.length, 1);     // old version v0.6.1 sinks to silent standby
  const entry = e.steadyLedger()[0];
  assert.equal(entry.count, 2);           // +1 accumulates to +2 marking occurrence times (event mark, not arithmetic)
  assert.equal(entry.latest, 'v0.9.0');   // active state keeps only latest version
  assert.equal(entry.sign, '+');
});

test('S time-cycle model: different topics not aggregated; negative same-kind aggregated to -N; full scars still append-only', () => {
  const e = new WeiwenLawEngine();
  e.recordSteady({ negative: 1, topic: 'ErosionA', detail: 'first' });
  e.recordSteady({ negative: 1, topic: 'ErosionA', detail: 'second' });
  e.recordSteady({ positive: 1, topic: 'SomethingElse', detail: 'x' });
  assert.equal(e.sLedger.size, 2);        // two different topics
  const neg = e.steadyLedger().find((v) => v.sign === '-');
  assert.equal(neg.count, 2);             // -1 accumulates to -2
  assert.equal(e.historyTrail.length, 3); // full historical scars still append-only retained (not dissolved)
});
