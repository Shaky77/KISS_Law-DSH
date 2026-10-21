// R₀ 域容量表（rCapacity）· 只读常量 + 纯函数，不接判决路径
// ════════════════════════════════════════════════════════════════════
// 来由（安 2026-10-20）：「R₀ 怎么会一个数都没有呢？所有每个领域标准，
// 在你的内部大数据中不是网络中自带的么？」
//
// 🔴 这一问把上一轮的错揭穿了：上一轮 strata.mjs 把 R₀ 挂成
//   `status: PENDING` ＋ `evidence: 'TBD@R_DOMAIN.hierarchy[level].capacity'`。
//   两处都错：
//     ① `R_DOMAIN.hierarchy[level].capacity` 这个字段**根本不存在**
//        （hierarchy 只有 level/name/contains/note）⇒ 引用了一个假字段；
//     ② 把「我没去查」写成「查不到」⇒ 与 10-19 被纠过的「把『我不知道』
//        写成『不可参数化』」是同一个病。
//
//   实测（2026-10-20 取证）：域常数全都有，而且有标准号、有数值、有单位。
//   ⇒ 真正的缺口不是「没有域常数」，是下面这个：
//
// ────────────────────────────────────────────────────────────────────
// 🔴 核心发现：R₀ 不是「一个数」，是「一个数 ÷ 一个分母」。
//
//   框架原文：扩容 ⟺ (ΣS > R₀)。ΣS 在引擎里单位＝**离散事件数**。
//   而真实域标准给的几乎**没有一个是事件次数**：
//     · 航空/汽车给的是**单位时间概率率**（1E-9 / 飞行小时）
//     · 医疗给的是**物理量容差**（±5% 流量误差）
//     · 功能安全给的是**比例下限**（SPFM ≥ 99%）
//     · 过程标准给的是**有序等级**（DAL A–E、ASIL A–D、Class A–C）
//
//   于是「ΣS > R₀」要成立，必须先把 p（率）换成次数：
//       R₀ = p_max × N_opp      （N_opp ＝ 该域的总"运行机会数"）
//   物理含义：
//       ΣS / N_opp = 实测失效率      越线 ⟺ ΣS / N_opp > p_max
//   这不是拍数，是量纲还原 —— **域常数（p_max）我一直有，缺的是分母 N_opp。**
//
//   ⚠️ 陷阱（已避）：不能令 N_opp = ΣS。那样 R₀ = p×ΣS，
//      判据退化成 `ΣS > p×ΣS`，p<1 恒真 ⇒ 同义反复。N_opp 必须是
//      **总运行机会数**（飞行小时数／总输注次数／总交易笔数），
//      与「偏离事件数」是两个量，不可互相顶替（见 SUBSTITUTION_BAN）。
// ────────────────────────────────────────────────────────────────────
//
// 🔴 第二个结构结论：**域不同 ⇒ 公式不同，不是阈值不同。**
//   RATE 类   → ΣS > p × N_opp        （次数口径，可还原）
//   TOLERANCE → |S_dev| > tol          （偏离量口径，ΣS 计数不可用）
//   RATIO     → 覆盖率 ≥ 下限          （比例口径，不参与累积比较）
//   SCALE     → 只可排序，不可作阈值   （有序无量）
//   NO_NUM    → 标准合法地不给数 ⇒ 该域本就不该由数值触发扩容
//   ⇒ 路由由「标准给的量纲」定，不由「域的名字」定。
//     新域进来只要判它给的是哪类量，就知道能不能接 —— **不必查表命中名字。**
//     （自检：这不是枚举。表里的条目是例示，判据是 kind 六分。）
//
// ⚠️ 不得使用 node 内置模块（docs/engine 镜像给浏览器加载）。
// ════════════════════════════════════════════════════════════════════

/**
 * 域标准给出的「量的种类」。**判接入方式就看这个，不看域名。**
 * 六类之外没有第七类：任何一个域标准给的量，必然落在这六种里。
 */
export const RCAP_KIND = {
  COUNT: 'count',           // 离散事件次数 —— 与 ΣS 同量纲，可直接比
  RATE: 'rate',             // 单位时间概率率 —— 须乘 N_opp 才成次数
  TOLERANCE: 'tolerance',   // 物理量容差 —— ΣS 须改记「偏离量」才可比
  RATIO: 'ratio',           // 比例下限（覆盖率）—— 不参与累积比较
  SCALE: 'scale',           // 有序无量等级 —— 只可排序，不可作阈值
  NO_NUM: 'no_num',         // 标准明示不给数 —— 合法地没有数
};

