// Type-level identifiability gate — targeted regression lock (one-off regression lock, read-only,
// does not modify the engine)
//
// The lock's criterion, not a list of values:
//   What is enumerated here is **every typeof type branch** (finite, closed), not "values that might
//   get passed in" (infinite, open). Therefore any change that falls back to value-level judgement
//   (e.g. psi !== undefined && psi !== null) collapses on the spot — including the pseudo-zero family
//   that Number() coerces to 0 (null / false / [] / ''), the bigint near-relative (10n), and Symbol,
//   which throws. That is exactly the reason this lock exists: to prove the gate is load-bearing,
//   not that cases are piling up.
//
// Background (trunk vs leaves):
//   - Value-level enumeration can never be complete: Number(null)=Number(false)=Number([])=Number('')=0,
//     all finite → pseudo-zero penetration; Number(10n)=10 is accepted as a normal value;
//     Number(Symbol()) throws TypeError outright.
//   - Order is the criterion: typeof must short-circuit before any Number() / comparison.
//   - Make illegal states unrepresentable: when the source is missing, psi must be undefined — never 0
//     (if "no source" and "the source says the effect is zero" share one representation, downstream has
//     no way to tell them apart).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateEffectPsi, upliftRank } from '../src/adapt/sd-effect-sensor.mjs';

// ── Equivalence class A: usable numbers (number and finite) — must pass through, zero false kills ──
const CLASS_A = [
  ['0', 0],
  ['1.5', 1.5],
  ['-0.3', -0.3],
  ['1e308', 1e308],
  ['Number.MIN_VALUE', Number.MIN_VALUE],
];

// ── Equivalence class B: number type but not finite — must be judged source-missing ──
const CLASS_B = [
  ['NaN', NaN],
  ['Infinity', Infinity],
  ['-Infinity', -Infinity],
];

// ── Equivalence class C: non-number types (all typeof branches enumerated) — must be judged
//    source-missing ──
const CLASS_C = [
  ['undefined', undefined],
  ['null', null],
  ['false', false],
  ['true', true],
  ['empty string', ''],
  ['abc', 'abc'],
  ['empty array', []],
  ['[0]', [0]],
  ['{}', {}],
  ['10n (bigint)', 10n],
  ['Symbol()', Symbol('s')],
  ['function', () => {}],
];

const OK_OVERLAP = 0.5; // inside the identifiable range, used to isolate the psi channel for testing

test('gate·class A: all finite numbers pass through, zero false kills', () => {
  for (const [label, v] of CLASS_A) {
    const r = estimateEffectPsi({ psi: v, overlap: OK_OVERLAP });
    assert.equal(r.identifiable, true, `${label} should be identifiable`);
    assert.equal(r.psi, v, `${label} psi should pass through unchanged`);
    assert.equal(r.psiMissing, false, `${label} should not be judged missing`);
    assert.equal(r.magnitude, Math.abs(v), `${label} magnitude should be |psi|`);
  }
});

test('gate·class B: number but not finite → source missing, and no pseudo-zero output', () => {
  for (const [label, v] of CLASS_B) {
    const r = estimateEffectPsi({ psi: v, overlap: OK_OVERLAP });
    assert.equal(r.psiMissing, true, `${label} should be judged missing`);
    assert.equal(r.psi, undefined, `${label} must not yield a psi number`);
    assert.equal(r.magnitude, undefined, `${label} must not yield a magnitude`);
  }
});

test('gate·class C: all non-number types → source missing, and no pseudo-zero output (incl. Symbol must not crash)', () => {
  for (const [label, v] of CLASS_C) {
    // If the implementation falls back to Number() coercion, Symbol throws TypeError outright —
    // it would crash right here inside the assertion and the test fails.
    const r = estimateEffectPsi({ psi: v, overlap: OK_OVERLAP });
    assert.equal(r.psiMissing, true, `${label} should be judged missing`);
    assert.equal(r.psi, undefined, `${label} must not output a pseudo-zero`);
    assert.equal(r.magnitude, undefined, `${label} must not output a pseudo-zero magnitude`);
  }
});

test('gate·overlap uses the same blade: any non-usable number is unidentifiable (must not be accidentally caught by the threshold)', () => {
  for (const [label, v] of [...CLASS_B, ...CLASS_C]) {
    const r = estimateEffectPsi({ psi: 0.3, overlap: v });
    assert.equal(r.identifiable, false, `overlap=${label} should be judged unidentifiable`);
    assert.equal(r.psi, undefined, `when unidentifiable, no psi is attached (fail-closed)`);
  }
  // Still normal inside the identifiable range
  assert.equal(estimateEffectPsi({ psi: 0.3, overlap: 0.5 }).identifiable, true);
  assert.equal(estimateEffectPsi({ psi: 0.3, overlap: 0.05 }).identifiable, true);
  assert.equal(estimateEffectPsi({ psi: 0.3, overlap: 0.95 }).identifiable, true);
});

test('gate·overlap out of range still reports positivity violation (semantic anchor unchanged)', () => {
  assert.match(estimateEffectPsi({ overlap: 0.02 }).reason, /positivity violation/);
  assert.match(estimateEffectPsi({ overlap: undefined }).reason, /extraction channel failed/);
  assert.match(estimateEffectPsi({ overlap: 'abc' }).reason, /source unidentifiable/);
});

test('illegal state unrepresentable: "missing" and "effect is zero" must be represented differently', () => {
  const zero = estimateEffectPsi({ psi: 0, overlap: OK_OVERLAP });
  const missing = estimateEffectPsi({ psi: null, overlap: OK_OVERLAP });
  assert.equal(zero.psi, 0);
  assert.equal(zero.psiMissing, false);
  assert.equal(missing.psi, undefined); // not 0 — downstream gets no value it could misread
  assert.equal(missing.psiMissing, true);
  assert.notEqual(missing.psi, zero.psi);
});

test('upliftRank gives no pseudo-zero: missing entries sort last and never produce 0', () => {
  const ranked = upliftRank([
    { name: 'a', psi: null },
    { name: 'b', psi: 0.5 },
    { name: 'c', psi: undefined },
    { name: 'd', psi: 0.9 },
  ]);
  assert.deepEqual(ranked.map((r) => r.name), ['d', 'b', 'a', 'c']);
  assert.equal(ranked[2].psi, undefined);
  assert.equal(ranked[3].psi, undefined);
  // Missing entries must not be treated as 0 and inserted in the middle
  assert.notEqual(ranked[2].psi, 0);
});
