// pledge.test.mjs — 担保（被审方自陈的界）的结构回归锁 · 2026-10-28
// ---------------------------------------------------------------------------
// 被锁定的结构（＝安当日提出的机制）：
//   ① **越界可判**：做了自己担保外的事 ⇒ 该动作被拒 + 第一 Bug 计数。判的是**行**（外 H），不推断动机。
//   ② **未达不判**：担保内的事没做完 ⇒ 不拦、不停、不追问。「为什么没做完」落在内 H，不可观测；
//      拿不可观测的量做闸门 ＝ XSUB-10 的老病（判据的输入面与事实的作用面不相交）。
//   ③ **只能收紧**：被审方自己换担保时，只受理"更窄"。放宽＝授权，只能宿主给。
//      否则"对不上担保就停"会被"先改成宽的再干活"绕过。
//   ④ **担保不授权**：pass 不跳任何后续判据。有效面 ＝ 通行证 ∩ 担保 ⇒ 担保永远只能让允许面变小。
//   ⑤ **被拒的提交不改变任何状态**：一次乱填不得把 agent 锁死（可被用来 DoS）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { parsePledge, pledgeStatus, resetPledgeUsage, isNarrower, pledgeVerdict, targetsFor } from '../src/core/capability.mjs';
import { setPledge, narrowPledge, apply } from '../src/index.js';

const REPO = 'C:\\work\\repo';
const OTHER = 'C:\\work\\other';

// 适配层的最小宿主（与 anchor-channel.test.mjs 同形）
function mockCtx() {
  const handlers = {};
  const tools = [];
  return { ctx: { on: (ev, cb) => { handlers[ev] = cb; }, tools: { register: (t) => { tools.push(t); } } }, handlers, tools };
}
const exec = (name, args) => ({ token: 't', callId: 'c1', name, arguments: args, signal: null });
const next = async () => 'NEXT';

const cap = (o = {}) => ({ id: 'cap-1', actions: ['read', 'write', 'delete'], scope: [REPO, OTHER], maxUses: 99, expiresAt: new Date(Date.now() + 864e5).toISOString(), ...o });
const pledgeOf = (o = {}) => parsePledge({ id: 'p-1', actions: ['read', 'write'], scope: [REPO], maxUses: 10, expiresAt: new Date(Date.now() + 864e5).toISOString(), reason: '本轮只在本仓内改文档', ...o }).pledge;

/** 一次裁决（证与担保都通过 call 顶层字段递进去，与适配层同形） */
function decide(call, { capRaw = null, pledgeRaw = null } = {}) {
  const e = new WeiwenLawEngine();
  return e.decideToolCall({ ...call, taskCapability: capRaw, pledge: pledgeRaw });
}

// —— ① 越界可判 ——

test('❶ 越界：担保只列了读/写，实际去删 ⇒ 拒绝，且判词点名"违背自陈担保"', () => {
  resetPledgeUsage();
  const r = decide(
    { name: 'delete_file', args: { path: REPO + '\\old.md' } },
    { capRaw: cap(), pledgeRaw: pledgeOf() },
  );
  assert.equal(r.kind, 'deny', '担保外的动作必须被拒（证允许也不行 —— 有效面是交集）');
  assert.match(r.reason, /违背自陈担保/);
  assert.equal(r.pledge.state, 'breach');
});

test('❷ 界内：担保覆盖的动作照放行（担保不是"处处设卡"）', () => {
  resetPledgeUsage();
  const r = decide(
    { name: 'write_file', args: { path: REPO + '\\a.md', content: '# hi' } },
    { capRaw: cap(), pledgeRaw: pledgeOf() },
  );
  assert.equal(r.kind, 'allow');
});

test('❸ 出界：证覆盖两个目录，担保只覆盖一个 ⇒ 动第二个目录即越界', () => {
  resetPledgeUsage();
  const r = decide(
    { name: 'write_file', args: { path: OTHER + '\\b.md', content: 'x' } },
    { capRaw: cap(), pledgeRaw: pledgeOf() },
  );
  assert.equal(r.kind, 'deny');
  assert.match(r.reason, /违背自陈担保/);
});