// ════════════════════════════════════════════════════════════════════
// 🔴 补正（2026-10-20 11:28 · 安指出「每个变量内部都有嵌套结构」）
//
//   本节之前，下面这张表是**平的**：`aviation.dal_a` / `medical.infusion_flow_error`
//   并排放在同一层，然后问「R₀ 是哪个数」。
//   ⇒ **摊平之后宏观与微观就看不见了** —— 行业定域（宏观）和某条条款的 ±5%（微观）
//     被当成同一层的两个候选。
//
//   补正形态：域表升为**两级**
//     宏观 = 域族（行业法规体系）：决定「这属不属于这个域」
//     微观 = 具体条款（§某条 ±某值）：决定「这个域的具体容差是多少」
//   微观条目必须能回指一个族；**回指不到 ⇒ 非法**（见 rCapAudit 的 family 检查）。
//
//   与 law.mjs 的关系：R_DOMAIN.hierarchy（宇宙⊃地球⊃宏观⊃微观）给的是**规则的包含层级**；
//   本处的 macro/micro 是**同一层级内部的粒度**（域族 vs 条款），二者正交，不可混称。
// ════════════════════════════════════════════════════════════════════

/** 域族（宏观层）：一个族 = 一套法规体系 + 该体系下的具体条款条目。 */
export const R_DOMAIN_FAMILIES = {
  aviation: {
    key: 'aviation',
    macro: '航空运输类飞机系统安全（FAA/EASA 适航体系，14 CFR / CS 25.1309 + DO-178C/DO-254）',
    microNote: '微观条目＝按失效条件严酷度分的 DAL 等级及其概率目标',
    members: ['aviation.dal_a', 'aviation.dal_b', 'aviation.dal_c', 'aviation.dal_d', 'aviation.dal_e'],
    binds: 'DAL 由系统层安全评估（ARP4754B/ARP4761A）指派，**软件项自身不承担概率**（DO-178C 原文口径）。',
  },
  automotive: {
    key: 'automotive',
    macro: '道路车辆功能安全（ISO 26262 体系）',
    microNote: '微观条目＝ASIL 等级对应的量化度量（PMHF / SPFM / LFM）',
    members: ['automotive.asil_d_pmhf', 'automotive.asil_d_spfm', 'automotive.asil_d_lfm'],
    binds: 'ASIL 由 HARA（严重度×暴露率×可控性）定级，**先定级再取度量**，不可反过来。',
  },
  medical: {
    key: 'medical',
    macro: '医疗行业定域（NMPA / EU MDR / FDA 法规体系 ＋ IEC/ISO 标准族）',
    microNote: '微观条目＝具体标准的具体条款值（如 IEC 60601-2-24 流量精度 ±5%）',
    members: ['medical.infusion_flow_error', 'medical.infusion_air_bubble', 'medical.infusion_occlusion', 'medical.alarm_response_delay', 'medical.iec62304_class'],
    binds: '🔴 医疗族给的是**物理量容差**（连续量），不是失效率 ⇒ 该族整体走 |S_dev| > tol，不走 ΣS > R₀。安指的蓝海着力点正在此。',
  },
  unspecified: {
    key: 'unspecified',
    macro: '未指定域',
    microNote: '无成员',
    members: ['unspecified'],
    binds: '无适用标准 ⇒ 不得借用任何族的常数（借了就是拍数）。',
  },
};

/** 给一条域表 key，回指它的族。**回指不到返回 null ⇒ 由 audit 判非法。** */
export function familyOf(domainKey) {
  for (const f of Object.values(R_DOMAIN_FAMILIES)) {
    if (f.members.includes(domainKey)) return f;
  }
  return null;
}

/** 族的宏观形态（行业定域）。 */
export function familyMacro(domainKey) {
  const f = familyOf(domainKey);
  return f ? f.macro : null;
}

/**
 * 取证等级。**二手来源必须标 secondary，不许装一手。**
 *   primary   : 标准正文／监管原文可核
 *   secondary : 检测机构、认证报道、百科等转引（数值可核，条款定位待核）
 */
