// Fusion tests: after the S/D quantitative effect sensor is wired into the DSH adapter layer,
// the engine's rulings are not polluted and the M gate takes effect.
// Call shapes strictly follow probe-sd-mirror.mjs P1–P6, keeping "after fusion" and "before fusion"
// on the same baseline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { estimateEffectPsi, upliftRank, fusedDecide } from '../src/adapt/sd-effect-sensor.mjs';

function freshEngine() {
  return new WeiwenLawEngine();
}

// ── Essence 1: identifiability first (the core of discarding the dross) ──
test('essence·identifiability first: overlap out of range → unidentifiable', () => {
  const bad = estimateEffectPsi({ psi: 0.3, overlap: 0.02 });
  assert.equal(bad.identifiable, false);
  assert.match(bad.reason, /positivity violation/);
  const ok = estimateEffectPsi({ psi: 0.3, overlap: 0.5 });
  assert.equal(ok.identifiable, true);
  assert.equal(ok.psi, 0.3);
});

// ── Essence 2: Uplift ranking (most S-eroding first) ──
test('essence·Uplift ranking: descending by |psi|', () => {
  const ranked = upliftRank([
    { name: 'read', psi: 0.1 },
    { name: 'delete', psi: -0.9 },
    { name: 'write', psi: 0.4 },
  ]);
  assert.equal(ranked[0].name, 'delete'); // |−0.9| is the largest
  assert.equal(ranked[2].name, 'read');
});

// ── After fusion: engine review passes through (P6 hidden confounding / neutral name → M already
//    involved, untouched) ──
test('fusion·P6 hidden-confounding request → engine review passes through, M not overwritten by sensor', () => {
  const call = { name: 'estimate_causal_effect', args: { treatment: 'X', outcome: 'Y', data: 'observational', unobserved_confounder: true, counterfactual_labels: false } };
  const r = fusedDecide(call, { engine: freshEngine(), psi: 0.8, overlap: 0.5, sRelevant: true });
  assert.equal(r.kind, 'review');
  assert.equal(r.sdSignal, undefined); // no untrustworthy signal attached
});

// ── After fusion: engine allow + identifiable → attach sdSignal, verdict unchanged
//    (adding leaves does not overwrite) ──
test('fusion·P4 benign read + identifiable → allow with sdSignal, engine verdict unchanged', () => {
  const call = { name: 'read_file', args: { path: '/tmp/ok.txt' } };
  const r = fusedDecide(call, { engine: freshEngine(), psi: 0.05, overlap: 0.6 });
  assert.equal(r.kind, 'allow');
  assert.ok(r.sdSignal && r.sdSignal.magnitude === 0.05);
});

// ── After fusion: engine allow + effect unidentifiable + S-related → escalate to review
//    (discarding the dross / M gate) ──
test('fusion·allow + effect unidentifiable + S-related → escalate to review (rejecting blind unconfoundedness)', () => {
  // [2026-09-20 输入换型 · 扣子 coze/51 方向] 原输入 `rm -rf ./cache` 现在被**引擎自己**的
  //   痕锚归属判据拦成 review（无锚 ⇒ review）⇒ 引擎先 review，fusion 只透传，
  //   本测试要考的「engine allow 之上做 M 闸门升级」这条路径就不会被走到。
  //   换成引擎放行的**可逆窗口**动作（cp），保留本测试的主题不变。
  const call = { name: 'exec', args: { command: 'cp -r ./cache ./cache-bak' } };
  const r = fusedDecide(call, { engine: freshEngine(), psi: 0.7, overlap: 0.01, sRelevant: true });
  assert.equal(r.kind, 'review');
  assert.equal(r.sdUncertain, true);
  assert.equal(r.law, 'M');
});

// ── After fusion: engine allow + effect unidentifiable + pure read → keep allowance (no S risk) ──
test('fusion·allow + effect unidentifiable + pure read → keep allow and flag uncertain', () => {
  const call = { name: 'read_file', args: { path: '/tmp/ok.txt' } };
  const r = fusedDecide(call, { engine: freshEngine(), psi: 0.0, overlap: 0.01 });
  assert.equal(r.kind, 'allow');
  assert.equal(r.sdUncertain, true);
  assert.equal(r.sdSignal, undefined);
});

