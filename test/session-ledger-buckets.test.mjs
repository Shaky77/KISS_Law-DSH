// session-ledger-buckets.test.mjs — regression lock (2026-09-26 · three alignment-layer fixes)
//   ① Cross-call sensitive-source registration point: the **judgment-layer entry**
//      (former defect: the registration lived inside deduceRisk ⇒ bypassed by upstream early returns ⇒ self-negating predicate)
//   ② `mSystemMarks` one-bucket-two-meanings split (instrument hygiene: never merge two meanings in one field)
//   ③ `allow` reason for "no action text" corrected (**right verdict + false reason = a true lie**)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

// ══ ① Registration-point contract: registration is the entry's job; deduceRisk stays a pure read ══
// Basis: the adapter (src/index.js) states "deduceRisk does semantic inference + dual-branch simulation only,
//   writes no state … ⇒ pure read, safe to recompute". The former implementation both **violated that contract**
//   and, because of its position, was **unreachable**.
test('契约①：deduceRisk 为纯读不登记；敏感源登记只发生在判定层入口 decideToolCall', () => {
  const e = new WeiwenLawEngine();
  e.deduceRisk({ name: 'read_file', args: { path: '/etc/shadow' } });
  assert.equal(e.sessRead.size, 0); // direct call is a pure read (writes no state)
  const r = e.decideToolCall({ name: 'read_file', args: { path: '/etc/shadow' } });
  assert.equal(r.kind, 'deny');     // intercepted by the judgment layer (credentials: taking without asking is theft)
  assert.equal(e.sessRead.size, 1); // yet the sensitive contact is still registered ⇒ later sinks must re-check source→sink
});

test('契约①幂等：同一敏感源重复裁决不重复计数；普通路径读不登记（不误伤）', () => {
  const e = new WeiwenLawEngine();
  for (let i = 0; i < 3; i += 1) e.decideToolCall({ name: 'read_file', args: { path: '/etc/shadow' } });
  assert.equal(e.sessRead.size, 1); // Set ⇒ idempotent
  const e2 = new WeiwenLawEngine();
  e2.decideToolCall({ name: 'read_file', args: { path: '/tmp/notes.txt' } });
  assert.equal(e2.sessRead.size, 0); // neither credential nor system path ⇒ not registered
});

// ══ ② Bucket split: interception counts no longer share a Map with R-anchor trace counts ══
test('拆桶②：同一系统反复被拦 → 计数进 mInterceptMarks；mSystemMarks（R 锚痕存桶）不被污染', () => {
  const e = new WeiwenLawEngine();
  const bad = { name: 'read_file', args: { path: { oops: true } } }; // dual-line mismatch → review/M
  for (let i = 0; i < 3; i += 1) e.decideToolCall(bad);
  const snap = e.snapshot();
  assert.equal(snap.mInterceptMarks.read_file, 3);      // interception counter bucket
  assert.deepEqual(Object.keys(snap.mSystemMarks), []); // R-anchor bucket: stays empty without an R hit
});

// ══ ③ Reason corrected: no action text ⇒ state it truthfully, do not reuse "S+1 path holds" ══
// Basis (author, 2026-09-26): empty ⇒ nothing enters the baseline ⇒ S level ⇒ M unchanged ⇒ no risk ⇒ allow is
//   correct; only the **reason** changes.
test('理由正位③：无动作文本的 allow 理由为「无扰动入基线」，不含「S 增路径成立」', () => {
  const e = new WeiwenLawEngine();
  const r = e.decideToolCall({ name: 'bash', args: { command: '' } });
  assert.equal(r.kind, 'allow');
  assert.match(r.reason, /无扰动入基线/);
  assert.doesNotMatch(r.reason, /S 增路径成立/);
});

test('理由对照③：有动作文本的正常低风险动作，理由仍为「S 增路径成立」（不被新分支吞掉）', () => {
  const e = new WeiwenLawEngine();
  const r = e.decideToolCall({ name: 'read_file', args: { path: '/tmp/notes.txt' } });
  assert.equal(r.kind, 'allow');
  assert.match(r.reason, /S 增路径成立/);
});
