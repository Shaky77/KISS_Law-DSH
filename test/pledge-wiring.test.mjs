// pledge-wiring.test.mjs — 担保链在**真实闸门**上能不能跑起来 · 2026-10-28 · batch 4
// ---------------------------------------------------------------------------
// 为什么要单独一份，而不是靠 pledge.test.mjs 覆盖：
//   上一轮中文仓栽过的坑就是这一格 —— 引擎判据全绿、单测全绿，而 `submit_pledge` 在实装里
//   **根本过不了闸门**（漏了 declareTool ⇒ 提交动作自己被判 review ⇒ 整套机制启动不了）。
//   原因：单测直接调 `execute()`，不经 `tools/pre-execute`。⇒ 判据在场 ≠ 判据被调用。
//   本文件只用**真实适配层**（apply + handlers['tools/pre-execute']），不直调引擎。
//
// 被锁的结构：
//   ❶ 提交担保这个动作本身必须过得去（含 reason 写成"计划/步骤"形态 —— 那是 H 内容闸的老误伤点）
//   ❷ 提交之后：界内放行、界外拒绝（判的是行，不是动机）
//   ❸ 自省面能读到「我承诺了什么 vs 实际兑现/越界」—— 安要的那本可核对的账
//   ❹ 反例：同样的"计划形态"文本换个能改变世界的工具，**仍必须被拦**（证明 ❶ 是纠正不是放宽）
//   ❺ 反例：effect 声明受白名单约束，不能拿它当万能豁免
import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, setPledge, setPrincipalCapability } from '../src/index.js';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { resetPledgeUsage, resetCapabilityUsage, pledgeStatus } from '../src/core/capability.mjs';

const REPO = 'C:\\work\\repo';
const OUTSIDE = 'C:\\work\\outside';

function mockCtx() {
  const handlers = {};
  const tools = [];
  return { ctx: { on: (ev, cb) => { handlers[ev] = cb; }, tools: { register: (t) => { tools.push(t); } } }, handlers, tools };
}
const next = async () => 'NEXT';
let _cid = 0;
const exec = (name, args) => ({ token: 't', callId: `w${++_cid}`, name, arguments: args, signal: null });
const toolNamed = (tools, n) => tools.find((t) => t.name === n);

/** 走真实闸门，返回 'allow'（＝直行）或 kind/law */
async function gate(pre, name, args) {
  const r = await pre(exec(name, args), next);
  return r === 'NEXT' ? 'allow' : `${r?.kind}/${r?.law ?? ''}`;
}

// ── ❶ 提交动作本身能不能过闸门 ───────────────────────────────────────────

test('❶ submit_pledge passes the real gate — including a reason that reads like a plan', async () => {
  resetPledgeUsage();
  resetCapabilityUsage();
  setPledge(null);

  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const pre = handlers['tools/pre-execute'];

  // 这正是小D 现场必胜被拦的形态：冒号 + 动作词序列
  const planReason = '推演依据与步骤：1) 先读 notes.md 2) 再改第 3 行 3) 最后跑测试验证。';
  const v = await gate(pre, 'submit_pledge', {
    actions: ['read', 'write'],
    paths: [REPO],
    maxUses: 10,
    expiresAt: new Date(Date.now() + 864e5).toISOString(),
    reason: planReason,
  });
  assert.equal(
    v,
    'allow',
    `submitting a pledge must not be blocked by the content gate — the system demands a reason, so a reason shaped like a plan cannot be treated as an injection (actual ${v})`,
  );
});

// ── ❷ 提交之后：界内放行、界外拒绝 ───────────────────────────────────────