// ── After fusion: engine deny passes through (P5 plaintext destruction → untouched) ──
test('fusion·P5 plaintext destruction → engine deny passes through', () => {
  const call = { name: 'exec', args: { command: 'rm -rf /' } };
  const r = fusedDecide(call, { engine: freshEngine(), psi: 0.9, overlap: 0.5, sRelevant: true });
  assert.equal(r.kind, 'deny');
});

// ── Reverse protection: the P1 miss (a known leaf-level blind spot) still exists after fusion;
//    fusion does not paper over it ──
test('fusion·P1 "rm -rf ." → 盲区已由痕锚归属判据关闭（不再靠 fusion 兜）', () => {
  const call = { name: 'exec', args: { command: 'rm -rf .' } };
  const r = fusedDecide(call, { engine: freshEngine(), psi: 0.9, overlap: 0.5, sRelevant: true });
  // [2026-09-20 判据变更 · 扣子 coze/51 方向] 本测试原记录：P1（`rm -rf .`）在引擎层是 ALLOW，
  //   属 engine.mjs SCOPE_REL_FULL 正则的已知叶级盲区（禁区，需单独授权才动），fusion 只诚实暴露、不粉饰。
  //   现已由**结构判据**（scar 类动作 + 无锚可归 ⇒ REVIEW）关闭——不依赖那条正则、不补路径/词表：
  //   引擎自己给出 review ⇒ fusion 透传（review 只可能出现在"引擎先 allow"之后的反推前提也不再触发）。
  assert.equal(r.kind, 'review');
});

// ── Blocker 1 regression lock: fail-open default → fail-closed (raised by Couizi, 2026-09-09) ──
test('blocker1·overlap not provided → fail-closed by default: write op goes to M review (not silent ALLOW)', () => {
  const call = { name: 'fs_write', args: { path: '/tmp/q3_report.txt', content: 'x' } };
  const r = fusedDecide(call, { engine: freshEngine() }); // overlap / sRelevant not provided
  assert.equal(r.kind, 'review');
  assert.equal(r.sdUncertain, true);
});

test('blocker1·sRelevant not provided → conservative derivation: read class=false (keep allow) / neutral name=true (escalate review)', () => {
  const readCall = { name: 'read_file', args: { path: '/tmp/ok.txt' } };
  const readR = fusedDecide(readCall, { engine: freshEngine(), overlap: 0.01 }); // unidentifiable, read class derived false
  assert.equal(readR.kind, 'allow');
  assert.equal(readR.sdUncertain, true);
  const neutralCall = { name: 'tool_42', args: {} };
  const neutralR = fusedDecide(neutralCall, { engine: freshEngine(), overlap: 0.01 }); // unidentifiable, neutral name derived true
  // Note: a neutral name is itself ruled review by the engine (M already involved, early return), so the
  // sensor does not add sdUncertain again; the "S-related" tightening semantics are positively verified
  // in the "blocker1·overlap not provided" (fs_write) test above.
  assert.equal(neutralR.kind, 'review');
});

// ── Blocker 2 regression lock: no psi source → no pseudo-zero (raised by Couizi, 2026-09-09) ──
test('blocker2·psi without source → no pseudo-zero, explicit psiMissing', () => {
  const call = { name: 'read_file', args: { path: '/tmp/ok.txt' } };
  const r = fusedDecide(call, { engine: freshEngine(), overlap: 0.6 }); // identifiable but no psi
  assert.equal(r.kind, 'allow');
  assert.ok(r.sdSignal);
  assert.equal(r.sdSignal.psi, undefined);
  assert.equal(r.sdSignal.psiMissing, true);
});

// ── Blocker 3 regression lock: one-way escalation-gate semantics (review/deny→allow forbidden)
//    (wording raised by Couizi, 2026-09-09) ──
test('blocker3·one-way tightening: engine review / deny is never flipped to allow by the sensor', () => {
  const reviewCall = { name: 'estimate_causal_effect', args: { treatment: 'X', outcome: 'Y', data: 'observational' } };
  const r1 = fusedDecide(reviewCall, { engine: freshEngine(), psi: 0.8, overlap: 0.5, sRelevant: true });
  assert.equal(r1.kind, 'review'); // still review, not overwritten
  const denyCall = { name: 'exec', args: { command: 'rm -rf /' } };
  const r2 = fusedDecide(denyCall, { engine: freshEngine(), psi: 0.9, overlap: 0.5, sRelevant: true });
  assert.equal(r2.kind, 'deny'); // still deny, not overwritten
});
