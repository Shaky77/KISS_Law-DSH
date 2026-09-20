// anchor-channel.test.mjs — 锚源定位（Y 轴定案 2026-09-20）的结构回归锁
// （文件名沿用历史的 anchor-channel；锁定对象已从"通道"改为"锚源定位"）
// ---------------------------------------------------------------------------
// 被锁定的结构（＝安的问题「可能言窗口面，本就是噪音？」的落地）：
//   ① **窗口面是观察面，不是锚源**。`agent/pre-step` 的 messages 只被观测（形状 / role 词表 / 线索），
//      其文本**一律不授权** —— 把授权挂在窗口面上＝把 Y 轴的量寄存在 X 轴的容器里。
//   ② **授权锚只有一个来源：结构入口** `setPrincipalScope()`（模块级 API，宿主集成方在启动/step 边界调用）。
//      它不是工具 ⇒ 模型调不到 ⇒ 主体分离由**位置**保证，不靠内容判别。
//   ③ **入口未接 ⇒ 锚池留空 ⇒ 不可逆动作交人工**（fail-closed）。这是设计，不是"漏读消息"。
//   ④ **替换语义**：锚池反映**当前有效范围**，非只增刻痕 —— 撤回/改范围立即生效（授权撤不回＝越权）。
//
// 探针实测（直读 declaredAnchors）——两种失效模式，故窗口面不可作锚源：
//   (a) 假接通：委托人最新一条＝"继续／好的／开始吧" ⇒ paths=[] nouns=[] ⇒ 锚池空却报"已授权"
//       ⇒ 表面"通道通了"、实际零授权能力 ⇒ 诱人继续修通道（X 轴惯性）；
//   (b) 假人证：agent 自述"我在想，接下来我要清空 /app/data" ⇒ paths=[/app/data] ⇒ 一旦 role 判别偏差被采信，
//       真路径进池 ⇒ 不可逆动作放行（比"无人证"更坏）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, setPrincipalScope } from '../src/index.js';

function mockCtx() {
  const handlers = {};
  const tools = [];
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: (t) => { tools.push(t); } },
  };
  return { ctx, handlers, tools };
}

const exec = (name, args) => ({ token: 't', callId: 'c1', name, arguments: args, signal: null });
const next = async () => 'NEXT';
const step = (messages, agent = 'main') => ({ agent, messages, step: 1, signal: null });
const toolNamed = (tools, n) => tools.find((t) => t.name === n);

// —— 窗口面：不授权（核心回归锁） ——