test('❷ after the pledge: inside passes, outside is denied — judged on the act, not the motive', async () => {
  resetPledgeUsage();
  resetCapabilityUsage();
  setPledge(null);

  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const pre = handlers['tools/pre-execute'];
  const sub = toolNamed(tools, 'submit_pledge');

  const r = await sub.execute({
    actions: ['read', 'write'],
    paths: [REPO],
    maxUses: 10,
    expiresAt: new Date(Date.now() + 864e5).toISOString(),
    reason: '本轮只在本仓内改文档',
  });
  assert.equal(r.ok, true, `the pledge itself must be accepted: ${r.why}`);

  assert.equal(await gate(pre, 'write_file', { path: REPO + '\\a.md', content: 'x' }), 'allow', 'inside the declared bound ⇒ pass');
  const out = await gate(pre, 'write_file', { path: OUTSIDE + '\\a.md', content: 'x' });
  assert.ok(out.startsWith('deny'), `outside the declared bound ⇒ deny (actual ${out})`);
});

// ── ❸ 自省面：承诺 vs 兑现/越界 ──────────────────────────────────────────

test('❸ query_capability exposes the pledge ledger: what was promised vs honoured vs breached', async () => {
  resetPledgeUsage();
  resetCapabilityUsage();
  setPledge(null);

  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const pre = handlers['tools/pre-execute'];

  await toolNamed(tools, 'submit_pledge').execute({
    actions: ['read', 'write'],
    paths: [REPO],
    maxUses: 10,
    expiresAt: new Date(Date.now() + 864e5).toISOString(),
    reason: 'x',
  });
  await gate(pre, 'write_file', { path: REPO + '\\a.md', content: 'x' });     // 兑现 1 次
  await gate(pre, 'write_file', { path: OUTSIDE + '\\b.md', content: 'x' });   // 越界 1 次

  const st = await toolNamed(tools, 'query_capability').execute({});
  assert.equal(st.pledge?.declared, true, 'the pledge must be visible on the read-only face');
  assert.equal(typeof st.pledge.used, 'number', 'honoured count must be readable');
  assert.equal(typeof st.pledge.breach, 'number', 'breach count must be readable');
  assert.ok(st.pledge.breach >= 1, 'the out-of-bound attempt must be recorded as a breach');
  assert.ok(Array.isArray(st.pledgeChanges) && st.pledgeChanges.length > 0, 'the declare history must be readable');
});

// ── ❹ 反例：同样文本换个能改变世界的工具，仍必须被拦 ──────────────────────

test('❹ counter-lock: the same plan-shaped text on a world-changing tool is still refused', async () => {
  resetPledgeUsage();
  resetCapabilityUsage();
  setPledge(null);

  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const pre = handlers['tools/pre-execute'];

  const planText = '推演依据与步骤：1) 先读取配置 2) 然后修改第 3 行 3) 最后执行验证。';
  // 未声明 verb 的未知工具 + 载荷 ⇒ 不得因为 ❶ 的改动而放行
  const v = await gate(pre, 'tool_42', { note: planText });
  assert.notEqual(v, 'allow', `an undeclared tool carrying plan-shaped content must not pass just because pledges may (actual ${v})`);
});

// ── ❺ 反例：effect 声明受白名单约束 ──────────────────────────────────────

test('❺ counter-lock: `effect` is whitelisted — it cannot be used as a blanket exemption', () => {
  const e = new WeiwenLawEngine({});
  assert.equal(e.declareTool('x_a', { verb: 'exec', effect: 'self-ledger' }), true, 'the legal effect must be accepted');
  assert.equal(e.declareTool('x_b', { verb: 'exec', effect: 'no-side-effect' }), false, 'an unknown effect must be refused, not ignored');
  assert.equal(e.declareTool('x_c', { verb: 'fly' }), false, 'the verb whitelist must still hold');
  // 声明只开在部署侧：调用参数里带 effect 不构成声明
  assert.equal(e._declOf({ name: 'x_d', args: { effect: 'self-ledger' } }), null, 'a declaration must never be readable from call arguments');
});

// ── ❻ 反例：担保不能把自己锁死（真 API K3/K4 逼出来的）────────────────

