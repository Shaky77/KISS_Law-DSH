// ⚠️ 本文件由 scripts/build-docs-engine.mjs 生成，请勿手改。
// 源：src/core/strata.mjs ｜ 改源码后运行 npm run build:docs
// 一致性由 test/docs-engine-sync.test.mjs 断言（手工镜像必漂移，故不靠人眼对账）。
// 五层推演读数（strata）· 只读，不接判决路径
// ════════════════════════════════════════════════════════════════════
// 来由（安 2026-10-20）：「依照结构，把公式带上，逐层推，逐层修。」
//
// 上一轮（readout.mjs）解决的是「判据该走哪条路」；本模块解决的是
// **「每层拿什么量来算」** —— 公式若只是形容词，就一次也用不上。
//
// 落码形态（docs/18 定式）：**每层先算一个量，结论＝量之间的关系**。
//   不是：这算不算扰动？            ← 开放域选择题，答错即判错
//   而是：不可逆占比是多少？        ← 填空题，答错能被指出来
//
// 🔴 本模块只读：
//   · 不 import engine（只接一个 duck-typed 实例）
//   · 不产生 allow / deny / review
//   · 三层状态之一必须显式落定：可算 / 待取证 / 未实现 —— **不许静默**
//
// ⚠️ 不得使用 node 内置模块（docs/engine 镜像给浏览器加载）。
//
// ════════════════════════════════════════════════════════════════════
// 🔴 更正横幅（2026-10-20 · 安质询「R₀ 怎么会一个数都没有呢」）
//
//   上一轮本文件写的是：
//     { key:'rNaught', expr:'R_DOMAIN[level].capacity', status:PENDING,
//       evidence:'TBD@R_DOMAIN.hierarchy[level].capacity —— 须按域取证' }
//   **两处错：**
//     ① `hierarchy[level].capacity` 字段根本不存在（只有 level/name/contains/note）
//        ⇒ 引用了一个假字段，表达式必然求不出值 —— 「写了 ≠ 生效」的又一例；
//     ② 把「我没去查」写成「查不到」⇒ 与 10-19 被纠的
//        「把『我不知道』写成『不可参数化』」是同一个病。
//
//   取证结果（见 rCapacity.mjs）：域常数全有，有标准号、有数值、有单位。
//   真正的缺口被这次质询顶了出来 —— **不是缺域常数，是缺分母 N_opp**：
//       扩容 ⟺ ΣS > R₀ ，其中 R₀ = p_max × N_opp
//   引擎只记「偏离事件数」，不记「总运行机会数」⇒ 失效率没有分母。
//   ⇒ 故 R 层由一格拆三格：p_max(OK) / N_opp(ABSENT) / R₀(PENDING)。
//   ⚠️ 形态意义：**「挂 TBD」本身是一个需要举证的判断**，不是免责声明。
//      挂之前必须先跑一次取证；跑完仍无，才可写 no_num。
// ════════════════════════════════════════════════════════════════════
// ────────────────────────────────────────────────────────────────────
// 🔴 本层第一次实跑就撞出的真缺口（2026-10-20，实测非推断）：
//
//   engine.historyTrail 的注释写着「append-only 全量历史刻痕：所有 S 事件只沉淀不消解」，
//   但**实际只 push 三条路径**：`positive>0` / `negative>0` / `trauma>0`。
//   而 `executed ∧ reversible==='scar'` 那条自动推导路径（delta = -1）**只减了 sBySubsystem，
//   没进 historyTrail**。
//
//   实测（4 笔账）：
//     historyTrail = 2 条  ["S+1","|S-1|"]
//     sAccount.rStore = 4 条  sign ["-","0","+","-"]  rev ["scar","none","unknown","unknown"]
//   ⇒ **不可逆动作（疤）在最该被记住的那本"全量"账里缺席。**
//
//   形态归类：这是「真的真话·半真」——注释每句都真（那三条确实记），
//   但不完整，且**核得出真 ⇒ 零告警**（四象格里最难抓的一格）。
//
//   ⇒ 因此 ΣS 一律从 **sAccount.rStore（全量账）** 取，不从 historyTrail 取；
//     并把「两源覆盖率」本身做成一个读数 —— **不抹平差异，让差异可见**。
// ────────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════

import { R_CAPACITY, RCAP_KIND, rCapRoute, expandThreshold, isDegenerateDenominator, rCapAudit } from './rCapacity.js';

/** 量的三种状态。**没有第四种**：算不出就一定落在后两档之一。 */
export const QSTAT = {
  OK: 'ok',              // 现在就能算（engine 有数据面）
  PENDING: 'pending',    // 结构上可算，但缺常数 / 缺取证（须带 evidence 线索）
  ABSENT: 'absent',      // 实现层根本没有这个量（真缺口）
};

export const FORMULA_VARS = Object.freeze(['R', 'S', 'D', 'H', 'M']);

/** 判据来源闸的判定结果。 */
export const SOURCE_GATE = {
  ALLOWED: 'allowed',        // 判据源在公式五个量内 ⇒ 合规
  OFF_FORMULA: 'off-formula', // 判据源在公式外（只能观测）⇒ 违规
  UNKNOWN: 'unknown',        // 判据源判不出 ⇒ 不放行也不判违规（如实报缺）
};

/**
 * 判一条判据的来源是否合规。
 *
 * @param {string} source 判据所读的量名（如 'sThicknessStandIn'、'mLayerLoad'）
 * @param {object} [opts]
 * @param {boolean} [opts.placeholder] 该量是否为占位
 * @param {boolean} [opts.alias] 是否为旧名别名
 * @param {string} [opts.declared] **该量声明的来源层**（'R'/'S'/'D'/'H'/'M'）——
 *   🔴 判据**以声明为准**，不按 key 名字猜：读数字段名是实现细节（`sThicknessStandIn`），
 *     它属于哪一层是**声明**出来的（criterionSource）⇒ 按名猜＝按词形判＝枚举思维。
 * @returns {{status:string, source:string, reason:string}}
 */
export function judgeCriterionSource(source, opts = {}) {
  const s = String(source ?? '').trim();
  if (!s) return { status: SOURCE_GATE.UNKNOWN, source: s, reason: '判据源未声明 ⇒ 不判合规（unknown ≠ 零）' };
  // 🔴 先判占位：占位是"公式外"的**特例**（它连自己的真身都不是）⇒ 单独报，别混进"公式外"里。
  if (opts.placeholder) {
    return { status: SOURCE_GATE.OFF_FORMULA, source: s,
      reason: '🔴 占位不得进判定（元判据 0.4.0）：占位连真身都不是，只是占位。' };
  }
  if (opts.alias) {
    return { status: SOURCE_GATE.OFF_FORMULA, source: s,
      reason: '🔴 旧名别名不得进判定（读它等于读占位本体）。' };
  }
  // 判据**以声明为准**（declared = 该量声明自己属于哪一层）。
  const declared = String(opts.declared ?? '').trim().toUpperCase();
  if (!declared) {
    return { status: SOURCE_GATE.UNKNOWN, source: s,
      reason: '🔴 该量**未声明来源层** ⇒ 判不出它在不在公式内（unknown ≠ 零 ⇒ 不放行、也不判违规）。' };
  }
  if (FORMULA_VARS.includes(declared)) {
    return { status: SOURCE_GATE.ALLOWED, source: s,
      reason: `判据源在公式五个量（${FORMULA_VARS.join('/')}）内（声明层＝${declared}）。` };
  }
  return { status: SOURCE_GATE.OFF_FORMULA, source: s,
    reason: `🔴 判据源「${s}」声明层＝${declared}，不在公式五个量（${FORMULA_VARS.join('/')}）之内 ⇒ 只能观测，不得进判定。` };
}

// ════════════════════════════════════════════════════════════════════
// 跨层代入禁令（本轮推出来的第一条，先立再算）
//
// 🔴 S 有两个维度，名字都叫 S，但**不是同一个量**：
//   · 时间维度（ΣS）＝ 历史刻痕厚度，只增不减 ⇒ **求和**
//   · 当前值维度（S_now）＝ 稳态高度，可升可降 ⇒ **取 min（木桶）**
//   ⇒ 拿 S_now 当 ΣS 用 = 跨维度代入 ⇒ 命题类型错（与「恒定量不进变量表」同族）。
//
// 判据形态：**两个量的聚合方向相反（Σ 取和 / 木桶取最小），即不可互代。**
// 聚合方向相反的，永远不是同一个量 —— 这条可机械检查。
// ════════════════════════════════════════════════════════════════════
export const SUBSTITUTION_BAN = [
  {
    id: 'S-TIME-vs-S-NOW',
    a: 'sHistoryThickness',   // Σ|amount|  （只增）
    b: 'sNow',                // min over subsystems（可降）
    why: '聚合方向相反：Σ 取和 vs 木桶取最小 ⇒ 不是一个量。扩容看厚度，刹车看高度；混用会让"伤疤"被读成"储备"。',
  },
];

