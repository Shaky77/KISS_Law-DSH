// Weiwen's Law (Weiwen's Law) M First-Bug-Halt · dual-line parallel + court-style cross-check + ticketing escalation
//
// Symptom-A (checkExplicitFlags): DSH contract flags (paradox / selfReference / deadlock /
//   contradiction / paramTypeError) —— fast but passive.
// Symptom-B (checkSchemaInference): engine's independent structural inference (schema comparison), not relying on DSH
//   flags, fills the blind spot.
// Court cross-check (crossCheckM): dual-line parallel conclusions compared —— consistent → adopt; inconsistent →
//   send back for retrial (review).
//
// Ticketing escalation: no threshold agonizing, no "trigger how many times to lock" agonizing;
//   interception immediately tickets; the same BUG barraging repeatedly / the same system disguising many times,
//   ticket count reaches cap 9 → hand to human decision, AI stops agonizing.
//   flow1: same BUG, refuses to repair, barrages 9 times → human
//   flow2: same system, 9 different disguises (each interception tickets) → human
//

import test from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

// ══ 1. Symptom-A + Symptom-B dual-line consistent → confirm halt (deny + closed loop) ══
test('法院：治标(paradox) + 治本(结构异常) 双线一致 → 确认停机 deny + 闭环', () => {
  const e = new WeiwenLawEngine();
  const call = { name: 'reason', args: { path: { nested: true } }, paradox: true };
  const d = e.decideToolCall(call);
  assert.equal(d.kind, 'deny');
  assert.equal(d.law, 'M');
  assert.equal(d.closedLoop, true);
  assert.equal(d.mCrossCheck.consistent, true);
  assert.equal(d.mCrossCheck.verdict, 'halt');
  assert.equal(d.mCrossCheck.aHalt, true);
  assert.equal(d.mCrossCheck.bHalt, true);
  assert.equal(d.mMark.bugCount, 1); // 首次拦截标记 1 次
});

// ══ 2. Only symptom-A hits, structure sound → inconsistent → send back for retrial (review) ══
test('法院：仅治标(paradox) 命中、结构良好 → 不一致 → 打回重审 review', () => {
  const e = new WeiwenLawEngine();
  const call = { name: 'reason', args: {}, paradox: true };
  const d = e.decideToolCall(call);
  assert.equal(d.kind, 'review');
  assert.equal(d.law, 'M');
  assert.equal(d.closedLoop, undefined); // 未确认停机，不入硬闭环
  assert.equal(d.mCrossCheck.verdict, 'review');
  assert.equal(d.mCrossCheck.aHalt, true);
  assert.equal(d.mCrossCheck.bHalt, false);
  assert.equal(d.mMark.sysCount, 1); // 拦截即标记
});

// ══ 3. Only symptom-B hits (DSH silent) → inconsistent → send back for retrial (symptom-B fills blind spot) ══
test('法院：DSH 未报、治本独立推断(param-type) 命中 → 不一致 → 打回重审 review', () => {
  const e = new WeiwenLawEngine();
  const call = { name: 'read_file', args: { path: { oops: true } } };
  const d = e.decideToolCall(call);
  assert.equal(d.kind, 'review');
  assert.equal(d.law, 'M');
  assert.equal(d.mCrossCheck.aHalt, false);
  assert.equal(d.mCrossCheck.bHalt, true);
});

// ══ 4. Neither line hits → consistent pass → sink to deduction layer (allow, no ticket) ══
test('法院：双线均未命中 → 一致通过 → 下沉推演层放行 allow（无标记）', () => {
  const e = new WeiwenLawEngine();
  const call = { name: 'read_file', args: { path: '/tmp/ok.txt' } };
  const d = e.decideToolCall(call);
  assert.equal(d.kind, 'allow');     // 推演层低风险 → 放行
  assert.notEqual(d.law, 'M');        // 未触发 M，不标记
  assert.equal(Object.keys(e.snapshot().mSystemMarks).length, 0);
});

// ══ 5. flow1: same BUG, refuses to repair, barrages 9 times → human decision ══
test('flow1：同一 BUG 拒不修复、硬闯满 9 次 → 转人工决策（AI 停止纠结）', () => {
  const e = new WeiwenLawEngine(); // mHumanCap 默认 9
  const broken = { name: 'reason', args: { path: { nested: true } }, paradox: true };
  // 第 1 次：双线一致确认停机（deny + 闭环），标记 1
  const d1 = e.decideToolCall(broken);
  assert.equal(d1.kind, 'deny');
  assert.equal(d1.closedLoop, true);
  // 第 2~8 次：闭环硬闸拦截（canReenter 闸门），标记 2..8，仍 deny
  for (let i = 0; i < 7; i++) {
    const d = e.decideToolCall(broken);
    assert.equal(d.kind, 'deny');
    assert.equal(d.closedLoop, true);
  }
  // 第 9 次：同一 BUG 标记满 9 → 转人工决策（humanDecision）
  const dh = e.decideToolCall(broken);
  assert.equal(dh.kind, 'review');
  assert.equal(dh.humanDecision, true);
  assert.ok(dh.bugKey);
  assert.ok(dh.reason.includes('转人工'));
  // 后续仍转人工，不再纠结、不耗算力
  const d10 = e.decideToolCall(broken);
  assert.equal(d10.humanDecision, true);
});