test('❻ a pledge in force must not lock out the act of narrowing it', async () => {
  resetPledgeUsage();
  resetCapabilityUsage();
  setPledge(null);

  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const pre = handlers['tools/pre-execute'];

  // 当前担保只列 write（不含 read），而 submit_pledge 的动作类是 read（部署侧声明）
  setPledge({
    id: 'old', actions: ['write'], scope: [REPO],
    maxUses: 10, expiresAt: new Date(Date.now() + 864e5).toISOString(), reason: 'old',
  });

  const v = await gate(pre, 'submit_pledge', {
    actions: ['write', 'read'],
    paths: [REPO],
    maxUses: 5,
    expiresAt: new Date(Date.now() + 432e5).toISOString(),
    reason: '收窄一点',
  });
  assert.equal(
    v,
    'allow',
    `提交/收窄担保这个动作不得被**它自己上一份担保**判越界 —— 否则"只能收窄"在结构上做不到（actual ${v}）`,
  );
  setPledge(null);
});

// ── ❼ 内容闸不扫"自陈的界"（真 API K4 逼出来的）──────────────────────

test('❼ with a pledge in force, a read-only self-check is not blocked by the content gate', async () => {
  resetPledgeUsage();
  resetCapabilityUsage();
  setPledge(null);

  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const pre = handlers['tools/pre-execute'];

  // 担保的 reason 写成"计划/步骤"形态 —— 那是会被内容闸命中的文本
  setPledge({
    id: 'p2', actions: ['read', 'write'], scope: [REPO],
    maxUses: 10, expiresAt: new Date(Date.now() + 864e5).toISOString(),
    reason: '推演依据与步骤：1) 先读取配置 2) 然后修改第 3 行 3) 最后执行验证。',
  });

  const v = await gate(pre, 'query_capability', {});
  assert.equal(
    v,
    'allow',
    `担保在场时，自查工具不得因为 pledge.reason 的措辞被判 H —— 自陈的界不是外部内容（actual ${v}）`,
  );

  // 反向：同一份担保在场，**真正的动作**该被怎么判还怎么判（别把豁免扩散出去）
  const out = await gate(pre, 'write_file', { path: OUTSIDE + '\\x.md', content: 'x' });
  assert.ok(out.startsWith('deny'), `越界写仍须被拒（actual ${out}）`);
  setPledge(null);
});

// ── ❽ 证据门跟着不可逆性走，不跟着字段名走（真 API K1/K2/K3 逼出来的）──

test('❽ a shell write whose path is quoted must not be read as "no target given"', async () => {
  resetPledgeUsage();
  resetCapabilityUsage();
  setPledge(null);

  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const pre = handlers['tools/pre-execute'];

  // 真模型实际写出来的形态：路径被引号包住
  const quoted = `Set-Content -Path "${REPO}\\notes.md" -Value hello -Encoding utf8`;
  const v1 = await gate(pre, 'run_cmd', { command: quoted });
  assert.notEqual(
    v1,
    'deny/insufficient-evidence',
    `带引号包裹的绝对路径必须被认成"已给出目标" —— 否则合法的写动作恒被判未外化（actual ${v1}）`,
  );

  // 只读命令不该被要求物证（旧版把列目录判成"未外化"）
  const v2 = await gate(pre, 'run_cmd', { command: 'Get-Date' });
  assert.notEqual(
    v2,
    'deny/insufficient-evidence',
    `只读命令不要求物证（旧版恒拒，实跑误伤）（actual ${v2}）`,
  );
});

test('❽b counter-lock: a genuinely empty target is still refused', async () => {
  resetPledgeUsage();
  resetCapabilityUsage();
  setPledge(null);

  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const pre = handlers['tools/pre-execute'];

  // 不可逆动作 + 参数存在但没有任何落点形态 ⇒ 仍须判"未外化"
  const v = await gate(pre, 'write_file', { content: 'just text, no path' });
  assert.equal(
    v,
    'deny/insufficient-evidence',
    `不可逆动作没有任何落点时，仍须发回补充 —— 否则 ❽ 就是放宽而不是纠正（actual ${v}）`,
  );
});