// ════════════════════════════════════════════════════════════════════
// 五层定义：每层给「量 ＋ 公式 ＋ 状态」
//
// 公式一律写成**可代入**形式：左边是对外可报的名字，右边是能从数据面算出的表达式。
// 算不出的量必须自带 `evidence`（TBD 挂在哪个标准 / 哪一层域）。
// ════════════════════════════════════════════════════════════════════
export const STRATA = [
  // ── R：域常数 ───────────────────────────────────────────────────
  {
    layer: 'R',
    name: '域常数',
    criterion: 'R_EXPANSION',
    formula: '扩容 ⟺ (ΣS > R₀) ∧ 质(S 经 M 沉淀)   ｜  R₀ = p_max × N_opp（RATE 类）；他类改走 |S_dev|>tol / 覆盖率 / 排序',
    quantities: [
      {
        key: 'sThicknessStandIn',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 在公式内，但本字段本身是**占位** ⇒ 占位闸另管。',
        label: 'SigmaS thickness (**stand-in** = occupies the "structural anchor thickness" slot)',
        expr: 'count(rStore where sign ∈ {+,-})  // unit = marks carrying a direction (**a proxy, not the real thing**)',
        status: QSTAT.OK,
        dim: 'time dimension · only grows',
        placeholder: true,
        yOrigin: '🔴 **Stand-in field**: the Y-side origin of the real thing has been found — law.mjs `R_EXPANSION.qualification`: \'the qualification for feeding back = amount (SigmaS > R0) AND quality (**an S settled through M feedback**, running D → H → M → trace-reread once)\'. ⇒ **a structural anchor = an S settled through M feedback** (framework wording, not a self-invented term). ⚠️ This field currently reads a **proxy** (marks with a direction) ⇒ its relation to the real thing is \'stand-in\': the name carries the stand-in marker and never shares the real thing\'s name (naming discipline: a stand-in field must carry its own marker, never impersonate the real thing). ⚠️ **A stand-in must not enter any verdict.** The real count is `sMSediment` (read-only); the same-class diff is `sClassDiff`.',
        note: '🔴 2026-10-29 (the trustee\'s ruling: \'not one variable in KISS\'s Law is made up\' + manuscript fig.2 \'every point on Y is a rule / every point on X is data\'): this field has **no** independent Y-side origin ⇒ by that meta-criterion it is demoted to a **stand-in** and no longer calls itself \'the finance reading\'. Before (0.3.6/0.3.7) it called itself \'structural anchor count / finance reading\' — that was **a proxy impersonating a variable**; corrected. Read from the full account (rStore), not historyTrail: the latter misses the scar derivation path (measured 4 marks, only 2 kept). Scars count too — that is the price of \'the ledger only grows\', but it does not mean the steady state improved.',
      },
      {
        key: 'sHistoryThickness',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）；本字段是**旧名别名** ⇒ 别名闸另管。',
        label: 'SigmaS historical thickness (**legacy alias** ⇒ read `sThicknessStandIn` instead)',
        expr: 'count(rStore where sign ∈ {+,-})  // same value as sThicknessStandIn',
        status: QSTAT.OK,
        dim: 'time dimension · only grows',
        placeholder: true,
        alias: true,   // legacy alias (deliberately carries no stand-in marker: it is not a stand-in body, it is an old-name channel)
        yOrigin: 'Same as sThicknessStandIn (stand-in; the real origin is in law.mjs R_EXPANSION.qualification).',
        note: '⚠️ **Legacy-name alias** (kept so xiaoD\'s comparison chain is not cut) — the authoritative name is now `sThicknessStandIn` (the stand-in name carries its own marker). This is **not** an independent reading; reading it equals reading the stand-in field. Do not read it as the real thing.',
      },
      {
        key: 'sMSediment',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）：经 M 沉淀的 S 计数 ⇒ 公式内。',
        label: 'S settled through M feedback (the real count of structural anchors · read-only)',
        expr: 'count(historyTrail where type = "S+1")  // unit = marks settled through M',
        status: QSTAT.OK,
        dim: 'structural anchor · the real thing',
        yOrigin: 'law.mjs `R_EXPANSION.qualification`: "the qualification for feeding back = amount (SigmaS > R0) AND quality (**an S settled through M feedback**, running D → H → M → trace-reread once)".',
        note: '🔴 **This is the real thing** (it has a Y-side origin in the framework wording) — a different class from sThicknessStandIn (stand-in). ⚠️ `S+1` is currently almost never produced (before 0.3.8 the engine explicitly "no longer records positive") ⇒ **the real reason the +S entrance is empty is not the measurement, it is that "closed-loop success" was never wired into the ledger** ⇒ this count honestly shows 0/almost nothing. ⚠️ **Read-only**: it does not enter any verdict.',
      },
      {
        key: 'sClassDiff',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内；但**只读观测面**，不进判定。',
        label: 'same-class diff (**read-only observation face · not a criterion**)',
        expr: 'group historyTrail by (subsystem, topic) ⇒ compare first vs last sign  // did this class change direction?',
        status: QSTAT.OK,
        dim: 'cross-time · read-only',
        yOrigin: 'Framework wording (iron law #16): "the load cannot be observed at bookkeeping time (it is inner H) ⇒ it is inferred from whether the behaviour changes when the same class of D recurs".',
        note: '🔴 **Read-only observation face** (the trustee\'s ruling: \'first build a read-only version — count only, do not enter the books, do not change verdicts; look at the numbers first, do not rush a criterion, or we make things up again\'). It reads the **direction diff of the same class** (failure → success = the path changed = the candidate shape of a structural anchor). ⚠️ **A big diff ≠ a structural anchor** — the real criterion is not landed yet ⇒ this number is for looking at shapes only, **it does not enter any verdict**.',
      },

      {
        key: 'sEventCount',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内；会计口径。',
        yOrigin: 'The trustee, 2026-10-29 (quoted in xiaoD #43): "S\'s accounting ledger records the running count" / "a running ledger can only count as an accounting ledger temporarily mounted outside S".',
        label: 'event count (accounting reading = all discrete events)',
        expr: 'count(sAccount.rStore)  // unit = discrete events (incl. unknown / neutral)',
        status: QSTAT.OK,
        dim: 'time dimension · only grows',
        note: 'An explicit name for the accounting reading (same value as sHistoryThickness, different name) — the readout face keeps the two apart so they are never read as one.',
      },
      {
        key: 'sOverdraft',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内；欠账方向读数。',
        yOrigin: 'Framework law.mjs S: "a negative erosion takes the **absolute value** |S-1|, the running total is not resolved algebraically" / "historical marks are irreversible" + the trustee 2026-10-29: running dry (reserve 0) and being overdrawn differ causally ⇒ read apart.',
        label: 'overdraft amount (how much is owed)',
        expr: 'Σ max(0, −net_subsystem)  // read apart from the reserve',
        status: QSTAT.OK,
        dim: 'debt direction',
        note: '🔴 2026-10-29 (xiaoD #39/#40): running dry (reserve 0) and being overdrawn differ causally ⇒ the debt gets its own quantity.',
      },

      {
        key: 'sNow',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内。',
        yOrigin: 'Framework law.mjs S: "②the current-value dimension rises and falls with positive/negative influence" / "the bucket law: several systems take the min (the shortest board sets the overall ceiling)".',
        label: 'S_now（当前值）',
        expr: 'min over sBySubsystem',
        status: QSTAT.OK,
        dim: '当前值维度·可降',
        note: '木桶：短板决定上限。与 ΣS 不可互代（见 SUBSTITUTION_BAN）。',
      },
      {
        key: 'rCapPMax',
criterionSource: 'R',
criterionSourceNote: 'R 层量（公式分子）⇒ 公式内（域常数）。',
        yOrigin: 'Framework law.mjs R_DOMAIN (a domain = the scope and magnitude scale set by the anchor) + rCapacity.mjs (aviation 1E-9/h, automotive 1E-8/h… each with a standard number, a value and a unit).',
        label: 'p_max（域常数·容许失效率）',
        expr: 'R_CAPACITY[domain].value',
        status: QSTAT.OK,
        dim: '域常数·已取证',
        note: '🔴 上一轮把 R₀ 挂成 TBD 是错的：域常数**一直有**（航空 1E-9/h、汽车 1E-8/h、医疗 ±5%…），有标准号、有数值、有单位。见 rCapacity.mjs。缺的从来不是它。',
      },
      {
        key: 'nOpportunities',
criterionSource: 'R',
criterionSourceNote: 'R 层量（公式分母侧，R₀ = p_max × N_opp）⇒ 公式内。',
        yOrigin: 'Framework law.mjs R_EXPANSION: "expansion ⟺ (SigmaS > R0)", where R0 = p_max × N_opp ⇒ N_opp is a denominator **carried by the formula itself** (not a self-invented quantity).',
        label: 'N_opp（总运行机会数·分母）',
        expr: 'engine.nOpportunities  // 飞行小时数／总输注次数／总交易笔数',
        status: QSTAT.ABSENT,
        dim: '分母',
        evidence: '🔴 真缺口：engine 只记「偏离事件数」，不记「总机会数」⇒ 失效率没有分母。这才是 R₀ 算不出的真正原因。⚠️ 不可拿 ΣS 顶替（见 isDegenerateDenominator：会退化成 ΣS > p×ΣS，恒真）。',
        note: 'N_opp 与 ΣS 是两个量：前者是「发生了多少次」，后者是「总共给了多少次机会」。',
      },
      {
        key: 'rNaught',
criterionSource: 'R',
criterionSourceNote: 'R 层量（公式分子，阈值）⇒ 公式内。',
        yOrigin: 'Framework law.mjs R_EXPANSION: "expansion ⟺ (SigmaS > R0) (strictly greater) triggers the R sub-chain expansion".',
        label: 'R₀（域容量阈值）',
        expr: 'p_max × N_opp  // 仅 RATE 类；其他量纲见 rCapRoute',
        status: QSTAT.PENDING,
        dim: '域常数 × 分母',
        evidence: 'PENDING@N_opp 缺分母（不是缺域常数）。折算式 R₀ = p_max × N_opp 已落码 expandThreshold()。',
        note: '🔴 R₀ 不是一个数，是「一个数 ÷ 一个分母」还原回次数口径。缺分母时答案是"还算不出"，不是"不扩容"。',
      },
      {
        key: 'rCapRoute',
criterionSource: 'R',
criterionSourceNote: 'R 层量（域/量纲路由）⇒ 公式内。',
        yOrigin: 'Framework law.mjs R_EXPANSION.qualification: a different domain ⇒ **a different formula, not a different threshold** (the dimension sets the route, not the domain name).',
        label: '接入路由（该域该用哪条公式）',
        expr: 'rCapRoute(kind, sUnit)',
        status: QSTAT.OK,
        dim: '结构路由',
        note: '🔴 域不同 ⇒ **公式不同，不是阈值不同**。RATE→ΣS>p×N_opp／TOLERANCE→|S_dev|>tol／RATIO→覆盖率／SCALE→只排序／NO_NUM→数值不触发。路由由标准给的**量纲**定，不由域的名字定 ⇒ 新域不必查表命中名字。',
      },
      {
        key: 'sQualified',
criterionSource: 'S',
criterionSourceNote: 'S 层量（质条件）⇒ 公式内。',
        yOrigin: 'Framework law.mjs R_EXPANSION.qualification: "the qualification for feeding back = amount (SigmaS > R0) AND quality (**an S settled through M feedback**, running D → H → M → trace-reread once)"; X-axis enumerations never hold it.',
        label: '质条件（是否经 M 沉淀）',
        expr: 'count(sAccount.sign ∈ {+,−}) > 0 ∧ 存在对应 M 落点',
        status: QSTAT.OK,
        dim: '质条件',
        note: '量够了不代表有资格：X 轴枚举永远不具资格（它不是 S 不够厚，是根本不是 S）。',
      },
    ],
    stopAt: [
      '🔴 域常数（p_max）已有；缺的是分母 N_opp ⇒ 报「缺分母」，**不许报「域常数未取证」**（那是上一轮的错，已撤）。',
      '❌ 不可用：「该域标准是 RATE，而 ΣS 是事件数 ⇒ 直接比 1E-9 > 5」——跨单位比较＝命题类型错。',
      '❌ 不可用：拿 ΣS 当 N_opp 代进去（退化守卫 isDegenerateDenominator 会拒）。',
      'SCALE 类（DAL/ASIL/Class）只可排序，不可当阈值；NO_NUM 类（DAL D）标准合法不给数 ⇒ 该域数值不触发扩容，**这不是欠账**。',
      'ΣS 大而质条件不成立 ⇒ 报「厚度够、资格不成立」，不报「将扩容」。',
    ],
  },

  // ── S：流水账本 ─────────────────────────────────────────────────
  {
    layer: 'S',
    name: '稳态储备',
    criterion: 'S_REFINEMENT',
    formula: 'S_now(sub) = Σ delta ；S_now = min_sub S_now(sub)',
    quantities: [
      {
        key: 'sNow',
        yOrigin: 'Framework law.mjs S: "the current-value dimension rises and falls with positive/negative influence" / "the bucket law: several systems take the min (the shortest board sets the overall ceiling)".',
        label: 'S_now（当前值）',
        expr: 'min over sBySubsystem',
        status: QSTAT.OK,
        dim: '当前值维度',
      },
      {
        key: 'sPositive',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内。',
        yOrigin: 'Framework law.mjs S: "a positive influence takes the S path S→S+1" / "\'+1\' means one independent discrete event" + the trustee (quoted in xiaoD #43): "+S is the positive anchor".',
        label: '正向事件数',
        expr: "count(historyTrail.type === 'S+1')",
        status: QSTAT.OK,
        dim: '事件计数',
      },
      {
        key: 'sNegative',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内。',
        yOrigin: 'Framework law.mjs S: "a negative influence takes the D path S→S-1 (the current value drops, but the erosion event itself is permanently recorded as a historical mark with an absolute value)" + the trustee: "|-S| is the negative anchor".',
        label: '负向侵蚀数',
        expr: "count(historyTrail.type === '|S-1|') + count('trauma')",
        status: QSTAT.OK,
        dim: '事件计数',
      },
      {
        key: 'sTrauma',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内。',
        yOrigin: 'Manuscript wording (quoted by the trustee in xiaoD #43/#44): **|−S| = negative accumulation (trauma, failure, setback…)**.',
        label: 'trauma 计数',
        expr: 'traumaCount',
        status: QSTAT.OK,
        dim: '刻痕',
      },
      {
        key: 'sTrailCoverage',
criterionSource: 'S',
criterionSourceNote: 'S 层量（公式分子）⇒ 公式内；**两源一致性读数**，判据不可用。',
        yOrigin: 'Framework law.mjs S: "①time dimension — everything that happened cannot be changed or removed, it only settles as history, historical marks are irreversible".',
        label: '刻痕覆盖率（两源一致性）',
        expr: 'count(historyTrail) / count(sAccount.rStore)',
        status: QSTAT.OK,
        dim: '比例',
        note: '🔴 **不抹平差异，让差异可见**：< 1 说明"全量历史"那本账漏记了路径。实测 scar 路径必漏 ⇒ 覆盖率恒 < 1 时不是偶发，是结构。',
      },
    ],
    stopAt: [
      '🔴 已登记口径缺陷：`delta = -1` 恒为 −1，而正向 `delta = positive` 可 > 1 ⇒ **同一公式里两个单位**（负向按事件、正向按量级）。读数中分别报「事件数」与「S 值」，不合并成净变化。',
      '覆盖率 < 1 ⇒ 只可用 rStore 算厚度；**不得用 historyTrail 算厚度**（会系统性低估，且低估的恰是不可逆动作）。',
    ],
  },

  // ── D：扰动 ────────────────────────────────────────────────────
  {
    layer: 'D',
    name: '扰动 / 脆弱性',
    criterion: 'RSDHM.D',
    formula: 'D_impact ∝ 不可逆性（scar ≫ window > none），不 ∝ 发生次数',
    quantities: [
      {
        key: 'dScarRate',
criterionSource: 'D',
criterionSourceNote: 'D 层量（公式分母）⇒ 公式内。',
        yOrigin: 'Framework law.mjs S: "a negative erosion takes the absolute value |S-1|… not resolved algebraically" (irreversibility is an **existing** reversibility classification, not a new criterion).',
        label: '不可逆占比',
        expr: 'count(sAccount.reversible === "scar") / count(sAccount)',
        status: QSTAT.OK,
        dim: '比例',
        note: '这是把「数了几次」换成「有没有不可逆」的落点（Rehan 侧 F3 同一判据）。',
      },
      {
        key: 'dUnknownRate',
criterionSource: 'D',
criterionSourceNote: 'D 层量（公式分母）⇒ 公式内。',
        yOrigin: 'Framework: undecidable ≠ zero risk (it lands on the conservative side and must be reported explicitly) — "the unknown must not be folded into the known".',
        label: '可逆性不可判占比',
        expr: 'count(reversible === "unknown") / count(sAccount)',
        status: QSTAT.OK,
        dim: '比例',
        note: '不可判不是零风险：它落在保守侧，且必须显式报出。',
      },
      {
        key: 'dMax',
criterionSource: 'D',
criterionSourceNote: 'D 层量（公式分母）⇒ 公式内。',
        yOrigin: 'Framework MULTI_SYSTEM_RULES.dMax (D takes the max over systems; **no implementation was found in the engine** ⇒ honestly reported as unimplemented, never faked with a single-system approximation).',
        label: 'D_max（多系统取最大）',
        expr: 'max over subsystems',
        status: QSTAT.ABSENT,
        evidence: 'MULTI_SYSTEM_RULES.dMax —— engine 内未核到实现；多系统是否在引擎语义内尚未定。',
        note: '🔴 未实现就报未实现，不拿「单系统近似」冒充。',
      },
    ],
    stopAt: [
      'dScarRate 与 dUnknownRate 必须**分开报**：未知不可折叠进已知（否则"没测"被读成"没有"）。',
    ],
  },

  // ── H：主观能动性 ──────────────────────────────────────────────
  {
    layer: 'H',
    name: '主观能动性（承担）',
    criterion: 'H_ENERGY_POSITION',
    formula: 'H_load = 有依据刻痕 / 总刻痕（承担率）',
    quantities: [
      {
        key: 'hPaymentStandIn',
criterionSource: 'H',
criterionSourceNote: 'H 层量（公式分母）⇒ 公式内，但本字段是**占位** ⇒ 占位闸另管。',
        label: 'load-bearing ratio (**stand-in** = occupies the "H load-bearing ratio" slot)',
        expr: 'count(sign ∈ {+,-}) / count(sAccount)  // **a proxy**: share of marks carrying a direction',
        status: QSTAT.OK,
        dim: 'ratio',
        placeholder: true,
        yOrigin: 'PLACEHOLDER: the real thing = "did H make a payment" (the trustee, 2026-10-29, quoted in xiaoD #43: "whether it can enter S, this finance ledger, depends on whether the subject H has made a payment"). ⚠️ The current tap is a **proxy** (using "has a direction" to stand in for "payment") — a payment action contains inner H (inviolable, unauditable), only outer H is observable ⇒ **not judgeable at the moment**; the real thing can only be **inferred across time** (framework wording: the load cannot be observed at bookkeeping time ⇒ inferred from whether the behaviour changes when the same class of D recurs). ⇒ The name carries its own stand-in marker and never impersonates the real thing. ⚠️ **A stand-in must not enter any verdict.**',
        note: 'The load is the only observable face of agency (iron law #16): only a paid cost counts as full load. ⚠️ But "has a direction" ≠ "payment" (a direction can be derived from a scar; a payment requires H to acknowledge the cost) ⇒ this number is a stand-in; the real observation face is sClassDiff (read-only).',
      },
      {
        key: 'hPaymentRate',
criterionSource: 'H',
criterionSourceNote: 'H 层量（公式分母）；本字段是**旧名别名** ⇒ 别名闸另管。',
        label: 'load-bearing ratio (**legacy alias** ⇒ read `hPaymentStandIn` instead)',
        expr: 'same as hPaymentStandIn (identical value)',
        status: QSTAT.OK,
        dim: 'ratio',
        placeholder: true,
        alias: true,   // legacy alias (deliberately carries no stand-in marker)
        yOrigin: 'Same as hPaymentStandIn (stand-in).',
        note: '⚠️ **Legacy-name alias** (kept so xiaoD\'s comparison chain is not cut) — the authoritative name is now `hPaymentStandIn`.',
      },
      {
        key: 'hExemptStandIn',
criterionSource: 'H',
criterionSourceNote: 'H 层量（公式分母）⇒ 公式内，但本字段是**占位** ⇒ 占位闸另管。',
        label: 'exemption ratio (**stand-in** = occupies the "H exemption ratio" slot)',
        expr: 'count(sign === "unknown") / count(sAccount)  // **a proxy**: share of undecidable marks',
        status: QSTAT.OK,
        dim: 'ratio',
        placeholder: true,
        yOrigin: 'PLACEHOLDER: the real thing = "was H exempted" (inner H side, not judgeable at the moment) ⇒ the current tap (share of sign=unknown) is a proxy. ⚠️ The name carries its own stand-in marker; **a stand-in must not enter any verdict.**',
        note: '🔴 A rising exemption ratio ⇒ the load has been taken off (the quantified shape of the v10 defect). It does not violate truthfulness, but it **produces no judgement power**. ⚠️ This number is a stand-in (proxy); the real observation face is sClassDiff (read-only).',
      },
      {
        key: 'hExemptRate',
criterionSource: 'H',
criterionSourceNote: 'H 层量（公式分母）；本字段是**旧名别名** ⇒ 别名闸另管。',
        label: 'exemption ratio (**legacy alias** ⇒ read `hExemptStandIn` instead)',
        expr: 'same as hExemptStandIn (identical value)',
        status: QSTAT.OK,
        dim: 'ratio',
        placeholder: true,
        alias: true,   // legacy alias (deliberately carries no stand-in marker)
        yOrigin: 'Same as hExemptStandIn (stand-in).',
        note: '⚠️ **Legacy-name alias** (kept so xiaoD\'s comparison chain is not cut) — the authoritative name is now `hExemptStandIn`.',
      },


    ],
    stopAt: [
      'H 只报「承担率」，**不报对错**：对错由 M 打回，不由本层自评。',
    ],
  },

  // ── M：信号反馈 ────────────────────────────────────────────────
  {
    layer: 'M',
    name: '信号反馈',
    criterion: 'CONVERGENCE',
    formula: '收敛度 = 落点集中度的**单调方向**（非容差、非阈值）',
    quantities: [
      {
        key: 'mConcentration',
criterionSource: 'M',
criterionSourceNote: 'M 层量（链末结果）⇒ 公式内。',
        yOrigin: 'Framework law.mjs CONVERGENCE: "convergence = the **monotonic direction** of the landing-point concentration (not a tolerance, not a threshold)" — the true chain: more observations ⇒ higher concentration.',
        label: '落点集中度',
        expr: '同 R 落点事件数 / 不同 R 落点数',
        status: QSTAT.OK,
        dim: '结构量',
        note: '真链：观测增多 ⇒ 集中度上升；假链：平移 ⇒ 集中度不升。',
      },
      {
        key: 'mDirection',
criterionSource: 'M',
criterionSourceNote: 'M 层量（链末方向）⇒ 公式内。',
        yOrigin: 'Framework law.mjs CONVERGENCE.threshold (**explicitly forbids fixing a threshold/tolerance** ⇒ only the direction is reported, never a tolerance).',
        label: '方向（近/远/不动）',
        expr: 'sign(concentration_after − concentration_before)',
        status: QSTAT.PENDING,
        dim: '单调方向',
        evidence: 'TBD@两窗切分口径 —— 窗口怎么切未定；🔴 定的是**方向**，永不写容差（law.mjs CONVERGENCE.threshold 明令不可定）。',
        note: '阈值本体论禁止：写死容差＝提前代理 H 的选择权。',
      },
      {
        key: 'mForwardWired',
criterionSource: 'M',
criterionSourceNote: 'M 层量（前向推演接线）⇒ 公式内。',
        yOrigin: 'Framework: the M first-bug stop + the forward-inference face (FORWARD_INFERENCE / M_TWO_TENSES; currently **zero wiring** ⇒ honestly reported as not wired, never as "convergence zero").',
        label: '未来格是否接线',
        expr: 'engine 内是否存在前向推演输出面',
        status: QSTAT.ABSENT,
        evidence: 'FORWARD_INFERENCE / M_TWO_TENSES —— 零接线（readout.phaseReadout 已登记）。',
      },
    ],
    stopAt: [
      '🔴 只报方向，不报「进圈了没有」——后者是容差，属越界。',
      '未来格未接线 ⇒ 报「未接」，不报「收敛度为零」（未测 ≠ 零）。',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════
// 🔴 [2026-10-30 · M 的不可判形态（小D 47 号件第五节 · 安 10-29「唯稳律的公式没上场吧？」的落法）]
//
//   小D 的核心观察（经我独立复核**成立**）：引擎跑的是**闸门**，不是**因果律计算**——
//     · 公式 M = (R×S)/(D×H) 在实现层**零命中**（readout.mjs R_EXPANSION.gap 已登记）；
//     · strata 的 M 层只有 mConcentration（落点集中度，**不是 M**）/ mDirection(pending) / mForwardWired(absent)；
//     · 框架原文（weiwen_framework L1604）：「公式 ＝ **截面**；活系统 ＝ **循环**：R→S→D→H→M→S′」，
//       且「S 在链上应出现**两次**：M 之前读入（本圈基线）、M 之后写成 S′（下圈基线）」。
//   ⇒ **「公式没跑」是真的**（不是小D 的误读）。
//
//   ⚠️ 但有一处必须分清（小D 未提，我核出来了）：**框架明令公式不赋值不计算**——
//     安 2026-10-20 亲定：「M **只输出方向**（up/down/indeterminate），**绝不输出数值**」
//     （日志 2026-10-20.md:169；nested.mjs 的 mDirection 就是按这条实现的）。
//   ⇒ 所以「没有一处输出 M = R×S/(D×H)」**这句按字面不成立**（不该有数值输出）；
//      **真缺的是「方向判据接进运行期」**——不是「缺一个数」。
//   ⇒ 落法因此**不是**去算 M 的数值（那会违反"不赋值不计算"），而是：
//     ① 把 M 的**可算性**做成显式读数（缺哪项 ⇒ 报缺哪项，不报 0、不拿旁支顶替）；
//     ② 把 mDirection 从恒 PENDING 改成**真接上**（nested.mjs 已实现，只差接线）。
// ════════════════════════════════════════════════════════════════════

/**
 * M 的可算性检查：公式 M = (R×S)/(D×H) 的五个量，逐项报**在不在场**。
 *
 * 🔴 判据形态（小D 47 号件第五节）：**M 不可算时，报「不可判（缺哪项）」，不许拿公式外的量顶替。**
 *   ⇒ 缺项**逐条列出**（哪一项缺），不是笼统的"不可算"。
 *   ⚠️ 不输出 M 的**数值**（框架明令不赋值不计算）——本函数只判**方向能否判**。
 *
 * @param {object} surface dataSurface 的输出
 * @param {object} [opts]
 * @param {object} [opts.delta] {R,S,D,H} 各 -1/0/+1（定性变化量；缺省全 0）
 * @returns {{judgable:boolean, dir?:'up'|'down', missing:string[], reason:string}}
 */
export function mComputability(surface, opts = {}) {
  const s = surface;
  const missing = [];
  // R：域常数与阈值（公式分子侧）—— p_max 已在 R_CAPACITY；R₀ 需要分母 N_opp。
  const hasPMax = !!(s && s.domainKey && R_CAPACITY[s.domainKey]);
  if (!hasPMax) missing.push('R（域常数 p_max：当前域未登记）');
  if (!s || s.nOpp == null) missing.push('N_opp（总运行机会数：R₀ 的分母，engine 未记）');
  // S：分子侧的 S —— 须有**真身**（经 M 沉淀），占位不作数。
  const mSediment = s ? s.mSediment : 0;
  if (!s) missing.push('S（未接 engine 实例）');
  else if (mSediment === 0) missing.push('S（经 M 沉淀的 S ＝ 0：正账入口未接，闭环成功没进记账）');
  // D：分母侧的扰动 —— dMax 未实现。
  missing.push('D_max（最大扰动量：MULTI_SYSTEM_RULES.dMax 未实现）');
  // H：分母侧的人类 —— 内 H 不可观测；可观测代理（同类 D 重现时取极行为是否变）未接。
  missing.push('H（人类支付量：内 H 不可观测，代理量未接）');

  const verdict = {
    judgeable: false,
    dir: undefined,
    missing,
    reason: missing.length
      ? `M 不可判（缺：${missing.join('；')}）—— 公式外的量（厚度/透支/承担率/覆盖率）**不得顶替**。`
      : 'M 可判方向。',
  };
  // ⚠️ 即便五项齐备，也**只判方向、不赋值**（框架明令）——且方向判据在 nested.mjs，
  //   需外部传入各层定性变化量（-1/0/+1）。
  const delta = opts.delta;
  if (missing.length === 0 && delta && typeof delta === 'object') {
    // 动态引入避免顶层循环依赖（nested.mjs 不 import strata.mjs，安全）。
    // eslint-disable-next-line no-undef
    const mod = globalThis.__WEIWEN_M_DIRECTION__;
    if (typeof mod === 'function') {
      const r = mod({ R: delta.R, S: delta.S, D: delta.D, H: delta.H });
      if (r && r.ok) { verdict.judgeable = true; verdict.dir = r.dir; verdict.reason = `M 方向＝${r.dir}（只判方向，绝不赋值）`; }
      else verdict.reason = `M 方向不可判（${r?.reason ?? 'unknown'}）——这是定性关系的上限，不是缺口。`;
    }
  }
  return verdict;
}


// ════════════════════════════════════════════════════════════════════
// 取值：所有算量集中在此，便于审计（一处定义，一处取证）
// ════════════════════════════════════════════════════════════════════

/** 安全取数组。 */
function arr(x) { return Array.isArray(x) ? x : []; }

/** 安全取数字。 */
function num(x) { return typeof x === 'number' && Number.isFinite(x) ? x : null; }

/** 从 engine 实例抽取原始数据面（只读字段，不调用会改状态的方法）。 */
export function dataSurface(engine) {
  if (!engine) return null;
  const trail = arr(engine.historyTrail);
  const subs = engine.sBySubsystem && typeof engine.sBySubsystem === 'object' ? engine.sBySubsystem : {};
  const store = arr(engine.sAccount && engine.sAccount.rStore);

  const trailEvents = trail.length;
  // 🔴 [2026-10-30 · Coverage convention (xiaoD piece 47, §2)] Before: trailCoverage =
  //   trailEvents / store.length ⇒ **numerator and denominator are different dimensions**
  //   (mark count vs event count) ⇒ the ratio can exceed 1 (measured 1.28–1.33), while the
  //   note said "<1 means something was missed" ⇒ **the direction was inverted** (xiaoD
  //   reported this contradiction; independent re-verification **holds**).
  //   Fix: numerator and denominator **same dimension** — denominator = event count,
  //   numerator = **count of events that left a mark** (trailMarked === true).
  //   ⚠️ "did this event leave a mark" can only be written by the engine (recordSteady holds
  //     both ledgers) ⇒ this module **reads, never computes**; when the marker is missing
  //     (legacy data) it reports null honestly, **and does not substitute the mark count**
  //     (that substitution is the lesion itself).
  //   ⚠️ Known structural gap: the scar-derivation path (executed ∧ scar) **enters rStore
  //     but not historyTrail** ⇒ trailMarked = false for those ⇒ coverage really drops
  //     **below 1** (that is a true miss, not a fake reading).
  const markedEvents = store.filter((r) => r && r.trailMarked === true).length;
  const unmarkedEvents = store.filter((r) => r && r.trailMarked === false).length;
  const coverageKnown = store.length ? store.some((r) => r && r.trailMarked !== null && r.trailMarked !== undefined) : false;
  const trailCoverage = (store.length && coverageKnown) ? markedEvents / store.length : null;
  const positives = trail.filter((e) => e && e.type === 'S+1').length;
  const negatives = trail.filter((e) => e && (e.type === '|S-1|' || e.type === 'trauma')).length;
  const subVals = Object.values(subs).map(num).filter((v) => v !== null);
  // 🔴 sNow must share one source with engine.effectiveS (before: this file recomputed min(the nets),
  //   which could go negative ⇒ one place said 0 and the other −1).
  const sNow = typeof engine.effectiveS === 'function' ? engine.effectiveS()
    : (subVals.length ? Math.max(0, Math.min(...subVals)) : 0);
  const sOverdraft = typeof engine.overdraft === 'function' ? engine.overdraft()
    : subVals.reduce((a, v) => a + (v < 0 ? -v : 0), 0);

  const scar = store.filter((r) => r && r.reversible === 'scar').length;
  const unknown = store.filter((r) => r && r.reversible === 'unknown').length;
  const paid = store.filter((r) => r && (r.sign === '+' || r.sign === '-')).length;
  const total = store.length;
  // 🔴 [2026-10-30 · Ratios are not additive (xiaoD piece 47, §2)] xiaoD measured:
  //   hPaymentStandIn + hExemptStandIn = 1.28 > 1, reporting "two mutually exclusive
  //   buckets summing to > 1 ⇒ the numerators come from different ledgers while the
  //   denominator is shared (18)".
  //   Independent re-verification: **the phenomenon holds, the mechanism is misjudged.**
  //   The truth is — the two buckets are **not mutually exclusive**; they are **two
  //   different dimensions**:
  //     · paid    = direction dimension (sign ∈ {+,−})      ⇒ "does this have a direction?"
  //     · unknown = reversibility dimension (reversible==='unknown') ⇒ "is this one's
  //               reversibility undecidable?"
  //   The same record **can** fall into both buckets (e.g. sign='-' and
  //   reversible='unknown') ⇒ a sum > 1 is **inevitable** — it is neither "numerators
  //   from different ledgers" nor "conventions got mixed". ⇒ Correct statement:
  //   **these two ratios must not be added** (different dimensions).
  //   ⇒ Fix: surface "different dimensions, not additive" on the reading face (the
  //     algorithms stay as they are: each convention is itself correct).
  const ratioAdditivity = {
    note: '🔴 hPaymentStandIn and hExemptStandIn are **not additive**: they are **two different dimensions** — '
      + 'paid = direction (sign ∈ {+,−}), unknown = reversibility (reversible===\'unknown\'); '
      + 'the same record can fall into both buckets ⇒ a sum > 1 is inevitable, **not** a mixed convention.',
    dimensions: { hPaymentStandIn: 'direction (sign ∈ {+,−})', hExemptStandIn: 'reversibility (reversible===\'unknown\')' },
    additive: false,
  };
  // 🔴 [2026-10-29 · finance vs accounting read apart (xiaoD #41: the ΣS tap was the running ledger,
  //   not the anchors)] settledThickness = **settled marks (finance reading)** = marks that carry a
  //   direction (sign ∈ {+,−}); eventCount = **all discrete events (accounting reading)**, including
  //   unknown / neutral ones. ⚠️ One step short of the trustee's wording: the carrier for "did H pay"
  //   does not exist yet (xiaoD #40 §3) ⇒ "has a direction" is a **proxy**, labelled as such.
  const settledThickness = paid;
  // ΣS ＝ 历史刻痕总厚度，单位＝**离散事件数**（S 的「1」＝一次独立事件，见 law.mjs S_REFINEMENT）。
  //   🔴 从 sAccount.rStore（全量账）取，不从 historyTrail 取 —— 后者漏 scar 推导路径（见文件头实测）。
  // 🔴 [2026-10-29 · the expansion criterion reads the finance ledger (the trustee's own
  //   wording, quoted in xiaoD #43): before, thickness = store.length (**discrete events**)
  //   ⇒ the expansion criterion took the **running ledger** as ΣS ⇒ "things with no energy
  //   were counted into the energy account". The trustee: "+S is a positive anchor, |−S| is a
  //   negative anchor, so the S ledger proper never becomes a negative ledger; S must fit the
  //   system's evolution structure, not a running ledger" + "just keep two ledgers: S's finance
  //   ledger records structural anchors, S's accounting ledger records the running count".
  //   ⇒ **thickness (the outward ΣS) = the anchor count (finance reading)**; the running
  //   count gets its own eventCount.
  const thickness = settledThickness;     // finance reading: structural anchors (the outward ΣS)
  const eventCount = total;

  // 落点集中度 ＝ **最大簇占比**（0–1），不是"总数/落点数"。
  //   后者在只有一个落点时会随事件数一路增长，量的是"发生了多少"而非"聚得多紧"。
  const domains = new Map();
  for (const r of store) {
    const ds = arr(r && r.rDomains);
    const k = ds.length ? ds.join('|') : '∅';
    domains.set(k, (domains.get(k) || 0) + 1);
  }
  const maxCluster = domains.size ? Math.max(...domains.values()) : 0;
  const concentration = total ? maxCluster / total : null;

  // ═══ Read-only same-class diff face (2026-10-29 · the trustee's ruling: count only first) ═══
  // 🔴 Why read-only: the trustee's ruling — the "same-class D recurrence diff" face is **first built
  //   read-only** (counts only, never enters the books, never changes a verdict), so xiaoD can run it
  //   and see what it looks like; "look at the numbers first, do not rush a criterion, or we make
  //   things up again".
  //
  // The Y-side definition of the real thing (law.mjs `R_EXPANSION.qualification`, verbatim):
  //   "the qualification for feeding back = amount (SigmaS > R0) AND quality (**an S settled through M
  //   feedback**, running D → H → M → trace-reread once)"
  //   ⇒ **a structural anchor = an S settled through M feedback**. Its carrier: **the `S+1` entries in
  //   historyTrail** (the only positive settled marks).
  //   ⇒ `S+1` is currently almost never produced (before 0.3.8 the engine explicitly "no longer records
  //   positive") ⇒ **the real reason the +S entrance is empty is not the measurement, it is that
  //   "closed-loop success" was never wired into the ledger**.
  const mTrail = arr(engine.historyTrail);   // the name must not collide with the existing `trail` (historyTrail aggregate)
  // "S settled through M feedback" count = positive settled marks (the real count; shows 0 if it is 0)
  const mSediment = mTrail.filter((e) => e && e.type === 'S+1').length;
  // 🔴 [2026-10-30 · 沉淀停摆显式化（小D 48 号件第四节）] 小D 实测：sMSediment = 0，判读为
  //   「**这一步从来没跑过**」，而现在的读数是**静默的 0** ⇒ 读起来像「暂时没有」⇒ **unknown ≠ 零** 被违反。
  //   ⇒ 落法：**停摆与零分开报**。停摆时给 `stalled:true` + 原因，**不报 0**。
  //   ⚠️ 停摆的判据是**结构性的**（不是「数恰好是 0」）：`S+1` 这条沉淀路径在引擎里
  //     **没有任何产生入口**（recordSteady 的 positive>0 分支从未被触发 ⇒ 正账入口空着）。
  //     ⇒ 只要引擎没接「闭环成功 ⇒ 记正账」这条线，就是**停摆**，不是「零」。
  //   ⚠️ 判据怎么落：引擎暴露一个**声明式开关**（`mSedimentWired`）——由引擎自己答"这条线接没接"，
  //     本模块**只读不算、不猜**（与元判据同原则：不能自己判断的东西就如实报缺）。
  const sedimentWired = engine?.mSedimentWired === true;
  const sedimentStall = {
    stalled: !sedimentWired && mSediment === 0,
    reason: sedimentWired
      ? null
      : '🔴 沉淀步**停摆**：M 未接线 ⇒ 「闭环成功 ⇒ 记正账（S+1）」这条线在引擎里没有产生入口 ⇒ '
        + 'sMSediment 的 0 是**静默的 0**（读起来像「暂时没有」，实际是「这一步从来没跑过」）。'
        + '按 unknown ≠ 零 ⇒ **停摆时不得读作零**。',
    wired: sedimentWired,
  };
  // Same-class diff: group by (subsystem, topic), compare the **first** and the **latest** mark.
  //   🔴 "same class" = same topic (the topic is the discriminator for same-kind events, see law.mjs S
  //   time-cycle model) ⇒ not a word-shape enumeration.
  //   "diff" = whether the direction of the same class changed (failure → success = the path changed =
  //   the candidate shape of a structural anchor).
  //   ⚠️ This is **observation only**: a big diff ≠ a structural anchor; the real criterion is not landed
  //   yet (only law.mjs's definition exists, no tap) ⇒ this number is for looking at shapes only.
  const byClass = new Map();
  for (const e of mTrail) {
    if (!e) continue;
    const key = `${e.subsystem ?? 'core'}::${e.topic ?? '∅'}`;
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key).push(e);
  }
  const classDiff = [];
  for (const [key, list] of byClass) {
    const ordered = list.slice().sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const signOf = (e) => (e.type === 'S+1' ? '+' : (e.type === 'trauma' ? 'trauma' : (e.type === '|S-1|' ? '-' : '0')));
    const fs = signOf(first);
    const ls = signOf(last);
    classDiff.push({
      class: key,
      marks: ordered.length,
      firstSign: fs,
      lastSign: ls,
      changed: fs !== ls,                                   // the direction of this class changed
      settled: ordered.some((e) => e.type === 'S+1'),      // this class has seen an S settled through M
      lastTs: last.ts ?? null,
    });
  }
  const classDiffSummary = {
    classes: classDiff.length,
    changed: classDiff.filter((c) => c.changed).length,
    settled: classDiff.filter((c) => c.settled).length,
    entries: classDiff,
  };

  return {
    thickness, settledThickness, eventCount, trailEvents, trailCoverage, positives, negatives, sNow, sOverdraft,
    markedEvents, unmarkedEvents, coverageKnown,
    ratioAdditivity,
    // 🔴 [2026-10-30 · 三本账同源（小D 47 号件第二节）] 小D 实测：一笔失败让 **thickness +1 / trauma +1 /
    //   overdraft +1** 三处同时涨 ⇒ 拿任何一个当"成本量"都会**三倍高估**。
    //   独立复核**成立**（我实测：一次 onFailure(1) ⇒ thickness Δ1 / trauma Δ1 / overdraft Δ1，
    //   而 rStore 只 +1 条、trail 只 +2 条刻痕）⇒ **它们不是三笔成本，是同一笔事件的三种表述**。
    //   ⇒ 本面显式给出**同源关系**，让读数的人不会把它们当成可相加的三笔。
    //   ⚠️ 这不改变任何一个量的算法（各有各的维度：厚度＝事件数 / trauma＝创伤事件数 / overdraft＝金额），
    //     只把「同源、不可相加当成本量」这件事摆到读数面上。
    sameEventViews: {
      note: '🔴 thickness / trauma / overdraft 是**同一笔事件的三种表述**，不是三笔成本 ⇒ 相加即三倍高估。'
        + '（各自维度：厚度＝有方向事件数；trauma＝创伤事件数；overdraft＝欠账金额）',
      views: ['thickness', 'trauma', 'sOverdraft'],
      source: '同一笔 recordSteady 调用（引擎侧唯一收口）',
      additive: false,
    },
    mSediment, classDiff: classDiffSummary,
    sedimentStall,
    traumaCount: num(engine.traumaCount) ?? 0,
    scar, unknown, paid, total, concentration, maxCluster,
    distinctDomains: domains.size,
    // ── R 层分母面（2026-10-20 新增）──────────────────────────────
    //  domainKey：当前账本落在哪个域（决定用哪条 p_max）
    //  nOpp     ：总运行机会数。engine 目前**没有**这个字段 ⇒ 恒为 null ⇒ ABSENT。
    //             ⚠️ 绝不回填成 store.length —— 那正是退化守卫要拦的同义反复。
    domainKey: typeof engine.domainKey === 'string' ? engine.domainKey : 'unspecified',
    nOpp: num(engine.nOpportunities),
  };
}

/** 计算单个量。返回 { status, value, evidence } —— **状态必须显式**。 */
export function compute(key, surface) {
  const s = surface;
  switch (key) {
    case 'sHistoryThickness': return s ? { status: QSTAT.OK, value: s.thickness } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sSettledThickness': return s ? { status: QSTAT.OK, value: s.settledThickness } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sEventCount': return s ? { status: QSTAT.OK, value: s.eventCount } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sOverdraft': return s ? { status: QSTAT.OK, value: s.sOverdraft } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sNow': return s ? { status: QSTAT.OK, value: s.sNow } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sPositive': return s ? { status: QSTAT.OK, value: s.positives } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sNegative': return s ? { status: QSTAT.OK, value: s.negatives } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sTrauma': return s ? { status: QSTAT.OK, value: s.traumaCount } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'sTrailCoverage': return s ? { status: QSTAT.OK, value: s.trailCoverage } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    case 'dScarRate': return s && s.total ? { status: QSTAT.OK, value: s.scar / s.total } : { status: QSTAT.PENDING, value: null, evidence: '账本为空或无实例' };
    case 'dUnknownRate': return s && s.total ? { status: QSTAT.OK, value: s.unknown / s.total } : { status: QSTAT.PENDING, value: null, evidence: '账本为空或无实例' };
    case 'hPaymentStandIn': return s && s.total ? { status: QSTAT.OK, value: s.paid / s.total } : { status: QSTAT.PENDING, value: null, evidence: 'empty ledger or no instance' };
    case 'hPaymentRate': return s && s.total ? { status: QSTAT.OK, value: s.paid / s.total } : { status: QSTAT.PENDING, value: null, evidence: '账本为空或无实例' };
    case 'hExemptStandIn': return s && s.total ? { status: QSTAT.OK, value: s.unknown / s.total } : { status: QSTAT.PENDING, value: null, evidence: 'empty ledger or no instance' };
    case 'hExemptRate': return s && s.total ? { status: QSTAT.OK, value: s.unknown / s.total } : { status: QSTAT.PENDING, value: null, evidence: '账本为空或无实例' };
    case 'mConcentration': return s ? { status: QSTAT.OK, value: s.concentration } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    // ── R 层：域常数 / 分母 / 路由（2026-10-20 重写）────────────────
    //  🔴 上一轮这三格只有一条 `rNaught → PENDING('TBD@…capacity')`，
    //     既引用了不存在的字段，也把「没查」冒充成「查不到」。现拆成三格：
    //       p_max  → OK      （域表里有值有源）
    //       N_opp  → ABSENT  （engine 真缺这个量）
    //       R₀     → PENDING （= p×N，缺分母）
    //     三格的状态各不相同，这才是实情。合并成一条会把「缺分母」写成「缺常数」。
    case 'rCapPMax': {
      const e = R_CAPACITY[s ? s.domainKey : 'unspecified'] ?? R_CAPACITY.unspecified;
      const has = e && e.value !== null && e.value !== undefined;
      return has
        ? { status: QSTAT.OK, value: e.value, evidence: `${e.kind}｜${e.unit}｜${e.source}（${e.verified}）` }
        : { status: QSTAT.PENDING, value: null, evidence: `该域为 ${e ? e.kind : 'unknown'} 类，无数值：${e ? e.source : '域表无此键'}` };
    }
    //  🔴 两档必须各带各的 evidence：接上分母后若仍挂着「真缺口」的注解，
    //     就是「状态对了、注解还是旧的」——形态上是「真的真话·半真」（核得出真 ⇒ 零告警）。
    case 'nOpportunities':
      return s && s.nOpp !== null
        ? { status: QSTAT.OK, value: s.nOpp, evidence: 'engine.nOpportunities 已供给。⚠️ 须同时声明口径（飞行小时／输注次数／调用次数），否则分母与 ΣS 可能量的不是同一件事。' }
        : { status: QSTAT.ABSENT, value: null, evidence: 'engine 无 nOpportunities 字段：只记偏离事件数，不记总机会数' };
    case 'rCapRoute': {
      const e = R_CAPACITY[s ? s.domainKey : 'unspecified'] ?? R_CAPACITY.unspecified;
      return { status: QSTAT.OK, value: rCapRoute(e ? e.kind : null, 'count'), evidence: `域 ${s ? s.domainKey : 'unspecified'} ⇒ kind=${e ? e.kind : 'unknown'}` };
    }
    case 'rNaught': {
      const key = s ? s.domainKey : 'unspecified';
      const e = R_CAPACITY[key] ?? R_CAPACITY.unspecified;
      const nOpp = s ? s.nOpp : null;
      // 退化守卫：N_opp 若等于 ΣS，换算出来的阈值会让判据恒真
      if (nOpp !== null && s && isDegenerateDenominator(nOpp, s.thickness)) {
        return { status: QSTAT.PENDING, value: null, evidence: '拒绝：N_opp === ΣS（同义反复，ΣS > p×ΣS 对 p<1 恒真）' };
      }
      const r = expandThreshold(e, nOpp);
      if (!r.ok) {
        const route = rCapRoute(e ? e.kind : null, 'count');
        return { status: QSTAT.PENDING, value: null, evidence: `${r.reason}｜${r.detail}｜route=${route.route}：${route.why}` };
      }
      return { status: QSTAT.OK, value: r.r0, evidence: r.detail };
    }
    case 'mDirection': return { status: QSTAT.PENDING, value: null, evidence: 'TBD@两窗切分口径（只定方向，永不写容差）' };
    case 'mForwardWired': return { status: QSTAT.ABSENT, value: null, evidence: 'FORWARD_INFERENCE 零接线' };
    case 'dMax': return { status: QSTAT.ABSENT, value: null, evidence: 'MULTI_SYSTEM_RULES.dMax 未实现' };
    case 'sQualified': return s ? { status: QSTAT.OK, value: s.paid > 0 && s.total > 0 } : { status: QSTAT.PENDING, value: null, evidence: '未接 engine 实例' };
    default: return { status: QSTAT.PENDING, value: null, evidence: `未定义取值器：${key}` };
  }
}

// ════════════════════════════════════════════════════════════════════
// 对外：逐层读数
// ════════════════════════════════════════════════════════════════════
export function strataReadout(engine = null) {
  const surface = dataSurface(engine);
  const layers = STRATA.map((st) => {
    const qs = st.quantities.map((q) => ({ ...q, ...compute(q.key, surface) }));
    const ok = qs.filter((q) => q.status === QSTAT.OK).length;
    return {
      layer: st.layer, name: st.name, criterion: st.criterion, formula: st.formula,
      quantities: qs,
      count: { ok, pending: qs.filter((q) => q.status === QSTAT.PENDING).length, absent: qs.filter((q) => q.status === QSTAT.ABSENT).length, total: qs.length },
      stopAt: st.stopAt,
    };
  });
  // ═══ Admission diagnostics (the executable form of the meta-criterion · 2026-10-29) ═══
  // 🔴 The trustee's ruling: "not one variable in KISS's Law is made up" + manuscript fig.2 "every point
  //   on Y is a rule / every point on X is data" ⇒ every readout field must point back to **a rule on
  //   the Y side** (= has a yOrigin); one that cannot ⇒ it may only be a **stand-in**
  //   (= placeholder:true, and **its name must carry the stand-in marker**), **and it must not enter
  //   any verdict**.
  //   ⚠️ Why a **readout diagnostic** rather than hard rejection at registration: same principle as
  //     readout.mjs — "meta-cognition may only read, not manage"; a hard rejection would fail every
  //     pre-existing field at once (not replayable). ⇒ the gap is **put on the readout face**, so
  //     "which variables are made up" is visible right there.
  //   ⇒ Companion discipline (testable): **a stand-in field name must carry the stand-in marker**
  //     (stand-in / slot / 占位) ⇒ locked by a test.
  const allQs = layers.flatMap((l) => l.quantities);
  const PLACEHOLDER_MARK = /(stand[-_ ]?in|slot|占位|替身)/i;
  const unbacked = allQs.filter((q) => !q.placeholder && !(q.yOrigin && String(q.yOrigin).trim()))
    .map((q) => q.key);
  const placeholders = allQs.filter((q) => q.placeholder && !q.alias).map((q) => ({
    key: q.key,
    markedInName: PLACEHOLDER_MARK.test(q.key),
    yOrigin: q.yOrigin ?? null,
  }));
  const placeholderWithoutMark = placeholders.filter((p) => !p.markedInName).map((p) => p.key);
  const aliases = allQs.filter((q) => q.alias).map((q) => q.key);   // legacy aliases (not stand-in bodies)
  // ═══ criterion-source gate diagnostic face (xiaoD piece 47, §5 · 2026-10-30) ═══
  // 🔴 Rule: **a verdict may only read the five quantities inside the formula
  //   (R/S/D/H/M); anything outside the formula is observation-only and must not enter
  //   a verdict.** — This is the **other half** of the 0.4.0 meta-criterion: that one
  //   fenced off stand-ins; this one fences off **everything outside the formula**.
  //   ⇒ Visible on the reading face: who is marked as a criterion source while actually
  //     sitting outside the formula (or being a stand-in / legacy alias).
  //   ⚠️ Read-only face (same nature as this module: "metacognition may only read, never
  //     govern") — it produces **no allow/deny/review**; it only makes violations explicit.
  const sourceGate = allQs.map((q) => {
    const verdict = judgeCriterionSource(q.key, {
      placeholder: !!q.placeholder, alias: !!q.alias, declared: q.criterionSource ?? null,
    });
    return {
      key: q.key,
      declared: q.criterionSource ?? null,     // declared criterion-source layer (R/S/D/H/M)
      inFormula: FORMULA_VARS.includes(String(q.criterionSource ?? '').toUpperCase()),
      placeholder: !!q.placeholder,
      alias: !!q.alias,
      verdict: verdict.status,
      reason: verdict.reason,
      note: q.criterionSourceNote ?? null,
    };
  });
  // 🔴 The gate is **recomputable** (not a list computed once and frozen): the verdict follows
  //   the `declared` field ⇒ change the declaration and the verdict must follow.
  //   Why recomputable: if the diagnostic face can only be looked at and not changed, there
  //   is no way to verify it is **really judging** (mutation testing would not go red).
  const recomputeGate = (overrides = {}) => allQs.map((q) => {
    const declared = Object.prototype.hasOwnProperty.call(overrides, q.key)
      ? overrides[q.key] : (q.criterionSource ?? null);
    const v = judgeCriterionSource(q.key, {
      placeholder: !!q.placeholder, alias: !!q.alias, declared,
    });
    return {
      key: q.key, declared,
      inFormula: FORMULA_VARS.includes(String(declared ?? '').toUpperCase()),
      placeholder: !!q.placeholder, alias: !!q.alias,
      verdict: v.status, reason: v.reason, note: q.criterionSourceNote ?? null,
    };
  });
  const gateViolations = sourceGate.filter((g) => g.verdict === SOURCE_GATE.OFF_FORMULA);
  return {
    layers,
    // the admission diagnostic face: made-up variables are visible right there
    provenance: {
      unbacked,                                   // neither a Y origin nor marked as a stand-in ⇒ made up
      placeholders,                               // the stand-in list (incl. "does the name carry the marker")
      placeholderWithoutMark,                     // a stand-in without the marker in its name ⇒ breaks the discipline
      aliases,                                    // legacy aliases (kept so comparison chains are not cut)
      rule: 'every readout field needs a yOrigin (a Y-side rule); without one it may only be a stand-in (name carries a stand-in/slot/占位 marker) and must not enter any verdict.',
    },
    // 🔴 criterion-source gate (xiaoD piece 47, §5): verdicts may only read the five formula
    //   quantities; anything outside the formula is observation-only.
    sourceGate: {
      rule: 'a verdict may only read the five quantities inside the formula (R/S/D/H/M); anything outside the formula is observation-only and must not enter a verdict.',
      formVars: [...FORMULA_VARS],
      violations: gateViolations,                 // marked as criterion source yet out of bounds
      clean: gateViolations.length === 0,
      entries: sourceGate,
      // 🔴 recomputable: pass {field: new declared layer} ⇒ returns the recomputed gate
      //   (for mutation self-checks; changes no state).
      recompute: (overrides) => {
        const rs = recomputeGate(overrides ?? {});
        return { entries: rs, violations: rs.filter((g) => g.verdict === SOURCE_GATE.OFF_FORMULA) };
      },
      note: '⚠️ This face is **read-only**: it produces no allow/deny/review (same principle as this module: metacognition may only read, never govern). '
        + 'What it does is **make violations explicit** — whoever is marked as a criterion source while actually sitting outside the formula (or being a stand-in / legacy alias) is surfaced on the spot.',
    },
    bans: SUBSTITUTION_BAN,
    domain: {
      key: surface ? surface.domainKey : null,
      pMax: R_CAPACITY[surface ? surface.domainKey : 'unspecified'] ?? null,
      nOpp: surface ? surface.nOpp : null,
    },
    // 域表体检：把「非法条目」与「标准合法地不给数」分开记账。
    //   malformed ≠ no_num_legal —— 前者是我的错，后者是域的性质，不是欠账。
    rcap: rCapAudit(),
    summary: {
      可算: layers.reduce((a, l) => a + l.count.ok, 0),
      待取证: layers.reduce((a, l) => a + l.count.pending, 0),
      未实现: layers.reduce((a, l) => a + l.count.absent, 0),
      engineAttached: !!surface,
    },
  };
}