// —— ② 未达不判 ——

test('❹ 未达不判：担保声明 10 次、一次没做 ⇒ 之后的正常动作照常放行，且账本记 0 用 0 越界', () => {
  resetPledgeUsage();
  const p = pledgeOf({ maxUses: 10 });
  const r = decide(
    { name: 'write_file', args: { path: REPO + '\\a.md', content: 'x' } },
    { capRaw: cap(), pledgeRaw: p },
  );
  assert.equal(r.kind, 'allow', '"没做完"不得被读成"违背担保" —— 那是内 H，不可判');
  const st = pledgeStatus(p);
  assert.equal(st.used, 1, '本次兑现记 1 次');
  assert.equal(st.breach, 0);
  assert.equal(st.remaining, 9, '剩余量可读，但不构成闸门');
});

// —— ③ 只能收紧 ——

test('❺ 只能收紧：已有窄担保，提交更宽的被拒，且当前担保纹丝不动', () => {
  resetPledgeUsage();
  setPledge(null);
  const narrow = { id: 'n1', actions: ['read'], scope: [REPO], maxUses: 3, expiresAt: new Date(Date.now() + 3600e3).toISOString() };
  assert.equal(setPledge(narrow).ok, true);

  const wider = { id: 'w1', actions: ['read', 'delete'], scope: [REPO, OTHER], maxUses: 50, expiresAt: new Date(Date.now() + 864e5).toISOString() };
  const r = narrowPledge(wider);
  assert.equal(r.ok, false, '放宽必须被拒（否则先改宽的再干活就绕过了整个机制）');
  assert.match(r.why, /只能收紧不能放宽/);

  // 状态未变：当前担保仍是窄的那份
  const st = pledgeStatus(r.pledge);
  assert.deepEqual([...st.actions], ['read']);
  assert.equal(st.maxUses, 3);
  setPledge(null);
});

test('❻ 收紧可受理：把担保改得更窄 ⇒ 接受', () => {
  resetPledgeUsage();
  setPledge(null);
  setPledge({ id: 'n2', actions: ['read', 'write'], scope: [REPO], maxUses: 10, expiresAt: new Date(Date.now() + 864e5).toISOString() });
  const r = narrowPledge({ id: 'n3', actions: ['read'], scope: [REPO], maxUses: 2, expiresAt: new Date(Date.now() + 3600e3).toISOString() });
  assert.equal(r.ok, true);
  assert.equal(r.pledge.maxUses, 2);
  setPledge(null);
});

test('❼ 首次提交算收紧（从无承诺到有承诺只会更严）', () => {
  setPledge(null);
  const first = parsePledge({ actions: ['read'], scope: [REPO], maxUses: 5 }).pledge;
  assert.equal(isNarrower(first, null).ok, true);
  setPledge(null);
});

// —— ④ 担保不授权 ——

test('❽ 担保不授权：没有通行证时，担保范围内的删除照样交人工（pass 不跳任何判据）', () => {
  resetPledgeUsage();
  const r = decide(
    { name: 'delete_file', args: { path: REPO + '\\old.md' } },
    { capRaw: null, pledgeRaw: pledgeOf({ actions: ['read', 'write', 'delete'] }) },
  );
  assert.equal(r.kind, 'review', '担保只能在证之上做减法；无证时它放不出任何东西');
});

// —— ⑤ 被拒的提交不改变状态 ——

test('❾ 非法提交不污染状态：垃圾担保被拒后，后续正常裁决不受影响（防"一次乱填锁死自己"）', async () => {
  resetPledgeUsage();
  setPledge(null);

  const before = narrowPledge({ nonsense: true });
  assert.equal(before.ok, false);

  // 🔴 必须走**真实的适配层**，不能直接把 pledge:null 塞给引擎 —— 那样测的是引擎，不是"状态有没有被污染"。
  //   第一版就是这么写的，变异验证当场打回：把"非法提交也写进状态"注入进去，14 条测试**全绿**。
  //   病灶与「判据在场 ≠ 判据被调用」同族：测试断言的那一层，不是病灶所在的那一层。
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const out = await handlers['tools/pre-execute'](exec('read_file', { path: REPO + '\\a.md' }), next);
  assert.equal(out, 'NEXT', '状态未被污染 ⇒ 正常读应放行；若被污染，这里会变成"担保在场但不可解析"的 review');
  assert.equal(pledgeStatus(null).declared, false);
  setPledge(null);
});

