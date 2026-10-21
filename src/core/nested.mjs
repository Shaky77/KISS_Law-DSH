// 四层嵌套（nested）· 每个变量内部的宏观／微观展开 ＋ M 公式的定性方向
// ════════════════════════════════════════════════════════════════════
// 来由（安 2026-10-20 11:28）：
//   「你一定是忘了公式最初就定义的，每个变量内部都有嵌套结构存在的。
//     也就是宏观与微观的关系。比如：R（医疗行业定域），
//     S（遵守 R 定下的医疗行业这个域的标准，找出已定的标准规范），
//     D（需要处理的事项，临床试验？药品研发？等等），
//     H（主观能动性不变，主要有第一视角决定，是 AI？还是人类自己？）
//     套回公式 M = (R×S) ÷ (D×H)」
//
// 🔴 这一问揭穿的是**结构性压平**，不是漏了个字段：
//   上一轮 rCapacity.mjs 把 R 摊成一张 14 条平表（aviation.dal_a / medical.xxx …），
//   然后问「R₀ 是哪个数」。**摊平之后就再也看不见宏观／微观了** ——
//   医疗行业定域（宏观）和某条条款的 ±5%（微观）被放在同一行比较。
//
//   而 law.mjs 早就写着 FRACTAL_PROPERTY：
//     'Fractal = spiral of lateral recursion (child-chain lateral recursion under same R)
//      + vertical transition (S feeds back into R).'
//   ⚠️ 查证结果（不是印象）：engine.mjs 只用了**横向递归**那一半
//      （:323 / :365 跨调用敏感源组合），**「每个变量内部的嵌套」这一半从未落码**。
//      ⇒ 本条不是新增理论，是**把早就写着的东西接上**。
//
// ────────────────────────────────────────────────────────────────────
// 🔴 公式原文（`CORE_FORMULA`，源：.backup 镜像 law.mjs:237-248，作者 2026-08-18 裁定纳入）
//
//     expression : M = (R × S) / (D × H)
//     numerator  : R × S — source of steady state（刚性锚 × 稳态储备）
//     denominator: D × H — resistance factors（扰动 × 杠杆距离）
//     direction  : H 越小 → 杠杆臂越长 → M 越大；H 越大 → 杠杆臂越短 → M 越小
//     constraint : 0 < H / (S ↔ D) < R
//     note       : **定性方向关系，不赋值，不做具体数值计算**
//
//   ⇒ 🔴 硬边界：本模块**只输出方向**（up / down / indeterminate），
//     **绝不输出 M 的数值**。上一轮那些 1e-9、±5% 是域标准给的客观常数，
//     不是「给公式赋值」—— 两件事不同，但也不能借此把 M 算成一个数。
// ────────────────────────────────────────────────────────────────────
//
// 🔴 嵌套的终止判据（本轮推出来的，标 `X推`）：
//   **展开到「H 能被唯一第一人称认领」为止。**
//   理由：R/S/D 都可以无限往下切（更细的条款、更细的事件），
//   但 H 的定义在每一层不变（仍是主观能动性），变的只是「谁」。
//   ⇒ H 是嵌套的锚：其他三层切到哪停，由「这一刀有没有具体的签字人」定。
//   安的原话「H（主观能动性不变，主要有第一视角决定）」正是这个意思。
//
// ⚠️ 不得使用 node 内置模块（docs/engine 镜像给浏览器加载）。
// ════════════════════════════════════════════════════════════════════

/** 两个粒度。**只有两个**：再细仍是微观，再粗仍是宏观。 */
export const NEST = {
  MACRO: 'macro',
  MICRO: 'micro',
};

