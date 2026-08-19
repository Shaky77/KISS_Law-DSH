// KISS's Law definition-alignment regression tests — lock the two alignments revealed by the author on 2026-08-20,
// preventing future upgrades from writing them wrong again:
//   ① Logic backtracking and First-Bug Halt run SEPARATELY and IN PARALLEL (not merged, not isomorphicWith-equivalent)
//   ② Backtracking traces along the R-scale containment axis (sub-rule layer → Micro → Macro → Earth → Cosmic); the two axes
//      are not confused with the time-evolution axis (parent-chain / child-chain R)
//
// Source: author's revelation (Xia Qi / Shaky77). Variables not pre-assigned numeric values; framework-native strictly, not softened, not altered.

import test from 'node:test';
import assert from 'node:assert/strict';
import { CALIBRATION, R_DOMAIN, THREE_IRON_LAWS } from '../src/core/law.mjs';

test('Alignment① CALIBRATION exists with three fields complete, no isomorphicWith-equivalent tag', () => {
  assert.ok(CALIBRATION, 'CALIBRATION should exist');
  assert.ok(CALIBRATION.rule, 'should have rule');
  assert.ok(CALIBRATION.parallelWith, 'should have parallelWith');
  assert.ok(CALIBRATION.rLayerVerification, 'should have rLayerVerification');
  assert.ok(!('isomorphicWith' in CALIBRATION), 'must not re-appear isomorphicWith-equivalent tag (previously wrongly merged the two mechanisms)');
});

test('Alignment① Logic backtracking and First-Bug Halt are explicitly separate-and-parallel, not "same-spirit/equivalent"', () => {
  const both = (CALIBRATION.rule + ' ' + CALIBRATION.parallelWith).toLowerCase();
  assert.match(CALIBRATION.parallelWith, /parallel/, 'should declare the two are parallel');
  assert.ok(!both.includes('same spirit'), 'must not write "same spirit" style merging');
  assert.ok(!both.includes('equivalent'), 'must not write "equivalent" style merging');
  assert.match(CALIBRATION.parallelWith, /halt.*sever|keep.*intact/, 'halt = manages severing / chain-preserving');
  assert.match(CALIBRATION.parallelWith, /backtrack.*trace|attribute/, 'backtracking = manages tracing / attribution');
});

test('Alignment② backtracking path traces along R-scale containment axis (sub-rule → Micro → Macro → Earth → Cosmic), no time-evolution-axis wording', () => {
  const rule = CALIBRATION.rule;
  for (const layer of ['Micro', 'Macro', 'Earth', 'Cosmic']) {
    assert.ok(rule.includes(layer), `backtracking path should contain ${layer}`);
  }
  assert.ok(!rule.includes('parent chain') && !rule.includes('child chain'), 'backtracking path must not mix parent/child chain (time-evolution axis)');
});

test('Alignment② R_DOMAIN nesting order is Cosmic⊃Earth⊃Macro⊃Micro, and contains fractalSubdivision fractal nesting', () => {
  const h = R_DOMAIN.hierarchy;
  assert.equal(h.length, 4, 'should be four representative levels');
  assert.equal(h[0].name, 'Cosmic objective rules');
  assert.equal(h[1].name, 'Earth objective rules');
  assert.equal(h[2].name, 'Macro objective rules');
  assert.equal(h[3].name, 'Micro objective rules');
  assert.equal(h[0].contains, 'Earth objective rules');
  assert.equal(h[1].contains, 'Macro objective rules');
  assert.equal(h[2].contains, 'Micro objective rules');
  assert.ok(R_DOMAIN.fractalSubdivision, 'should add fractalSubdivision');
  assert.match(R_DOMAIN.fractalSubdivision, /fractal nesting|isomorphic recursion/, 'each level\'s sub-rules should be fractally nested, isomorphically recursive');
});

test('Alignment② scale-containment-axis and time-evolution-axis not confused: parent/child-chain concepts must not appear in backtracking definition', () => {
  const blob = JSON.stringify(CALIBRATION);
  assert.ok(!blob.includes('parent chain') && !blob.includes('child chain'), 'CALIBRATION must not mix parent/child-chain time-evolution axis');
});

test('Alignment③ R objective-rule layer is re-verifiable: rLayerVerification declares claim vs re-verification disagreement = premise distorted', () => {
  assert.match(CALIBRATION.rLayerVerification, /re-verify/, 'should mention re-verification');
  assert.match(CALIBRATION.rLayerVerification, /premise distorted|assignment untrustworthy/, 'should land on premise distorted / assignment untrustworthy');
});

test('Consistency prerequisite: First-Bug Halt iron law and R hierarchy definition still online (no regression)', () => {
  assert.equal(THREE_IRON_LAWS.length, 3, 'three iron laws should still be three');
  assert.ok(THREE_IRON_LAWS[1].includes('First-Bug Halt'), 'iron law ② still First-Bug Halt');
  assert.equal(R_DOMAIN.hierarchy[3].name, 'Micro objective rules', 'R hierarchy last level should be Micro');
});