// —— 边界：到期 / 判不出 ——

test('❿ 到期 ≠ 违背：担保过期后本判据退出（借书证到期不等于偷书）', () => {
  resetPledgeUsage();
  const expired = pledgeOf({ expiresAt: new Date(Date.now() - 1000).toISOString(), maxUses: null });
  const r = decide(
    { name: 'delete_file', args: { path: REPO + '\\old.md' } },
    { capRaw: cap(), pledgeRaw: expired },
  );
  assert.equal(r.kind, 'allow', '过期只让担保失效，不构成越界；动作仍受证与刚性锚约束');
});

test('⓫ 判不出 ≠ 越界：目标不可判时交人工，不按越界处置', () => {
  resetPledgeUsage();
  // ⚠️ 这里必须**不签证书**：有证时"目标不可判"会先被通行证判成 fail 并返回，轮不到担保这一层。
  //   首次写这条测试就踩到了 —— 断言的是担保的行为，前提却让另一个判据先出手（口径不一致的对照＝无效）。
  const r = decide(
    { name: 'write_memory', args: { key: 'k', value: 'v' } },
    { capRaw: null, pledgeRaw: pledgeOf() },
  );
  assert.equal(r.kind, 'review');
  assert.match(r.reason, /核对不了/);
  assert.equal(r.pledge?.state, 'unknown', '判不出必须与越界分开：它不是 breach');
});

// —— 连续越界 ⇒ 转人工（用既有封顶，不新拍阈值）——

test('⓬ 连续越界：同一系统反复违背担保，达封顶即转人工决策', () => {
  resetPledgeUsage();
  const e = new WeiwenLawEngine();
  const p = pledgeOf({ actions: ['read'] });
  let last = null;
  for (let i = 0; i < 12; i += 1) {
    last = e.decideToolCall({ name: 'delete_file', args: { path: REPO + '\\o' + i + '.md' }, taskCapability: cap(), pledge: p });
    if (last.humanDecision) break;
  }
  assert.equal(last.kind, 'review');
  assert.equal(last.humanDecision, true, '达封顶后 AI 停止纠结、转人工（不是无限计数下去）');
});

test('⓯ 提交担保这个动作自己必须过闸 —— 否则"要担保先过闸、过闸又得先有担保"死循环', async () => {
  resetPledgeUsage();
  setPledge(null);
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);

  const args = { actions: ['read', 'write'], paths: [REPO], maxUses: 5, reason: '本轮只在本仓内改文档' };
  const out = await handlers['tools/pre-execute'](exec('submit_pledge', args), next);
  // 🔴 这条锁是补出来的：最初漏了在可信侧声明 `submit_pledge`，于是提交动作本身被归因判成 review
  //   （对外映射成 deny）⇒ 整套机制在实装里根本启动不了，而单测全绿（因为单测直接调 execute）。
  assert.equal(out, 'NEXT', '提交入口必须可过闸（凭据：适配层可信声明 + 带落点参数）');

  // ⚠️ 闸门放行只代表"允许执行"，真正执行的是宿主（这里是 mock 的 next）。
  //   所以过闸之后要**显式**调一次 execute —— 否则测的是"闸门没拦"，不是"担保生效"。
  const submitted = await tools.find((t) => t.name === 'submit_pledge').execute(args, {});
  assert.equal(submitted.ok, true);

  // 提交确实生效：账本读得到
  const st = (await tools.find((t) => t.name === 'query_capability').execute({}, {})).pledge;
  assert.equal(st.declared, true);
  assert.deepEqual([...st.actions], ['read', 'write']);
  setPledge(null);
});

