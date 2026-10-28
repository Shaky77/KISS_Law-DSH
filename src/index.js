// KISS's Law (Weiwen's Law) DeepSeek Harness plugin entry (pure ESM, written against real dsh v0.1.0-rc.6 API)
// Form: interception hooks (rigid guard) + tool set (white-box self-check)
// Source: author's revelation (Xia Qi / Shaky77). Framework-native strictly, not softened, not altered.
//
// Real API (calibrated against types & source inside dsh-tools / dsh-agent packages):
//   - Pre-tool-call gate: ctx.on('tools/pre-execute', (exec, next) => Promise<PreToolDecision>)
//       waterfall; return { kind:'deny', reason } to block, or return next() to release.
//       exec read-only view contains { token, callId, name, arguments, signal, agent?, parent? }.
//
//   - Gate coverage & gate position (read from dsh source 2026-09-20, settling an earlier "unknown"):
//       · Coverage is **structural, not conventional**: `ToolRegistry.prepareExecution` runs
//         `ctx.waterfall(carrier, 'tools/pre-execute', exec, …)` for **every** execution
//         (dsh-tools/lib/index.js), and the package's own invariants enforce "pre-execute fires once
//         per execution, and before execute/post-execute" (dsh-tools/lib/invariant.js).
//         Container sub-calls (Code Mode `run_code` dispatch) carry `parent: exec.token`
//         (dsh-tools/lib/code-mode.js) and pass through the same gate.
//         ⇒ Nothing bypasses the gate by construction — so no per-caller exception is needed here,
//           and none is allowed (locked by test: derived/sub-agent calls adjudicate identically).
//       · Position is **between decided and done**: the gate runs after the agent has *produced* the
//         call and before dispatch. The agent's **speech** lives upstream of the gate, i.e. inside H
//         (out of the coordinate graph). ⇒ On this side we can only adjudicate **act vs principal
//         scope** (both in-graph). This is why the speech window is *not* an anchor source: it is not
//         "a channel we failed to wire", it is a quantity that the graph does not contain.
//       · Position quantities given freely by the host here: `agent` (who) / `parent` (derived from
//         which call) / `token` · `callId` (where this act sits). Structural ⇒ usable.
//         Content quantities (`arguments`, and any narrative) ⇒ never authorization.
//   - Pre-step gate: ctx.on('agent/pre-step', (payload, next) => Promise<PreStepDecision>)
//       payload = { agent, messages, step, signal }; return { kind:'reject' } to reject the whole step (no reason field).
//   - Receipt gate: ctx.on('tools/post-execute', (exec, result, next) => Promise<PostToolDecision>)
//       waterfall; runs after the act has landed and before the receipt reaches the model. Return
//       { kind:'block', feedback:[ContentBlock] } and the host returns the call as an isError whose
//       content is that feedback; return next() to accept. Failed calls DO pass through it
//       (dsh-tools: "Tool and unknown-tool failures still receive post-execute").
//   - Audit hook: ctx.on('tools/result', (res) => void) observe only, do not rewrite (result already immutable).
//   - Tool registration: ctx.tools.register(defineTool({ name, description, parameters, output:{schema,render}, async execute(args, exec) }))
//       output is a mandatory field (mandatory canonical output declaration).
//
// Still an RC preview; official notes future breaking API changes; re-check against the current official docs before real-device integration.

import { writeFileSync, appendFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { WeiwenLawEngine, DEFAULT_RIGID_ANCHORS } from './core/engine.mjs';
import { R_DOMAIN, THREE_IRON_LAWS } from './core/law.mjs';
// [2026-10-21 中英对齐 · synced from the CN edition] Criterion-wiring readout (read-only surface):
//   makes "which criteria in the library actually enter the computation" auditable.
//   No verdict, no state writes, no gate participation — meta-cognition may READ, never RULE
//   (docs/runway-and-criterion §4).
import { readout as criterionReadout } from './core/readout.mjs';
// [2026-10-21] Five-stratum readout (R→S→D→H→M, each layer given a substitutable quantity).
import { strataReadout } from './core/strata.mjs';
// [2026-10-21] Four-layer nesting (macro/micro inside R/S/D/H) + M's directional form.
import { NESTED_VARS, M_CONSTRAINT, mDirection, mTwoLayer, mConstraintShape, nestAudit } from './core/nested.mjs';
// [2026-10-21 12:0x · author ruling] Variables as acts: R = look-up (an act), H = observer stance
//   (a choice), plus the three-notch measure of the S↔D tension L.
//   Author: "don't make R a fixed assignment, make it an executable act; the tension in between
//   I haven't worked out — I'm a humanities person, this is engineering, you try."
import {
  R_ACTION, H_OBSERVER, H_PERMIT, hPermitOf, LOSS_BEARER, lossRoute, tensionOf, slidePos, verbAudit,
  TENSION_OUTPUT, checkTensionOutput,
  R_ONTOLOGY, R_SCALE, R_RELAY, rSourceGrade, MARGIN_CONSENSUS, pickMargin, notchCapOf,
  CLAUSE_SLOTS, checkClauseShape,
  H_AUTHORITY, CAPACITY_VS_LIABILITY, ESCALATION, ESCALATE, mustEscalate, EVIDENCE_LIFECYCLE,
  GATE_FOLD, gateOf,
  PROVENANCE_ATTESTATION,
  H_UMBRELLA, H_FACETS, H_SHAPE, INNER_OUTER_SEAM, FACET_DISCIPLINE, facetOf, isCrossFacet, FORMULA_INPUT,
} from './core/verb.mjs';
import { bugKeyOf } from './core/bugstop.mjs';
import { defineTool } from '@deepseek-ai/dsh-tools';

const LOG = new URL('./runtime.log', import.meta.url);

// ---------- buildId: a fingerprint of the criteria code (2026-10-27, requested by external auditor node "xiaoD") ----------
// Origin: xiaoD reported three gaps against `0.2.0`; two of them had already been fixed by later commits.
//   He was not wrong — the *package* carried no fingerprint. The line numbers he cited (`L2189/L2218`) had
//   long since moved inside a 2643-line file. When a line number is the only locating device, the question
//   "is the code you measured the code I am describing?" can only be answered by self-report, and self-report
//   is not auditable.
// Criterion (why not `package.json`'s version): **a version number is written by a human and can be forgotten;
//   a content hash changes the moment the content changes.** So the fingerprint derives from the content of
//   `src/core/*.mjs` only — no version number, no timestamp. `_engine_base_*` is a baseline copy excluded at
//   packaging time; its presence locally would pollute the hash, so it is excluded explicitly.
// Semantics: same buildId ⇒ same criteria code; different ⇒ the two readings may not be cross-credited.
//   It does **not** mean "newer / older" — that question needs the commit log.
// 🔴 Line endings must be normalised before hashing (measured 2026-10-27 on a real install):
//   hashing raw working-tree bytes gave the *same code* two different fingerprints depending on install path:
//     inside the npm package (old files checked out as CRLF by autocrlf) → `8e8604efd2cf`
//     git storage / a Linux checkout (LF)                            → `91fea30b57f8`
//   The *only* purpose of buildId is "is the code you measured the code I am describing". Mixing in a platform
//   convention unrelated to the code destroys that purpose, and destroys it in the worst way: a mismatch gets
//   read as "you installed an old package" rather than "the fingerprints were taken under different conventions"
//   — which sends the reader down the wrong path. Hence: normalise, then hash.
export function computeBuildId(entries) {
  const h = createHash('sha256');
  for (const [name, content] of [...entries].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
    h.update(name);
    h.update(String(content).replace(/\r\n/g, '\n'));
  }
  return h.digest('hex').slice(0, 12);
}

const BUILD_ID = (() => {
  try {
    const dir = new URL('./core/', import.meta.url);
    const entries = readdirSync(dir)
      .filter((n) => n.endsWith('.mjs') && !n.startsWith('_engine_base_'))
      .map((n) => [n, readFileSync(new URL(n, dir)).toString('utf8')]);
    return computeBuildId(entries);
  } catch { return 'unavailable'; }
})();

// 🔴 [2026-10-27 · second blind spot, raised by xiaoD after real measurement] `buildId` hashes only
//   `src/core/*.mjs` ⇒ **a change to the adapter layer (this file) is invisible to it.** Between 0.2.5 and
//   0.2.6 the adapter and the docs changed while buildId did not move at all (both versions reported
//   `91fea30b57f8`; only `loadedAt` differed).
//   ⇒ This is not "the fingerprint computed wrong", it is a question of **coverage**: buildId answers
//   "is the criteria code the same", not "is the whole behavioural surface the same".
//   Disposition: **do not widen buildId's coverage** — widening would void every recorded value the project
//   has published for 0.2.0–0.2.6 and break historical reconciliation. Instead place a **second** fingerprint
//   beside it, with its own meaning:
//       `buildId`   = criteria domain  (src/core — decides *what it is judged to be*)
//       `bundleId`  = behaviour domain (all of src, adapter included — decides *how it lands on the host*)
//   Carrying both means: whichever one moved tells you what moved, without guessing from a version number.
const BUNDLE_ID = (() => {
  try {
    const walk = (dir, prefix) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
      if (e.isDirectory()) return walk(full, `${prefix}${e.name}/`);
      if (!e.name.endsWith('.js') && !e.name.endsWith('.mjs')) return [];
      if (e.name.startsWith('_engine_base_') || e.name === 'runtime.log') return [];
      return [[`${prefix}${e.name}`, readFileSync(full).toString('utf8')]];
    });
    return computeBuildId(walk(new URL('./', import.meta.url), ''));
  } catch { return 'unavailable'; }
})();
const LOADED_AT = new Date().toISOString();

