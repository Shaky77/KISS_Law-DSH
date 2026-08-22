// First-Bug Halt closed-loop state machine unit test (node --test)
// Verify: BUG → halt → backtrack → trace → resolve/fix(verify) → reenter closed loop;
//         reentry forbidden before repair (fundamentally blocks "backtrack-only-without-repair → infinite recursion").
// Deterministic, zero-dependency, no API key burned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { BugStopGuard } from '../src/core/bugstop.mjs';

// ---------------- Block infinite recursion: rerunning with original BUG is rejected ----------------
test('loop: after First-Bug Halt, repeatedly rerunning with the original BUG is always denied (blocks infinite recursion)', () => {
  const e = new WeiwenLawEngine();
  const broken = { name: 'reason', args: {}, paradox: true };
  const d1 = e.decideToolCall(broken);
  assert.equal(d1.kind, 'deny');
  assert.equal(d1.law, 'M');
  assert.ok(d1.bugKey);
  // Simulate "infinite recursion": rerun the same broken call repeatedly
  for (let i = 0; i < 12; i++) {
    const d = e.decideToolCall(broken);
    assert.equal(d.kind, 'deny');
    assert.equal(d.closedLoop, true);
    assert.ok(Array.isArray(d.missing) && d.missing.length > 0, 'should report missing steps');
  }
});

// ---------------- After loop closes: reentry released ----------------
test('loop: after completing backtrack → trace → fix(verify), reentry is allowed', () => {
  const e = new WeiwenLawEngine();
  const broken = { name: 'reason', args: {}, paradox: true };
  const d1 = e.decideToolCall(broken);
  const key = d1.bugKey;
  assert.ok(key);

  e.reverseBug(key);                         // logic backtrack (trace)
  e.traceBug(key, 'R objective-rule layer: premise distorted');  // trace-mark
  const fixed = { name: 'reason', args: {}, paradox: false }; // fix: remove the paradox flag
  const res = e.resolveBug(key, fixed);      // default verify: fixed no longer triggers First-Bug Halt
  assert.equal(res.ok, true);

  const d2 = e.decideToolCall(fixed);
  assert.equal(d2.kind, 'allow'); // released after repair
});

// ---------------- Core reinforcement: backtrack-only-without-repair still forbidden ----------------
test('loop: only logic backtrack, no repair → reentry still forbidden', () => {
  const e = new WeiwenLawEngine();
  const broken = { name: 'reason', args: {}, selfReference: true };
  e.decideToolCall(broken);
  const key = e.bugStopSnapshot()[0].bugKey;
  e.reverseBug(key); // backtrack only, no repair
  const d = e.decideToolCall(broken);
  assert.equal(d.kind, 'deny');
  assert.equal(d.closedLoop, true);
  assert.ok(d.missing.includes('resolve/fix (verify)'));
});

// ---------------- BugStopGuard unit ----------------
test('BugStopGuard: halt→reverse→trace→resolve state transition correct', () => {
  const g = new BugStopGuard();
  const call = { name: 'x', args: {}, deadlock: true };
  const { bugKey } = g.halt(call);
  assert.equal(g.canReenter(call).allowed, false);
  g.reverse(bugKey);
  g.trace(bugKey, 'Micro layer: race condition');
  const ok = g.resolve(bugKey, { name: 'x', args: {}, deadlock: false }, (fix) => fix.deadlock !== true);
  assert.equal(ok.ok, true);
  assert.equal(g.canReenter(call).allowed, true); // after repair this signature no longer blocks
});

test('BugStopGuard: stable identity — same signature halted multiple times hits the same record (gate keeps working)', () => {
  const g = new BugStopGuard();
  const call = { name: 'y', args: { a: 1 }, paramTypeError: true };
  const k1 = g.halt(call).bugKey;
  const k2 = g.halt(call).bugKey; // second halt (simulating rerun)
  assert.equal(k1, k2);
  assert.equal(g.stops.get(k1).attempts, 2);
});
