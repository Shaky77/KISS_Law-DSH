// mutation-gate.test.mjs — Gate ④ (checklist question ④ from Couizi): mutation testing mechanized (specimen: no-destructive-fs)
// Anchor two-source conjunction: C1(action class: attrib.ok && DELETION_LAYERS) ∧ C2(scope: extractPath hits root/system/pseudo-fs)
//   Both components are semantically同源 (same referent "destruction of the file system"), 源分置 (C1=attribution layer / C2=extractPath, independent of command text).
// Mutation rule: apply k negations to each component (odd=negate, even=identity).
//   ① Single-component negation → variant must be "killed" (at least one case flips) to pass;
//   ② Pairwise negation → must also be killed (no redundant cancellation);
//   ③ Double negation of the same component (parity law) → mechanically flagged as "equivalent mutant" (flips nothing).
// Note: C1 comes from the real engine attributeCall; C2's extractPath + scope regex are 【extracted directly from engine.mjs source】
//   (test reads source and evals it, does not modify the engine) to guarantee zero drift from the live anchor.
//   origDeny is cross-validated against the real engine checkRigidAnchor(no-destructive-fs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { attributeCall } from '../src/core/attribution.mjs';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const engineSrc = readFileSync(join(__dir, '..', 'src', 'core', 'engine.mjs'), 'utf8');
// Extract the real scope regex from engine source (same origin as the live anchor, avoids hand-typed drift)
function evalConst(name) {
  const m = engineSrc.match(new RegExp('const ' + name + ' = (/[\\s\\S]*?/);'));
  if (!m) throw new Error('mutation-gate: cannot extract ' + name + ' from engine source');
  return eval(m[1]);
}
const SCOPE_ROOT = evalConst('SCOPE_ROOT');
const SYS_DELETE = evalConst('SYS_DELETE');
const PSEUDO_FS = evalConst('PSEUDO_FS');
const DELETION_LAYERS = new Set(['file-delete', 'cred-delete']);

function extractPath(call) {                 // mirror engine extractPath (reads call.args.path / .file)
  const c = call?.args ?? {};
  if (typeof c.path === 'string') return c.path;
  if (typeof c.file === 'string') return c.file;
  return undefined;
}
function C1(call) {                       // action-class component (source = attribution layer)
  const a = attributeCall(call);
  return a.ok && DELETION_LAYERS.has(a.layer);
}
function C2(call) {                       // scope component (source = extractPath, not command text)
  const p = extractPath(call);
  return !!(p && (SCOPE_ROOT.test(p) || SYS_DELETE.test(p) || PSEUDO_FS.test(p)));
}
function origDeny(call) { return C1(call) && C2(call); }
function applyNeg(x, k) { return k % 2 === 0 ? x : !x; }
function mutatedDeny(call, flips) {      // flips: { componentIndex: negationCount }
  const c = [C1(call), C2(call)];
  const v = c.map((x, i) => applyNeg(x, flips[i] || 0));
  return v[0] && v[1];
}

const CASES = [
  { name: 'fs_delete',   args: { path: '/' } },
  { name: 'fs_delete',   args: { path: '/etc' } },
  { name: 'cred_delete', args: { path: '/root' } },
  { name: 'fs_delete',   args: { path: '/tmp/x' } },
  { name: 'read_file',   args: { path: '/tmp/notes.txt' } },
  { name: 'write_file',  args: { path: '/home/u/draft.txt' } },
];

test('Q④·single-component negation: variants are killed (at least one case flips)', () => {
  for (const flips of [{ 0: 1 }, { 1: 1 }]) {
    let killed = false;
    for (const c of CASES) if (origDeny(c) !== mutatedDeny(c, flips)) killed = true;
    assert.ok(killed, `variant negating ${JSON.stringify(flips)} must be killed by at least one case (flipped verdict)`);
  }
});

test('Q④·pairwise negation: also killed (no redundant cancellation)', () => {
  const flips = { 0: 1, 1: 1 };
  let killed = false;
  for (const c of CASES) if (origDeny(c) !== mutatedDeny(c, flips)) killed = true;
  assert.ok(killed, `pairwise negation ${JSON.stringify(flips)} must be killed (flipped verdict)`);
});

test('Q④·double negation of same component (parity law): mechanically flagged equivalent (flips nothing)', () => {
  for (const flips of [{ 0: 2 }, { 1: 2 }]) {
    let flipsCount = 0;
    for (const c of CASES) if (origDeny(c) !== mutatedDeny(c, flips)) flipsCount++;
    assert.strictEqual(flipsCount, 0, `double negation ${JSON.stringify(flips)} must be equivalent to original (parity law), flipping no case`);
  }
});

test('Q④·cross-validation with real engine: origDeny matches engine checkRigidAnchor(no-destructive-fs)', () => {
  const eng = new WeiwenLawEngine();
  for (const c of CASES) {
    const hit = eng.checkRigidAnchor(c)?.anchor === 'no-destructive-fs';
    assert.strictEqual(hit, origDeny(c), `specimen model must match real engine: ${JSON.stringify(c)}`);
  }
});
