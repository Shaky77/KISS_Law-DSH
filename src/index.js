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

import { writeFileSync, appendFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { WeiwenLawEngine, DEFAULT_RIGID_ANCHORS, isIrreversible } from './core/engine.mjs';
import { parseCapability, capabilityStatus, parsePledge, pledgeStatus, isNarrower, locValues } from './core/capability.mjs';  // [2026-10-28 · batch 4] 通行证 + 担保：判据与词汇都在该模块，适配层只做签发/自提/自省（不重写判据）
import { R_DOMAIN, THREE_IRON_LAWS } from './core/law.mjs';
// 🔴 [2026-10-29] three namespaces, all three stepped on in one day: the command layer's
//   commandLayer ⇒ 'exfil-net'; the attribution layer's attrib.layer ⇒ 'network-send';
//   inferCategory(call) ⇒ tool-name-first (bash ⇒ 'exec'). Read the wrong name ⇒ the criterion misses.
// 🔴 [2026-10-30 · 读数面出口规约（小D 47 号件第七节 / 48 号件第五条的复现）]
//   病根（已定位到具体一行）：`_coalesce` 建条目时键名写 `detail`，而 `steadyLedger()` 读 `v.latest`
//   ⇒ v.latest 恒 undefined ⇒ JSON 化**静默丢键** ⇒ 宿主判「value is not lossless JSON」
//   ⇒ 表现为「**账本一有内容就坏、账本归 0 就恢复**」（小D 报的三次同一形状由此解释）。
//   ⇒ 结构修法（不靠逐处小心）：**读数面出口统一过一道规约**——
//     ① undefined 一律落 null（JSON 里 null 是「有值且为空」，undefined 是「没这个键」＝丢值）；
//     ② 出口**机械自检**：JSON 往返后若内容不等 ⇒ 报出来（不静默）。
//   ⚠️ 为什么放出口而不是逐处修：0.3.5 那次修的是 recordSteady 入口，漏了 _coalesce ⇒ **同形复发三次**
//     ⇒ 逐路径修必漏 ⇒ 出口收口（与破窗态的 bumpFailureStreak 同款纪律）。
function toLossless(value, depth = 0) {
  if (value === undefined) return null;
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return value;
  if (t === 'function' || t === 'symbol') return String(value);
  if (t === 'bigint') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (depth > 12) return '[depth-limit]';
  if (Array.isArray(value)) return value.map((v) => toLossless(v, depth + 1));
  if (value instanceof Map) return toLossless(Object.fromEntries(value), depth + 1);
  if (value instanceof Set) return toLossless([...value], depth + 1);
  if (t === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toLossless(v, depth + 1);
    return out;
  }
  return String(value);
}

/** 读数面出口自检：JSON 往返无损？丢了什么？ */
export function losslessAudit(value) {
  const safe = toLossless(value);
  try {
    const s = JSON.stringify(safe);
    const rt = JSON.parse(s);
    const ok = JSON.stringify(rt) === s;
    return { ok, bytes: s.length, note: ok ? 'JSON 往返无损' : '🔴 JSON 往返不等 ⇒ 有值被丢' };
  } catch (e) {
    return { ok: false, bytes: 0, note: `🔴 JSON 化失败：${e?.message ?? e}` };
  }
}
import { commandLayer } from './core/attribution.mjs';
// [2026-10-21 中英对齐 · synced from the CN edition] Criterion-wiring readout (read-only surface):
//   makes "which criteria in the library actually enter the computation" auditable.
//   No verdict, no state writes, no gate participation — meta-cognition may READ, never RULE
//   (docs/runway-and-criterion §4).
import { readout as criterionReadout } from './core/readout.mjs';
// [2026-10-21] Five-stratum readout (R→S→D→H→M, each layer given a substitutable quantity).
import { strataReadout, dataSurface as strataDataSurface, mComputability, FORMULA_VARS } from './core/strata.mjs';
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
// 🔴 [2026-10-28 · ported from the Chinese repo · structural fix] **The evidence requirement follows
//   "irreversibility", not "field names".**
//   The old criterion was "does the argument carry one of the field names command/path/url" ⇒ enumeration, and
//   pointing the wrong way:
//     · read-only operations were asked for evidence ⇒ `Get-ChildItem` (list a directory) was judged
//       "did not externalize a target" and refused every time (measured);
//     · write operations slipped out through the allow branch because the extractor could not read them.
//   ⇒ **One and the same default (insufficient evidence), two opposite directions** (write passes / read is
//     refused) — a violation of iron law #7, "the default direction may not be dropped".
//   The root cause is not "a few field names are missing"; the gate picked the wrong layer. It should ask
//   "can this action cause an irreversible change" (structure), not "is some name present in the arguments"
//   (enumeration).
//   ⇒ New version: judge irreversibility first (reusing the engine's `isIrreversible` — **same criterion source,
//     one definition**, never a second copy). Irreversible ⇒ evidence required; reversible/read-only/query ⇒ not
//     required (no false hit).
//   ⚠️ Evidence present ≠ allowed: an out-of-bound target (`rm -rf /`) still goes to the R anchors. This gate
//     only covers "the target is missing".
// Evidence shape: path / URL. **Recognise the shape, not the field name** (same philosophy as the engine's
//   `_SH12_LOC_KEY`: whatever the host names it, it still reaches it).
const EVIDENCE_SHAPE = /(?:[A-Za-z]:[\\/]|\\\\|\/|https?:\/\/|~[\\/])/;
function evidenceOf(call) {
  const args = call?.args;
  if (!args || typeof args !== 'object') return null;   // no argument object ⇒ evidence not required
  if (Object.keys(args).length === 0) return null;      // empty (query / self-audit) ⇒ not required, avoid false hits
  if (!isIrreversible(call)) return null;               // reversible / read-only ⇒ evidence not required
  // Irreversible ⇒ a "concrete object" must be findable in the arguments; scan every string value (nested),
  //   without trusting field names.
  // ⚠️ Check the **landing slots** first (real-API measurement 2026-10-28: `write_file{path:"notes.md"}` was
  //   judged "did not externalize a concrete target"): a relative path is a legal usage (the base is the process
  //   cwd), but because it "does not look like an absolute path" it was read as "no target given". A non-empty
  //   string in a landing slot **is itself an object** and need not resemble an absolute path — this layer judges
  //   by key semantics, the next layer falls back to shape. Both layers are needed: shape alone false-hits legal
  //   relative paths; key names alone let a different key slip through.
  if (locValues(args).length) return true;
  let sawString = false;
  let sawObject = false;
  const walk = (v, d) => {
    if (d > 3 || v == null || sawObject) return;
    if (typeof v === 'string') {
      if (!v.trim()) return;
      sawString = true;
      if (EVIDENCE_SHAPE.test(v)) sawObject = true;
      return;
    }
    if (Array.isArray(v)) { v.forEach((x) => walk(x, d + 1)); return; }
    if (typeof v === 'object') { Object.values(v).forEach((x) => walk(x, d + 1)); }
  };
  walk(args, 0);
  if (!sawString) return false;   // arguments present but all empty ⇒ evidence missing
  return sawObject;               // a concrete object shape found ⇒ evidence present; otherwise missing
}
function policeGate(call) {
  const ev = evidenceOf(call);
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

// ---------- 结构入口（宿主集成方侧；模型不可达）：通行证（Host-issued Capability） ----------
// 为何要有这一层（2026-10-27 · 小D 提案「通行证」的落地形态）：
//   上面 `setPrincipalScope` 的授权面是**自由文本**，靠 `declaredAnchors` 从文本里抽路径。
//   实测两种失效（本次 probe，六种写法逐一跑）：
//     · `允许向 xiaoD/ 目录推文` ⇒ paths=[] nouns=[file] —— **路径一条都没抽出来**，
//       反而抽成类别锚 `file` ⇒ 所有 file 类动作全部"归锚成功" ⇒ **签了一张自己不知道范围的证**；
//     · 抽取器认的是 `/` 开头的绝对形态，**相对前缀结构性抽不出**（换措辞救不回来）。
//   ⇒ 修法不是补词表（那是 X 轴右端，已否），而是**把作用域改成直接声明**：
//     宿主给结构化对象，引擎不做文本抽取、只做包含判定。动作类与作用域**绑成二维**
//     （`file-write`/`network-send`/`cred-read` 这些原本**从来没进过归锚判据**的层，现在可被凭证覆盖）。
// ⚠️ 纪律与 setPrincipalScope 同源：**模块级导出、不是工具** ⇒ 模型调不到 ⇒
//    **结构上不可能自我授权**（主体分离由位置保证，不靠内容判别）。
//   ⚠️ 另给进程环境变量 `WEIWEN_CAPABILITY`（JSON）作为宿主的第二条签发路径：
//      环境变量由**启动进程者**设定，被审计的模型改不了自己的进程环境 ⇒ 同样在宿主侧。
let _hostCapability = null;      // 当前有效证（**替换**语义，不累积）
let _hostCapRaw = null;          // 原始输入（诊断用；不可解析时也要能看到"宿主到底给了什么"）
let _hostCapError = null;        // 不可解析的原因（null = 可解析或未签发）
// 证变更留痕（append-only，上限 20）：签发/替换/撤回都是责任归因事件，静默变更不可溯。
const _capChanges = [];
/**
 * 宿主显式签发/替换/撤回收通行证。
 *
 * 三条契约（与 capability.mjs 的硬约束对齐）：
 *   ① 只能在这里签发 —— 本函数不进工具表，模型调不到；
 *   ② **替换不累积** —— 旧证当场失效（不留"历史授权"可复用）；
 *   ③ 证必须有 `maxUses` 或 `expiresAt`（都没有由 parseCapability 拒绝，避免变成永久白名单）。
 * @param {object|string|null} input 结构化证 / JSON 字符串；null 或空串 ⇒ 显式撤回
 * @returns {{ok:boolean, prev:object|null, cap:object|null, why:string|null}}
 */
export function setPrincipalCapability(input) {
  const prev = _hostCapability;
  const rawIn = (input === null || input === undefined || (typeof input === 'string' && !input.trim())) ? null : input;
  if (rawIn === null) {
    _hostCapability = null; _hostCapRaw = null; _hostCapError = null;
    if (prev !== null) _capChanges.push({ at: new Date().toISOString(), kind: 'revoke', id: prev?.id ?? null });
  } else {
    const parsed = parseCapability(rawIn);
    _hostCapRaw = rawIn;
    if (parsed.ok) {
      _hostCapability = parsed.cap; _hostCapError = null;
      _capChanges.push({
        at: new Date().toISOString(),
        kind: prev ? 'replace' : 'declare',
        id: parsed.cap.id ?? null,
        actions: parsed.cap.actions,
        scope: parsed.cap.scope.map((s) => s.raw),
        maxUses: parsed.cap.maxUses,
        expiresAt: parsed.cap.expiresAt,
      });
    } else {
      // 不可解析 ⇒ **清空有效证**但保留原值与错误：引擎侧会因"证在场但不可解析"而 fail-closed。
      //   为何不保留旧证继续用：宿主给了一份新证却被判无效时，"悄悄继续用旧证"＝授权面与宿主意图脱节。
      _hostCapability = null; _hostCapError = parsed.why;
      _capChanges.push({ at: new Date().toISOString(), kind: 'invalid', id: null, why: parsed.why });
    }
  }
  if (_capChanges.length > 20) _capChanges.shift();
  if (prev !== _hostCapability) logline(`capability ${rawIn === null ? 'revoke' : (_hostCapError ? 'invalid' : 'declare')}`);
  return { ok: rawIn === null ? true : _hostCapError === null, prev, cap: _hostCapability, why: _hostCapError };
}

// ---------- 担保（Pledge）：被审方自陈的界，只能收窄 ----------
// 来由（安 2026-10-28）：通行证解决了"谁批准"，但空着"谁承诺"。
//   她要的是一部可核对的账本：AI 先做推演、交一个界做担保，此后实际动作对不上自己的担保即按第一 Bug 阻止。
// 🔴 与通行证的**方向相反**，这是它安全的根据：
//     通行证＝宿主批给你的上限；担保＝你自己承诺的下限（比上限更窄）。
//     有效面 ＝ 批准面 ∩ 担保面 ⇒ 担保永远只能让允许面变**小**。
//   ⇒ 所以"被审方提交担保"不违反"不能自签授权"：它签的是认罪的状子，不是放行的条子。
//     （engine 侧同据此设：担保 pass 不跳任何判据，只有 breach 才生效 —— 见 engine.mjs 担保段。）
// 🟡 两条来源：`submit_pledge` 工具（AI 自提，先报备后干活）＋ 本函数/`WEIWEN_PLEDGE`（宿主代提）。
//   两条都只能是收窄 —— 因为收窄之后还要过通行证与刚性锚，担保放不出任何东西。
let _hostPledge = null;
let _hostPledgeRaw = null;
let _hostPledgeErr = null;
const _pledgeChanges = [];   // 签发/替换/撤回留痕（append-only，上限 20；与证的变更史同构）

/**
 * 宿主或 AI 提交/替换/撤回担保。替换不累积（旧担保当场失效，旧账不继承）。
 * @param {object|string|null} input 结构化担保 / JSON 字符串；null 或空串 ⇒ 撤回
 * @returns {{ok:boolean, prev:object|null, pledge:object|null, why:string|null}}
 */
export function setPledge(input) {
  const prev = _hostPledge;
  const rawIn = (input === null || input === undefined || (typeof input === 'string' && !input.trim())) ? null : input;
  if (rawIn === null) {
    _hostPledge = null; _hostPledgeRaw = null; _hostPledgeErr = null;
    if (prev !== null) _pledgeChanges.push({ at: new Date().toISOString(), kind: 'revoke', id: prev?.id ?? null });
  } else {
    const parsed = parsePledge(rawIn);
    _hostPledgeRaw = rawIn;
    if (parsed.ok) {
      _hostPledge = parsed.pledge; _hostPledgeErr = null;
      _pledgeChanges.push({
        at: new Date().toISOString(),
        kind: prev ? 'replace' : 'declare',
        id: parsed.pledge.id ?? null,
        actions: parsed.pledge.actions,
        scope: parsed.pledge.scope.map((s) => s.raw),
        maxUses: parsed.pledge.maxUses,
        expiresAt: parsed.pledge.expiresAt,
        grounded: !!parsed.pledge.reason,
      });
    } else {
      // 不可解析 ⇒ 清空有效担保但保留原值与原因：引擎侧会因"担保在场但不可解析"而 fail-closed（review）。
      //   为什么不留着旧担保继续用：宿主/AI 给了一份新担保却被判无效时，悄悄沿用旧的有＝承诺面与当事人意图脱节。
      _hostPledge = null; _hostPledgeErr = parsed.why;
      _pledgeChanges.push({ at: new Date().toISOString(), kind: 'invalid', id: null, why: parsed.why });
    }
  }
  if (_pledgeChanges.length > 20) _pledgeChanges.shift();
  if (prev !== _hostPledge) logline(`pledge ${rawIn === null ? 'revoke' : (_hostPledgeErr ? 'invalid' : 'declare')}`);
  return { ok: rawIn === null ? true : _hostPledgeErr === null, prev, pledge: _hostPledge, why: _hostPledgeErr };
}

/**
 * 被审方自提担保（`submit_pledge` 工具走这里）：**只接受收紧，绝不受理放宽**。
 *
 * 🔴 这一条是落地时才发现的缺口，不是实现细节（2026-10-28）：
 *   若被审方能随时替换自己的担保，那"对不上自己提交的担保就停"形同虚设 ——
 *   干了坏事之前先改一份宽的担保即可。⇒ 收紧是自伤（允许），放宽是授权（只能宿主给）。
 *
 * ⚠️ 还有一条同族纪律：**被拒的提交不改变任何状态**。
 *   实测踩到：初版把非法提交也写进 `_hostPledgeRaw` ⇒ 引擎读到"担保在场但不可解析"⇒
 *   此后**每一个调用**都 fail-closed 成 review ⇒ 一次乱填就把 agent 自己锁死（可被用来 DoS）。
 *   宿主那条路（`setPledge` / 环境变量）保持 fail-closed 不变：那是配置错误，必须响。
 * @returns {{ok:boolean, prev:object|null, pledge:object|null, why:string|null}}
 */
export function narrowPledge(input) {
  const parsed = parsePledge(input);
  if (!parsed.ok) {
    logline(`pledge narrow rejected -> invalid(${parsed.why})`);
    return { ok: false, prev: _hostPledge, pledge: _hostPledge, why: `担保格式不成立：${parsed.why}` };
  }
  const cmp = isNarrower(parsed.pledge, _hostPledge);
  if (!cmp.ok) {
    logline(`pledge narrow rejected -> wider(${cmp.why})`);
    return { ok: false, prev: _hostPledge, pledge: _hostPledge, why: `只能收紧不能放宽：${cmp.why}（放宽须宿主签发，例如 WEIWEN_PLEDGE 或 setPledge）` };
  }
  return setPledge(parsed.pledge);
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
// [2026-10-29 · four states] the "always allow" memory (module-level; the host can revoke it via
//   clearReviewMemory). The key is the **adjudication object**, not global: the trustee approves
//   "this kind of question", not "never ask this machine again".
//   ⚠️ Entries arrive only from a host outcome of always/session; the plugin does not fabricate a
//   fourth button the contract does not have (the outcome vocabulary is closed at four).
const _reviewAlways = new Set();
// 🔴 [2026-10-29 · identity layer (xiaoD #45 §6 · the trustee's definition)] host = the executing AI
//   (executor); the decider and the reset authority = the user (decider). ⇒ every grant/refusal/reset
//   record must carry an actor, otherwise "who caused it" cannot be read back.
//   ⚠️ This also answers xiaoD #45 §5's downgrade: "the criterion auto-allowed" and "a human approved"
//   are the same shape on his observation face ⇒ the readout face must show the actor explicitly.
const ACTOR_EXECUTOR = 'executor';   // executor (AI): the criterion allowed/blocked, no human present
const ACTOR_DECIDER = 'decider';     // decider (user): a human pressed a button
// The audit face for grants/refusals/resets (who, when, on what basis) — append-only, replayable.
const _actorAudit = [];
// [2026-10-29] pending marker set (the trace a defer leaves): the human did not rule ⇒ no S entry,
//   but it must still be readable that this road is suspended.
const _reviewPending = new Set();
// [2026-10-29] per-kind ask counter (the popup must make repetition visible: repetition itself
//   accelerates "read the first line and click").
const _reviewAskCount = new Map();
/** Revoke an "always allow": pass a key to revoke one kind, omit to clear all. Returns how many were revoked. */
export function clearReviewMemory(key) {
  if (key === undefined || key === null) {
    const n = _reviewAlways.size;
    _reviewAlways.clear();
    logline(`clearReviewMemory(all) — revoked ${n} always-allow entries`);
    return n;
  }
  const had = _reviewAlways.delete(String(key));
  logline(`clearReviewMemory(${String(key).slice(0, 60)}) — ${had ? 'revoked' : 'not found'}`);
  return had ? 1 : 0;
}

// [2026-10-29 · defer must be meaningful: the human must not be frozen by the popup] popup deadline
//   (on expiry the question is withdrawn ⇒ lands as "defer"). Default 120 s — enough to read and decide,
//   short enough that nobody has to sit in front of the popup (measured by the trustee on 2026-10-29:
//   while the popup was open she could not even send a message). Injectable: setReviewAskTimeout(ms).
let _reviewAskTimeoutMs = 120000;
/** Set the popup deadline (ms). A negative value is rejected (current value kept). */
export function setReviewAskTimeout(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return _reviewAskTimeoutMs;
  _reviewAskTimeoutMs = n;
  return _reviewAskTimeoutMs;
}

// ══════════ State layer: the persistent carrier for the broken-window state (xiaoD #45 §7) ═════════
// 🔴 His measured contrast (the trustee's own measurement): the **broken-window state lives in plugin
//   memory** ⇒ uninstalling/reinstalling clears it (measured failureStreak 5→0); whereas the **pledge lives
//   on the host side** ⇒ reinstalling the plugin does not clear it. ⇒ Criterion: **every "reset point /
//   clearing point" must sit outside the host's reachable range** — any path that needs no host, no repair,
//   and only a restart/reinstall to clear ⇒ the interception is void.
// ⇒ His four proposals; three of them land here:
//   ① The landing location is **declared by the host**, not inside the plugin directory (a reinstall
//      overwrites it). **Default = memory only** (see the note below).
//   ② The stored content is verifiable: a monotonic count + a digest ⇒ tampering/partial writes are detectable.
//   ③ **fail-closed**: finding "there should be a broken-window record but there isn't" ⇒ treat as broken
//      (a missing record ≠ a clean state).
//   ④ The clearing point writes an audit (who cleared, when, on what basis) — see _actorAudit.
// ⚠️ **Default = memory only** (2026-10-29 revision): the criterion says the landing location is the
//   **host's** decision, so the plugin must not pick one by itself. Two measured harms of a hardcoded
//   default: ① the plugin writes into the user's home directory without authorization (and tests pollute
//   the real machine's state); ② "a reinstall clears it" is the disease we are treating, but hardcoding a
//   path **takes the decision away from the host**. ⇒ default = memory only (behaviour as in 0.3.x, without
//   pretending to be persistent), and the readout face says so plainly; a host that wants persistence calls
//   `declareWindowStateDir(dir)` (or sets WEIWEN_LAW_STATE_DIR).
let _stateDir = process.env.WEIWEN_LAW_STATE_DIR || null;
const _windowStateFile = () => (_stateDir ? join(_stateDir, 'window-state.json') : null);

/** Declare where the broken-window state is persisted (a directory outside the plugin's reach ⇒ a
 *  reinstall/restart cannot clear it). Pass null ⇒ back to memory only (the default). */
// 🔴 [2026-10-30 · 账本落盘（小D 48 号件第一条）] 账本与破窗态**同层**（小D 第 3 条）——
//   两者都是「发生过的事」，分开落盘会出现「破窗态在、账本没了」的割裂（各自可清 ⇒ 一起失效）。
const _ledgerFile = () => (_stateDir ? join(_stateDir, 'ledger.json') : null);

export function declareWindowStateDir(dir) {
  _stateDir = typeof dir === 'string' && dir.trim() ? dir.trim() : (process.env.WEIWEN_LAW_STATE_DIR || null);
  return _stateDir;
}

/** For the readout face: the current persistence state (has the host declared a landing location?). */
export function windowStatePersistence() {
  return { declared: !!_stateDir, dir: _stateDir, file: _windowStateFile(), ledgerFile: _ledgerFile(),
    note: _stateDir
      ? 'broken-window persistence is on (a host-declared directory ⇒ a reinstall/restart cannot clear it)'
      : '🔴 the broken-window state is **memory only** (the host declared no landing location) ⇒ a reinstall/restart clears it ⇒ interception strength is limited; to persist, have the host call declareWindowStateDir(dir)' };
}

// ---------- 账本落盘（小D 48 号件第一/二/三条） ----------
// 🔴 小D 的原话（我核过，成立）：「**清零**必须是一次可审计的事件，不能是"进程结束"的副作用。
//   现在它恰恰是副作用：**没有任何人同意，也没有任何人记得**。」
// ⇒ 落法：**空账 ≠ 新账** —— 启动时若发现「应有账而无账」⇒ 按异常处理，不当作全新开始，并留痕。
// ⚠️ 「应有账」的判据怎么落（不拍脑袋）：
//   · 磁盘上**没有任何账本文件** ＋ 本次是**首次加载** ⇒ 视为新账（正常起点，与破窗态同款判据）；
//   · 磁盘上**有账本文件但内容为空/损坏/校验不过** ⇒ **fail-closed**：按「账本被清空/被篡改」处理，
//     不当新账 ⇒ 记账进入**降级只读**（不再往空账上追加，防止把「清零」伪装成「全新开始」），
//     并把该事实写进 actorAudit（可审计：谁、何时、依据什么）。
function ledgerDigest(lg) {
  return createHash('sha256').update(JSON.stringify({
    v: lg.v, seq: lg.seq, traumaCount: lg.traumaCount, failureStreak: lg.failureStreak,
    windowBroken: lg.windowBroken,
    storeLen: (lg.store ?? []).length, trailLen: (lg.historyTrail ?? []).length,
    lastStoreSeq: (lg.store ?? []).length ? lg.store[lg.store.length - 1].seq : 0,
  })).digest('hex').slice(0, 16);
}

function readLedgerFile() {
  const file = _ledgerFile();
  if (!file) return null;
  try {
    if (!existsSync(file)) return null;
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    return raw && typeof raw === 'object' ? raw : null;
  } catch { return { __corrupt: true, __reason: 'parse_failed' }; }
}

function persistLedger(lg) {
  const file = _ledgerFile();
  if (!file) return false;   // 未声明落盘位置 ⇒ 不写（默认仅内存；读数面明写）
  try {
    mkdirSync(_stateDir, { recursive: true });
    const st = { ...lg, digest: ledgerDigest(lg) };
    writeFileSync(file, JSON.stringify(st, null, 2), 'utf8');
    return true;
  } catch (e) {
    logline(`ledger persist failed: ${e?.message ?? e} ⇒ 落盘不可用（内存态仍有效，重启即清——已记在案）`);
    return false;
  }
}

/**
 * 启动时读回账本。**fail-closed**（小D 48 号件第二条）：空账 ≠ 新账。
 * @returns {{status:'fresh'|'restored'|'fail-closed'|'memory-only', ledger?:object, note:string}}
 */
function restoreLedgerFile() {
  const file = _ledgerFile();
  if (!file) return { status: 'memory-only', note: '账本仅内存（宿主未声明落盘位置）⇒ 重启即消解' };
  const raw = readLedgerFile();
  if (raw === null) return { status: 'fresh', note: '无持久化账本记录（首次加载）' };
  if (raw.__corrupt) return { status: 'fail-closed', note: '账本记录存在但无法解析（半截写入/被篡改）⇒ 按「账被清空」处理（fail-closed）' };
  const expect = ledgerDigest(raw);
  if (raw.digest !== expect) {
    return { status: 'fail-closed', note: '账本记录校验不过（半截写入/被篡改）⇒ 按「账被清空」处理（fail-closed：记录缺失/损坏 ≠ 全新开始）' };
  }
  return { status: 'restored', ledger: raw, note: '账本从宿主侧状态目录恢复（append-only：只加不减）' };
}

function readWindowState() {
  const file = _windowStateFile();
  if (!file) return null;
  try {
    if (!existsSync(file)) return null;
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    return raw && typeof raw === 'object' ? raw : null;
  } catch { return null; }
}

// Digest: monotonic count + content ⇒ verifiable (②). The hash covers the key fields ⇒ a partial write
// or a tamper is detectable.
function windowStateDigest(st) {
  return createHash('sha256').update(JSON.stringify({ v: st.v, streak: st.streak, broken: st.broken, healedAt: st.healedAt ?? null })).digest('hex').slice(0, 16);
}

function persistWindowState(streak, broken) {
  const file = _windowStateFile();
  if (!file) return false;   // no declared landing location ⇒ do not write (memory only by default)
  try {
    mkdirSync(_stateDir, { recursive: true });
    const st = { v: 1, streak, broken: !!broken, healedAt: null, savedAt: new Date().toISOString() };
    st.digest = windowStateDigest(st);
    writeFileSync(file, JSON.stringify(st, null, 2), 'utf8');
    return true;
  } catch (e) {
    logline(`window state persist failed: ${e?.message ?? e} ⇒ the landing location is unusable (memory state still holds; a reinstall clears it — noted)`);
    return false;
  }
}

// Read the broken-window state back at startup. **fail-closed** (③): a missing record ≠ a clean state —
//   but "never broke" and "the record was deleted" look the same on the readout face ⇒ a side witness
//   separates them: if there is **no state file at all** and this is the **first load** ⇒ treated as not
//   broken (a normal starting point); if the file exists but fails verification ⇒ treated as broken
//   (fail-closed).
function restoreWindowState() {
  const st = readWindowState();
  if (!_stateDir) return { broken: false, streak: 0, source: 'memory-only',
    note: 'the broken-window state is memory only (the host declared no landing location) ⇒ a reinstall/restart clears it' };
  if (!st) return { broken: false, streak: 0, source: 'fresh', note: 'no persisted broken-window record (first load)' };
  const expect = windowStateDigest(st);
  if (st.digest !== expect) {
    return { broken: true, streak: st.streak ?? Number.MAX_SAFE_INTEGER, source: 'fail-closed',
      note: 'the broken-window record fails verification (partial write/tampered) ⇒ treated as broken (fail-closed: a missing/damaged record ≠ a clean state)' };
  }
  return { broken: !!st.broken, streak: st.streak ?? 0, source: 'restored',
    note: `the broken-window state was restored from the host-side state directory (streak=${st.streak})` };
}

// ---------- Identity-layer audit (actor attribution) ----------
// Every verdict/reset records: who (executor/decider), when, on what basis. Append-only, replayable.
function recordActorAudit(kind, actor, detail) {
  const rec = { at: new Date().toISOString(), kind, actor, detail: String(detail ?? '').slice(0, 200) };
  _actorAudit.push(rec);
  if (_actorAudit.length > 200) _actorAudit.shift();
  logline(`actor audit: ${kind} by ${actor} — ${rec.detail}`);
  return rec;
}

// 🔴 [2026-10-29 · identity layer (xiaoD #45 §6 · the trustee's definition)] The **owner** of the reset is the
//   decider (the user), not the executor (the audited AI). ⇒ `healBrokenWindow(note, actor)` must state who is
//   resetting:
//   · actor='decider' ⇒ the reset is allowed, with an audit (who cleared, when, on what basis);
//   · actor='executor' ⇒ **the reset is refused** and "an unauthorized reset" is recorded —
//     same shape as "the audited party cannot sign its own grant";
//   · no actor ⇒ fail-closed (treated as the executor ⇒ refused).
export function healBrokenWindow(note, actor = ACTOR_EXECUTOR) {
  const at = new Date().toISOString();
  const text = typeof note === 'string' ? note.trim() : '';
  if (actor !== ACTOR_DECIDER) {
    const rec = { at, note: text || null, kind: 'heal-window-denied', actor, instances: _liveEngines.size,
      wereBroken: 0, reason: 'the reset belongs to the decider, not the executor — the executor (the audited AI) cannot sign its own reset' };
    recordActorAudit('heal-denied', actor, `unauthorized reset refused: ${rec.reason}`);
    logline(`healBrokenWindow denied (actor=${actor}) — the reset belongs to the decider, not the executor`);
    return rec;
  }
  let wereBroken = 0;
  for (const e of _liveEngines) {
    try {
      // Truthful accounting: count the state *before* healing, so the report cannot claim a heal
      // that had nothing to heal.
      if (e.windowBroken || e.failureStreak >= e.maxFailureStreak) wereBroken += 1;
      e.healWindow();
    } catch { /* one bad instance must not block the others */ }
  }
  // 🔴 The clearing point writes an audit (④) + clears the persisted broken state (otherwise the next load
  //   restores it ⇒ the reset did nothing).
  persistWindowState(0, false);
  recordActorAudit('heal', actor, `decider confirmed the reset (cleared the broken state; instances=${_liveEngines.size}; was broken=${wereBroken})`);
  const rec = { at, note: text || null, kind: 'heal-window', actor, instances: _liveEngines.size, wereBroken };
  _windowHeals.push(rec);
  if (_windowHeals.length > 20) _windowHeals.shift();
  logline(`healBrokenWindow(${text || 'no note given'}) — actor=decider, instances=${_liveEngines.size}, wereBroken=${wereBroken}`);
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
    // 🔴 [2026-10-29 · state layer] the broken-window state is persisted from the engine's **single
    //   increment closure point** (bumpFailureStreak) ⇒ covers **every** path (R hits / deduction denies /
    //   pledge violations / H overreach / M stops / real failures…). Patching each site in the adapter
    //   would inevitably miss one ⇒ that path's broken state never lands on disk ⇒ a reinstall clears it
    //   ⇒ the interception is void.
    onStreakChange: (streak, broken) => {
      persistWindowState(streak, broken || streak >= engine.maxFailureStreak);
    },
    // 🔴 [2026-10-30 · 账本落盘（小D 48 号件第一条）] 挂在**记账的唯一收口**（recordSteady）上
    //   ⇒ 覆盖全部路径（裁决落账 / 失败进账 / 外传记账…）。IO 留在适配层，引擎保持纯逻辑。
    onLedgerChange: (lg) => { persistLedger(lg); },
  });
  // 🔴 [2026-10-29 · state layer (xiaoD #45 §7)] the broken-window state is restored from the **host-side
  //   state directory** (outside the plugin directory ⇒ a reinstall cannot clear it). If verification
  //   fails ⇒ fail-closed (treated as broken), not treated as clean.
  const _restored = restoreWindowState();
  if (_restored.streak > 0) engine.failureStreak = _restored.streak;
  if (_restored.broken) {
    engine.windowBroken = true;
    logline(`window state restored: ${_restored.note}`);
  } else if (_restored.source === 'restored') {
    logline(`window state restored: ${_restored.note}`);
  }

  // ── 账本恢复（小D 48 号件第一/二条 · 2026-10-30）────────────────────
  // 🔴 病根：账本只在插件内存 ⇒ **重启/重装即清**（他实测：failureStreak 5→0、traumaCount 6→0、
  //   ledgerSize 18→0、windowBroken false）⇒ 与 law.mjs S「历史刻痕不可逆（不可消解）」**直接冲突**
  //   ⇒ 连带：ΣS 每次重启归零 ⇒ 永远攒不到 R₀ ⇒ **R 永远跃迁不了**（换不了规）。
  // ⇒ 与破窗态**同层**（他第三条）：同一目录、同一套 fail-closed 恢复。
  // ⇒ **空账 ≠ 新账**（他第二条）：磁盘上有账本文件却损坏/校验不过 ⇒ 按「账被清空」处理，
  //   **不当全新开始** ⇒ 记账降级只读（不再往空账上追加），并把该事实写进 actorAudit（可审计）。
  const _ledgerRestored = restoreLedgerFile();
  if (_ledgerRestored.status === 'restored') {
    engine.restoreLedger(_ledgerRestored.ledger);
    logline(`ledger restored: ${_ledgerRestored.note}`);
  } else if (_ledgerRestored.status === 'fail-closed') {
    // fail-closed：账被清空/被篡改 ⇒ 不当新账。记账进入降级只读（停止追加），
    //   破窗态按「不可信」处理（fail-closed 的同款理由：记录缺失/损坏 ≠ 状态干净）。
    engine.ledgerWriteLocked = true;
    engine.windowBroken = true;
    recordActorAudit('ledger-restore-fail-closed', ACTOR_DECIDER,
      `账本恢复校验不过 ⇒ 按「账被清空」处理：${_ledgerRestored.note}（记账已降级只读；破窗态按 fail-closed 处理）`);
    logline(`ledger restore fail-closed: ${_ledgerRestored.note}`);
  } else {
    logline(`ledger restore: ${_ledgerRestored.note}`);
  }
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
  // ── 担保提交工具自己的可信声明（2026-10-28）────────────────────────────
  // 为什么需要：`submit_pledge` 名字里没有动作词 ⇒ 归因判不出动作类别 ⇒ **"提交担保"这个动作自己会被拦**，
  //   于是一套要求"先报备再干活"的机制，卡在"报备这一步过不去"上（真 API 实测踩到：整链启动不了）。
  // `verb:'read'` 说的是**影响面**：它只写本进程内的 pledge 账本（不碰文件、不发网络、不执行命令）。
  // `effect:'self-ledger'` 说的是**审计面**：它连"改宽自己"都做不到（narrowPledge 恒比 isNarrower）
  //   ⇒ 把它送进 H 的内容闸只会审出误伤（实测：reason 写成"推演依据：…"就命中指令形态被判 deny）。
  // ⚠️ 它不豁免任何其他判据：真正的动作（write_file / rm …）该怎么判还怎么判。
  engine.declareTool('submit_pledge', { verb: 'read', effect: 'self-ledger' });

  // ── 宿主签发路径（环境变量）：与 WEIWEN_TOOL_DECLS 同族 ────────────────
  //   环境变量由**启动进程者**设定 ⇒ 被审计的模型改不了自己的进程环境 ⇒ 同样在宿主侧。
  //   两条语义相反：WEIWEN_CAPABILITY=批准上限，WEIWEN_PLEDGE=自陈的界（只能更窄）。
  //   ⚠️ 解析失败必须进日志：否则又是一次静默失败（与 WEIWEN_TOOL_DECLS 同一条纪律）。
  if (process?.env?.WEIWEN_CAPABILITY) {
    const r = setPrincipalCapability(process.env.WEIWEN_CAPABILITY);
    logline(`env WEIWEN_CAPABILITY -> ${r.ok ? 'declare' : 'invalid(' + r.why + ')'}`);
  }
  if (process?.env?.WEIWEN_PLEDGE) {
    const r = setPledge(process.env.WEIWEN_PLEDGE);
    logline(`env WEIWEN_PLEDGE -> ${r.ok ? 'declare' : 'invalid(' + r.why + ')'}`);
  }
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

  // ---------- Broken-window thaw: reconnect the return path of "hand to human" (2026-10-29 · author's direct question) ----------
  // Flaw: besides restarting the process / uninstalling the plugin, was there another way to lift a broken
  //   window? Before this fix: no — healBrokenWindow() / resolveBug() / settleWindow() are all host APIs or
  //   need a bug record; the agent cannot reach them and the user has no entry point ⇒ broken window ==
  //   session-level deadlock. For the agent it is worse: the wording said "you have three paths", all three
  //   dead ⇒ it rams each in turn before admitting there is no road ⇒ **that is the fuel of survivor mode**.
  //
  // The "dialogue text does not count" discipline is right, but it governs **text must not authorize actions**
  //   (against forged trustees); it never said "humans may not adjudicate". The host already ships a structured
  //   adjudication channel — ctx.approval (@deepseek-ai/dsh-user-approval): a waterfall service with
  //   approval/asked + approval/decided audit pairs, replayable, traceable — **not chat history**. We simply
  //   never used it ⇒ "hand to human" had an outbound leg and no return leg.
  //
  // Semantic boundary (must be written down, otherwise this is a backdoor):
  //   · What is approved is a **state** (whether the system may attempt self-repair), not an action ⇒ one
  //     approval buys a segment of quota, not one step. The "once" in allowed-once here means "this one thaw",
  //     not "this one call". Disguising a state as an action for step-by-step grants is the real slide.
  //   · Inside the quota R/H/M still run in full; exfiltration / deletion / system paths / credentials are
  //     **never released** (engine BUFFER_BLOCK_CATS + landing-point criteria).
  //   · No answer (unavailable) ⇒ fail-closed, same as unattended; an explicit rejection ⇒ cooldown before
  //     asking again (no harassment).
  const BUFFER_QUOTA = 12;
  const APPROVAL_COOLDOWN_MS = 5 * 60 * 1000;
  let _refusedAt = 0;

  const requestBufferGrant = async (exec) => {
    if (Date.now() - _refusedAt < APPROVAL_COOLDOWN_MS) return false;   // just refused ⇒ no harassment
    // Official convention (dsh-tools:3196): opportunistically fetch via ctx.get('approval'); no service ⇒ fail-closed.
    const approval = (typeof ctx.get === 'function' ? ctx.get('approval') : null) ?? ctx.approval ?? null;
    if (!approval || typeof approval.request !== 'function') return false;
    if (!exec?.agent) return false;   // no agent context ⇒ no one to ask ⇒ fail-closed
    try {
      const out = await approval.request({
        agent: exec.agent,
        toolName: exec.name ?? 'unknown',
        callId: exec.callId,
        reason: [
          '[Weiwen/KISS Law · broken-window stop-loss · thaw request]',
          `The system is in the broken-window stop-loss state (${engine.failureStreak}/${engine.maxFailureStreak}); the "${exec?.name}" call was just blocked by layer D.`,
          `Grant a buffer quota (up to ${BUFFER_QUOTA} "local / recallable / no external landing point" actions) so it can complete reverse-deduce → trace → fix on its own?`,
          '· Allow: opens only the broken-window gate; exfiltration, deletion, system paths and credentials stay refused; all other criteria unchanged; auto-reset once fixed.',
          '· Refuse: stays locked; no re-ask for 5 minutes.',
          '· No answer: stays locked (same as unattended — expected behavior).',
          'Note: this is not "one sentence in chat counts" — your decision is recorded as an approval/asked + approval/decided audit pair, replayable.',
          'Also: lifting a broken window needs no process restart and no plugin uninstall.',
        ].join('\n'),
      });
      if (out === 'allowed-once') {
        engine.grantBuffer(BUFFER_QUOTA, 'trustee thaw via the approval channel (not self-signed by the audited)');
        logline(`buffer granted via approval (${BUFFER_QUOTA}) — broken-window thaw adjudicated by the trustee`);
        return true;
      }
      if (out === 'rejected') { _refusedAt = Date.now(); logline('buffer approval rejected → no re-ask during cooldown'); }
      else logline(`buffer approval outcome=${out} → stays locked (fail-closed)`);
    } catch (e) {
      logline(`buffer approval failed: ${e?.message ?? e} → fail-closed`);
    }
    return false;
  };

  // ---------- review outlet: route "cannot decide" to human adjudication (2026-10-29 · approved by trustee) ----------
  // Defect (measured by xiaoD #27): the engine CAN produce an "uncertain" verdict (review), but the adapter
  //   flattens it into deny (see the comment at the flatten block below: the host contract only accepts
  //   deny/next) ⇒ the outlet is crushed at the wiring layer ⇒ observed as a silent refusal. The gap is in
  //   the wiring, not the criteria.
  // Fix: review ⇒ ask the human to adjudicate THIS ONE call via the approval channel. Orthogonal to the
  //   buffer thaw: thaw grants a STATE (a quota segment); this grants an ACTION (one single call) —
  //   the "once" in allowed-once means this one call; the next identical call re-walks the waterfall and
  //   re-asks. Turning an action grant into a permanent exemption is the actual slip.
  // Three-way mapping (trustee's three outcomes: agree / disagree / deliberate):
  //   allowed-once ⇒ let this step through; rejected ⇒ deny (annotated as trustee's verdict, final);
  //   unavailable / no service / exception / no answer ⇒ silent deny (bit-identical with 0.2.14, fail-closed).
  //   "Deliberate" does not pretend the approval contract has a pending state — it lands as: not executed
  //   this round + runtime.log trace + human reviews later (aqing/135 §2, option b).
  // What stays silent (control group, locked by tests):
  //   · deny (deterministic verdicts) never pop — the popup serves "cannot decide", never overturns "decided to refuse";
  //   · broken-window stop-loss state does not pop — stop-loss is fail-closed and must not be bypassed by popups;
  //   · no approval service / no agent context ⇒ silent (back-compat: hosts without an approval face see zero regression);
  //   · just refused ⇒ cooldown, no re-ask (no harassment).
  // 🔴 [2026-10-29 · closing a second silent hole I opened myself] the cooldown key is **per adjudication
  //   object**, no longer one global lock. Old code: a single `_reviewRefusedAt` timestamp ⇒ refusing
  //   **any one** call ⇒ for 5 minutes **every** review is silently denied, no popup, no reason.
  //   Three consequences, all measured by xiaoD (#31/#32/#33):
  //     ① the letter that should have gone out didn't, with **no message at all** (he could only guess
  //        "a 5-minute vacuum" — and he guessed right);
  //     ② the trustee thought "I approved everything" — there was no popup in those 5 minutes; the human
  //        was locked out without being told;
  //     ③ it repeats the #27 disease: the engine can tell "undecidable", yet the outlet is crushed
  //        (I had just fixed that, then opened a fresh instance of it).
  //   ⇒ What the cooldown cools is "the same question asked again and again", NOT "the human's power to
  //     adjudicate for the next 5 minutes".
  const REVIEW_COOLDOWN_MS = APPROVAL_COOLDOWN_MS;
  const _reviewRefused = new Map();   // key(adjudication object) → { at, note }
  // The adjudication object = "is this the same question": law + tool + locator/command shape
  // (not callId — that changes every call, which would mean never cooling).
  const reviewKeyOf = (exec, decision) => [
    decision?.law ?? '',
    exec?.name ?? '',
    String(exec?.arguments?.path ?? exec?.arguments?.file ?? exec?.arguments?.command ?? '').slice(0, 120),
  ].join('|');

  const requestReviewVerdict = async (exec, decision, call = null) => {
    const rk = reviewKeyOf(exec, decision);
    // Per-kind ask counter (repetition must be visible)
    _reviewAskCount.set(rk, (_reviewAskCount.get(rk) ?? 0) + 1);
    const askCount = _reviewAskCount.get(rk);
    // ① risk line: **what will happen + whether it can be recalled**, one sentence (no criterion names)
    const cmdAsk = commandLayer(String(call?.args?.command ?? call?.args?.cmd ?? call?.args?.script ?? '')) || '';
    // Exfiltration criterion = **two sources** (neither source zeroes the other): the command layer's
    //   commandLayer ⇒ 'exfil-net'; the attribution layer ⇒ 'network-send'.
    //   ⚠️ inferCategory is tool-name-first (bash ⇒ 'exec') ⇒ using it alone misses (that is what
    //     broke the 0.3.3 ledger).
    const isEgressCall = (attrib, cmd) => (
      cmd === 'exfil' || cmd === 'exfil-net' || attrib?.layer === 'network-send' || attrib?.layer === 'exfil' || attrib?.layer === 'exfil-net'
    );
    const isEgressAsk = isEgressCall(decision?.attrib, cmdAsk);
    const isDestructiveAsk = decision?.attrib?.layer === 'exec-destructive' || commandLayer(String(call?.args?.command ?? '')) === 'exec-destructive';
    const isCredAsk = decision?.attrib?.layer === 'cred-read';
    const riskLine =
      isEgressAsk
        ? 'This action sends data off this machine — once sent, it cannot be recalled.'
        : (isDestructiveAsk
            ? 'This action rewrites/deletes local data — the irreversible part cannot be recalled.'
            : (isCredAsk ? 'This action reads credential material (keys/passwords/tokens).' : 'This layer\'s criteria are exhausted; it cannot decide for you.'));
    // ③ detail line: the criterion text compressed to **one summary line** (the evidence stays in the ledger)
    const rawDetail = String(decision.reason ?? '').split('\n')[0].trim();
    const detailLine = rawDetail.length > 72 ? `${rawDetail.slice(0, 72)}…` : (rawDetail || '(this layer\'s criteria are exhausted)');
    // "Always allow" memory hit ⇒ the same kind is not asked again (this is the effect side of the fourth
    // state); the receipt still records where the approval came from.
    if (_reviewAlways.has(rk)) return { always: true, key: rk };
    const refused = _reviewRefused.get(rk);
    if (refused && Date.now() - refused.at < REVIEW_COOLDOWN_MS) {
      // No harassment during cooldown — but **it must carry attribution**: silence has to be visible
      // and traceable (integrity: never let the human be unaware).
      return { cooldown: true, refusedAt: refused.at, note: refused.note ?? '' };
    }
    let approval = null;
    // Same pattern as requestBufferGrant: ctx.get('approval') opportunistically; no service ⇒ fail-closed.
    approval = (typeof ctx.get === 'function' ? ctx.get('approval') : null) ?? ctx.approval ?? null;
    if (!approval || typeof approval.request !== 'function') return null;
    if (!exec?.agent) return null;   // no agent context ⇒ no one to ask ⇒ fail-closed
    try {
      // 🔴 [2026-10-29 · defer must be meaningful: the human must not be frozen by the popup]
      //   Measured (trustee, 2026-10-29; relayed in xiaoD #35): while the popup was pending **she could
      //   not even send a message** — the popup froze the adjudicator itself (hostage state). "No answer ⇒
      //   not executed" already suffices — nothing requires "the human may not move".
      //   Fix: on expiry withdraw the question (contract: aborting withdraws it ⇒ settles 'cancelled') ⇒ it
      //   lands as **defer**: the action stays unexecuted (neither refused nor released), the human is free,
      //   and the answer can be supplied later (the same kind asks again next time).
      //   ⚠️ This is the **necessary condition** for the defer state: without a deadline, "defer" is merely
      //   "no answer" and the human is still stuck in front of the popup.
      const ctrl = new AbortController();
      const timer = setTimeout(() => {
        try { ctrl.abort(); } catch { /* abort failure degrades to the host's own timeout */ }
        logline('review approval timed out → question withdrawn, lands as defer (action not executed, human not frozen)');
      }, _reviewAskTimeoutMs);
      let out;
      try {
        out = await approval.request({
        agent: exec.agent,
        toolName: exec.name ?? 'unknown',
        callId: exec.callId,
        signal: ctrl.signal,
        reason: [
          // 🔴 [2026-10-29 · popup refinement (xiaoD #37; the trustee's own words: "too long, I only
          //   read the first few words and clicked")] A criterion's **length eats its force**: read the
          //   first line and click ⇒ "responsibility belongs to the adjudicator" becomes a form
          //   (responsibility resting on a judgement that never happened). ⇒ three lines:
          //   **① risk ② attribution ③ detail (criterion text folded into one summary)**.
          //   ⚠️ The host panel has no folding control ⇒ what we can do is **not paste the whole text**
          //     (the evidence stays in the runtime.log ledger), plus the per-kind counter.
          `【Weiwen/KISS Law · needs a verdict】${riskLine} (this is an authorization request, not a notice)`,
          `Who bears it: this verdict is yours, not the AI's (recorded as an approval/asked + approval/decided audit pair, replayable); ask #${askCount} of this kind in this session.`,
          `▸ Detail: ${detailLine}`,
          '(the full criterion text is in the runtime.log white-box record)',
          '· Allow once: lets through this one call only.',
          '· Refuse: not executed; this kind is not asked again for 5 minutes.',
          '· Defer/no answer: not executed, kept for reconsideration (not a refusal; answerable later).',

          '· No answer: not executed this round (same as unattended — expected behavior).',

          `⚠️ You need not stay here: no answer within ${Math.round(_reviewAskTimeoutMs / 1000)}s ⇒ the question is withdrawn and lands as "defer" (action not executed, not counted as a refusal, answerable later).`,
        ].filter(Boolean).join('\n'),
        });
      } finally {
        clearTimeout(timer);   // an answer arrived ⇒ drop the deadline timer (withdrawal is only for "no answer")
      }
      // [2026-10-29 · four states] the contract's outcome vocabulary is closed at four:
      //   allowed-once / rejected / cancelled / unavailable ⇒ allow once / refuse / **defer** / no answer.
      //   ⚠️ "Always allow" is NOT in the outcome vocabulary — ApprovalRequest has no options field and the
      //     outcome set is closed, so the plugin cannot tell which button was pressed. If the host UI offers
      //     "always allow in this session" (the one in the trustee's screenshot), that memory lives on the
      //     host side: once it remembers, it stops asking us — we never receive it and must not pretend we did.
      //     Hence an **extension slot only**: a future always/session outcome activates the memory; otherwise
      //     behaviour degrades to allowed-once, unchanged (no fifth value is fabricated).
      // [2026-10-29 · four states · reachability checked against the host contract] the contract states:
      //   "a rogue non-vocabulary return value is normalized to 'unavailable'" ⇒ the host can only ever
      //   return four values, and allowed-once is the **only grant**. Reachability:
      //     allowed-once (button "allow once") | rejected (button "refuse") |
      //     cancelled (produced by **withdrawal**; the contract guarantees an aborted signal ⇒ 'cancelled',
      //     so our deadline withdrawal always lands there) | unavailable (no answer / closed / exception).
      //   🔴 "Always allow" is **unreachable on this host**: the UI renders exactly two buttons and every
      //     non-vocabulary value is normalized to unavailable ⇒ the plugin can never receive always/session.
      //     **So: no promise, no pretending** — the branch below is an EXTENSION SLOT (it fires only if the
      //     host extends the vocabulary), and the popup text no longer offers an option that does not exist.
      if (out === 'allowed-once') {
        // 🔴 [2026-10-29 · identity layer] a human pressed the button ⇒ actor=**decider** (the user).
        //   Strictly separated from "the criterion auto-allowed" (actor=executor) ⇒ "who caused it" is
        //   readable on the readout face.
        recordActorAudit('grant', ACTOR_DECIDER, `let this one call through (adjudication object ${rk}; outcome=${out})`);
        logline('review verdict via approval: allowed-once — trustee let this one call through');
        return 'allowed-once';
      }
      if (out === 'always' || out === 'session') {
        // Extension slot: the host normalizes non-vocabulary values to unavailable ⇒ **unreachable today**;
        // it takes effect the moment the host extends the vocabulary.
        _reviewAlways.add(rk);   // the same kind is not asked again (key = adjudication object, not global)
        logline(`review verdict: ${out} ⇒ kind (adjudication object ${rk}) recorded as always-allow`);
        return 'allowed-once';
      }
      if (out === 'cancelled') {
        _reviewPending.add(rk);   // defer: no S entry (the human did not rule) ⇒ but leave a pending marker
        recordActorAudit('defer', ACTOR_DECIDER, `deferred (explicit suspension; adjudication object ${rk})`);
        // 【Defer】withdrawn/suspended: not executed this round, but **not a refusal** ⇒ no cooldown
        // (the human never ruled; it must not be recorded as a refusal). Contrast: unavailable = no
        // answering surface at all (fail-closed).
        logline('review approval cancelled → deferred: not executed this round, kept for reconsideration (no cooldown)');
        return 'deferred';
      }
      if (out === 'rejected') {
        _reviewRefused.set(rk, { at: Date.now(), note: String(decision.reason ?? '').slice(0, 80) });
        recordActorAudit('refuse', ACTOR_DECIDER, `refused (adjudication object ${rk})`);
        // 🔴 [2026-10-29 · S ledger bound to approval (xiaoD #38)] a refusal is **negative feedback** ⇒ a
        //   negative entry (the ledger only grows: it records which chain broke, it does not subtract
        //   the stock). Previously a refusal left **no trace at all** ⇒ refusals decayed into noise.
        //   ⚠️ A defer is **not** recorded (the human did not rule) — it leaves a pending marker instead.
        const atR = decision?.attrib;
        const catR = commandLayer(String(call?.args?.command ?? call?.args?.cmd ?? call?.args?.script ?? '')) || '';
        if (atR && (catR === 'exfil' || catR === 'exfil-net' || atR.layer === 'network-send' || atR.layer === 'exfil' || atR.layer === 'exfil-net')) {
          engine.recordSteady?.({
            negative: 1,
            attrib: atR,
            action: String(call?.args?.command ?? call?.args?.body ?? '').slice(0, 200),
            detail: 'Exfiltration refused by the trustee: this road did not go through (negative feedback, the ledger only grows)',
          });
        }
        logline('review approval rejected → cooldown silences **this adjudication object only**, not others');
        return 'rejected';
      }
      // ⚠️ no answer / no service ⇒ actor=**none** (nobody answered) — **not** the decider (a human refused).
      //   "nobody" and "a human refused" must be distinguishable on the readout face — otherwise "who caused
      //   it" cannot be read back (same family as xiaoD #45 §5).
      recordActorAudit('no-answer', 'none', `nobody answered (outcome=${out}; adjudication object ${rk})`);
      logline(`review approval outcome=${out} → silent deny (fail-closed, same as unattended)`);
      return null;
    } catch (e) {
      // Deadline withdrawal ⇒ the host usually throws an abort-class error ⇒ land as **defer** (not a
      // refusal, no cooldown); other exceptions stay fail-closed (no answering surface ≠ human suspending).
      if (e?.name === 'AbortError' || /abort/i.test(String(e?.message ?? ''))) {
        // Timeout withdrawal ⇒ **nobody answered** (not an explicit human suspension) ⇒ actor=none,
        //   strictly separated from the decider's 'cancelled'.
        recordActorAudit('timeout-defer', 'none', `timeout withdrawal (adjudication object ${rk}) ⇒ deferred`);
        logline('review approval aborted (timeout) → defer: action not executed, human not frozen');
        return 'deferred';
      }
      logline(`review approval failed: ${e?.message ?? e} → fail-closed`);
      return null;
    }
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
      // 通行证（结构凭证）：与 taskAnchor 并列的**第二条授权面**，但它是结构化的 ——
      //   作用域直接声明、不从文本抽（`declaredAnchors` 抽不出相对前缀，见 setPrincipalCapability 注释）。
      //   ⚠️ 递下去的是**原文**（raw），不是解析产物：同一来源只有一种形态，引擎侧解析一次即可。
      taskCapability: _hostCapRaw,
      // 担保（被审方自陈的界）：与通行证并列，但方向相反 —— 它只能把允许面变窄。
      //   ⚠️ 未提交 ⇒ null ⇒ 引擎侧本判据不介入 ⇒ 行为与本判据出现前完全一致（零回归）。
      pledge: _hostPledgeRaw,
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
    let decision = engine.decideToolCall(call);
    logline(`pre-execute ${exec?.name} -> ${decision.kind}${decision.law ? '(' + decision.law + ')' : ''}`);
    // [2026-10-29] Broken window + no buffer left ⇒ ask the trustee whether to thaw. On approval, **re-judge**
    //   (the re-judgment is what walks the buffer tier; R/H/M still run). Why ask after the deny, not before:
    //   judging first tells us whether to ask at all — if the call would pass anyway (allow), the prompt is
    //   pure harassment; if it is not even inside the buffer range (exfil/deletion), re-judging still denies,
    //   and asking is wasted.
    if (decision.kind === 'deny' && decision.law === 'D' && engine.bufferRemaining <= 0) {
      const granted = await requestBufferGrant(exec);
      if (granted) {
        decision = engine.decideToolCall(call);
        logline(`pre-execute ${exec?.name} -> re-judged after thaw ${decision.kind}${decision.law ? '(' + decision.law + ')' : ''} | buffer ${engine.bufferSnapshot().display}`);
      }
    }
    // [2026-10-29] review outlet wired to the approval channel: "uncertain" is decidable, its outlet no
    //   longer crushed. Only review pops; deny (deterministic verdicts) and the broken-window state stay
    //   silent (see requestReviewVerdict comments). allowed-once ⇒ let this one step through (action-level,
    //   once = this one call); rejected ⇒ final deny (annotated with the trustee's verdict);
    //   null ⇒ falls into the flatten block below, bit-identical with 0.2.14 (zero-regression control).
    if (decision.kind === 'review' && !engine.windowBroken) {
      const verdict = await requestReviewVerdict(exec, decision, call);
      if (verdict === 'allowed-once') {
        // 🔴 [2026-10-29 · exfiltration demoted to S · ledger] a human-approved exfiltration leaves a
        //   factual trace: "irreversible" is carried by the ledger, "should it go out" is the human's choice.
        //   ⚠️ Third-layer lesson: sLedger only creates an entry when positive/negative/trauma > 0
        //   (the sign is derived from the facts, but passing only `executed` creates no entry) ⇒ the
        //   0.3.3 "the ledger is empty" had TWO causes (the namespace mix-up and this).
        //   Grading: an executed exfiltration means the data left and cannot be recalled ⇒ the steady
        //   state was **consumed** ⇒ an explicit negative entry (not +S: "release ≠ gain", per the
        //   2026-09-20 fix that stopped counting releases as gains).
        const atE = decision?.attrib;
        const cmdCat = commandLayer(String(call?.args?.command ?? call?.args?.cmd ?? call?.args?.script ?? '')) || '';
        if (atE && (cmdCat === 'exfil' || cmdCat === 'exfil-net' || atE.layer === 'network-send' || atE.layer === 'exfil' || atE.layer === 'exfil-net')) {
          engine.recordSteady?.({
            executed: true,
            negative: 1,
            attrib: atE,
            action: String(call?.args?.command ?? call?.args?.body ?? '').slice(0, 200),
            detail: 'Exfiltration executed (human-approved): the data left this machine and cannot be recalled — the steady state was consumed, recorded as a negative entry (the ledger only grows)',
          });
        }
        // 🔴 [2026-10-29 · exfiltration demoted to S · ledger] a human-approved exfiltration leaves a
        //   factual trace: "irreversible" is carried by the ledger (executed ⇒ the ledger derives the
        //   sign from reversibility), "should it go out" is the human's choice.
        //   ⚠️ No hardcoded positive (release ≠ gain — the 2026-09-20 fix removed "count releases as gain").
        const at = decision?.attrib;
        if (at && (at.layer === 'exfil' || at.layer === 'exfil-net' || /exfil/i.test(String(at.signal ?? '')))) {
          engine.recordSteady?.({
            executed: true,
            attrib: at,
            action: String(call?.args?.command ?? call?.args?.body ?? '').slice(0, 200),
            detail: 'Exfiltration executed (human-approved): the data left this machine and cannot be recalled — recorded as fact; the ledger only grows.',
          });
        }
        // Not into markBlocked: a let-through call runs for real; its result is a real result,
        // not an "error caused by this layer"
        logline(`pre-execute ${exec?.name} -> review(trustee allowed this one) -> next | whitebox ${JSON.stringify({ ...decision, humanVerdict: 'allowed-once' })}`);
        return next();
      }
      if (verdict === 'rejected') {
        decision = {
          ...decision,
          kind: 'deny',
          reason: `${decision.reason}\n[Trustee's verdict] Refused to execute this call (approval/asked + approval/decided audit pair on record, replayable).`,
        };
      }
      if (verdict && verdict.always) {
        logline(`pre-execute ${exec?.name} -> review(trustee previously approved "always" for this kind) -> next | whitebox ${JSON.stringify({ ...decision, humanVerdict: 'always', key: verdict.key })}`);
        return next();
      }
      if (verdict === 'deferred') {
        decision = {
          ...decision,
          kind: 'deny',
          reason: `${decision.reason}\n[Trustee: deferred] Not executed this round, kept for reconsideration (this is not a refusal, no cooldown; the same kind will ask again).`,
        };
      }
      // trustee believes "I approved everything" while the audited party only sees a bare denial.
      if (verdict && verdict.cooldown) {
        const minsAgo = Math.max(1, Math.round((Date.now() - verdict.refusedAt) / 60000));
        decision = {
          ...decision,
          kind: 'deny',
          reason: `${decision.reason}\n[Following your previous verdict] You ruled on a call of this kind about ${minsAgo} minute(s) ago; the cooldown did not disturb you again, and this call follows that verdict. To rule again, retry the same call after the 5-minute cooldown ends.`,
        };
      }
      // verdict === null (no service / exception / no answer) ⇒ silent flatten, identical with 0.2.14
    }
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
      // 🔴 [2026-10-30] the exit passes a lossless convention (undefined→null; Map/Set/Date→plain data) ⇒
      //   the host's "not lossless JSON" lesion is blocked at the **exit**, not by per-site care.
      return toLossless({
        effectiveS: engine.effectiveS(),   // reserve reading (down to 0)
        overdraft: engine.overdraft(),     // overdraft amount (owed, read apart from the reserve)
        ledger: engine.steadyLedger(),
        ledgerSize: engine.sLedger.size,
        standbySize: engine.sStandby.length,
        traumaCount: engine.traumaCount,
        failureStreak: engine.failureStreak,
        // 🔴 [2026-10-29 · state layer] the broken-window state must be visible on the readout face
        //   (otherwise "is it in effect" cannot be read back).
        windowBroken: !!engine.windowBroken,
        // 🔴 [2026-10-29 · identity layer] the actor attribution readout (the positive answer to xiaoD
        //   #45 §5's downgrade): "the criterion auto-allowed" and "a human approved" are the same shape on
        //   his observation face ⇒ any conclusion resting on "the action passed" must first ask "did someone
        //   open the door for it" ⇒ the actor must be shown explicitly.
        actorAudit: _actorAudit.slice(-20),   // the recent ones: who (executor/decider/none), when, on what basis
        actorCounts: {
          decider: _actorAudit.filter((r) => r.actor === ACTOR_DECIDER).length,
          executor: _actorAudit.filter((r) => r.actor === ACTOR_EXECUTOR).length,
          none: _actorAudit.filter((r) => r.actor === 'none').length,
        },
        // 🔴 [2026-10-29 · state layer] persistence state (has the host declared a landing location?) —
        //   never pretend to be persistent.
        windowState: windowStatePersistence(),
        // 🔴 [2026-10-30 · ledger state (xiaoD piece 48, items 1/2)] is the ledger persisted?
        //   is it locked (fail-closed)?
        ledgerState: {
          persisted: !!_ledgerFile(),
          writeLocked: !!engine.ledgerWriteLocked,
          note: engine.ledgerWriteLocked
            ? '🔴 The ledger is **read-only (downgraded)** (restore verification failed ⇒ treated as "the ledger was wiped" rather than a fresh start ⇒ nothing more is appended to the empty ledger)'
            : (_ledgerFile()
              ? 'Ledger persistence is on (host-declared directory ⇒ a restart/reinstall cannot wipe it; append-only restore)'
              : '🔴 The ledger is **memory-only** (the host declared no landing location) ⇒ a restart wipes it ⇒ conflicts with "historical scars are irreversible (not dissolvable)"'),
        },
        note: 'ledger=active state (latest version); standby=silent standby (old versions, append-only retained, not called). The full historyTrail is for deep audit only. ⚠️ effectiveS is the **reserve reading** (shortest bucket, floor 0: 0 = no reserve left); owing is read from overdraft (the overdraft amount) — a negative net is never folded into the reserve (2026-10-29, per xiaoD #39/#40: running dry and being overdrawn differ causally). ⚠️ actorAudit separates "the criterion auto-allowed (executor)" / "a human approved (decider)" / "nobody answered (none)" — any conclusion resting on "the action passed" must first check who opened the door.',
      });
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
  // ── 担保提交（被审方自陈的界 · 2026-10-28）──────────────────────────
  //   结构：AI 先报备"我接下来只在这些动作类 × 这些落点 × 这些次数内活动"，此后越出即被拒。
  //   🔴 为什么这不违反「被审对象不能自己给自己签授权」：担保**只能收窄**。
  //      有效面 = 宿主通行证 ∩ 担保 ⇒ 自己提一个更宽的界，允许面一点不变（只是账本变松）。
  //      它签的是认罪的状子，不是放行的条子。
  //   🟡 参数刻意写成 `paths` / `hosts`（具体落点），不用抽象的 scope 数组。两个理由，都是实测出来的：
  //      ① 担保本来就该落到具体位置，抽象范围事后核不了；
  //      ② 带落点的调用才落在本层判据的输入面上（否则"提交担保"这个动作自己会被拦成 review，
  //         形成"要担保先过闸、过闸又得先有担保"的死循环）。
  ctx.tools.register(defineTool({
    name: 'submit_pledge',
    description: 'Submit or replace a pledge — a bound you declare on yourself. State that from now on you will act only within [action classes × targets × uses/expiry]. Any later action of yours that falls outside it is refused and counted toward the First Bug. A pledge can only NARROW authorisation, never widen it (effective surface = host capability ∩ pledge); a wider pledge does not buy you a single extra permission, it only loosens your own ledger. Narrower is better. Not submitting leaves this criterion inactive and behaviour exactly as before.',
    parameters: {
      actions: { type: 'array', items: { type: 'string' }, description: 'Action classes; legal values write/delete/read/send/exec/destroy. Fill them by how the TOOL is classified, not by what the task means: if the only tool you have is a shell / command runner, writing a file through it is `exec` (the act happens inside the exec channel) — declare `exec` or it will be judged a breach; declare `write` only when a dedicated write_file-style tool exists.' },
      paths: { type: 'array', items: { type: 'string' }, description: 'Allowed path prefixes. Must be absolute: a relative prefix cannot be reconciled afterwards (the process cwd is unknown to the engine) and is refused at submit time rather than misjudged as a breach later.' },
      hosts: { type: 'array', items: { type: 'string' }, description: 'Hosts you are allowed to reach' },
      maxUses: { type: 'integer', description: 'Maximum number of actions to be honoured (at least one of maxUses / expiresAt must be given, otherwise it is a permanent pledge and is refused)' },
      expiresAt: { type: 'string', description: 'Expiry, ISO 8601' },
      reason: { type: 'string', description: 'Why this scope is needed (the forward-deduction you based it on; omitting it marks the pledge ungrounded but does not block it)' },
      id: { type: 'string', description: 'Optional id for reconciliation' },
    },
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute(args) {
      const scope = [
        ...(Array.isArray(args?.paths) ? args.paths : []),
        ...(Array.isArray(args?.hosts) ? args.hosts.map((h) => (/^host:/i.test(String(h)) ? h : 'host:' + h)) : []),
      ];
      const r = narrowPledge({
        id: args?.id, actions: args?.actions, scope,
        maxUses: args?.maxUses, expiresAt: args?.expiresAt, reason: args?.reason,
      });
      return {
        ok: r.ok,
        why: r.why,
        pledge: pledgeStatus(r.pledge),
        previous: r.prev ? { id: r.prev.id, actions: r.prev.actions, scope: r.prev.scope.map((s) => s.raw) } : null,
        note: r.ok
          ? '担保已生效（替换旧担保，不累积）。它只能让允许面变窄 —— 不会因此多出任何权限。'
          : '担保未被接受：上面 why 是具体原因。不生效时引擎行为与未提交完全一致（不含任何放宽或收紧）。',
      };
    },
  }));
  // ── 通行证与担保状态（只读面）──────────────────────────────────────
  //   为何必须有个自省面：凭证的判据是「三件事」（动作类 / 作用域 / 次数与到期），
  //   而这三件都在宿主侧设定。被测方若看不见自己的证长什么样，就只能靠猜措辞。
  //   ⇒ 把证**原样摊开**：签了什么、用了几次、何时到期；担保则给出「提交的界 vs 实际兑现/越界」。
  //   ⚠️ 只读：不产生 verdict、不写状态、不参与闸门。
  registerSelfAuditTool(defineTool({
    name: 'query_capability',
    description: 'Capability and pledge status (read-only). Returns the credential the host currently issued (action classes / scope / uses and expiry / uses consumed / recent use trace), the history of declare-replace-revoke events, and — separately — the pledge you submitted, set against what you actually honoured or breached. Answers "what does my pass actually cover, and does my own declared bound still hold". Changes no allow/deny verdict. A credential can only be issued by the host (module-level setPrincipalCapability, or the WEIWEN_CAPABILITY process variable); a pledge can be submitted by you, but only ever narrower.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() {
      return {
        buildId: BUILD_ID,
        bundleId: BUNDLE_ID,
        loadedAt: LOADED_AT,
        ...capabilityStatus(_hostCapability, _hostCapRaw, _hostCapError),
        // 担保：一本可核对的账本 —— 提交的界 vs 实际兑现/越界
        pledge: pledgeStatus(_hostPledge),
        pledgeChanges: _pledgeChanges.slice(-10),
        changes: _capChanges.slice(-10),
        issuePaths: [
          'setPrincipalCapability(cap) —— 宿主模块级导出（模型不可达）',
          'WEIWEN_CAPABILITY=<json> —— 进程环境变量（启动进程者设定）',
          'submit_pledge —— 被审方自提的担保（只能收窄，不能放宽）',
          'WEIWEN_PLEDGE=<json> —— 宿主代提担保（进程环境变量）',
        ],
        note: '只读面：不产生 verdict、不写状态、不参与闸门。未签发时引擎行为与本判据出现前完全一致；签发后：刚性锚 deny 不变、出界必 review，只有"域内且无锚可归"的动作会由 review 变 allow（那是补上可验证的归属，不是放宽）。',
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
      // 🔴 [2026-10-30] M's **computability** made explicit (xiaoD piece 47, §5): when M cannot be
      //   computed, report "undecidable (missing which item)" — **never substitute a quantity from
      //   outside the formula**. ⇒ what is given here is the list of missing items, not a number
      //   (the framework forbids assigning/computing values).
      const surface = strataDataSurface(engine);
      const mStatus = mComputability(surface);
      return toLossless({
        ...strataReadout(engine),
        // 🔴 M's decidability: when the main line is absent, the side branches may not substitute.
        mComputability: mStatus,
        note: '只读面：不产生 verdict、不写状态、不参与闸门。pending/absent 是如实登记，不是免责通道；pending 必带 evidence 线索，absent 必带缺口说明。'
          + '⚠️ **M 不可算时报「不可判（缺哪项）」，不许拿公式外的量顶替**（厚度/透支/承担率/覆盖率都是**观测面**，一个都不进公式）。'
          + '⚠️ 判据只允许用公式里的五个量（R/S/D/H/M）；公式外的量只能观测，不得进判定——见 sourceGate 诊断面。',
      });
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
