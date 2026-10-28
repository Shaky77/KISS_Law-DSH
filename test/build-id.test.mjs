// build-id.test.mjs — regression lock for the buildId convention
// ---------------------------------------------------------------------------
// What is locked here is a property, not a table of expected values:
//   **The same code ⇒ the same buildId, regardless of the platform's line-ending habit or the install path.**
//
// The defect (measured 2026-10-27 by a real-install probe, on 0.2.3 as shipped):
//   The same code produced `8e8604efd2cf` inside the npm package and `91fea30b57f8` on the git storage side.
//   The difference was line endings: older files were checked out as CRLF by autocrlf and went into the
//   package that way, while git stores LF.
//   The consequence is not "an ugly number" — it is that **the fingerprint's purpose fails**:
//   the only reason buildId exists is to answer "is the code you measured the code I am describing".
//   Once a platform convention is mixed in, a mismatch gets read as "you installed an old package" instead
//   of "the two sides used different conventions".
//
// Why a property rather than a checklist: files will be added and removed and contents will change, which
//   voids any table of expected values; the property "normalised-equal content ⇒ equal value" keeps holding
//   no matter how many times the code changes.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { computeBuildId, FINGERPRINTS } from '../src/index.js';

const FILES = [
  ['engine.mjs', 'line one\nline two\nline three\n'],
  ['law.mjs', 'const a = 1;\nconst b = 2;\n'],
];

test('same content: all-LF and all-CRLF must hash equal (the basis for cross-platform comparability)', () => {
  const lf = FILES.map(([n, c]) => [n, c]);
  const crlf = FILES.map(([n, c]) => [n, c.replace(/\n/g, '\r\n')]);
  assert.equal(computeBuildId(lf), computeBuildId(crlf));
});

test('same content: mixed line endings (old file CRLF + new file LF) hash equal to uniform endings', () => {
  const mixed = [
    ['engine.mjs', 'line one\r\nline two\r\nline three\r\n'],   // an older file checked out by autocrlf
    ['law.mjs', 'const a = 1;\nconst b = 2;\n'],                // a file freshly written by a tool
  ];
  assert.equal(computeBuildId(mixed), computeBuildId(FILES));
});

test('one changed character ⇒ the value must change (a fingerprint has to bite the content)', () => {
  const changed = [['engine.mjs', 'line one\nline two\nline three!\n'], FILES[1]];
  assert.notEqual(computeBuildId(changed), computeBuildId(FILES));
});

test('the file name participates in the hash ⇒ renaming changes the value (content equality alone must not slip through)', () => {
  const renamed = [['engine2.mjs', FILES[0][1]], FILES[1]];
  assert.notEqual(computeBuildId(renamed), computeBuildId(FILES));
});

test('input order does not affect the result (the caller\'s ordering must not become a convention difference)', () => {
  assert.equal(computeBuildId([FILES[1], FILES[0]]), computeBuildId(FILES));
});

test('a lone \\r is content, not a line ending, and must not be normalised away', () => {
  const a = [['x.mjs', 'a\rb\n']];
  const b = [['x.mjs', 'a\nb\n']];
  assert.notEqual(computeBuildId(a), computeBuildId(b), 'a lone \\r is content, not a line-ending marker');
});

// ─────────────────────────────────────────────────────────────
// Separating the two fingerprints (2026-10-27, raised by xiaoD: "the second way the version is blind")
//   Defect: `buildId` hashes only `src/core/*.mjs` ⇒ **a change to the adapter layer (index.js) is invisible.**
//     Between 0.2.5 and 0.2.6 the adapter and the docs changed while buildId never moved (both reported
//     `91fea30b57f8`; only loadedAt differed).
//     ⇒ Not "the fingerprint computes wrong" — a question of **coverage**: it answers "is the criteria code
//     the same", not "is the whole package's behavioural surface the same".
//   Disposition: do not widen buildId (that would void the recorded values for 0.2.0–0.2.6); instead place a
//     second fingerprint beside it: buildId = criteria domain (src/core) / bundleId = behaviour domain (all of src).
//   The property locked here: **bundleId must cover the adapter and be independently recomputable from outside**
//     (not merely a number we printed).
// ─────────────────────────────────────────────────────────────

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const walkSrc = (dir, prefix = '') => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  if (e.isDirectory()) return walkSrc(join(dir, e.name), `${prefix}${e.name}/`);
  if (!e.name.endsWith('.js') && !e.name.endsWith('.mjs')) return [];
  if (e.name.startsWith('_engine_base_') || e.name === 'runtime.log') return [];
  return [[`${prefix}${e.name}`, readFileSync(join(dir, e.name), 'utf8')]];
});

test('bundleId can be recomputed independently from outside (an auditor need not trust the printed value)', () => {
  assert.equal(computeBuildId(walkSrc(SRC)), FINGERPRINTS.bundleId);
});

test('bundleId covers the adapter: the file set must include index.js, which buildId\'s coverage excludes', () => {
  const files = walkSrc(SRC).map(([n]) => n);
  assert.ok(files.includes('index.js'), 'the bundle coverage must include the adapter layer index.js');
  assert.ok(files.includes('core/engine.mjs'), 'the bundle must also include the criteria domain');
  // Counter-example: if index.js is ever dropped from the bundle, the assertion above fails.
});

test('the two fingerprints must differ — equality would mean the coverages were merged (back to "the adapter is invisible")', () => {
  assert.notEqual(FINGERPRINTS.bundleId, FINGERPRINTS.buildId);
  assert.match(FINGERPRINTS.buildId, /^[0-9a-f]{12}$/);
  assert.match(FINGERPRINTS.bundleId, /^[0-9a-f]{12}$/);
});

test('bundleId bites adapter content: same core + one changed adapter character ⇒ bundleId moves, buildId does not', () => {
  const all = walkSrc(SRC);
  const coreOnly = all.filter(([n]) => n.startsWith('core/')).map(([n, c]) => [n.replace('core/', ''), c]);
  const tweaked = all.map(([n, c]) => (n === 'index.js' ? [n, c + '\n// probe'] : [n, c]));
  const coreTweaked = tweaked.filter(([n]) => n.startsWith('core/')).map(([n, c]) => [n.replace('core/', ''), c]);

  assert.notEqual(computeBuildId(all), computeBuildId(tweaked), 'bundleId must be sensitive to adapter changes');
  assert.equal(computeBuildId(coreOnly), computeBuildId(coreTweaked), 'buildId should be insensitive to adapter changes (that is its semantics, not a defect)');
});
