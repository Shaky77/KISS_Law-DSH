// Weiwen's Law definition-alignment regression test — guards against future upgrades regressing the definitions:
//   ① Logic-backtrack and First-Bug-Halt are kept separate and parallel (not merged, not "isomorphicWith"-equivalent)
//   ② Backtrack traces back along the R scale-inclusion axis (sub-rule layer → micro → macro → earth → cosmos);
//     the two axes are NOT confused with the time-evolution axis (parent/child chain R)
//

import test from 'node:test';
import assert from 'node:assert/strict';
import { CALIBRATION, R_DOMAIN, THREE_IRON_LAWS } from '../src/core/law.mjs';

test('对齐① CALIBRATION 存在且三字段齐全，已无 isomorphicWith 等同标注', () => {
  assert.ok(CALIBRATION, 'CALIBRATION 应存在');
  assert.ok(CALIBRATION.rule, '应有 rule');
  assert.ok(CALIBRATION.parallelWith, '应有 parallelWith');
  assert.ok(CALIBRATION.rLayerVerification, '应有 rLayerVerification');
  assert.ok(!('isomorphicWith' in CALIBRATION), '不得再出现 isomorphicWith 等同标注（此前误将两机制合体）');
});

test('对齐① 逻辑反推 与 第一 Bug 停机 明确为分开并行，而非"同精神/等同"', () => {
  const both = (CALIBRATION.rule + ' ' + CALIBRATION.parallelWith).toLowerCase();
  assert.match(CALIBRATION.parallelWith, /separately and in parallel|in parallel/, '应声明二者并行');
  assert.ok(!both.includes('same spirit'), '不得再写"同精神"式合体');
  assert.ok(!/equiv|identical|merged/.test(both), '不得再写"等同"式合体');
  assert.match(CALIBRATION.parallelWith, /halt.*sever|sever.*preserve (survival|continuity)/, '停机=管断/切链保活');
  assert.match(CALIBRATION.parallelWith, /backtracking.*trace|attribute the cause/, '反推=管溯/归因');
});

test('对齐② 反推路径沿 R 尺度包含轴（细分规则层→微观→宏观→地球→宇宙），且不含时间演进轴措辞', () => {
  const rule = CALIBRATION.rule;
  for (const layer of ['Micro', 'Macro', 'Earth', 'Cosmic']) {
    assert.ok(rule.includes(layer), `反推路径应包含 ${layer}`);
  }
  assert.ok(!rule.includes('parent-chain') && !rule.includes('child-chain'), '反推路径不得混入母链/子链（时间演进轴）');
});

test('对齐② R_DOMAIN 嵌套层级顺序为 宇宙⊃地球⊃宏观⊃微观，且含 fractalSubdivision 分形套嵌', () => {
  const h = R_DOMAIN.hierarchy;
  assert.equal(h.length, 4, '应为四层代表层级');
  assert.equal(h[0].name, 'Cosmic objective rules');
  assert.equal(h[1].name, 'Earth objective rules');
  assert.equal(h[2].name, 'Macro objective rules');
  assert.equal(h[3].name, 'Micro objective rules');
  assert.equal(h[0].contains, 'Earth objective rules');
  assert.equal(h[1].contains, 'Macro objective rules');
  assert.equal(h[2].contains, 'Micro objective rules');
  assert.ok(R_DOMAIN.fractalSubdivision, '应新增 fractalSubdivision');
  assert.match(R_DOMAIN.fractalSubdivision, /fractal nesting|isomorphic recursion/, '每层细分规则应分形套嵌、同构递归');
});

test('对齐② 尺度包含轴 与 时间演进轴 不混淆：母链/子链概念不得出现在反推定义中', () => {
  const blob = JSON.stringify(CALIBRATION);
  assert.ok(!blob.includes('母链') && !blob.includes('子链'), 'CALIBRATION 不得混入母链/子链时间演进轴');
});

test('对齐③ R 客观规则层可复验：rLayerVerification 声明宣称与复验不符即前提失真', () => {
  assert.match(CALIBRATION.rLayerVerification, /re-verif|re-verification/, '应提及复验');
  assert.match(CALIBRATION.rLayerVerification, /premise (is )?distorted|assignment untrustworthy/, '应落到前提失真/赋值不可信');
});

test('一致性的前提：第一 Bug 停机铁律与 R 层级定义均仍在线（无回退）', () => {
  assert.equal(THREE_IRON_LAWS.length, 3, '三大铁律仍应为三条');
  assert.ok(THREE_IRON_LAWS[1].includes('First-Bug Halt'), '铁律② 仍为第一 Bug 停机');
  assert.equal(R_DOMAIN.hierarchy[3].name, 'Micro objective rules', 'R 层级末层应为微观');
});
