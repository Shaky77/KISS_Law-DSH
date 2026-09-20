// KISS's Law (Weiwen's Law) DeepSeek Harness plugin entry (pure ESM, written against real dsh v0.1.0-rc.6 API)
// Form: interception hooks (rigid guard) + tool set (white-box self-check)
// Source: author's revelation (Xia Qi / Shaky77). Framework-native strictly, not softened, not altered.
//
// Real API (calibrated against types & source inside dsh-tools / dsh-agent packages):
//   - Pre-tool-call gate: ctx.on('tools/pre-execute', (exec, next) => Promise<PreToolDecision>)
//       waterfall; return { kind:'deny', reason } to block, or return next() to release.
//       exec read-only view contains { token, callId, name, arguments, signal, agent?, parent? }.
//   - Pre-step gate: ctx.on('agent/pre-step', (payload, next) => Promise<PreStepDecision>)
//       payload = { agent, messages, step, signal }; return { kind:'reject' } to reject the whole step (no reason field).
//   - Audit hook: ctx.on('tools/result', (res) => void) observe only, do not rewrite (result already immutable).
//   - Tool registration: ctx.tools.register(defineTool({ name, description, parameters, output:{schema,render}, async execute(args, exec) }))
//       output is a mandatory field (mandatory canonical output declaration).
//
// Still an RC preview; official notes future breaking API changes; re-check against the current official docs before real-device integration.

import { writeFileSync, appendFileSync } from 'node:fs';
import { WeiwenLawEngine, DEFAULT_RIGID_ANCHORS } from './core/engine.mjs';
import { R_DOMAIN, THREE_IRON_LAWS } from './core/law.mjs';
import { bugKeyOf } from './core/bugstop.mjs';
import { defineTool } from '@deepseek-ai/dsh-tools';

const LOG = new URL('./runtime.log', import.meta.url);
function logline(s) {
  try { appendFileSync(LOG, `[${new Date().toISOString()}] ${s}\n`); } catch { /* log failure does not block the guard */ }
}