function logline(s) {
  try { appendFileSync(LOG, `[${new Date().toISOString()}] {b:${BUILD_ID}} ${s}\n`); } catch { /* log failure does not block the guard */ }
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

// ---------- Structural entry (host integrator side; unreachable by the model): broken-window heal ----------
// Why this entry is mandatory, not a convenience (structural reason):
//   once the broken window is in force, `pre-execute` refuses **every** call — including the repair
//   action itself ⇒ with no host-side entry the break is a **session-level deadlock** (the only way
//   out is restarting the process). The engine already has `healWindow()`, but it is only reached
//   through `resolveBug()` (closed loop verified) and `settleWindow()` (phase expiry) — and in a DSH
//   session neither is reachable by the audited model ⇒ what was missing is the **wire**, not the
//   **capability**. This export is that wire.
// Same discipline as `setPrincipalScope`: a module-level API, **not a tool** ⇒ the model cannot call
//   it ⇒ self-unlocking is structurally impossible (separation of principal is guaranteed by position,
//   not by inspecting content).
// Heal is traced (append-only, cap 20): releasing a stop-loss is an accountability event — a silent
//   clear would leave "when/why did it lift?" unanswerable afterwards.
const _liveEngines = new Set();
const _windowHeals = [];
/**
 * Host-side: explicitly reset the D broken-window stop-loss **after the fault is actually fixed**
 * (or after a human ruling). Applies to every plugin instance registered in this process.
 * @param {string} note why it is being lifted (recorded in the trace; null if omitted)
 * @returns {{at:string, note:string|null, kind:string, instances:number, wereBroken:number}}
 *          `wereBroken` = how many instances were actually in the broken state before the reset
 */
export function healBrokenWindow(note) {
  const at = new Date().toISOString();
  const text = typeof note === 'string' ? note.trim() : '';
  let wereBroken = 0;
  for (const e of _liveEngines) {
    try {
      // Truthful accounting: count the state *before* healing, so the report cannot claim a heal
      // that had nothing to heal.
      if (e.windowBroken || e.failureStreak >= e.maxFailureStreak) wereBroken += 1;
      e.healWindow();
    } catch { /* one bad instance must not block the others */ }
  }
  const rec = { at, note: text || null, kind: 'heal-window', instances: _liveEngines.size, wereBroken };
  _windowHeals.push(rec);
  if (_windowHeals.length > 20) _windowHeals.shift();
  logline(`healBrokenWindow(${text || 'no note given'}) — instances=${_liveEngines.size}, wereBroken=${wereBroken}`);
  return rec;
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

// ---------- Receipt-gate helpers (2026-09-21) ----------
// Failed-ness is read from the host's own structural marks (`isError` / an `error` object), never by
// string-matching the outcome — the same discipline as "position quantities are structural, content
// quantities are not authorization".
function isFailedReceipt(result) {
  return result?.isError === true || result?.error != null;
}

// The host replaces the receipt `content` with our `feedback` when it blocks, so the original outcome
// must be carried across — otherwise a block destroys the very evidence it is based on.
function receiptTextOf(result, limit = 800) {
  const blocks = Array.isArray(result?.content) ? result.content : [];
  const parts = [];
  for (const b of blocks) {
    if (typeof b === 'string') parts.push(b);
    else if (b && typeof b.text === 'string') parts.push(b.text);
    else if (b && typeof b.type === 'string') parts.push(`[${b.type}]`);
  }
  let s = parts.join('\n').trim();
  if (!s && typeof result?.error?.message === 'string') s = result.error.message.trim();
  if (!s) return '(empty receipt)';
  return s.length > limit ? `${s.slice(0, limit)}…[truncated, ${s.length - limit} chars omitted]` : s;
}

// Framework-native corrective: halt, then close the loop. Not an apology, not a retry hint — the
// receipt is where M lands, so it must say what M requires before re-entry.
function haltFeedback(bw, bugKey) {
  return [
    "[KISS's Law · D broken-window stop-loss / M First-Bug Halt]",
    bw.reason,
    // [2026-10-28 · reading shape] The ledger keeps counting (S only grows), but the threshold reading must
    //   cap — otherwise receipts show 6/5, 7/5, reading as "the threshold is 5, so why 7". The engine supplies
    //   `display` (5/5 + excess); the adapter does not re-compare thresholds of its own.
    `This receipt is the point where the deviation accrual reached the threshold (${bw.display ?? `${bw.streak}/${bw.cap}`}).`,
    'The break point lands HERE — on this receipt — not on some later call: once the broken window is in',
    'force every later call is refused before it executes, so this is the last moment the framework can speak.',
    'Required before re-entry (backtracking alone does not close the loop):',
    '  1. reverse-deduce the logic of what just failed;',
    '  2. trace-mark the root-cause layer (M closed loop: reverse → trace → fix);',
    '  3. fix it and pass verification — only then may this call be re-issued.',
    // [2026-10-28] Ownership of the reset must be stated: without it the agent assumes "retry once more" or
    //   "I cannot unlock this myself" and turns a stop into an infinite loop.
    '  ⚠️ The reset is NOT in your hands: the broken window is cleared by the **host side** (host calls the exported healBrokenWindow(note),',
    '     or resolveBug(bugKey) resets it automatically once the fix verifies).',
    '     What you can do: read this receipt and the self-audit readings (self-audit tools stay available while',
    '     broken), complete the three steps above, and hand the result to the host.',
    `Do not re-issue this call, or any look-alike, as-is. BUG identity: ${bugKey}.`,
  ].join('\n');
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
  // 🔴 [2026-10-28 · broken-window scope narrowed] The self-audit roster must exist **before** the engine and be
  //   handed to it as the **same Set object**. One home only: if the engine copied it, "registered but the engine's
  //   copy was not updated" would fail silently — this repo has already been burned by two tables judging the same
  //   call (SLOT_PATH / _SH12_LOC_KEY), and we are not doing that a second time.
  //   Why not infer from tool names or arguments: that is the audited party's own account (same rule as "words do
  //   not enter the anchor pool").
  const SELF_AUDIT_TOOL_NAMES = new Set();
  const engine = new WeiwenLawEngine({
    rigidAnchors: DEFAULT_RIGID_ANCHORS,
    selfAuditTools: SELF_AUDIT_TOOL_NAMES,
  });
  // ── Tool declarations (layer two · 2026-10-28): the trusted side reports a verb for tools whose name carries none ──
  //   Origin: `glob` / `grep` / `list_dir` have no action word in their names ⇒ the attribution layer cannot tell
  //     ⇒ everything is referred. Measured (14-cell comparison): ordinary in-domain read-only actions passed 3/7;
  //     with the host declaring them, 7/7.
  //   🔴 Why an environment variable: the same route as the capability pass — **the environment is the host's
  //     configuration surface, and the audited party cannot change its own environment.** If a declaration could be
  //     read from the tool-call arguments, the agent would ship `{'verb':'read'}` and authorise itself.
  //   🔴 Why the host must report it: argument shape is **one-to-many** — `glob{pattern}` and
  //     `delete_matching{pattern}` have exactly the same shape, so shape cannot determine the layer. And the host
  //     **already knows**, when registering the tool, whether it reads or deletes.
  //   Format (either one):
  //     WEIWEN_TOOL_DECLS='{"glob":{"verb":"read"},"grep":{"verb":"read"}}'
  //     WEIWEN_TOOL_DECLS='@/abs/path/decls.json'      ← convenient to version-control and to audit
  //   ⚠️ A parse failure must not quietly become "no declarations, so nothing to do": no declaration already means
  //     **everything is referred** (fail-closed), which is the safe direction; but the reason must go into the log,
  //     otherwise it is another silent failure (the same lesson as the capability pass).
  if (process?.env?.WEIWEN_TOOL_DECLS) {
    const raw = String(process.env.WEIWEN_TOOL_DECLS).trim();
    try {
      const json = raw.startsWith('@') ? readFileSync(raw.slice(1), 'utf8') : raw;
      const map = JSON.parse(json);
      const n = engine.declareTools(map);
      logline(`env WEIWEN_TOOL_DECLS -> ${n}/${Object.keys(map).length} 条声明生效（${Object.keys(map).join(',')}）`);
    } catch (e) {
      logline(`env WEIWEN_TOOL_DECLS -> invalid(${e?.message ?? e}) ⇒ 全部按"无声明"处理（交还，不放行）`);
    }
  }
  // Register this instance so the host-side heal entry (`healBrokenWindow`) can reach it. A host may
  // inject the plugin many times in one process (one per agent/session, and harnesses re-inject per
  // case) ⇒ the set is bounded: past 32 instances the oldest ref is dropped, so heal stays a "lift the
  // stop-loss in this process" action instead of an unbounded reference holder.
  _liveEngines.add(engine);
  if (_liveEngines.size > 32) _liveEngines.delete(_liveEngines.values().next().value);
  logline('apply() entered — registering tools/pre-execute, agent/pre-step, tools/post-execute (receipt gate), tools/result and white-box self-check tools');

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
    // [2026-09-20 · 位置量观测] 宿主在门这一侧**自带**的结构位置：`agent`（谁在调）/ `parent`（从哪派生）。
    //   纯观测、**不参与裁决**（授权仍只认委托人声明的范围）；用途＝实机一跑即知该宿主是否给位置量，
    //   以及**派生调用有没有被计数**（＝"门覆盖全路径"的可观测证据，非推测）。
    callSites: { total: 0, withAgent: 0, withParent: 0 },
    // [2026-09-21 · 回执门观测] 第三个真能拦的门位置在回执侧。这里只**如实记数**，供实机跑一次即知
    //   门有没有被派发、失败回执有没有到达、阻断有没有真的发生 —— 不猜宿主行为。
    receiptGate: {
      seen: 0,            // 经过回执门的调用数（含成功，证明门被派发）
      failedSeen: 0,      // 其中带失败信号的（门只对这些施加裁决）
      blocked: 0,         // 实际阻断数（回执被改写成纠错错误）
      failOpen: true,     // 监听器抛错 ⇒ accept：门不得把健康运行弄坏
      cap: engine.maxFailureStreak,
      lastAt: null,
      lastReason: null,
      lastStreak: null,
    },
  };

  // ---------- R / D / S / H / M total adjudication: pre-tool-call gate (waterfall) ----------
  ctx.on('tools/pre-execute', async (exec, next) => {
    channel.callSites.total += 1;
    if (exec?.agent !== undefined) channel.callSites.withAgent += 1;
    if (exec?.parent !== undefined) channel.callSites.withParent += 1;
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
      // ═══ White-box carry-through: fact positions pass by DEFAULT (2026-09-24 · structural fix, not name-picking) ═══
      // Before: this was "pick by name" — only bugKey/closedLoop/missing/stage/risk were listed, so **every other fact position the engine produced was silently dropped**.
      // Measured (probe-whitebox-egress.mjs `before`, 24 real-API inputs / 18 decisions, same-instant-same-object method):
      //   conduction dropped 18/18 · innerH 18/18 · mMark 17/18 · attrib 15 · deduced 10 · scarUnanchored 9 · fractalSubM 6 · systemKey/actionText/equivalence/mCrossCheck 1 each — 11 field families total.
      //   Dropping `innerH` in particular directly violates the engine-side inner-H protocol ④: "deliver the outer-H deduction result and the inner-H parked state **together**".
      // Why structural instead of "add the missing names": fields evolve with the engine, so **enumeration can never catch up** (X axis); egress must pass by POSITION (Y axis) — one change covers all present and future fact positions.
      // Host contract read from source (dsh-tools/lib/index.js:3002 reads only kind/reason; lib/types/index.d.ts:408 types only {kind,reason})
      //   ⇒ extra fields are ignored and not strictly validated ⇒ harmless to the host; white-box for downstream plugins and the audit surface.
      // The exclusion list is defined by NATURE (only "internal-implementation positions": engine-instance refs / mutable internal state / inner-H deduction process), never a name blacklist.
      //   Measured: all engine outputs across 18 decisions are **JSON-serialisable, no cycles, no functions** (sample 2456 B) ⇒ nothing currently falls into the exclusion.
      const INTERNAL_ONLY = [];   // internal-implementation positions only; fact positions always pass
      const out = { ...decision, kind: 'deny', law: decision.law, reason: `[KISS's Law·${decision.law}] ${decision.reason}` };
      for (const k of INTERNAL_ONLY) delete out[k];
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
      // ═══ White-box carry-through: what the interface sees = what the log records (same object, no fork) ═══
      // The log is the append-only audit surface (src/runtime.log, gitignored, not committed). Writing a second "summary" here
      //   means two copies that can drift, at which point white-box degrades into "looks white-box" ⇒ so what is logged is **the very object returned**.
      logline(`pre-execute ${exec?.name} -> ${decision.kind}${isReview ? '(awaitingHuman, bugKey=' + out.bugKey + ')' : ''} | whitebox ${JSON.stringify(out)}`);
      return out;
    }
    // allow: leave a white-box record too — otherwise "was not blocked" becomes an **unrecorded event** (isomorphic to the engine rule "every conduction leaves a mark").
    logline(`pre-execute ${exec?.name} -> whitebox ${JSON.stringify(decision)}`);
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
      if (decision.kind === 'review') {
        // PreStepDecision 契约仅 {kind:'reject'}、不携带 reason/branches，
        // 故富信息（定义不明缘由 + 留证身份 + 推演后果）记入 runtime.log 供审计，
        // 宿主侧以 reject 阻断该步、交还用户裁决。
        // [2026-09-24 同构回填 · base A → B] 这一格是 base A 的既有能力：契约不给回传通道时，
        //   **唯一不留白的方式是把留证写进审计日志** —— 否则 pre-step 的 review 事后不可追溯（bugKey 与后果双失）。
        const call = { name: 'pre-step', args: { messages: payload?.messages } };
        const bug = bugKeyOf(call);
        const branches = deduceBranches(engine, call);
        logline(`pre-step review (definition unclear) -> suspend & return to user for decision, bugKey=${bug}` + (branches ? ` branches=${JSON.stringify(branches)}` : ''));
      } else {
        logline(`pre-step -> reject(${decision.law})`);
      }
      // ═══ White-box carry-through: isomorphic to tools/pre-execute ═══
      // The host contract (PreStepDecision) only accepts {kind:'reject'} ⇒ rich information **cannot leave via the return value**,
      //   so the log is the only white-box surface at this exit. Before, only a few names were picked for the log
      //   (bugKey / branches) — the same "pick by name" defect: neither the engine decision object itself (law/reason)
      //   nor **this decision's chain landing** (engine.conduction) reached the audit surface.
      // Now the **engine decision object itself** is recorded verbatim, plus adapter additions (same rule: by position, never by name).
      logline(`pre-step -> whitebox ${JSON.stringify({ ...decision, bugKey: bugKeyOf({ name: 'pre-step', args: { messages: payload?.messages } }), conduction: engine.conduction ?? [] })}`);
      return { kind: 'reject' }; // PreStepDecision only {kind:'reject'}, no reason field
    }
    return next();
  });

  // ---------- D broken-window stop-loss at the receipt: post-execute gate (waterfall) ----------
  // Position: after the act has landed, before the receipt reaches the model — the last adjudication
  // point in the whole pipeline. Contract read from dsh-tools source (2026-09-21), not guessed:
  //   · Coverage — `ToolRegistry.postExecute` runs for every execution that is not already final, and
  //     the package states outright that "Tool and unknown-tool failures still receive post-execute"
  //     (dsh-tools/lib/index.js) ⇒ a failed or unknown tool is adjudicated here too.
  //   · The verdict is consumed — `{kind:'block', feedback}` makes the host return the call as an
  //     `isError` whose `content` is the corrective `feedback` (postExecute, same file). Not decoration.
  //   · A throwing listener turns the whole call into an error ⇒ this body never throws at the host:
  //     every path degrades to `accept` (fail-open). A gate that can break a healthy run is worse
  //     than no gate.
  // Why adjudicate **here** (structural reason, not back-filling a gap we forgot):
  //   once the broken window is in force, every later call is refused at pre-execute and **never
  //   reaches a receipt** ⇒ the receipt side gets exactly one chance to speak: the failure that brings
  //   the deviation accrual to the threshold. After that it is structurally silent — the window closed.
  //   ⇒ So this is not "one more interception". It is **where the break point lands**: the fault
  //     receipt is severed into a corrective receipt on the spot (M lands on the receipt), instead of
  //     only refusing the *next* call.
  // Fail-open boundary, stated up front: adjudication applies **only to receipts that already failed**.
  //   A successful result is passed through untouched (no content replacement, no value rewrite) — so a
  //   misjudgement can never turn a healthy outcome into an error.
  ctx.on('tools/post-execute', async (exec, result, next) => {
    let decision = null;
    try {
      channel.receiptGate.seen += 1;
      if (isFailedReceipt(result)) {
        channel.receiptGate.failedSeen += 1;
        const bw = engine.breakAtReceipt();
        if (bw) {
          const call = {
            name: exec?.name,
            args: exec?.arguments ?? {},
            command: exec?.arguments?.command,
            code: exec?.arguments?.code,
          };
          const bugKey = bugKeyOf(call);
          decision = {
            kind: 'block',
            law: 'D',
            reason: `[KISS's Law·D] ${bw.reason}`,
            bugKey,
            closedLoop: true,
            // The host replaces the receipt `content` with this feedback, so the original outcome must
            // be carried across — a block may never destroy the evidence it is based on.
            feedback: [
              { type: 'text', text: haltFeedback(bw, bugKey) },
              { type: 'text', text: `--- original receipt, preserved ---\n${receiptTextOf(result)}` },
            ],
          };
          // Counters and the log line are written only once the block is actually delivered: if building
          // the feedback throws, the catch below degrades to accept — and a counter incremented earlier
          // would then be claiming a block that never happened.
          channel.receiptGate.blocked += 1;
          channel.receiptGate.lastAt = new Date().toISOString();
          channel.receiptGate.lastReason = bw.reason;
          // Reading uses `display` (threshold capped + excess reported separately), never the raw streak:
          //   while broken, the raw streak shows 6/5, 7/5.
          const streakText = bw.display ?? `${bw.streak}/${bw.cap}`;
          channel.receiptGate.lastStreak = streakText;
          logline(`post-execute ${exec?.name} -> block (D broken-window at receipt, ${streakText}, bugKey=${bugKey})`);
        }
      }
    } catch (e) {
      decision = null;   // fail-open
      logline(`post-execute gate failed open: ${e?.message ?? e}`);
    }
    // ═══ White-box carry-through: isomorphic to the two exits above (what is logged is the very object returned, no fork) ═══
    // The receipt-side terminus (where D's break-window stop-loss lands) previously left only a one-line summary
    //   (streak/bugKey) ⇒ the feedback text handed back to the host (the evidence the block was based on) never reached
    //   the audit surface. Now the whole record is written: the mark and the delivery share one source.
    if (decision) logline(`post-execute ${exec?.name} -> whitebox ${JSON.stringify(decision)}`);
    return decision ?? (typeof next === 'function' ? next() : { kind: 'accept' });
  });

  // ---------- White-box audit: result hook (observe only, do not rewrite) ----------
  // Host contract (dsh-tools/lib/types/index.d.ts): `'tools/result'(exec, result)` — the FIRST parameter
  // is the execution; the frozen result is the SECOND. Reading `error` off the first parameter turns
  // failure accrual into a silent no-op, and the real-device run proved exactly that (2026-09-21): the
  // accrual never happened, so the receipt gate above projected failureStreak = 0 forever and could
  // never speak. Position, not content — the slot is part of the contract, so no shim for the old shape.
  ctx.on('tools/result', (exec, result) => {
    if (result?.error) {
      engine.onFailure();
      logline(`result audit: failure accrued (streak=${engine.failureStreak}/${engine.maxFailureStreak})`);
    }
  });

  // ---------- White-box self-check tools (model can query, verify framework running) ----------
  const renderObj = (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }];

  // 🔴 [2026-10-27 · cure instrument self-reference] **Explicit registry** of self-audit tools.
  //   Why a registry rather than reading the tool name: the `query_` prefix is a **word form**, and a word-form
  //   criterion is enumeration (a future `get_*` / `inspect_*` self-audit tool would be missed — and the
  //   consequence of missing one is precisely the self-reference coming back).
  //   Registration and registration-as-a-self-audit-tool are **one action here** (`registerSelfAuditTool` does
  //   add + register together) ⇒ "registered but forgot to record it" is structurally impossible. This is a
  //   structural position, not list maintenance.
  //   ⚠️ Every tool this plugin exposes is a read-only self-check (reads engine state, no side effects).
  //      If a tool with side effects is ever added, it must go through `ctx.tools.register` directly and
  //      **must not** go through this function.
  //    (The roster itself, `SELF_AUDIT_TOOL_NAMES`, is created at the top of apply() and shared with the engine
  //     by reference — see the note there. 2026-10-28: the same roster now also defines the **broken-window range**:
  //     while the window is broken only registered self-audit read-only tools pass, everything else is still denied.)
  const registerSelfAuditTool = (def) => {
    SELF_AUDIT_TOOL_NAMES.add(def.name);
    return ctx.tools.register(def);
  };

  registerSelfAuditTool(defineTool({
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

  registerSelfAuditTool(defineTool({
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

  registerSelfAuditTool(defineTool({
    name: 'query_conduction_chain',
    description: 'Return the conduction-chain order R→S→D→H→M and the framework essence, plus the **actual chain landing of the most recent decision** (per-node readings and verdict), so the model can understand the closed-loop structure and audit the basis of the latest verdict.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      // 🔴 [2026-10-27 · instrument self-reference fix] Before the fix this read `engine.conduction`
      //   (which holds only "the most recent one").
      //   Defect: this tool also passes through the gate ⇒ its own decision overwrites "the most recent one"
      //   ⇒ what it reads back is always **itself**.
      //   Measured (xiaoD): after glob→deny, calling this tool reported allow / law:推演 / layer=file-read /
      //   vacuum — that was not glob's chain, it was this tool's own. Every "look at the chain" self-check
      //   before the fix was a self-portrait.
      //   Fix: read from the **decision history**, taking "the most recent decision that is not a self-audit
      //   tool" (self-audit tool names are explicitly registered in SELF_AUDIT_TOOL_NAMES).
      const subject = engine.lastConductionExcluding(SELF_AUDIT_TOOL_NAMES);
      const hist = Array.isArray(engine.conductionHistory) ? engine.conductionHistory : [];
      const excluded = hist.filter((e) => SELF_AUDIT_TOOL_NAMES.has(e.tool)).length;
      return {
        chain: ['R rigid anchor', 'S steady-state reserve', 'D break-window stop-loss', 'H inner-H inviolability', 'M First-Bug Halt'],
        essence: 'White-box presentation of causal-law runtime structure: survival (never abandon any node) and precision (structure carries its own anchors) are isomorphic.',
        // [2026-09-24 · white-box carry-through] Before, this tool **returned a constant**: no matter what had happened, you read the same text
        //   ⇒ a surface that looks like a white-box query but is in fact a black box (nobody outside can re-derive any single verdict from it).
        //   Meanwhile the chain landing of the latest decision has **always been present** on the engine side
        //   (each R→S→D→H→M node carries sBefore/sAfter/delta/verdict readings) ⇒ echo it as-is, unprocessed.
        //   No new criterion, no change to adjudication, no field-picking (same rule: faithful by position, never summarised by name).
        lastConduction: subject ? subject.conduction : [],
        // The subject must be **named**: without "whose chain is this", the reader cannot tell whether they are
        // looking at an action or at the instrument itself.
        lastConductionSubject: subject
          ? { tool: subject.tool, kind: subject.kind, law: subject.law, seq: subject.seq, at: subject.at }
          : null,
        lastConductionNote: subject
          ? 'The most recent decision by a tool that is **not** a self-audit tool (per-node readings). The judged tool is named in lastConductionSubject.tool.'
          : 'No decision by a non-self-audit tool in this session yet — an empty array is a positive reading (nothing to look at yet), not an error.',
        // Self-reference made **visible rather than silently handled**: how many were excluded, and which are registered.
        selfAuditExcluded: excluded,
        selfAuditTools: [...SELF_AUDIT_TOOL_NAMES],
      };
    },
  }));

  registerSelfAuditTool(defineTool({
    name: 'query_boundary',
    description: 'Query the inner-H boundary: this plugin does not invade the subjective black-box (neither reads nor writes).',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return { innerH: 'inviolable', read: false, write: false, note: 'White-box does not invade black-box: mind/free will are the subjective black-box, cannot be read or written.' };
    },
  }));

  // Three Iron Laws (white-box self-check: model can query the framework's immutable constraints)
  registerSelfAuditTool(defineTool({
    name: 'query_iron_laws',
    description: 'Return the finalized text of KISS\'s Law three iron laws (immutable): inner H inviolability / First-Bug Halt / never abandon any node. For the model to calibrate direction and self-check boundaries.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return { ironLaws: THREE_IRON_LAWS };
    },
  }));

  // First-Bug Halt closed-loop state machine white-box self-check (author completion 2026-08-21)
  registerSelfAuditTool(defineTool({
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
  registerSelfAuditTool(defineTool({
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

  // ════════════════════════════════════════════════════════════════════
  // [2026-10-21 中英对齐] 以下四个工具同步自中文本仓（weiwen-law-dsh）。
  //   对齐纪律：**结构一致、条目随本体**。描述面翻英文（对外可用），note 面保留中文
  //   （两仓同源、判据表述不分叉）。参数顺序与中文本仓逐项对齐。
  //   四者全部是**只读面**：不产生 verdict、不写状态、不进任何闸门。
  // ════════════════════════════════════════════════════════════════════

  // [2026-10-20] 判据接线自查（元认知的第一个可观测面）
  registerSelfAuditTool(defineTool({
    name: 'query_criterion_wiring',
    description: 'Criterion-wiring self-check (read-only). The library\'s criteria are registered into four buckets — decision slot / readout slot / declaration slot / undetermined — and this returns the members of each, the gaps already declared on paper (criteria that should have been wired but were not), and whether each of the three time phases (past · present · future) of the causal chain is connected. Answers one question: "of the rules I know, how many actually enter the computation". Changes no allow/deny verdict.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return {
        buildId: BUILD_ID,
        bundleId: BUNDLE_ID,
        loadedAt: LOADED_AT,
        ...criterionReadout(engine),
        note: '只读面：不产生 verdict、不写状态、不参与闸门。gaps 是如实登记的缺口（不是免责通道）；unmapped 是欠账，不视为通过。双指纹：buildId＝src/core 内容哈希（判据域，答判成什么）；bundleId＝src 全量含本适配层（行为域，答怎么落到宿主上）。都不含版本号 ⇒ 外部审计方可自行重算比对外，不必依赖被测方自报包版本。',
      };
    },
  }));

  // ── 五层推演读数（R→S→D→H→M，逐层给「可代入量」）──────────────────
  registerSelfAuditTool(defineTool({
    name: 'query_strata',
    description: 'Five-stratum readout (read-only): walks R→S→D→H→M and returns, per layer, the quantities that can actually be substituted into the formula — each with its expression and with "where it stops". Three states are explicit: ok (computable now) / pending (missing a constant or its evidence, carrying a TBD pointer) / absent (the quantity does not exist in the implementation). Also returns the cross-layer substitution bans (e.g. ΣS and S_now aggregate in opposite directions and may not stand in for each other). The R layer additionally exposes the domain-capacity face: p_max (evidenced standard value) / N_opp (denominator, absent in the engine) / R₀ (= p×N) / rCapRoute (which formula this domain should use), plus a domain-table health check that counts "malformed entry" separately from "legal standard that gives no number". Changes no allow/deny verdict.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return {
        ...strataReadout(engine),
        note: '只读面：不产生 verdict、不写状态、不参与闸门。pending/absent 是如实登记，不是免责通道；pending 必带 evidence 线索，absent 必带缺口说明。',
      };
    },
  }));

  // ── 四层嵌套（R/S/D/H 各自的宏观／微观）＋ M 公式方向 ─────────────
  registerSelfAuditTool(defineTool({
    name: 'query_nested',
    description: 'Four-layer nesting readout (read-only): returns, for R/S/D/H, the macro form, the micro form, the containment relation (which binds which), the termination criterion for expansion, and a medical-domain instance; plus the DIRECTION of M = (R×S)/(D×H) — up / down / indeterminate, never a number, because the formula\'s own text forbids assignment and computation. Pass per-layer deltas (-1/0/+1) to get a direction. Also returns the shape test for the formula constraint `0 < H/(S↔D) < R`: `↔` is NOT an operator — it marks the internal rail of H (S end ↔ D end), H being a slider on that rail — so only the slider\'s position shape is judged (on_rail / off_low / off_high / unknown), never a number. Pass hPosition to judge the shape. Produces no verdict and enters no gate.',
    parameters: {
      delta: { type: 'object', description: 'Per-layer change: {R,S,D,H}, each -1 (down) / 0 (unchanged) / +1 (up). Omit to get static structure and the audit only.' },
      macroDelta: { type: 'object', description: 'Macro-layer change in two-layer mode (optional); giving it together with microDelta switches to the two-layer containment judgement.' },
      microDelta: { type: 'object', description: 'Micro-layer change in two-layer mode (optional).' },
      hPosition: { type: 'string', description: 'H\'s position shape on the S↔D rail: inside (strictly on the rail) / at_s (pinned to the S end, agency at zero) / at_d (pinned to the D end, at R\'s scale) / beyond (past R, out of domain). Omit and it is not judged (unknown, which is not the same as satisfied).' },
    },
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute(args = {}) {
      const out = { vars: NESTED_VARS, audit: nestAudit(), constraint: M_CONSTRAINT };
      if (args.macroDelta || args.microDelta) {
        out.twoLayer = mTwoLayer(args.macroDelta || {}, args.microDelta || {});
      } else if (args.delta) {
        out.direction = mDirection(args.delta);
      }
      if (args.hPosition !== undefined) {
        out.constraintShape = mConstraintShape({ pos: args.hPosition });
      }
      out.note = '只读面：M 只输出方向，不输出数值（CORE_FORMULA: 定性方向关系，不赋值）。indeterminate 是定性关系的上限，不是缺口。⚠️ `↔` 不是算子（不存在「待实现的算子」）；它标记 H 内部那条滑轨。**区间长度（张力 L）可求**，见 query_tension；不可求的是把 `↔` 当运算符。';
      return out;
    },
  }));

  // ── 张力 L（S↔D 之间的跨距）＋ R/H 的动作形态 ───────────────────
  registerSelfAuditTool(defineTool({
    name: 'query_tension',
    description: 'S↔D tension readout (read-only): computes the span L between "what the standard requires" and "what this case actually allows". Three notches, routed by what the domain actually provides — notch A (a tolerance exists): L = |deviation| / tolerance, dimensionless, the unit being "how many tolerances"; notch B (only clauses or act lists): returns a GAP LIST (required acts − allowed acts), and a set difference has no magnitude, so it never carries a number; notch C (neither available): not judged, which is not the same as compatible. Also returns H\'s position shape on the tension (on_rail / off_low / off_high / zero_tension / unknown), where zero_tension is a structural fact: S and D are fully compatible ⇒ span is zero ⇒ the lever has no arm ⇒ H has nowhere to stand. Also returns the three-layer distinction of R (ontology has no ceiling / the domain reading is a projection / R = 100 is a mere scale), the consensus margin interval for the given consequence level, and a SHAPE check on clauses (slot presence only, no natural-language parsing). Also returns who holds H\'s discretion (set by the first person, with no higher licensing authority) and the ESCALATION criterion (undecidable ∧ must trace to an owner ∧ concerns that owner ⇒ hand back to the human for final ruling; missing one of the three stops at H and does not hand back), plus the evidence-grade convention (second-hand evidence does not block a verdict; a to-do is not a debt). Also judges the SOURCE OF THIS LAYER\'S RULER: pass citableToPublic to separate "public original standard" (origin, citable externally) from "an upper layer\'s paraphrase" (relay, valid only inside this layer and never to be passed off as the original) — R does not reach you directly: objective within a layer, a projection across layers, and handing in the original against this layer\'s gap means handing in the wrong ruler. Also returns LOSS ATTRIBUTION: loss from paraphrase or relay can only be paid by H (R/S/D carry no "bearing the consequence" property, hence no capacity to pay); pass relayLayers to get the direction — more layers ⇒ total H up ⇒ M down, so removing layers raises M directly; the root of the loss is that the receiver must rebuild the context, not that information was lost. Also returns H\'s RUNWAY PERMIT: pass runwayCovered to judge whether this spot may "run wide open, don\'t be afraid, play to your strengths" — where the runway is paved, excess caution is withdrawn (it is only interest paid on a gap) ⇒ loss-bearing H retires ⇒ total H down ⇒ M up; where it is not paved, run along the known boundary first. Granularity follows runway coverage, not industry name; what is withdrawn is excess caution, NOT consequence attribution. Produces no verdict and enters no gate.',
    parameters: {
      tol: { type: 'number', description: 'Notch A: the standard\'s tolerance (same unit as dev). Example: an infusion pump at ±5 ⇒ tol = 5.' },
      dev: { type: 'number', description: 'Notch A: the actual deviation (same unit as tol). May be negative; tension takes the absolute value.' },
      required: { type: 'array', items: { type: 'string' }, description: 'Notch B: the act set S requires (what the clause says must be done).' },
      allowed: { type: 'array', items: { type: 'string' }, description: 'Notch B: the act set D allows (what this case can actually do).' },
      notchH: { type: 'number', description: 'The ABSOLUTE margin corresponding to the notch H chose (same unit as L: how many tolerances). Omit and the position is not judged.' },
      rCap: { type: 'number', description: 'H\'s SCALE READING (percentage scale ⇒ 80 means 80%). ⚠️ A reading, not a ceiling: R\'s ontology has no ceiling, so no "rCap < 1" requirement exists. Can be computed automatically from criticality + notch.' },
      scale: { type: 'number', description: 'The scale (default 100 = percentage scale, i.e. the old paper\'s R = 100). Changing the scale changes the reading only, never the verdict.' },
      criticality: { type: 'string', description: 'Consequence level (key into the consensus margin table): metrology_high_risk / aero_medical_derating / mil_industrial_derating / commercial_derating. Given, it looks up the margin interval and computes rCap.' },
      notch: { type: 'string', description: 'Which notch H chose: toward_s (stay with the standard, take the large end of the margin) / balanced (take the interval midpoint) / toward_d (favour the perturbation, take the small end).' },
      clauses: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Clause list: checks SHAPE only (action + object + value/unit as a pair + source + version). No natural-language parsing. A bare string is reported as unstructured.' },
      undecidable: { type: 'boolean', description: 'Escalation clause ①: is this something H cannot decide? Omit and escalation is not judged (unknown ≠ no need to escalate).' },
      mustTraceOwner: { type: 'boolean', description: 'Escalation clause ②: must it be traced to a responsible person? Purely technical and unattributable ⇒ stop at H.' },
      relatesToOwner: { type: 'boolean', description: 'Escalation clause ③: does it concern some responsible person? All three conjoined before it returns to the human.' },
      citableToPublic: { type: 'boolean', description: 'The source of this layer\'s ruler: can this requirement be pointed to a public original — standard number + clause number + version? true ⇒ origin (citable externally); false ⇒ relay (an upper layer\'s paraphrase, valid only inside this layer, never to be passed off as the original). Omit ⇒ the source is not judged (≠ origin). ⚠️ The test does not read industry wording, only "can you point to it": down a company → department → manager → you chain you hold relay, and handing in origin against it means handing in the wrong ruler.' },
      wants: {
        type: 'string',
        description: 'Which face of H you are asking about (controlled values: who = who / qualification / signature | what_can = can-do / notch / permit | what_cost = how much is paid / loss | visible = can it be seen from outside / the seam). 🔴 H is an umbrella term, not a scalar: omitting wants ⇒ the face is undetermined ⇒ returns question_incomplete (completable — NOT "cannot judge", and NOT an allow). Given, it returns the criterion for that face.',
      },
      selfReadsAs: {
        type: 'string',
        description: 'Which face\'s reading you intend to use in order to answer the face named by wants (same controlled values). 💰 Two different faces ⇒ crossFacet = true, i.e. a cross-face misinference (forged authority). Example: using "the output style is consistent" (visible) to answer "what is his motive" (who). Omit ⇒ cross-face is not judged (≠ it is not a cross-face misinference).',
      },
      relayLayers: { type: 'number', description: 'How many relay layers sit on this chain of mine (0 = direct contact with the original context, 1 = immediate manager, 2 = department + manager …). Given, it returns the DIRECTION of loss payment: loss can only be paid by H (R/S/D carry no "bearing the consequence" property ⇒ no capacity to pay), more layers ⇒ total H up ⇒ M down. Direction only, never a value for H. Omit ⇒ not judged (≠ lossless).' },
      runwayCovered: { type: 'boolean', description: 'Is the CRITERION RUNWAY paved at this spot (not "does this industry have standards", but "is the criterion here present"). true ⇒ issue the executor "run wide open, don\'t be afraid, play to your strengths": withdraw excess caution (it is only interest paid on a gap), loss-bearing H retires ⇒ total H down ⇒ M up; effective H does not shrink. false ⇒ run along the known boundary, do not shed caution (shedding it by force measures the gap, not the runway). ⚠️ Granularity = the extent of runway coverage, not the industry name. Omit ⇒ the permit is not judged (≠ free to run wide open).' },
      inFormula: { type: 'boolean', description: 'Can this quantity ENTER THE FORMULA (= could another person, following it, land on the same reviewable original or record?). true ⇒ it enters, and it is necessarily outer H (then grade the trace strength hard/soft). false ⇒ not in the input set ⇒ state is not_in_input_set (NOT a debt, NOT booked), and the hint is to first ask "can it be externalised". ⚠️ Distinct from not_collected (in the input set but not collected — that IS a debt); the two kinds of "absent" must never be merged. Omit ⇒ not judged (≠ in, and ≠ out).' },
    },
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute(args = {}) {
      const out = {
        action: { R: R_ACTION, H: H_OBSERVER },
        audit: verbAudit(),
      };
      const t = tensionOf(args);
      out.tension = t;

      // R 的三层区分：本体无上限 / 读数是域的投影 / 刻度只是换算
      out.R = { ontology: R_ONTOLOGY, scale: R_SCALE };

      // 🔴 R 不直达：本层拿到的尺子是 origin 还是 relay（层内客观 ≠ 跨层直达）
      out.relay = R_RELAY;
      if (args.citableToPublic !== undefined) {
        out.rSource = rSourceGrade({ citableToPublic: args.citableToPublic });
      }

      // 🔴 损耗只能由 H 支付：转述层数 ↑ ⇒ 总 H ↑ ⇒ M ↓（只判方向，不给数值）
      out.loss = LOSS_BEARER;
      // 张力输出的合法形状（档B 只允许缺口清单/不判；给比值即形状非法）
      out.tensionOutput = TENSION_OUTPUT;

      // 🔴 H 是统称（安 2026-10-20 20:3x）：先说清它有几个面，再看你问哪一面。
      out.hUmbrella = H_UMBRELLA;
      out.hFacets = H_FACETS;
      // 内 H/外 H 之间那道缝（此前无落点）
      out.seam = INNER_OUTER_SEAM;
      // 🔴 公式准入律（安 2026-10-20 20:45）：能进公式的 H，全部是外 H
      out.formulaInput = FORMULA_INPUT;
      // 输入集自检：没给 ⇒ 不判（不默认"在内"）；false ⇒ 不进公式、不挂账
      if (args.inFormula === true) {
        out.formulaInputNow = {
          inFormula: true,
          tier: '一级：留痕 ⇒ 进（权重按 PROVENANCE_ATTESTATION 再判 hard/soft）',
        };
      } else if (args.inFormula === false) {
        out.formulaInputNow = {
          inFormula: false,
          state: FORMULA_INPUT.states.NOT_IN_INPUT_SET,
          bookkeeping: '不挂账（不是欠账）',
          reroute: '先问「能不能外化」——补得成可留痕形态就是 not_collected，补不成才是内 H',
        };
      }
      out.facetRule = FACET_DISCIPLINE;
      if (args.wants !== undefined) {
        out.facetNow = facetOf({ wants: args.wants });
        // 跨面自检：本次问的是哪面、而查询里同时给了别的面的读数 ⇒ 提示但不阻断
        if (args.selfReadsAs !== undefined) {
          out.crossFacet = isCrossFacet({ asked: args.wants, read: args.selfReadsAs });
        }
      }
      if (args.relayLayers !== undefined) {
        out.lossRoute = lossRoute({ relayLayers: args.relayLayers });
      }

      // 🔴 H 的通行许可：跑道铺到处 ⇒ 放开了跑（撤过度谨慎，不是免后果归属）
      out.permit = H_PERMIT;
      if (args.runwayCovered !== undefined) {
        out.permitNow = hPermitOf({ runwayCovered: args.runwayCovered });
      }

      // 余量档：查共识表（区间 ＋ 取端），不拍数
      let rCap = args.rCap;
      if (args.criticality) {
        out.margin = MARGIN_CONSENSUS;
        out.picked = pickMargin({ criticality: args.criticality, notch: args.notch });
        if (rCap === undefined && out.picked.ok) {
          const cap = notchCapOf({ criticality: args.criticality, notch: args.notch });
          out.cap = cap;
          if (cap.ok) rCap = cap.rCap;
        }
      }
      if (args.notchH !== undefined || rCap !== undefined) {
        out.position = slidePos({ tension: t, notchH: args.notchH, rCap, scale: args.scale });
      }

      // 条款形状（不做 NLP 抽取，只校验槽位）
      if (Array.isArray(args.clauses)) {
        const rows = args.clauses.map(checkClauseShape);
        out.clauses = {
          rows,
          slots: CLAUSE_SLOTS,
          summary: {
            structured: rows.filter((r) => r.ok).length,
            unstructured: rows.filter((r) => !r.ok).length,
          },
          note: 'unstructured 不是"判不出"，是**输入缺形状** ⇒ 该补槽位（可执行动作），不是落 review 的理由。',
        };
      }

      // 🔴 H 的裁量权归属：由第一视角自己定；无上级授权者（否则嵌套不终止）
      out.authority = {
        h: H_AUTHORITY,
        split: CAPACITY_VS_LIABILITY,
        note: '裁量权可归 AI（H 自己判）；责任权唯人类。二者不可互代：判得出「谁有责任」≠「责任已裁定」。',
      };

      // 🔴 升级判据：不是「判不出就交还」，是三条合取
      out.escalation = ESCALATION;
      if ([args.undecidable, args.mustTraceOwner, args.relatesToOwner].some((v) => v !== undefined)) {
        out.verdictEscalate = mustEscalate({
          undecidable: args.undecidable,
          mustTraceOwner: args.mustTraceOwner,
          relatesToOwner: args.relatesToOwner,
        });
      } else {
        out.verdictEscalate = { verdict: ESCALATE.UNKNOWN, ok: false, reason: '未给三条中任一条 ⇒ 不判（≠ 不必升级）' };
      }

      // 🔴 二手来源不阻塞：待办 ≠ 欠账
      out.evidence = EVIDENCE_LIFECYCLE;
      // 🔴 实测补的（2026-10-20 E2）：provenance 能不能被别人照着核
      out.provenance = PROVENANCE_ATTESTATION;

      out.note = '只读面：张力只是 S↔D 的跨距，**不是 M 的值**。档B 不参与比值（集合差没有大小）。zero_tension ≠ 通过，它表示「照标准做就行、不需要能动性」。🔴 R=100 是**刻度**不是上限（R 本体无上限）；rCap 是读数，不是界。🔴 H 的取值由第一视角自己定、无上级授权者；升级唯一出口=「判不出 ∧ 须追责 ∧ 与责任人有关」。🔴 **R 不直达**：本层（部门/管理者/主审）手上的尺子是 origin 还是 relay 决定该查什么；放行由上一层给，自评 M 通过不构成放行。🔴 **损耗只能由 H 支付**（唯一主动项）：转述层数↑⇒总 H↑⇒M↓；但优化方向是**移项**（把 H 从零收益的复述处移到正收益的判断处），不是"减少 H"——H=0 违反 `0 <`。🔴 **H 也是通行许可**：「放开了跑，别怕」是给执行者的**指令形态**（不是取值）⇒ 跑道铺到处才发；放开＝把损耗 H 退掉 ⇒ 总 H↓ ⇒ M↑，**不是 H 变大**。';
      return out;
    },
  }));
}

export { name, inject, apply };

// 🔴 [2026-10-27] Both fingerprints exposed outward (pure fact slot — takes part in no verdict, enters no gate):
//   `buildId`   = criteria domain  (src/core) — decides *what it is judged to be*
//   `bundleId`  = behaviour domain (all of src, this adapter included) — decides *how it lands on the host*
//   Why export them: an auditor must be able to **recompute them independently** and compare, rather than
//   being limited to whatever value we printed on a receipt.
//   Why not merge them into one: merging would void every recorded value for 0.2.0–0.2.6 (breaking historical
//   reconciliation), and would conflate two different questions ("did the criteria change" vs "did the
//   package change").
export const FINGERPRINTS = { buildId: BUILD_ID, bundleId: BUNDLE_ID, loadedAt: LOADED_AT };

// Adapter-layer fusion wiring: S/D quantitative effect sensor (M-gate constrained),
// see src/adapt/sd-effect-sensor.mjs
export { estimateEffectPsi, upliftRank, fusedDecide } from './adapt/sd-effect-sensor.mjs';