export const RCAP_EVIDENCE = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
};


// ════════════════════════════════════════════════════════════════════
// 域容量表（例示，非穷举）
//
// 每条必须四全：value ∧ unit ∧ source ∧ kind。
// 🔴 缺任一项 ⇒ 该条**非法**（不是 PENDING，是非法）—— 由 rCapAudit() 判。
// 🔴 NO_NUM 类允许 value=null，但必须写明 source 且 kind 正确，
//    这是「合法地没有数」，与「没查」在账上必须能分开。
// ════════════════════════════════════════════════════════════════════
export const R_CAPACITY = {
  // ── 航空（运输类飞机系统安全评估）─────────────────────────────────
  'aviation.dal_a': {
    kind: RCAP_KIND.RATE,
    value: 1e-9, unit: 'per_flight_hour',
    source: '14 CFR / CS 25.1309(b) + AMC 25.1309（AC 20-115D 认可 RTCA DO-178C DAL A）',
    verified: RCAP_EVIDENCE.SECONDARY,
    note: 'Catastrophic「extremely improbable」。⚠️ 概率属**系统层**，不属于软件项——DO-254/DO-178C 原文口径：software has no failure rate；故 p_max 只能挂系统失效条件，不能挂某个软件模块。',
  },
  'aviation.dal_b': {
    kind: RCAP_KIND.RATE, value: 1e-7, unit: 'per_flight_hour',
    source: 'AMC 25.1309（Hazardous「extremely remote」）', verified: RCAP_EVIDENCE.SECONDARY,
    note: 'Hazardous。',
  },
  'aviation.dal_c': {
    kind: RCAP_KIND.RATE, value: 1e-5, unit: 'per_flight_hour',
    source: 'AMC 25.1309（Major「remote」）', verified: RCAP_EVIDENCE.SECONDARY,
    note: 'Major。',
  },
  'aviation.dal_d': {
    kind: RCAP_KIND.NO_NUM, value: null, unit: null,
    source: 'DO-178C DAL D（Minor：无定量失效概率要求，只须证明影响为轻微）', verified: RCAP_EVIDENCE.SECONDARY,
    note: '🔴 这是「合法地没有数」的样板：标准明确不给。⇒ 该域不可由数值触发扩容，须走排序/定性通道。**不可记成 PENDING**。',
  },
  'aviation.dal_e': {
    kind: RCAP_KIND.NO_NUM, value: null, unit: null,
    source: 'DO-178C DAL E（No Safety Effect，无目标）', verified: RCAP_EVIDENCE.SECONDARY,
    note: '无安全影响 ⇒ 不设阈值。',
  },

  // ── 汽车（功能安全）──────────────────────────────────────────────
  'automotive.asil_d_pmhf': {
    kind: RCAP_KIND.RATE, value: 1e-8, unit: 'per_hour',
    source: 'ISO 26262-5 ASIL D 随机硬件失效概率度量（PMHF < 10⁻⁸/h）', verified: RCAP_EVIDENCE.SECONDARY,
    note: 'ASIL D ＝最高等级。',
  },
  'automotive.asil_d_spfm': {
    kind: RCAP_KIND.RATIO, value: 0.99, unit: 'ratio_min',
    source: 'ISO 26262-5 ASIL D 单点故障度量 SPFM ≥ 99%', verified: RCAP_EVIDENCE.SECONDARY,
    note: '覆盖率类：判「达标/未达标」，不参与 ΣS 累积比较。',
  },
  'automotive.asil_d_lfm': {
    kind: RCAP_KIND.RATIO, value: 0.90, unit: 'ratio_min',
    source: 'ISO 26262-5 ASIL D 潜伏故障度量 LFM ≥ 90%', verified: RCAP_EVIDENCE.SECONDARY,
    note: '同上。',
  },

  // ── 医疗（蓝海：失败代价不可逆 ＋ 标准严 ＋ 未被商品化）────────────
  'medical.infusion_flow_error': {
    kind: RCAP_KIND.TOLERANCE, value: 0.05, unit: 'relative_error',
    source: 'IEC 60601-2-24:2012 输液泵流量精度（全量程平均流量误差 ≤ ±5%）', verified: RCAP_EVIDENCE.SECONDARY,
    note: '🔴 连续物理量容差 ⇒ 走 |S_dev| > tol，**不走 ΣS > R₀**（次数口径在这里无意义）。',
  },
  'medical.infusion_air_bubble': {
    kind: RCAP_KIND.TOLERANCE, value: 50, unit: 'uL',
    source: 'IEC 60601-2-24:2012 气泡检测灵敏度（须识别 ≥50μl）', verified: RCAP_EVIDENCE.SECONDARY,
    note: '⚠️ 二手转引，条款号待核。',
  },
  'medical.infusion_occlusion': {
    kind: RCAP_KIND.TOLERANCE, value: 300, unit: 'mmHg',
    source: 'IEC 60601-2-24:2012 阻塞压力报警（约 300mmHg 触发）', verified: RCAP_EVIDENCE.SECONDARY,
    note: '⚠️ 二手转引，且为**约值**（随管路/流速档位变）⇒ 不可当单一硬阈值。',
  },
  'medical.alarm_response_delay': {
    kind: RCAP_KIND.TOLERANCE, value: 10, unit: 's',
    source: 'IEC 60601-1-8 医用电气设备报警系统（响应时间上限）', verified: RCAP_EVIDENCE.SECONDARY,
    note: '⚠️ 二手转引，条款号待核。',
  },
  'medical.iec62304_class': {
    kind: RCAP_KIND.SCALE, value: null, unit: null,
    source: 'IEC 62304:2006+A1:2015 软件安全分级 Class A/B/C（A 无伤害 / B 非严重 / C 死亡或严重伤害）',
    verified: RCAP_EVIDENCE.SECONDARY,
    note: '🔴 **过程等级，不是阈值**。有序但无数值 ⇒ 只能用来排序与选档，绝不能当 R₀ 代入比较。把它当数值是最常见的以形代实。',
  },

  // ── 缺省（未指定域）────────────────────────────────────────────
  'unspecified': {
    kind: RCAP_KIND.NO_NUM, value: null, unit: null,
    source: '未指定域 ⇒ 无适用标准', verified: RCAP_EVIDENCE.PRIMARY,
    note: '🔴 这是**真的没有**（域未定），与 aviation.dal_d 的「标准合法地不给数」必须分开：前者可补，后者补不出来。⇒ 二者都不可用，但 evidence 写法不同。',
  },
};

