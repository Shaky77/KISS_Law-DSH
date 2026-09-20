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
// ---------- 锚通道（Y 轴解法：不猜字段名 ⇒ 改「接通道 + 运行时自报」） ----------
// 结构事实（**非猜测**）：宿主契约 `agent/pre-step` 的 payload 明确含 `messages`（见本文件顶部 API 注，
//   与 exec 视图字段集并列）。⇒「言」与「任务范围」在结构上必然存在于消息流里，不必去猜某个 utterance 字段名。
// 主体分离（责任归因）：授权锚**只由委托人声明喂养**；被审计 agent 的自述**不授权**，它只走言行比对（绑定性）。
//   ⇒ 此处只提取**委托人**的声明；助手消息**只观察、不采信**（避免"上一帧自述"冒充"本帧言"＝假人证）。
// 形状容错 + 自报：宿主消息对象的具体形状未知 ⇒ 结构化容忍抽取；**抽不出即返回 null（不猜）**，
//   并把"看到了什么"（形状 / role 词表）写进通道自报 ⇒ 实机跑一次即可用观测替代猜测。
const PRINCIPAL_ROLE = /^(user|human|principal|operator|owner)$/i;
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
    return { ok: false, shape: msgs === undefined ? 'absent' : typeof msgs, rolesSeen: [], principalText: null, assistantSeen: false, count: 0 };
  }
  const roles = [];
  let principalText = null;
  let assistantSeen = false;
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const m = msgs[i];
    if (!m || typeof m !== 'object') continue;
    const raw = m.role;
    const role = Array.isArray(raw) ? String(raw[0] ?? '') : raw === undefined || raw === null ? '' : String(raw);
    if (role) roles.push(role);
    if (PRINCIPAL_ROLE.test(role)) {
      if (!principalText) {
        const t = textOfContent(m.content ?? m.text ?? '');
        if (t.trim()) principalText = t;
      }
    } else if (role && !assistantSeen && /^(assistant|model|agent|ai)$/i.test(role)) {
      assistantSeen = textOfContent(m.content ?? m.text ?? '').trim().length > 0;
    }
  }
  return { ok: true, shape: 'array', rolesSeen: [...new Set(roles)], principalText, assistantSeen, count: msgs.length };
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

  // 锚通道状态：pre-step 取（委托人声明）→ pre-execute 用。作用域＝一个 step 内的全部工具调用。
  // 委托人声明在本会话内**持续有效**（任务范围不因某一 step 无新指令而失效），直到出现新的声明。
  let principalAnchor = null;
  const channel = {
    steps: 0,
    messagesSeen: 0,
    shape: 'absent',
    rolesSeen: [],
    principalFound: false,
    assistantSeen: false,
    lastCaptureAt: null,
  };

  // ---------- R / D / S / H / M total adjudication: pre-tool-call gate (waterfall) ----------
  ctx.on('tools/pre-execute', async (exec, next) => {
    const a = exec?.arguments ?? {};
    const call = {
      name: exec?.name,
      args: a,
      command: a.command,
      code: a.code,
      // [2026-09-20 · 锚通道] 委托人声明的任务范围（授权锚）。**不是**从 exec 视图猜的字段名：
      //   来源＝`agent/pre-step` 契约里的 messages（见文件顶部 API 注）。缺失即留 null ⇒ 锚池留空
      //   ⇒ 不可逆动作交人工（fail-closed）；**绝不臆造授权**（假人证比无人证更坏）。
      taskAnchor: principalAnchor,
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
    // [2026-09-20 · 锚通道取言] 结构化容忍抽取 + 自报；**抽不出即不采信**（不猜字段名，不制造假人证）。
    const rd = readMessageStream(payload);
    channel.steps += 1;
    channel.shape = rd.shape;
    channel.rolesSeen = rd.rolesSeen;
    channel.messagesSeen = rd.count;
    channel.assistantSeen = rd.assistantSeen;
    if (rd.principalText) {
      principalAnchor = rd.principalText;   // 委托人声明在本会话内持续有效，直到出现新声明
      channel.principalFound = true;
      channel.lastCaptureAt = new Date().toISOString();
      logline(`pre-step anchor captured (${rd.principalText.length} chars, roles=[${rd.rolesSeen.join(',')}])`);
    } else {
      logline(`pre-step anchor NOT found (shape=${rd.shape}, roles=[${rd.rolesSeen.join(',')}]) — 锚池留空，不猜`);
    }
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

  // [2026-09-20 · 锚通道自报] 把"猜宿主字段名"换成"看事实"：实机跑一次即可观测
  //   ① 宿主是否真把消息流交给插件（shape / roles 词表）；② 委托人声明有没有被识别；③ 锚池里有什么。
  ctx.tools.register(defineTool({
    name: 'query_anchor_channel',
    description: 'White-box self-report of the anchor channel: whether the principal\'s declared task scope and the same-frame utterance reached the engine, plus the observed message shape and role vocabulary. Use it on a real host to observe what the host actually passes instead of guessing field names. An empty pool means irreversible actions are handed to a human (fail-closed by design).',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return {
        adapter: channel,
        engine: engine.anchorChannel,
        note: '授权锚只由委托人声明喂养（责任归因）；被审计 agent 的自述不进锚池（否则自我授权）。抽不出委托人消息即不猜 ⇒ 锚池留空 ⇒ 不可逆动作交人工。',
      };
    },
  }));
}

export { name, inject, apply };

// Adapter-layer fusion wiring: S/D quantitative effect sensor (M-gate constrained),
// see src/adapt/sd-effect-sensor.mjs
export { estimateEffectPsi, upliftRank, fusedDecide } from './adapt/sd-effect-sensor.mjs';
