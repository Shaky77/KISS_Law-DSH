// R₀ 域容量表的机械锁
// ════════════════════════════════════════════════════════════════════
// 这条锁防的是一次**真实的、被用户当场揪出来的**错（2026-10-20）：
//
//   安问：「R₀ 怎么会一个数都没有呢？所有每个领域标准，在网络里不是自带的么？」
//   ⇒ 上一轮把 R₀ 挂成 `PENDING(TBD@R_DOMAIN.hierarchy[level].capacity)`，
//     而那个字段**根本不存在**。域常数一直有，只是我没查。
//
// 于是这条锁要锁住三件不同的事，**不能合看**：
//   ① 域表四全（value ∧ unit ∧ source ∧ kind）—— 缺任一＝非法，不是 pending；
//   ② 「标准合法地不给数」(no_num) 与「我没查」(malformed) 在账上必须分得开；
//   ③ R₀ 缺的是**分母**不是域常数 —— 二者状态必须不同档。
//
// 🔴 双向验证（反面半必须有，否则误伤恒为 0）：
//   正常态全绿；注入 malformed / 拿 ΣS 当分母 / 把 SCALE 当数值 ⇒ 立刻红。
// ════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert';

import {
  R_CAPACITY, RCAP_KIND, RCAP_EVIDENCE,
  rCapRoute, expandThreshold, isDegenerateDenominator, rCapAudit, rCapOf,
} from '../src/core/rCapacity.mjs';
import { STRATA, QSTAT, compute, dataSurface, strataReadout } from '../src/core/strata.mjs';

// ── 造一个 duck-typed engine（dataSurface 只读字段，不调方法）──────────
function fakeEngine({ domainKey = 'aviation.dal_a', nOpp = null, n = 4 } = {}) {
  const rStore = Array.from({ length: n }, (_, i) => ({
    sign: i % 2 ? '-' : '+', reversible: i === 0 ? 'scar' : 'unknown', rDomains: ['R:X'],
  }));
  const e = {
    historyTrail: rStore.map((r) => ({ type: r.sign === '-' ? '|S-1|' : 'S+1' })),
    sBySubsystem: { a: 5 },
    sAccount: { rStore },
    traumaCount: 0,
  };
  if (domainKey !== undefined) e.domainKey = domainKey;
  if (nOpp !== null) e.nOpportunities = nOpp;
  return e;
}

// ═══════════════════════════════════════════════════════════════════
// ① 域表四全体检 —— 缺 source/unit/kind 即非法
// ═══════════════════════════════════════════════════════════════════
test('① 域表四全：无 malformed 条目（value ∧ unit ∧ source ∧ kind）', () => {
  const a = rCapAudit();
  assert.strictEqual(a.verdict, 'pass', `存在非法条目：${JSON.stringify(a.rows.filter((r) => r.status === 'malformed'), null, 2)}`);
  assert.strictEqual(a.count.malformed, 0);
  assert.ok(a.count.total >= 10, `条目过少（${a.count.total}）—— 不可能只有这么几个域的标准`);
});

test('② 反证：注入缺 source 的条目 ⇒ 体检必须红（否则这条锁是摆设）', () => {
  const bad = {
    'bogus.no_source': { kind: RCAP_KIND.RATE, value: 1e-9, unit: 'per_hour', verified: 'secondary' },
    'bogus.no_kind': { value: 5, unit: 'uL', source: '某标准' },
    'bogus.no_value_for_rate': { kind: RCAP_KIND.RATE, unit: 'per_hour', source: '某标准' },
  };
  const a = rCapAudit(bad);
  assert.strictEqual(a.verdict, 'fail');
  assert.strictEqual(a.count.malformed, 3, '三条都该被判非法');
});