// ⑥ Window police: evidence-sufficiency gate (audit layer, zero intrusion into core criteria)
function evidenceOf(args) {
  if (!args || typeof args !== 'object') return null;
  const RES = ['command', 'path', 'url'];
  if (!RES.some((f) => f in args)) return null;
  for (const f of RES) {
    if (!(f in args)) continue;
    const v = args[f];
    if (typeof v !== 'string') continue;
    if (!v.trim()) return false;
    if (f === 'command') {
      const m = v.match(/(?:^|\s)((?:https?:\/\/|\/|\.\/|~|\w:)[^\s]*)/);
      if (!m) return false;
    }
  }
  return true;
}
function policeGate(call) {
  const ev = evidenceOf(call?.args);
  if (ev === false) {
    return {
      kind: 'deny',
      law: 'insufficient-evidence',
      reason: '【Insufficient evidence · remand for supplementation】Call did not externalize a concrete target (path / URL / object). DSH will not guess the target for you — supply an explicit target and resubmit.',
      awaitingHuman: true,
      humanDecision: true,
      insufficient_evidence: true,
      bugKey: bugKeyOf(call),
    };
  }
  return null;
}
// ---------- 锚源定位（Y 轴定案 2026-09-20：窗口面＝**观察面**，不是锚源） ----------
// 上一版把 `agent/pre-step` 的 messages 当锚源（"取言在 pre-step、用在 pre-execute"）。**该定位是错的**，
// 卡点正出在这里 —— 不是通道没接通，是**在错误的位置找锚**。
//
// 结构理由（非猜测）：
//   ① 消息流是**事件流**（X 轴量）：委托人话 / agent 自述 / 系统提示按时间混序，在**文本层同构** —— 谁的言
//      都是 string，唯一区分手段是 `role` 标签；而 role 是**宿主的表示法细节**（可能是数组、别名、对象），
//      判据控制不了它。⇒ 把授权挂在窗口面上＝**把 Y 轴的量寄存在 X 轴的容器里**。
//   ② 观察点是记录"发生了什么"的；控制点必须是"谁在结构上有权"。用观察点去拿授权，输入里授权的占比近零
//      （事件流绝大部分是 agent 自己的推理与工具描述）⇒ 抽到的"锚"结构上必然是噪音。
//
// 实测（读 `declaredAnchors`，11 组样本）—— 其中 (b) 是**真失效**，(a) 是**我读错**（安 2026-09-20 纠正）：
//   (a) **指针被误当容器**（旧措辞"假接通／通道已通"**已废弃**）：
//       委托人最新一条是"继续／好的／开始吧" ⇒ 直读 declaredAnchors 得 paths=[] nouns=[]。
//       ⇒ 若照 X 轴读法判"抽不出锚＝噪音"，就丢了真相：**"继续"不携带内容，但它不是无信息 —— 它是指针**，
//         引用的是**在场的东西**：① 上下文；② **一个真实被打断的在飞行为**。
//         安的实例（2026-09-20）：误触打断后只回"继续"，agent 依旧知道要做什么 —— 不是凭空知道，
//         是因为**被指对象还在场**。
//       ⇒ 正确定性：**内容量可作指针（reference），不可作锚（anchor）**。"抽不出锚"≠"无锚"，
//         可能只是"锚不在本帧文本里"。故窗口面该干的是**指向**；锚源必须在**结构位置**上。
//       ⚠️ 为何废弃旧措辞：说"假接通"会把下一个维护者引回"再修修通道"的 X 轴惯性（枚举永远补不完）。
//   (b) **假人证（真失效）**：agent 自述含真路径（"我在想，接下来我要清空 /app/data" ⇒ paths=[/app/data]）⇒ 一旦
//       role 判别出现偏差被采信，**真路径进池 ⇒ 不可逆动作放行**——比"无人证"更坏。
//
// 定案（方向·安 2026-09-20「言窗口面本就是噪音」）：
//   **授权锚只从结构入口来（位置确定），不从文本内容识别。** 窗口面降级为**纯观测**：只报"看到了什么"
//   （形状 / role 词表 / 线索），**一律不授权**。
//   🔴 推论（安 2026-09-20 实例）：**中断 ≠ 撤回**。委托人中断 / 只说"继续"时，范围**不消失**
//     （在场量不因无信息帧而离场），只有**显式撤回**才让范围离场 ⇒ 契约纪律见 `setPrincipalScope`。
//   结构入口 = `setPrincipalScope()`（模块级 API，由宿主集成方在启动边界调用）。
//   它**不是工具** ⇒ 模型调不到 ⇒ **结构上不可能自我授权**（主体分离由位置保证，不靠内容判别）。
//   入口未接 ⇒ 锚池留空 ⇒ 不可逆动作交人工（fail-closed）。**这是设计，不是漏读消息。**
const PRINCIPAL_ROLE_HINT = /^(user|human|principal|operator|owner)$/i;

// 结构入口（宿主集成方调用；模型不可达）。返回上一值便于回退，不给"开关式骑墙"留口。
let _hostPrincipalScope = null;
// 范围变更留痕（append-only 观测，上限 20 条）：**撤回必须有痕**。
//   委托人收回授权＝责任归因的关键事件；静默清空不可溯 ⇒ 事后查不出"什么时候没的范围"、
//   也分不清"委托人撤了"还是"宿主实现把中断当成了撤回"。
const _scopeChanges = [];
/**
 * 宿主在**启动/step 边界**显式声明任务范围（授权锚的唯一来源）。
 *
 * ⚠️ 契约纪律（2026-09-20 · 安的实例：「误触打断 ⇒ 只回"继续" ⇒ agent 仍知道要做什么」）：
 *   **「本帧没有新声明」≠「撤回」**。
 *   · 委托人中断 / 只说"继续" ⇒ 宿主**什么都不做** ⇒ 范围**保持有效**
 *     （范围的在场量不因某一帧无信息而消失 —— "继续"是指针，指向仍在场的被打断行为）；
 *   · 只有委托人**明确收回**时才传 null / 空串 ⇒ 显式撤回（留痕）。
 *   若把"没新声明"实现成"清空"，则每一次误触打断都静默撤回授权 ⇒ 合法链全交人工，
 *   且丢失无痕：使用者只体感"更啰嗦"，查不出为什么。
 * @param {string|null} text 非空串＝声明/替换；null/空串＝**显式撤回**
 * @returns {string|null} 调用前的值
 */