// ════════════════════════════════════════════════════════════════════
// 接入路由：给定 kind 与 ΣS 的口径，判「这个域常数能不能直接比」
//
// 返回：
//   usable : 能否**原样**代入 ΣS > R₀
//   route  : 该怎么算（原式 / 换算 / 换公式 / 只排序 / 不触发）
//   why    : 一句话说清为什么（可被审）
// ════════════════════════════════════════════════════════════════════
export function rCapRoute(kind, sUnit = 'count') {
  switch (kind) {
    case RCAP_KIND.COUNT:
      return sUnit === 'count'
        ? { usable: true, route: 'direct', why: '同量纲（离散事件数）⇒ 原样可比。' }
        : { usable: false, route: 'unit_mismatch', why: `R₀ 是事件数而 ΣS 记的是 ${sUnit} ⇒ 跨单位比较＝命题类型错。` };

    case RCAP_KIND.RATE:
      return {
        usable: false, route: 'need_denominator',
        why: '域标准给的是**率**（单位时间概率）⇒ 须换算 R₀ = p_max × N_opp。缺 N_opp 就判不了，**但缺的是分母、不是域常数**。',
      };

    case RCAP_KIND.TOLERANCE:
      return {
        usable: false, route: 'switch_formula',
        why: '域标准给的是**物理量容差** ⇒ 应走 |S_dev| > tol（偏离量口径）。用事件计数 ΣS 去比，量的根本不是同一件事。',
      };

    case RCAP_KIND.RATIO:
      return { usable: false, route: 'coverage_only', why: '比例下限判的是**覆盖率达标**，不是累积越线 ⇒ 不参与 ΣS > R₀。' };

    case RCAP_KIND.SCALE:
      return { usable: false, route: 'order_only', why: '有序无量等级 ⇒ 只能排序／选档；**当数值用＝以形代实**。' };

    case RCAP_KIND.NO_NUM:
      return { usable: false, route: 'no_numeric_trigger', why: '标准合法地不给数（或域未指定）⇒ 该域本就不该由数值触发扩容；须走定性／排序通道。' };

    default:
      return { usable: false, route: 'unknown_kind', why: `未知量纲类别 ${kind} ⇒ 判不出，须 review（不猜）。` };
  }
}