test('③ 「标准合法地不给数」≠「我没查」：no_num 与 malformed 分开计数', () => {
  const a = rCapAudit();
  // aviation.dal_d / dal_e / medical.iec62304_class / unspecified 是合法的 no_num
  assert.ok(a.count.no_num_legal >= 3, `no_num_legal 应 ≥3，实为 ${a.count.no_num_legal}`);
  // 但它们必须各自写清 source —— 不许拿空 source 冒充「标准不给」
  for (const r of a.rows.filter((x) => x.status === 'no_num_legal')) {
    assert.ok(r.source && r.source.length > 4, `${r.key} 是 no_num 但没写清来源 ⇒ 与「没查」不可分`);
  }
});

// ═══════════════════════════════════════════════════════════════════
// ② 量纲路由：域不同 ⇒ 公式不同，不是阈值不同
// ═══════════════════════════════════════════════════════════════════
test('④ 六类量纲各有专属路由，且互不相同', () => {
  const routes = Object.values(RCAP_KIND).map((k) => rCapRoute(k, 'count').route);
  assert.strictEqual(new Set(routes).size, 6, `六类应给六条不同路由，实为：${routes.join(',')}`);
});

test('⑤ 只有 COUNT 类可直接代入；RATE 必须换算；TOLERANCE 必须换公式', () => {
  assert.strictEqual(rCapRoute(RCAP_KIND.COUNT, 'count').usable, true);
  assert.strictEqual(rCapRoute(RCAP_KIND.RATE, 'count').route, 'need_denominator');
  assert.strictEqual(rCapRoute(RCAP_KIND.TOLERANCE, 'count').route, 'switch_formula');
  // 反证：把 TOLERANCE 当 direct 用 ⇒ 这条断言会红
  assert.notStrictEqual(rCapRoute(RCAP_KIND.TOLERANCE, 'count').route, 'direct');
});

test('⑥ SCALE 与 NO_NUM 都不可作数值阈值（以形代实的两个入口）', () => {
  assert.strictEqual(rCapRoute(RCAP_KIND.SCALE, 'count').route, 'order_only');
  assert.strictEqual(rCapRoute(RCAP_KIND.NO_NUM, 'count').route, 'no_numeric_trigger');
  assert.strictEqual(rCapRoute(RCAP_KIND.SCALE, 'count').usable, false);
  assert.strictEqual(rCapRoute(RCAP_KIND.NO_NUM, 'count').usable, false);
});

test('⑦ 路由读的是量纲，不是域名 —— 换名字仍判得出', () => {
  // 自检两问之一：能否判一个从未在名单里出现过的实例？
  const unknownKind = rCapRoute('some_kind_never_seen', 'count');
  assert.strictEqual(unknownKind.route, 'unknown_kind', '未知量纲必须 review，不许猜成可算');
  // 同一 kind 换任何域名，路由不变
  const t = rCapRoute(RCAP_KIND.TOLERANCE, 'count');
  assert.strictEqual(t.route, 'switch_formula');
  assert.strictEqual(rCapRoute(RCAP_KIND.TOLERANCE, 'seconds').route, 'switch_formula');
});

// ═══════════════════════════════════════════════════════════════════
// ③ 换算 R₀ = p_max × N_opp，含退化守卫
// ═══════════════════════════════════════════════════════════════════
test('⑧ 换算式正确：航空 DAL A × 1e6 飞行小时 ⇒ R₀ = 1e-3 次', () => {
  const r = expandThreshold(rCapOf('aviation.dal_a'), 1e6);
  assert.strictEqual(r.ok, true);
  assert.ok(Math.abs(r.r0 - 1e-3) < 1e-12, `期望 1e-3，实为 ${r.r0}`);
  assert.strictEqual(r.unit, 'events');
});

test('⑨ 反证：缺分母 ⇒ 拒绝换算，且理由必须是 missing denominator 而非 missing constant', () => {
  const r = expandThreshold(rCapOf('aviation.dal_a'), null);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'no_denominator');
  // 🔴 关键：措辞必须指向「分母」，不是「域常数」——上一轮就错在这儿
  assert.ok(/N_opp/.test(r.detail) && /不是域常数/.test(r.detail), `理由写错了：${r.detail}`);
});