// —— 反例锁：担保不能被当通行证收下（两物不得互相冒充）——

test('⓭ 反例锁：担保不得被 parseCapability 当通行证收下，反之亦然', async () => {
  const { parseCapability } = await import('../src/core/capability.mjs');
  const p = pledgeOf();
  assert.equal(p.__cap, undefined, '担保不得带 __cap 标记（否则一张担保就能冒充通行证）');
  assert.equal(p.__pledge, true);

  const c = parseCapability({ actions: ['read'], scope: [REPO], maxUses: 3 }).cap;
  assert.equal(c.__pledge, undefined);
  assert.equal(c.__cap, true);
});

test('⓮ 反例锁：永久担保（既无次数也无到期）必须被拒 —— 否则等同白名单', () => {
  const r = parsePledge({ actions: ['read'], scope: [REPO] });
  assert.equal(r.ok, false);
  assert.match(r.why, /永久/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 以下四条来自 2026-10-28 **真 DeepSeek API 实测**（不是设想）：
//   模型提交 `paths:["notes.md"]`（相对路径）+ 实际动作给绝对路径 ⇒ 被判「违背自陈担保」
//   并**计入第一 Bug**。三个缺口串成一条链，每一步都让正常动作变成有罪：
//     ① 落点键表只认单数 `path` ⇒ 模型写的 `paths` 整列漏看
//     ② `parsePledge` 收下相对路径 ⇒ 它和绝对目标不可比
//     ③ 不可比落 breach（重罚）而不是 unknown（交人工）
//   ⇒ 「判不出被读成有罪」是 XSUB-10 的镜像：那里是判不出被读成无风险。
// ═══════════════════════════════════════════════════════════════════════════

test('⓯ 相对路径不得进担保范围：提交时就失败，并说清怎么改（不等到干活时判成越界）', () => {
  const r = parsePledge({ actions: ['write'], scope: ['notes.md'], maxUses: 3, reason: '本任务只写这一份' });
  assert.equal(r.ok, false, '相对路径范围必须被拒 —— 基准是本进程 cwd，引擎无从核对');
  assert.match(r.why, /绝对路径/);
  // 补法要能照着改
  assert.match(r.why, /工作目录/);
});

test('⓰ 兜底：范围里残留相对路径、目标是绝对路径 ⇒ 判「核对不了」，绝不判越界（越界会计第一 Bug）', () => {
  resetPledgeUsage();
  // 绕过入口收口，直接造一张含相对范围的担保（模拟历史遗留 / 其他入口写入）
  const legacy = { actions: ['write'], scope: [{ raw: 'notes.md', kind: 'path', value: 'notes.md' }], maxUses: 9, expiresAt: new Date(Date.now() + 864e5).toISOString(), __pledge: true };
  const v = pledgeVerdict({ call: { name: 'write_file', args: { path: REPO + '\\notes.md' } }, layer: 'file-write', pledge: legacy });
  assert.equal(v.state, 'unknown', '不可比 ⇒ 未知，不是越界');
  assert.match(v.why, /核不了|无从核对/);
});

test('⓱ 落点键表收复数与数组：`paths: [...]` 必须被读到（否则担保整列漏看）', () => {
  const t = targetsFor({ name: 'submit_pledge', args: { paths: [REPO, OTHER] } }, 'read');
  assert.equal(t.kind, 'path');
  assert.deepEqual([...t.values].sort(), [REPO.replace(/\\/g, '/'), OTHER.replace(/\\/g, '/')].sort());
  // 单数仍要工作（不许为了复数把单数弄丢）
  assert.deepEqual(targetsFor({ name: 'read_file', args: { path: REPO } }, 'read').values, [REPO.replace(/\\/g, '/')]);
});

test('⓲ 相对文件名是合法的落点：`write_file{path:"notes.md"}` 不得被判「未外化具体作用对象」', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const pre = handlers['tools/pre-execute'];
  const d = await pre(exec('write_file', { path: 'notes.md', content: '# 纪要' }), next);
  assert.notEqual(d?.law, '证据不足', '相对路径是合法用法，不能当成"没给目标"');
});