// ══ 6. flow2: same system, 9 different disguises (each interception tickets) → human decision ══
test('flow2：同一系统 9 次不同伪装 → 标记满 9 次 → 转人工决策', () => {
  const e = new WeiwenLawEngine();
  const sys = 'EVASION-CORE';
  // 9 次不同伪装：不同 args 使 bugKey 各异，但 systemId 同为 sys → 系统标记累计
  for (let i = 0; i < 8; i++) {
    const call = { name: 'probe', systemId: sys, paradox: true, args: { variant: i } };
    const d = e.decideToolCall(call);
    assert.equal(d.kind, 'review'); // 仅治标命中 → 打回重审（每次均标记系统）
    assert.notEqual(d.humanDecision, true); // 前 8 次未达封顶
  }
  const last = e.decideToolCall({ name: 'probe', systemId: sys, paradox: true, args: { variant: 8 } });
  assert.equal(last.kind, 'review');
  assert.equal(last.humanDecision, true); // 第 9 次达封顶 → 转人工
  assert.ok(last.reason.includes('转人工'));
});

// ══ 7. Deduction grey-zone repetition: same system 9 grey-zone tickets → human decision ══
test('推演灰区：同一系统 9 次灰区(中风险)拦截 → 标记满 9 → 转人工决策', () => {
  const e = new WeiwenLawEngine();
  const sys = 'GREY-SYS';
  // upload 外传外部目标 = 推演中风险（review，外部外传但未触 R 凭据锚点），每次标记系统
  for (let i = 0; i < 8; i++) {
    const d = e.decideToolCall({ name: 'upload', systemId: sys, args: { url: `http://external.com/x${i}` } });
    assert.equal(d.kind, 'review');
    assert.notEqual(d.humanDecision, true);
  }
  const last = e.decideToolCall({ name: 'upload', systemId: sys, args: { url: 'http://external.com/x8' } });
  assert.equal(last.humanDecision, true);
});

// ══ 8. Symptom-B independent structural inference covers all forms (not relying on DSH flags) ══
test('法院：治本能独立识别 自引用 / 矛盾 / 形态偏离（即使 DSH 全静默）', () => {
  const e = new WeiwenLawEngine();
  const selfRef = e.checkSchemaInference({ id: 'c1', name: 'loop', args: { next: 'c1' } });
  assert.equal(selfRef.halt, true);
  assert.equal(selfRef.anomaly.kind, 'self-reference');
  const contra = e.checkSchemaInference({ name: 'io', args: { read: true, write: true } });
  assert.equal(contra.halt, true);
  assert.equal(contra.anomaly.kind, 'contradiction');
  const dev = e.checkSchemaInference({ args: {} });
  assert.equal(dev.halt, true);
  assert.equal(dev.anomaly.kind, 'schema-deviation');
  const ok = e.checkSchemaInference({ name: 'read_file', args: { path: '/tmp/ok.txt' } });
  assert.equal(ok.halt, false);
});

// ══ 9. Closed-loop repair must clear BOTH lines (symptom-B structural anomaly must also be repaired to count as resolved) ══
test('法院：闭环修复须治标+治本双线皆清，才算 resolved（拒绝只修一侧）', () => {
  const e = new WeiwenLawEngine();
  const broken = { name: 'reason', args: { path: { nested: true } }, paradox: true };
  e.decideToolCall(broken);
  const key = e.bugStopSnapshot()[0].bugKey;
  e.reverseBug(key);
  e.traceBug(key, 'R 客观规则层：前提失真');
  // 只去掉 paradox（治标清），但结构异常仍在（治本未清）→ 默认验证应失败
  const partial = { name: 'reason', args: { path: { nested: true } }, paradox: false };
  const r1 = e.resolveBug(key, partial);
  assert.equal(r1.ok, false, '仅修治标、治本仍在 → 不应 resolved');
  // 两侧皆清 → resolved，且回收标记
  const full = { name: 'reason', args: {}, paradox: false };
  const r2 = e.resolveBug(key, full);
  assert.equal(r2.ok, true);
  const d = e.decideToolCall(full);
  assert.equal(d.kind, 'allow');
  assert.equal(Object.keys(e.snapshot().mBugForce).length, 0, '修复后 BUG 标记应回收');
});

// ══ 10. Cap threshold tunable by author (mHumanCap): cap=3 → 3rd time → human ══
test('标记制：mHumanCap 可调，cap=3 时同一 BUG 第 3 次即转人工', () => {
  const e = new WeiwenLawEngine({ mHumanCap: 3 });
  const broken = { name: 'reason', args: { path: { nested: true } }, paradox: true };
  e.decideToolCall(broken); // mark 1
  e.decideToolCall(broken); // mark 2 (canReenter)
  const d3 = e.decideToolCall(broken); // mark 3 → human
  assert.equal(d3.humanDecision, true);
});