test('⑩ 退化守卫：N_opp === ΣS 必须被识别（否则 ΣS > p×ΣS 恒真）', () => {
  assert.strictEqual(isDegenerateDenominator(4, 4), true);
  assert.strictEqual(isDegenerateDenominator(4, 5), false);
  assert.strictEqual(isDegenerateDenominator(null, 5), false);
});

test('⑪ 反证：把 ΣS 当 N_opp 接进 engine ⇒ rNaught 仍必须 PENDING', () => {
  const eng = fakeEngine({ domainKey: 'aviation.dal_a', nOpp: 4 }); // 4 笔账 ⇒ ΣS = 4
  const s = dataSurface(eng);
  assert.strictEqual(s.thickness, 4);
  const r = compute('rNaught', s);
  assert.strictEqual(r.status, QSTAT.PENDING, '退化分母竟算出了阈值 ⇒ 判据会恒真');
  assert.ok(/同义反复/.test(r.evidence));
});

// ═══════════════════════════════════════════════════════════════════
// ④ R 层三格状态必须不同档（本轮最核心的一条）
// ═══════════════════════════════════════════════════════════════════
test('⑫ R₀ 三格分离：p_max=OK ／ N_opp=ABSENT ／ R₀=PENDING', () => {
  const s = dataSurface(fakeEngine());
  assert.strictEqual(compute('rCapPMax', s).status, QSTAT.OK, '域常数应已可算（已取证）');
  assert.strictEqual(compute('nOpportunities', s).status, QSTAT.ABSENT, '分母应判为真缺口');
  assert.strictEqual(compute('rNaught', s).status, QSTAT.PENDING, 'R₀ 应因缺分母而 PENDING');
  // 🔴 反证：三格不许并成一档 —— 合并就会把「缺分母」写成「缺常数」
  const st = new Set([
    compute('rCapPMax', s).status,
    compute('nOpportunities', s).status,
    compute('rNaught', s).status,
  ]);
  assert.strictEqual(st.size, 3, '三格状态并档了 ⇒ 又回到上一轮的错');
});

test('⑬ 正向半：补上 N_opp 后 R₀ 必须真的算出来（不是永远 pending）', () => {
  const eng = fakeEngine({ domainKey: 'aviation.dal_a', nOpp: 1e6 });
  const r = compute('rNaught', dataSurface(eng));
  assert.strictEqual(r.status, QSTAT.OK, `补了分母仍算不出：${r.evidence}`);
  assert.ok(Math.abs(r.value - 1e-3) < 1e-12);
});

test('⑭ 医疗域必须走「换公式」而不是「直接比」', () => {
  const s = dataSurface(fakeEngine({ domainKey: 'medical.infusion_flow_error', nOpp: 1000 }));
  const route = compute('rCapRoute', s);
  assert.strictEqual(route.status, QSTAT.OK);
  assert.strictEqual(route.value.route, 'switch_formula', '医疗给的是 ±5% 容差，不能拿事件数去比');
  // 且此时 R₀ 不该被「算出来」——TOLERANCE 类没有次数阈值
  const r0 = compute('rNaught', s);
  assert.strictEqual(r0.status, QSTAT.PENDING);
  assert.strictEqual(r0.evidence.includes('not_rate'), true);
});

test('⑮ 未指定域 ⇒ 不冒充任何域的常数', () => {
  const s = dataSurface({ historyTrail: [], sBySubsystem: { a: 1 }, sAccount: { rStore: [] } });
  assert.strictEqual(s.domainKey, 'unspecified');
  const p = compute('rCapPMax', s);
  assert.strictEqual(p.status, QSTAT.PENDING, '未指定域却给出了域常数 ⇒ 拍数');
  assert.ok(/未指定域|no_num|没有数/.test(p.evidence) || p.value === null);
});

// ═══════════════════════════════════════════════════════════════════
// ⑤ 账上可核：每条域常数都必须指得出标准
// ═══════════════════════════════════════════════════════════════════
test('⑯ 每条有数值的域常数都带标准号（不许拍数）', () => {
  for (const [k, e] of Object.entries(R_CAPACITY)) {
    if (e.value === null || e.value === undefined) continue;
    assert.ok(e.source && e.source.length > 8, `${k} 有值但无出处 ⇒ 拍数`);
    assert.ok(Object.values(RCAP_EVIDENCE).includes(e.verified), `${k} 取证等级非法：${e.verified}`);
  }
});