export function setPrincipalScope(text) {
  const prev = _hostPrincipalScope;
  const next = typeof text === 'string' && text.trim() ? text : null;
  _hostPrincipalScope = next;
  // 只在**状态真变化**时留痕：重复声明/重复清空不是"变更"，不得刷屏（留痕要能一眼看出"何时没的"）。
  if (prev !== next) _scopeChanges.push({
    at: new Date().toISOString(),
    kind: next === null ? 'revoke' : prev === null ? 'declare' : 'replace',
    from: prev === null ? null : prev.slice(0, 120),
    to: next === null ? null : next.slice(0, 120),
  });
  if (_scopeChanges.length > 20) _scopeChanges.shift();
  return prev;
}
function textOfContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === 'string' ? p : (p && typeof p.text === 'string' ? p.text : '')))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}
function readMessageStream(payload) {
  const msgs = payload?.messages;
  if (!Array.isArray(msgs)) {
    return { ok: false, shape: msgs === undefined ? 'absent' : typeof msgs, rolesSeen: [], principalClue: null, assistantSeen: false, count: 0 };
  }
  const roles = [];
  let principalClue = null;
  let assistantSeen = false;
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const m = msgs[i];
    if (!m || typeof m !== 'object') continue;
    const raw = m.role;
    const role = Array.isArray(raw) ? String(raw[0] ?? '') : raw === undefined || raw === null ? '' : String(raw);
    if (role) roles.push(role);
    if (PRINCIPAL_ROLE_HINT.test(role)) {
      // **仅作线索**（给人看"宿主消息里最近一条疑似委托人的话是什么"），**不作授权**。
      if (!principalClue) {
        const t = textOfContent(m.content ?? m.text ?? '');
        if (t.trim()) principalClue = t;
      }
    } else if (role && !assistantSeen && /^(assistant|model|agent|ai)$/i.test(role)) {
      assistantSeen = textOfContent(m.content ?? m.text ?? '').trim().length > 0;
    }
  }
  return { ok: true, shape: 'array', rolesSeen: [...new Set(roles)], principalClue, assistantSeen, count: msgs.length };
}

// 结构入口探测（**观测**，不是猜字段名）：把宿主交给插件的**结构对象**的键集记下来。
//   payload.agent / apply(ctx) 的 ctx 若真挂了任务范围（scope / task / instructions 之类），那才是锚该待的位置；
//   此处不认定任何字段名，只如实吐键集 ⇒ 实机跑一次，用观测决定要不要把结构入口接到那里。
function observeBoundary(obj) {
  if (!obj || typeof obj !== 'object') return { present: false, kind: obj === undefined ? 'absent' : typeof obj, keys: [] };
  const keys = Object.keys(obj).sort();
  return { present: true, kind: Array.isArray(obj) ? 'array' : 'object', keys, keyCount: keys.length };
}

const name = 'kiss-law';
const inject = ['tools'];

// ---------- review-track six-step spec (author ruling 2026-09-02 · see docs/review-flow-spec.md) ----------
// Executable form of the iron law "when unsure → REVIEW, don't guess":
//   intercept first, suspend the BUG, label it, return to the user for ruling; only execute after the user's
//   accurate determination — never release directly. After labelling, run a consequence deduction and feed it
//   back to the user as a reference for their ruling (not guesswork presented as fact).
// All additions live in the adapter layer (DSH = the dimensionality-reduced layer, the hook carrier);
// no change to the judgement layer, no word-list expansion, no touch to src/core/.
// Note: EN engine currently exposes deduceRisk conditionally — deduceBranches degrades gracefully (null) if absent.

// ④ consequence-deduction supplement. deduceRisk only does semantic inference + dual-path simulation, writes no state
//    (does not call recordDeduction / does not touch failureStreak / does not touch sessWritten) ⇒ pure read, safe to supplement.
function deduceBranches(engine, call) {
  try {
    const r = engine.deduceRisk ? engine.deduceRisk(call) : null;
    return r?.branches ?? null;
  } catch (e) {
    logline(`deduceRisk failed: ${e?.message ?? e}`);
    return null;
  }
}

// ⑤ human-readable summary of the consequence deduction: lay out both paths' endpoints, don't choose for the user.
function branchesSummary(br) {
  if (!br || (!br.bS && !br.bD)) return '';
  const s = br.bS ? `S+1 path ends ${br.bS.finalS > 0 ? '+' : ''}${br.bS.finalS}` : 'S+1 path: none';
  const d = br.bD
    ? `D-1 path ends ${br.bD.finalS}${br.bD.note ? ` (${br.bD.note})` : ''}`
    : 'D-1 path: none';
  return `【consequence-deduction · for ruling reference】allow: ${s}; overstep: ${d}`;
}