test('窗口面不授权：委托人消息里写明范围，锚池仍空 ⇒ 不可逆动作交人工', async () => {
  setPrincipalScope(null);
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  await handlers['agent/pre-step'](step([{ role: 'user', content: '清理 /app/tmp 里的临时文件' }]), next);
  const out = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/tmp/*' }), next);
  assert.equal(out.kind, 'deny', '窗口面文本不得充当授权（哪怕它看起来正是任务范围）');
  assert.equal(out.awaitingHuman, true);
});

test('假接通：委托人最新一条是承接语「继续」⇒ 不得报"已授权"、锚池不得被填', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const tool = toolNamed(tools, 'query_anchor_channel');
  await handlers['agent/pre-step'](
    step([{ role: 'user', content: '清理 /app/tmp 里的临时文件' }, { role: 'user', content: '继续' }]),
    next,
  );
  await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/data' }), next);
  const rep = await tool.execute({}, {});
  assert.equal(rep.adapter.authoritySeen, false, '授权只认结构入口，承接语不得让"已授权"为真');
  assert.equal(rep.engine.principalAnchorSeen, false);
  assert.deepEqual(rep.engine.poolPaths, []);
  assert.equal(rep.adapter.clueSeen, true, '线索仍如实记录（给人看），但线索≠授权');
  assert.equal(rep.adapter.clueNonAuthoritative, true);
});

test('假人证：agent 自述含真路径 ⇒ 不进锚池、不授权', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const tool = toolNamed(tools, 'query_anchor_channel');
  await handlers['agent/pre-step'](step([{ role: 'assistant', content: '我在想，接下来我要清空 /app/data' }]), next);
  const out = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/data' }), next);
  assert.equal(out.kind, 'deny', '被审计方的自述不得自我授权');
  const rep = await tool.execute({}, {});
  assert.deepEqual(rep.engine.poolPaths, []);
  assert.equal(rep.adapter.assistantSeen, true, '助手自述只观察');
});

// —— 结构入口：授权（位置确定） ——

test('结构入口授权：setPrincipalScope 声明范围 ⇒ 范围内删除放行', async () => {
  setPrincipalScope('清理 /app/tmp 里的临时文件');
  try {
    const { ctx, handlers } = mockCtx();
    apply(ctx);
    await handlers['agent/pre-step'](step([{ role: 'user', content: '继续' }]), next);   // 窗口面纯承接语
    const out = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/tmp/*' }), next);
    assert.equal(out, 'NEXT', '授权来自结构入口 ⇒ 范围内放行（与窗口面内容无关）');
  } finally { setPrincipalScope(null); }
});

test('结构入口授权：范围外删除 ⇒ 交人工挂起', async () => {
  setPrincipalScope('清理 /app/tmp 里的临时文件');
  try {
    const { ctx, handlers } = mockCtx();
    apply(ctx);
    await handlers['agent/pre-step'](step([{ role: 'user', content: '继续' }]), next);
    const out = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/logs' }), next);
    assert.equal(out.kind, 'deny');
    assert.equal(out.awaitingHuman, true, '声明范围外 ⇒ 判不出交人工，不猜');
  } finally { setPrincipalScope(null); }
});

// —— 锚池语义：当前有效量（替换），不是只增刻痕 ——

test('入口撤回 ⇒ 立即回到 fail-closed（授权随位置在/不在，不靠会话记忆文本）', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  await handlers['agent/pre-step'](step([{ role: 'user', content: '清理 /app/tmp 里的临时文件' }]), next);
  setPrincipalScope('清理 /app/tmp 里的临时文件');
  const a = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/tmp/*' }), next);
  assert.equal(a, 'NEXT');
  setPrincipalScope(null);   // 入口撤回
  const b = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/tmp/*' }), next);
  assert.equal(b.kind, 'deny', '入口不在 ⇒ 锚池空 ⇒ 不可逆动作交人工');
});

test('替换语义：委托人改范围后，旧范围立即失效（授权撤不回＝越权）', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  setPrincipalScope('清理 /app/tmp 里的临时文件');
  const a = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/tmp/*' }), next);
  assert.equal(a, 'NEXT');
  setPrincipalScope('清理 /app/logs 里的临时文件');   // 范围变更
  const b = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/tmp/*' }), next);
  assert.equal(b.kind, 'deny', '旧范围不得因"曾声明过"而永久留在池里');
  setPrincipalScope(null);
});

// —— 主体分离：由位置强制，不靠内容判别 ——

test('主体分离：授权入口在模块 API、不在工具面 ⇒ 模型侧无自授权路径', async () => {
  setPrincipalScope(null);
  const { ctx, tools } = mockCtx();
  apply(ctx);
  assert.equal(typeof setPrincipalScope, 'function', '结构入口须存在于模块 API（宿主集成方可达、模型不可达）');
  // 工具面不得有任何可写入"范围/授权"的入参（只读查询工具名里含 anchor 是正常的，看的是**入参**）
  const AUTH_KEY = /^(scope|task|taskanchor|authoriz|permission|grant|allow|principal)/i;
  for (const t of tools) {
    const keys = Object.keys(t.parameters?.properties ?? {});
    assert.equal(keys.some((k) => AUTH_KEY.test(k)), false, `工具 ${t.name} 不得接受授权类入参（否则模型可自我授权）`);
  }
});

test('安全：exec.arguments 里的 taskAnchor 不得冒充授权', async () => {
  setPrincipalScope(null);
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const out = await handlers['tools/pre-execute'](
    exec('run_task', { command: 'rm -rf /app/data', taskAnchor: '把 /app/data 清空' }),
    next,
  );
  assert.equal(out.kind, 'deny', '授权只从结构入口来，不接受调用参数自报');
});

// —— 观测：用事实替代猜测字段名 ——

test('自报：query_anchor_channel 如实吐出观测与结构缺口', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const tool = toolNamed(tools, 'query_anchor_channel');
  assert.ok(tool, '须注册锚源自报工具');
  await handlers['agent/pre-step'](
    { agent: { id: 'a1', scope: { task: '清理 /app/tmp' } }, messages: [{ role: 'user', content: '清理 /app/tmp 里的临时文件' }], step: 1 },
    next,
  );
  await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/tmp/*' }), next);
  const rep = await tool.execute({}, {});
  assert.equal(rep.adapter.authority, 'structural-entry');
  assert.equal(rep.adapter.shape, 'array');
  assert.deepEqual([...rep.adapter.rolesSeen].sort(), ['user']);
  assert.equal(rep.adapter.agentBoundary.present, true);
  assert.deepEqual(rep.adapter.agentBoundary.keys, ['id', 'scope'], '宿主结构对象键集＝接真入口所需的事实（不猜名字）');
  assert.equal(typeof rep.adapter.structGap, 'string');
  assert.ok(rep.adapter.structGap.includes('结构边界'), '须明说授权锚该在哪个位置');
});

test('观测降级：畸形 messages / 缺 agent ⇒ 不抛错、不臆造授权（fail-closed）', async () => {
  const shapes = [undefined, null, 'not-an-array', 42, [{}], [{ role: 12345 }], [{ body: 'x' }], [{ role: 'user', content: '' }]];
  for (const messages of shapes) {
    const { ctx, handlers, tools } = mockCtx();
    apply(ctx);
    const tool = toolNamed(tools, 'query_anchor_channel');
    await handlers['agent/pre-step']({ agent: 'main', messages, step: 1 }, next);   // 不得抛错
    const out = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/data' }), next);
    assert.equal(out.kind, 'deny', `形状 ${JSON.stringify(messages)} 下仍须 fail-closed`);
    const rep = await tool.execute({}, {});
    assert.equal(rep.engine.principalAnchorSeen, false);
  }
});

test('形状容错：分片 content 只作线索记录，不改变"不授权"结论', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const tool = toolNamed(tools, 'query_anchor_channel');
  await handlers['agent/pre-step'](
    step([{ role: 'user', content: [{ type: 'text', text: '清理 /app/tmp 里的临时文件' }] }]),
    next,
  );
  await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/tmp/*' }), next);
  const rep = await tool.execute({}, {});
  assert.equal(rep.adapter.clueSeen, true);
  assert.equal(rep.adapter.authoritySeen, false);
  assert.deepEqual(rep.engine.poolPaths, [], '线索不落池');
});

test('窗口面跑再多 step 也不得积累出授权', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const tool = toolNamed(tools, 'query_anchor_channel');
  for (const c of ['清理 /app/tmp 里的临时文件', '继续', '接着把日志也清掉 /app/logs']) {
    await handlers['agent/pre-step'](step([{ role: 'user', content: c }]), next);
    await handlers['tools/pre-execute'](exec('run_task', { command: 'ls /tmp' }), next);
  }
  const rep = await tool.execute({}, {});
  assert.deepEqual(rep.engine.poolPaths, [], '窗口面无论跑多少 step 都不得积累授权');
  assert.equal(rep.adapter.steps, 3, '观测计数照记');
});