// ════════════════════════════════════════════════════════════════════
// 换算：R₀ = p_max × N_opp（仅 RATE 类）
//
// 🔴 前置校验（少了它就会算出同义反复）：
//   N_opp 必须**独立于** ΣS。若调用方拿 ΣS 当 N_opp，
//   R₀ = p×ΣS ⇒ `ΣS > p×ΣS` 对任意 p<1 恒真 ⇒ 判据失效。
//   故此处显式拒绝 nOpp === sSum。
// ════════════════════════════════════════════════════════════════════
export function expandThreshold(entry, nOpp) {
  if (!entry || entry.kind !== RCAP_KIND.RATE) {
    return { ok: false, reason: 'not_rate', detail: '只有 RATE 类可换算出次数阈值。' };
  }
  if (typeof nOpp !== 'number' || !isFinite(nOpp) || nOpp <= 0) {
    return { ok: false, reason: 'no_denominator', detail: '缺 N_opp（总运行机会数）⇒ R₀ 算不出来。这**不是域常数缺失**，是分母缺失。' };
  }
  return {
    ok: true,
    r0: entry.value * nOpp,
    unit: 'events',
    detail: `R₀ = ${entry.value} ${entry.unit} × ${nOpp} ⇒ ${entry.value * nOpp} 次（容许上限）`,
  };
}

/**
 * 同义反复守卫：把 N_opp 与 ΣS 分开的唯一机械办法。
 * 调用方若传入同一个数，这里返回 false。
 */
export function isDegenerateDenominator(nOpp, sSum) {
  return typeof nOpp === 'number' && typeof sSum === 'number' && nOpp === sSum;
}

// ════════════════════════════════════════════════════════════════════
// 表体检：四全校验（value ∧ unit ∧ source ∧ kind）
//
// 🔴 这是本模块最重要的一条：**它让「没查」与「标准不给」在账上分得开。**
//   · 四全 && kind=NO_NUM && source 写着某标准 ⇒ 合法地没有数（记 no_num_legal）
//   · 缺 source / 缺 kind / 缺 unit（且非 NO_NUM）⇒ **非法条目**（记 malformed）
//   ⇒ 只有 malformed 才是我的错；no_num_legal 是域的性质，不是我的债。
// ════════════════════════════════════════════════════════════════════
export function rCapAudit(table = R_CAPACITY) {
  const rows = [];
  for (const [key, e] of Object.entries(table)) {
    const hasValue = e.value !== null && e.value !== undefined;
    const needsUnit = e.kind === RCAP_KIND.RATE || e.kind === RCAP_KIND.TOLERANCE || e.kind === RCAP_KIND.RATIO || e.kind === RCAP_KIND.COUNT;
    const missing = [];
    if (!e.kind) missing.push('kind');
    if (!e.source) missing.push('source');
    if (hasValue && !e.unit) missing.push('unit');
    if (needsUnit && !hasValue) missing.push('value');
    if (!hasValue && e.kind === RCAP_KIND.NO_NUM && !e.source) missing.push('source(NO_NUM 也须写清是哪个标准不给)');
    // 🔴 嵌套检查：微观条款必须能回指宏观族。回指不到 ⇒ 这条是「孤儿条款」，
    //    它让「行业定域」这一步被跳过 —— 正是上一轮把表摊平后留下的病灶。
    const fam = familyOf(key);
    if (!fam) missing.push('family(回指不到域族 ⇒ 宏观定域被跳过)');

    rows.push({
      key, kind: e.kind ?? null, value: e.value ?? null, unit: e.unit ?? null,
      source: e.source ?? null, verified: e.verified ?? null,
      family: fam ? fam.key : null,
      status: missing.length ? 'malformed' : (e.kind === RCAP_KIND.NO_NUM ? 'no_num_legal' : 'ok'),
      missing,
    });
  }
  const count = (s) => rows.filter((r) => r.status === s).length;
  return {
    rows,
    count: { ok: count('ok'), no_num_legal: count('no_num_legal'), malformed: count('malformed'), total: rows.length },
    verdict: count('malformed') === 0 ? 'pass' : 'fail',
  };
}

export function rCapOf(domainKey) {
  return R_CAPACITY[domainKey] ?? null;
}