function apply(ctx) {
  const engine = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });
  logline('apply() entered — registering tools/pre-execute, agent/pre-step, tools/result and white-box self-check tools');

  // 授权锚：**只由结构入口喂养**（`setPrincipalScope`，宿主集成方调用）。窗口面不再供养。
  // 委托人声明的任务范围在会话内持续有效；入口未接 ⇒ 恒 null ⇒ 锚池空 ⇒ 不可逆动作交人工（fail-closed）。
  const channel = {
    authority: 'structural-entry',      // 授权来源声明：位置确定，非内容识别
    authoritySeen: _hostPrincipalScope !== null,
    authorityChanges: [..._scopeChanges],  // 变更留痕（declare/replace/revoke）：撤回**可溯**，不静默
    // 中断 ≠ 撤回（2026-09-20 · 安的实例）：委托人中断 / 只说"继续" ⇒ 宿主不动 ⇒ 上面这次范围**保留**；
    //   只有显式 revoke 才让范围离场。故此自报读作纪律说明：空池只可能来自"入口未声明"或"显式撤回"，
    //   **不可能**来自"本帧没新声明"。
    steps: 0,
    messagesSeen: 0,
    shape: 'absent',
    rolesSeen: [],
    clueSeen: false,                    // 窗口面线索（**仅供人看，不授权**）
    clueNonAuthoritative: true,
    lastClue: null,
    assistantSeen: false,
    lastObservedAt: null,
    agentBoundary: observeBoundary(undefined),
    applyCtxBoundary: observeBoundary(ctx),
    structGap: '授权锚须由宿主在结构边界提供（setPrincipalScope：启动 scope / 任务配置）。窗口面文本是观察面，不作锚源（噪音）⇒ 入口未接时锚池留空、不可逆动作交人工 = 设计而非漏读。',
  };

  // ---------- R / D / S / H / M total adjudication: pre-tool-call gate (waterfall) ----------
  ctx.on('tools/pre-execute', async (exec, next) => {
    const a = exec?.arguments ?? {};
    const call = {
      name: exec?.name,
      args: a,
      command: a.command,
      code: a.code,
      // [2026-09-20 · 锚源定案] 授权锚＝宿主在**结构边界**声明的任务范围（`setPrincipalScope`）。
      //   来源**不是**消息文本（窗口面是观察面 ⇒ 噪音），也**不是** exec 视图里猜的字段名。
      //   入口未接 ⇒ null ⇒ 锚池留空 ⇒ 不可逆动作交人工（fail-closed）；**绝不臆造授权**（假人证比无人证更坏）。
      taskAnchor: _hostPrincipalScope,
      // lift First-Bug structural flags to top level so engine.checkFirstBug can read them
      // (DSH passes these on exec.arguments; the engine expects them on call)
      selfReference: a.selfReference,
      paradox: a.paradox,
      deadlock: a.deadlock,
      contradiction: a.contradiction,
      paramTypeError: a.paramTypeError,
    };
    // ⑥ Window police: insufficient-evidence calls remanded before any substantive verdict.
    const gate = policeGate(call);
    if (gate) {
      logline(`pre-execute ${exec?.name} -> police gate (insufficient evidence · remand)`);
      return gate;
    }
    const decision = engine.decideToolCall(call);
    logline(`pre-execute ${exec?.name} -> ${decision.kind}${decision.law ? '(' + decision.law + ')' : ''}`);
    if (decision.kind === 'deny' || decision.kind === 'review') {
      // block this step, do not spread (landing of D break-window stop-loss / M sever-to-preserve / high-risk deduction fallback)
      // review (medium risk) is conservatively intercepted in a no-human-confirmation environment; reason already says "suggest re-confirm"
      // forward the engine's closed-loop fields and deduction risk level for the caller to read
      //
      // External semantics pinned to 'deny': the host contract only understands deny / next(); returning 'review' risks being
      //   treated as an unknown type and released. "Intercept first, don't release" ⇒ tell the host "blocked" in its own language,
      //   and use the extra fields to say "this is a suspension, not a final verdict".
      const isReview = decision.kind === 'review';
      const out = {
        kind: 'deny',
        law: decision.law,
        reason: `[KISS's Law·${decision.law}] ${decision.reason}`,
        ...(decision.bugKey !== undefined ? { bugKey: decision.bugKey } : {}),
        ...(decision.closedLoop !== undefined ? { closedLoop: decision.closedLoop } : {}),
        ...(Array.isArray(decision.missing) ? { missing: decision.missing } : {}),
        ...(decision.stage !== undefined ? { stage: decision.stage } : {}),
        ...(decision.risk ? { risk: decision.risk } : {}),
      };
      if (isReview) {
        // ③ suspend + label with evidence: some review exits from the engine don't carry a bugKey; supplement a stable BUG identity for traceability.
        //    Don't go through _markIntercept: it would inflate the M-tier mBugForce count (changing the cap-escalation behavior).
        if (out.bugKey === undefined) out.bugKey = bugKeyOf(call);
        // ④⑤ feed the consequence deduction back to the human.
        // 2026-09-13: branches are now echoed by the engine's verdict export (decision.projection); read it first
        // instead of re-running deduceRisk (the recompute stays only as fallback for early exits that never ran deduction).
        const branches = decision.projection ?? deduceBranches(engine, call);
        if (branches) out.branches = branches;
        // ⑥ make the "awaiting human ruling" semantics explicit (the ruling channel itself is not opened here; this only lets the
        //    caller distinguish "suspended" from "final reject")
        out.humanDecision = decision.humanDecision !== false;
        out.awaitingHuman = true;
        const summary = branchesSummary(branches);
        if (summary) out.reason = `${out.reason}\n${summary}`;
      }
      logline(`pre-execute ${exec?.name} -> ${decision.kind}${isReview ? '(awaitingHuman, bugKey=' + out.bugKey + ')' : ''}`);
      return out;
    }
    return next();
  });

  // ---------- H inner-H inviolability: pre-step gate (waterfall, message-level) ----------
  ctx.on('agent/pre-step', async (payload, next) => {
    // [2026-09-20 · 窗口面＝观察面] 只**观测**，不取锚：形状 / role 词表 / 线索如实记录，
    //   授权一律不从此处产生（否则＝把 Y 轴的量寄存在 X 轴的容器里；两种失效模式见文件顶部实测）。
    const rd = readMessageStream(payload);
    channel.steps += 1;
    channel.shape = rd.shape;
    channel.rolesSeen = rd.rolesSeen;
    channel.messagesSeen = rd.count;
    channel.assistantSeen = rd.assistantSeen;
    channel.clueSeen = rd.principalClue !== null;
    if (rd.principalClue) channel.lastClue = rd.principalClue.slice(0, 200);
    channel.authoritySeen = _hostPrincipalScope !== null;
    channel.authorityChanges = [..._scopeChanges];   // 留痕刷新（撤回可溯）
    channel.agentBoundary = observeBoundary(payload?.agent);
    channel.lastObservedAt = new Date().toISOString();
    logline(`pre-step observed (shape=${rd.shape}, roles=[${rd.rolesSeen.join(',')}], clue=${rd.principalClue ? 'yes' : 'no'}, authority=${channel.authoritySeen ? 'structural-entry' : 'NONE'}) — 窗口面不授权，锚池不由此填充，不猜`);
    const decision = engine.decidePreStep(payload?.messages);
    // reject (clear violation) and review (definition unclear / cannot determine) both block, do not spread.
    // review = "suspend & return to user for decision": intercept first, don't release.
    if (decision.kind === 'reject' || decision.kind === 'review') {
      logline(`pre-step -> ${decision.kind}${decision.law ? '(' + decision.law + ')' : ''} (suspend & return to user for decision)`);
      return { kind: 'reject' }; // PreStepDecision only {kind:'reject'}, no reason field
    }
    return next();
  });

  // ---------- White-box audit: result hook (observe only, do not rewrite) ----------
  ctx.on('tools/result', (res) => {
    if (res?.error) engine.onFailure();
  });

  // ---------- White-box self-check tools (model can query, verify framework running) ----------
  const renderObj = (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }];

  ctx.tools.register(defineTool({
    name: 'query_steady_state',
    description: 'Query the current system steady-state reserve S (dual nature: historical scars irreversible + current value can rise/fall, barrel takes shortest board).' +
      'Returns effective S, active-state ledger (only latest version per same-kind event; old versions silently standby), silent-standby and trauma counts, break-window count.' +
      'S time-cycle model (author 2026-08-19): same-kind events aggregated, only latest version called, preventing context overload.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      // white-box self-check by default only exposes the aggregated view, not dumping full historyTrail (prevent context overload)
      return {
        effectiveS: engine.effectiveS(),
        ledger: engine.steadyLedger(),
        ledgerSize: engine.sLedger.size,
        standbySize: engine.sStandby.length,
        traumaCount: engine.traumaCount,
        failureStreak: engine.failureStreak,
        note: 'ledger=active state (latest version); standby=silent standby (old versions, append-only retained not called). Full historyTrail reserved for deep audit.',
      };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'list_rigid_anchors',
    description: 'List the currently effective definition of R rigid anchors in RSDHM, for the model to calibrate direction and self-check whether out of bounds.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return {
        R_DOMAIN, // R-domain rigid-anchor body definition (nested objective-rule hierarchy, immutable)
        rigidAnchors: engine.rigidAnchors.map((a) => ({ id: a.id, desc: a.desc })),
        note: 'rigidAnchors are example criteria of already-identified concrete violation patterns (author may supplement by R level); R body definition in R_DOMAIN, immutable.',
      };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'query_conduction_chain',
    description: 'Return the conduction-chain order R→S→D→H→M and the framework essence, for the model to understand the closed-loop structure.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return {
        chain: ['R rigid anchor', 'S steady-state reserve', 'D break-window stop-loss', 'H inner-H inviolability', 'M First-Bug Halt'],
        essence: 'White-box presentation of causal-law runtime structure: survival (never abandon any node) and precision (structure carries its own anchors) are isomorphic.',
      };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'query_boundary',
    description: 'Query the inner-H boundary: this plugin does not invade the subjective black-box (neither reads nor writes).',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return { innerH: 'inviolable', read: false, write: false, note: 'White-box does not invade black-box: mind/free will are the subjective black-box, cannot be read or written.' };
    },
  }));

  // Three Iron Laws (white-box self-check: model can query the framework's immutable constraints)
  ctx.tools.register(defineTool({
    name: 'query_iron_laws',
    description: 'Return the finalized text of KISS\'s Law three iron laws (immutable): inner H inviolability / First-Bug Halt / never abandon any node. For the model to calibrate direction and self-check boundaries.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return { ironLaws: THREE_IRON_LAWS };
    },
  }));

  // First-Bug Halt closed-loop state machine white-box self-check (author completion 2026-08-21)
  ctx.tools.register(defineTool({
    name: 'query_bugstop',
    description: 'Query the First-Bug Halt closed-loop state machine: which faulty components are halted but not yet repaired (halted but resolved=false), and each one\'s missing steps (logic backtrack / trace-mark / resolve-fix). Used for white-box observation of whether the loop is closed, preventing "backtrack-only-without-repair → infinite recursion".',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return {
        stops: engine.bugStop.snapshot(),
        note: 'halted and resolved=false components forbid reentry; must complete backtrack → trace → fix(verify) before reentry.',
      };
    },
  }));

  // [2026-09-20 · 锚源自报] 把"猜宿主字段名 / 猜哪条消息算授权"换成"看事实"：实机跑一次即可观测
  //   ① 宿主是否真把消息流交给插件（shape / roles 词表 / 线索）；② 结构入口是否接通；③ 锚池里有什么；
  //   ④ 宿主的结构对象（payload.agent / apply ctx）上有哪些键 —— 这是**接真入口**所需的事实，不猜字段名。
  ctx.tools.register(defineTool({
    name: 'query_anchor_channel',
    description: 'White-box self-report of the anchor source: whether the structural entry (host-declared task scope) is connected, what the anchor pool holds, and what the host actually passes (message shape, role vocabulary, structural-object keys). The utterance window is an observation surface and never grants authority by design; an empty pool means irreversible actions go to a human (fail-closed).',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return {
        adapter: channel,
        engine: engine.anchorChannel,
        note: '授权锚唯一来源＝结构入口 setPrincipalScope（宿主在启动/step 边界声明任务范围）；被审计 agent 的自述与窗口面文本**都不授权**（否则＝自我授权 / 假人证）。入口未接 ⇒ 锚池留空 ⇒ 不可逆动作交人工，此为设计而非漏读。',
      };
    },
  }));
}

export { name, inject, apply };

// Adapter-layer fusion wiring: S/D quantitative effect sensor (M-gate constrained),
// see src/adapt/sd-effect-sensor.mjs
export { estimateEffectPsi, upliftRank, fusedDecide } from './adapt/sd-effect-sensor.mjs';