test('⑰ 二手来源必须显式标 secondary（不许装一手）', () => {
  const secondary = Object.entries(R_CAPACITY).filter(([, e]) => e.verified === RCAP_EVIDENCE.SECONDARY);
  assert.ok(secondary.length >= 5, `二手来源应被诚实标出，实为 ${secondary.length} 条`);
  for (const [k, e] of secondary) {
    assert.ok(e.source.length > 8, `${k} 标了 secondary 却没写出处`);
  }
});

test('⑱ strataReadout 把域表体检一起吐出来（可核，不藏在代码里）', () => {
  const r = strataReadout(fakeEngine({ domainKey: 'aviation.dal_a' }));
  assert.ok(r.rcap, '缺 rcap 体检面');
  assert.strictEqual(r.rcap.verdict, 'pass');
  assert.strictEqual(r.domain.key, 'aviation.dal_a');
  assert.ok(r.domain.pMax && r.domain.pMax.value === 1e-9);
});

test('⑲ STRATA 里 R 层必须含三格 rCapPMax / nOpportunities / rNaught / rCapRoute', () => {
  const R = STRATA.find((s) => s.layer === 'R');
  const keys = R.quantities.map((q) => q.key);
  for (const k of ['rCapPMax', 'nOpportunities', 'rNaught', 'rCapRoute']) {
    assert.ok(keys.includes(k), `R 层缺 ${k}`);
  }
});

// ═══════════════════════════════════════════════════════════════════
// ⑥ 「状态变了、注解还是旧的」—— 本轮实跑当场抓到的一格
// ═══════════════════════════════════════════════════════════════════
test('⑳ 分母接上后，注解不许还写着「真缺口」（半真＝核得出真、零告警，最难抓）', () => {
  const without = strataReadout(fakeEngine()).layers.find((l) => l.layer === 'R');
  const withOpp = strataReadout(fakeEngine({ nOpp: 1e6 })).layers.find((l) => l.layer === 'R');
  const pick = (L) => L.quantities.find((q) => q.key === 'nOpportunities');

  assert.strictEqual(pick(without).status, QSTAT.ABSENT);
  assert.ok(/无 nOpportunities|真缺口/.test(pick(without).evidence), '缺分母时须明说是缺口');

  const w = pick(withOpp);
  assert.strictEqual(w.status, QSTAT.OK);
  // 🔴 反证：若 OK 分支没带自己的 evidence，展开后会残留静态定义的「真缺口」文案
  assert.ok(!/无 nOpportunities|真缺口/.test(w.evidence), `状态已 OK 但注解仍是旧的：${w.evidence}`);
  assert.ok(/口径/.test(w.evidence), '接上分母后必须提醒声明口径');
});

test('㉑ 实跑四条场景的状态矩阵（防「只测一条路」）', () => {
  const R = (eng) => {
    const L = strataReadout(eng).layers.find((l) => l.layer === 'R');
    return Object.fromEntries(L.quantities.map((q) => [q.key, q.status]));
  };
  // 无域无分母
  assert.strictEqual(R(fakeEngine({ domainKey: 'unspecified' })).rNaught, QSTAT.PENDING);
  // 航空有分母 ⇒ R₀ 真算出来
  assert.strictEqual(R(fakeEngine({ domainKey: 'aviation.dal_a', nOpp: 1e6 })).rNaught, QSTAT.OK);
  // 医疗有分母 ⇒ 仍 PENDING（量纲不对，不是缺数）
  assert.strictEqual(R(fakeEngine({ domainKey: 'medical.infusion_flow_error', nOpp: 1e3 })).rNaught, QSTAT.PENDING);
  // 退化分母 ⇒ 仍 PENDING（守卫拦）
  assert.strictEqual(R(fakeEngine({ domainKey: 'aviation.dal_a', nOpp: 4 })).rNaught, QSTAT.PENDING);
});