// ════════════════════════════════════════════════════════════════════
// 四层各自的嵌套形态
//
// 每层必须给全五件：
//   essence  该变量的本体（不随粒度变）
//   macro    宏观形态：这个变量在「域族」粒度上是什么
//   micro    微观形态：这个变量在「具体条款/事件」粒度上是什么
//   binds    宏观与微观的服从关系（低层服从高层，见 R_DOMAIN.invariant）
//   stopAt   该层展开到哪停（终止判据）
//   medical  医疗域实例（安给的例子，落成可核的具体项）
// ════════════════════════════════════════════════════════════════════
export const NESTED_VARS = {
  R: {
    key: 'R',
    name: '域常数',
    essence: '域 = 客观规则的作用范围（由锚点定出）；R 本体是客观规则，不是那张层级表。',
    macro: '域族：哪个行业的哪一套规则体系（医疗 / 航空 / 汽车…）',
    micro: '具体条款：某标准某条的具体要求与数值（可被引用、可被第三方核）',
    binds: '微观条款不得宽于宏观法规；冲突时**上行**（低层服从高层，R_DOMAIN.invariant）。',
    stopAt: '展开到能指出「哪一条」为止（有标准号 ＋ 条款号，不是"行业惯例"）。',
    medical: {
      macro: '医疗行业定域：NMPA / EU MDR / FDA 法规体系（决定"这属不属于医疗域"）',
      micro: 'IEC 60601-2-24:2012 流量精度 ±5% ／ IEC 62304 软件分级 Class A/B/C',
    },
  },

  S: {
    key: 'S',
    name: '稳态储备',
    essence: '已有稳态容量基线。**在具体域里，它的形态就是"已经定下来的标准规范"** —— 这就是安说的「找出已定的标准规范」。',
    macro: '该域已定的标准规范全集（IEC/ISO/GB 族：哪些标准适用于这一类产品）',
    micro: '本项目**实际遵循并被验证过**的那几条（不是"能引的都引上"）',
    binds: '微观只能取宏观的子集，**不许自造**宏观里没有的规范；缺项须报 gap，不许静默补。',
    stopAt: '展开到「本项目的验证证据指向哪一版」为止（版本号必须落定，否则同一标准两版会一桶两义）。',
    medical: {
      macro: '医疗器械适用标准族：IEC 60601 系列（电气安全）／IEC 62304（软件）／ISO 14971（风险管理）／ISO 13485（体系）',
      micro: '本项目实际做过的：如 IEC 60601-2-24 型式试验报告 ＋ IEC 62304 Class B 的 SDLC 文档集',
    },
  },

  D: {
    key: 'D',
    name: '扰动',
    essence: '进入基线的扰动（客观来的，不由 H 选）。在实务里它的形态是「需要处理的事项」。',
    macro: '一类活动的整体：临床试验（期别／品类）／药品研发（阶段）／上市后监测',
    micro: '一个具体事件：某受试者某次给药、某批次某次检验、某例不良事件',
    binds: '微观事件的**计数口径**必须回指宏观活动的定义（否则 ΣS 与 N_opp 量的不是同一件事）。',
    stopAt: '展开到「有唯一时间、唯一对象、唯一动作」为止（三者缺一即还没到位）。',
    medical: {
      macro: '临床试验（如 III 期、某适应症）／药品研发（如工艺验证阶段）',
      micro: '受试者 #0237 在第 4 次随访时的一次超量输注事件',
    },
  },

  H: {
    key: 'H',
    name: '主观能动性',
    essence: '作选择并承担后果。🔴 **在每一层定义都不变**；变的只是「谁」。',
    macro: '谁对这个系统负责：机构 / 申办方 / PI / 伦理委员会（能承担后果的那一方）',
    micro: '这一次判定由谁签字：**AI 还是人类**（安的原话：主要有第一视角决定）',
    binds: '🔴 微观 H 的授权来自宏观 H；**AI 不得在无人类授权处充当宏观 H**（否则责任落不到具体人）。',
    stopAt: '展开到「这条判决错了，谁的名字签在上面」能答出具体一方为止。答不出 ⇒ 该层无 H 位。',
    invariance: '✅ H 是四层里唯一「本体不随粒度变」的变量 —— 这正是它可以当嵌套终止锚的原因。',
    // 🔴 [2026-10-20 · 安裁定补入] **↔ 属于 H 的内部嵌套结构**：
    //   H 不是「一个点」，它内部自带一条滑轨 —— 两端是 S（S_min 端）与 D（D_max 端），
    //   H 本体是轨上的滑块。依据 law.mjs:60 原文「H 是 S 与 D 之间的动态滑块」。
    //   ⇒ 所以外层也有 S、D，内层也有 S、D：**同名不同层，不可互代**（嵌套的又一次显形）。
    //   ⇒ 约束 `0 < H/(S↔D) < R` 说的就是「滑块必须严格在轨内且在域标度内」。
    innerAxis: {
      rail: 'S ↔ D  （S＝支点／刚性锚端，D＝阻力作用点端）',
      holds: 'H ＝ 轨上的滑块（杠杆距离／力臂）',
      source: 'law.mjs:60 ＋ law.mjs:78',
      isOperator: false,
      warn: '🔴 外层 S、D 与内层 S、D 不是同一个东西 ⇒ **不得跨层代入**。',
      // ⚠️ 以下四行为 `X推`（安只裁定「属于 H 的内部嵌套结构」，未逐条确认）：
      //   依据＝「每个变量内部都有嵌套」＋「H 本体不随粒度变」两条原话。
      //   可验证点：若成立，R_in/S_in/D_in 必须都能举出与外层不同的实例。
      innerFour: {
        R_in: '这个能动者**认定**自己在哪个域（≠ 客观的 R_out，它可能认定错）',
        S_in: '它**真正掌握**的标准（≠ 名义上适用的 S_out）',
        D_in: '它**实际面对**的扰动（≠ 事项本身的 D_out）',
        H_in: '**还是它自己** ⇒ H_in ＝ H_out（本体不变 ⇒ 不产生新的第一视角）',
        why: 'H_in ≠ H_out ⇒ 每层凭空长出新的第一视角 ⇒ 嵌套永不终止，H 就失去了「嵌套锚」资格。',
        consequence: '🔴 `0 < H/(S↔D) < R` 因此是**自我约束**、不是外部约束：观察者就是被观察者 ⇒ 这正是它不可数值化的结构原因（不是「还没实现」）。',
      },
    },
    medical: {
      macro: '申办方 ＋ PI ＋ 伦理委员会（对试验整体负责）',
      micro: '本次给药复核：AI 建议 / 人类护士签字确认（两者必须能分开）',
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// M = (R×S)/(D×H) 的定性方向
//
// 取对数：ln M = ln R + ln S − ln D − ln H
//   ⇒ 各变量的偏导符号：R:+ / S:+ / D:− / H:−
//   与原文 direction 一致（H 越小 → M 越大）。
//
// 🔴 定性式的能力边界（**必须先说清，否则会被当成能算**）：
//   · 单变量变化 ⇒ 方向确定
//   · 多变量变化但**贡献同号** ⇒ 方向确定
//   · 多变量变化且贡献**异号** ⇒ **判不出**（要比较幅度，而原文禁止赋值）
//     这不是"不可判"，是**定性关系本身的上限**（L3：结构上没有）。
//     ⚠️ 与「我没查」必须分开记。
// ════════════════════════════════════════════════════════════════════

/** 各变量对 M 的偏导符号（ln 形式）。 */
export const M_SIGN = { R: +1, S: +1, D: -1, H: -1 };

/** 允许的变化量取值：降 / 不变 / 升。**没有 0.5** —— 定性式不接受幅度。 */
export const DELTA = { DOWN: -1, SAME: 0, UP: +1 };

/**
 * 判 M 的方向。
 * @param {{R?:number,S?:number,D?:number,H?:number}} delta 各变量变化：-1/0/+1
 * @returns {{ok:boolean, dir?:'up'|'down', reason?:string, terms?:Array}}
 */
export function mDirection(delta = {}) {
  const terms = [];
  for (const k of ['R', 'S', 'D', 'H']) {
    const d = delta[k] === undefined ? 0 : delta[k];
    if (![-1, 0, 1].includes(d)) {
      return { ok: false, reason: 'bad_delta', detail: `${k}=${d}：定性式只接受 -1/0/+1，不接受幅度` };
    }
    if (d !== 0) terms.push({ k, d, contrib: M_SIGN[k] * d });
  }
  if (!terms.length) return { ok: false, reason: 'no_change', detail: '四个变量都没变 ⇒ M 不变（不是判不出）' };

  const up = terms.filter((t) => t.contrib > 0).length;
  const down = terms.filter((t) => t.contrib < 0).length;
  if (up && down) {
    return {
      ok: false, reason: 'indeterminate',
      detail: '多项变化贡献方向相反 ⇒ 定性式判不出（需比较幅度，而原文明令不赋值）。这是定性关系的上限，不是缺口。',
      terms,
    };
  }
  return { ok: true, dir: up ? 'up' : 'down', terms };
}

/**
 * 双层合并：宏观 M 与微观 M 各自判方向，再判微观是否服从宏观。
 *
 * 服从规则（R_DOMAIN.invariant：低层级须服从高层级）：
 *   · 宏观判不出 ⇒ 微观方向不能单独生效（上层未定，下层不可越位）
 *   · 宏观 up 而微观 down（或反之）⇒ **冲突**，须上行走宏观
 *   · 两层同向 ⇒ 一致
 */
export function mTwoLayer(macroDelta, microDelta) {
  const mac = mDirection(macroDelta);
  const mic = mDirection(microDelta);
  if (!mac.ok) {
    return { ok: false, reason: 'macro_indeterminate', macro: mac, micro: mic, verdict: '上层不可判 ⇒ 下层不生效（不许微观越位定调）' };
  }
  if (!mic.ok) {
    return { ok: false, reason: 'micro_indeterminate', macro: mac, micro: mic, verdict: '下层判不出不影响上层结论' };
  }
  if (mac.dir !== mic.dir) {
    return { ok: true, dir: mac.dir, conflict: true, macro: mac, micro: mic, verdict: `微观方向（${mic.dir}）与宏观（${mac.dir}）冲突 ⇒ 上行，取宏观` };
  }
  return { ok: true, dir: mac.dir, conflict: false, macro: mac, micro: mic, verdict: '两层同向，一致' };
}

// ════════════════════════════════════════════════════════════════════
// 公式约束 `0 < H / (S ↔ D) < R` —— 算子未定义，不许猜
//
// 🔴 这一格是本轮**主动登记的欠账**，写法本身是判据示范：
//   「不知道」必须写清查过哪、缺哪个具体东西，否则与「没查」不可分。
// ════════════════════════════════════════════════════════════════════
export const M_CONSTRAINT = {
  expr: '0 < H / (S ↔ D) < R',
  source: 'CORE_FORMULA.semantics.constraint（.backup/repo-mirrors-2026-09-13/.../law.mjs:246）',

  // ══════════════════════════════════════════════════════════════════
  // 🔴 [2026-10-20 · 安裁定] `↔` **没有算子** —— 它不属于 H 的内部嵌套结构。
  //   ⇒ 上一轮登记为 `operator_undefined` ＋ 列三个候选求裁定，**整格作废**。
  //     错的不是「我没查到」，是**我把类别判错了**：
  //     我按「二元算子」去找一个「位置标记」，检索方向从一开始就不在解集里
  //     ⇒ 再查六十处也查不到（枚举补不了类别错，见铁律「先结构、后枚举」）。
  // ══════════════════════════════════════════════════════════════════
  status: 'not_an_operator',

  // ◆ 它不是算子，那它是什么：**H 内部那一层嵌套的进入标记**
  //   依据是原文，不是我编的（两处互相印证）：
  //     law.mjs:60  'H 是 S 与 D 之间的动态滑块。H 越小（越靠近 S_min），力臂越长…'
  //     law.mjs:78  约束式**挂在外 H（可观测行为）**上，不挂内 H（内 H 不可读）
  //   ⇒ `S ↔ D` 读作「S 到 D 这条滑轨」，H 是轨上的滑块；
  //     `H / (S↔D)` 是滑块在轨上的**相对位置**，不是两个量的商。
  //   ⇒ 所以它是**结构坐标**（轴名），不是可求值的表达式。
  reading: 'S↔D ＝ H 内部那条滑轨（S 为 S_min 端 / D 为 D_max 端），H ＝ 轨上滑块。↔ 标记「这段区间属于 H 的内部」，不可求值。',
  binds: 'law.mjs:60（H 是 S 与 D 之间的动态滑块）＋ law.mjs:78（约束挂 outer H，inner H 不可审计）',

  // ◆ 由此得到的可判形态（**非数值**，只判滑块在不在轨内）
  //   滑块有一个原文自带的性质：**必须在轨上，脱轨即失效**。
  //   这正好落地 `0 < … < R` 两头封口，且不需要任何数值：
  //     下界 0  : 退到 S 端之外 ⇒ 能动性归零（纯规则，不构成滑块的力臂）
  //     上界 R  : 越过 D 端/域的标度 ⇒ 脱域（能动性超出 R 所定范围）
  shape: {
    numeric: false,
    states: {
      ON_RAIL: 'on_rail',     // 严格在轨内 ⇒ 约束成立
      OFF_LOW: 'off_low',     // 退到 S 端外（能动性＝0）⇒ 违反下界 0<
      OFF_HIGH: 'off_high',   // 越过 R（能动性脱域）⇒ 违反上界 <R
      UNKNOWN: 'unknown',     // 给不出位置 ⇒ 不判（不是「成立」）
    },
    note: '🔴 只给位置形态，**不给比例值**。原文 note 明令「不赋值、不做具体数值计算」，此处同样受约束。',
  },

  // ◆ 被裁定撤回的旧结论（保留为证据，不删——删了就看不出我错过什么）
  retracted: {
    at: '2026-10-20 11:4x · 安：「没有算子，那是属于 H 的内部嵌套结构」',
    oldStatus: 'operator_undefined',
    oldCandidates: [
      '比值：S 与 D 的量化比',
      '距离：S 到 D 的可达距离（与 denominator 的「杠杆距离」同族）',
      '双向互馈：S 与 D 互为扰动源',
    ],
    whyWrong: '三候选都是**在解集之外求一个解**：前提（↔ 是算子）本身就是错的。⚠️ 病名不是「没查到」，是「拿枚举补类别错」。',
    lesson: '符号在算子表里全线查不到时，**先问「它是不是被当成了错误的类别」**，而不是继续扩大检索范围。',
  },

  // ◆ 裁定后仍需守的边界（这格不再是欠账，但仍是硬约束）
  guards: [
    '🔴 禁止为 `↔` 实现任何二元函数（ratio / distance / mutual / feedback）—— 落任何一种都是类型错。',
    // 🔴 [2026-10-20 12:0x · 自我修正] 上一版这里写的是「禁止把 S↔D 求值成一个数」，**锁得过宽**：
    //   · 该禁的是「把 `↔` 当成运算符」（S op D）；
    //   · **不该禁**「求这段区间的长度」—— 区间有长度，那是**区间的属性**，不是 `↔` 的运算结果。
    //   安随后问「SD 中间这个张力怎么算」，正说明这一段是**有可求量的**。
    //   ⇒ 精确版如下：长度可求，算子不可造。
    '🔴 禁止把 `↔` 当运算符（`S ⊕ D` 这种写法一律非法）；但**允许求区间长度** —— 该长度即「张力 L」，属区间属性，见 `verb.mjs` 的 `tensionOf()`。',
    '🔴 该约束只能挂在 **outer H** 上（law.mjs:78）；挂到 inner H 即越界（内 H 不可审计）。',
  ],
  // ⚠️ 自我修正记录（留证据，不删）
  selfCorrection: {
    at: '2026-10-20 12:0x',
    was: '禁止把 `S↔D` 求值成一个数；一旦求值，H 的「相对位置」就被误读成「比值」',
    now: '禁止把 `↔` 当运算符；但允许求**区间长度（张力 L）**',
    why: '为防「类别错」而把正解一起锁掉 ＝ **过宽**（与过窄同罪：都让判据失去分辨力）。锚点：区间有长度，符号无运算。',
    correctBy: '安 12:0x「SD 中间这个张力，如何计算」⇒ 承认该段有可求量。',
  },
};

/**
 * 判滑块的位置形态（**只判形态，不判数值**）。
 *
 * 输入是**位置标签**，不是数：
 *   inside  : 严格在轨内（不含两端）
 *   at_s    : 贴死 S 端 ⇒ 相对位置＝0 ⇒ 违反下界 `0 <`
 *   at_d    : 贴到 D 端（达 R 标度）⇒ 违反上界 `< R`
 *   beyond  : 越过 R 标度 ⇒ 脱域
 * 输出恒带 `numeric:false` —— 原文 note 明令不赋值，此处不得给比例值。
 *
 * ⚠️ 「unknown ⇒ 不判」**不等于**「成立」：缺位置时不下结论，也不当通过。
 */
export function mConstraintShape(where = {}) {
  const P = M_CONSTRAINT.shape.states;
  const pos = where && where.pos;
  const out = (state, ok, reason, extra = {}) => ({ state, ok, numeric: false, reason, ...extra });

  if (pos === undefined || pos === null || pos === '') {
    return out(P.UNKNOWN, false, '未给 H 在轨上的位置 ⇒ 不判（≠ 约束成立）');
  }
  if (pos === 'inside') return out(P.ON_RAIL, true, '滑块严格在轨内 ⇒ 约束成立');
  if (pos === 'at_s') return out(P.OFF_LOW, false, '贴死 S 端 ⇒ 相对位置＝0，违反下界 `0 <`（能动性归零）');
  if (pos === 'at_d') return out(P.OFF_HIGH, false, '贴到 D 端 ⇒ 达 R 标度，违反上界 `< R`（能动性脱域）');
  if (pos === 'beyond') return out(P.OFF_HIGH, false, '越过 R 标度 ⇒ 违反上界 `< R`（能动性脱域）');
  return out(P.UNKNOWN, false, `未知位置「${pos}」⇒ 不判`);
}

// ════════════════════════════════════════════════════════════════════
// 体检：四层是否都给了嵌套三件（macro / micro / stopAt）
// ════════════════════════════════════════════════════════════════════
export function nestAudit(table = NESTED_VARS) {
  const rows = Object.values(table).map((v) => {
    const missing = [];
    if (!v.essence) missing.push('essence');
    if (!v.macro) missing.push('macro');
    if (!v.micro) missing.push('micro');
    if (!v.binds) missing.push('binds');
    if (!v.stopAt) missing.push('stopAt');
    if (!v.medical || !v.medical.macro || !v.medical.micro) missing.push('medical');
    return { key: v.key, missing, status: missing.length ? 'malformed' : 'ok' };
  });
  const bad = rows.filter((r) => r.status !== 'ok');
  return {
    rows,
    count: { ok: rows.length - bad.length, malformed: bad.length, total: rows.length },
    verdict: bad.length ? 'fail' : 'pass',
    constraint: M_CONSTRAINT,
  };
}

/**
 * 判某个变量的展开是否到位。
 * 🔴 只判「有没有给」，不判「给得对不对」——后者要人来裁。
 */
export function nestStop(varKey, level) {
  const v = NESTED_VARS[varKey];
  if (!v) return { ok: false, reason: 'unknown_var' };
  const field = level === NEST.MACRO ? v.macro : level === NEST.MICRO ? v.micro : null;
  if (!field) return { ok: false, reason: 'unknown_level' };
  return { ok: true, at: level, form: field, stopAt: v.stopAt };
}
