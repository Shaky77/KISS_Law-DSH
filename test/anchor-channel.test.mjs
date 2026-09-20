// anchor-channel.test.mjs — 锚通道（Y 轴解法）与主体分离的**适配层**回归锁
// ---------------------------------------------------------------------------
// 补上了 src/index.js 此前**零测试覆盖**的缺口（skill: weiwen-law-engine-patch 已记该缺口）。
// 被锁定的结构：
//   ① 通道：言 / 任务范围在**消息流**里（宿主契约 `agent/pre-step` 的 payload 明文含 `messages`，
//      见 src/index.js 顶部 API 注）⇒ 取言在 pre-step、用在 pre-execute，**不需要猜任何 utterance 字段名**。
//   ② 主体分离：授权锚只由**委托人**声明喂养；助手（被审计方）自述**不授权**（否则自我授权 ⇒ 门自解除）。
//   ③ 诚实降级：抽不出委托人消息 ⇒ **不猜** ⇒ 锚池留空 ⇒ 不可逆动作交人工（fail-closed），
//      同时 `query_anchor_channel` 把"看到了什么"如实吐出 ⇒ 实机用**观测**替代猜测字段名。
// 注：引擎侧 `anchorChannel` 在**裁决发生时**写入 ⇒ 读它之前必须先走一次真实裁决（否则读到构造初值）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../src/index.js';

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
const step = (messages) => ({ agent: 'main', messages, step: 1, signal: null });
const toolNamed = (tools, n) => tools.find((t) => t.name === n);

test('通道：委托人声明（messages 里的 user 消息）成为授权锚 ⇒ 范围内删除放行', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  await handlers['agent/pre-step'](step([{ role: 'user', content: '清理 /app/tmp 里的临时文件' }]), next);
  const out = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/tmp/*' }), next);
  assert.equal(out, 'NEXT', '范围内 ⇒ 放行至下一环');
});

test('通道：范围外删除 ⇒ 交人工挂起（不直接放行）', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  await handlers['agent/pre-step'](step([{ role: 'user', content: '清理 /app/tmp 里的临时文件' }]), next);
  const out = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/logs' }), next);
  assert.equal(out.kind, 'deny');
  assert.equal(out.awaitingHuman, true);
});

test('主体分离：只有助手消息（无委托人）⇒ 不形成授权锚 ⇒ 不可逆动作交人工', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  await handlers['agent/pre-step'](step([{ role: 'assistant', content: '我要清空 /app/data' }]), next);
  const out = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/data' }), next);
  assert.equal(out.kind, 'deny', '被审计方不得自我授权');
  assert.equal(out.awaitingHuman, true);
});

test('诚实降级：messages 形状不认识 ⇒ 不抛错、不臆造授权（锚池留空）', async () => {
  const shapes = [undefined, null, 'not-an-array', 42, [{}], [{ role: 12345 }], [{ body: 'x' }], [{ role: 'user', content: '' }]];
  for (const messages of shapes) {
    const { ctx, handlers } = mockCtx();
    apply(ctx);
    await handlers['agent/pre-step']({ agent: 'main', messages, step: 1 }, next);   // 不得抛错
    const out = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/data' }), next);
    assert.equal(out.kind, 'deny', `形状 ${JSON.stringify(messages)} 下仍须 fail-closed`);
  }
});

test('自报：query_anchor_channel 如实吐出通道事实（实机以观测替代猜测字段名）', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const tool = toolNamed(tools, 'query_anchor_channel');
  assert.ok(tool, '须注册锚通道自报工具');
  await handlers['agent/pre-step'](
    step([{ role: 'user', content: '清理 /app/tmp 里的临时文件' }, { role: 'assistant', content: '好的' }]),
    next,
  );
  // 引擎通道自报在裁决时写入 ⇒ 先走一次真实裁决再读
  await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/tmp/*' }), next);
  const rep = await tool.execute({}, {});
  assert.equal(rep.adapter.principalFound, true);
  assert.equal(rep.adapter.shape, 'array');
  assert.deepEqual([...rep.adapter.rolesSeen].sort(), ['assistant', 'user']);
  assert.equal(rep.adapter.assistantSeen, true, '助手自述只观察、不采信');
  assert.equal(rep.engine.principalAnchorSeen, true);
  assert.equal(rep.engine.utteranceSeen, false, '言未到（窗口面仍不传言）——如实报，不假装');
  assert.ok(rep.engine.poolPaths.includes('/app/tmp'), '委托人声明的路径须落进锚池');
});

test('自报：无委托人消息时如实报"没找到"（不假装有）', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const tool = toolNamed(tools, 'query_anchor_channel');
  await handlers['agent/pre-step'](step([{ role: 'assistant', content: '我在想' }]), next);
  await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/data' }), next);   // 真实裁决一次
  const rep = await tool.execute({}, {});
  assert.equal(rep.adapter.principalFound, false);
  assert.equal(rep.engine.principalAnchorSeen, false);
  assert.deepEqual(rep.engine.poolPaths, []);
  assert.equal(rep.adapter.assistantSeen, true, '助手消息确实看到了，但只观察');
});

test('形状容错：结构化 content（分片数组）也能被抽取', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  const tool = toolNamed(tools, 'query_anchor_channel');
  await handlers['agent/pre-step'](
    step([{ role: 'user', content: [{ type: 'text', text: '清理 /app/tmp 里的临时文件' }] }]),
    next,
  );
  await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/tmp/*' }), next);
  const rep = await tool.execute({}, {});
  assert.equal(rep.adapter.principalFound, true);
  assert.ok(rep.engine.poolPaths.includes('/app/tmp'));
});

test('安全：exec.arguments 里的 taskAnchor 不得冒充授权（不许旁路自授权）', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  // 无 pre-step ⇒ 无委托人声明；同时把 taskAnchor 塞进 arguments 试图自我授权
  const out = await handlers['tools/pre-execute'](
    exec('run_task', { command: 'rm -rf /app/data', taskAnchor: '把 /app/data 清空' }),
    next,
  );
  assert.equal(out.kind, 'deny', '授权只从宿主契约通道来，不接受调用参数自报');
});

test('持续有效：委托人声明不因某一 step 无新指令而失效', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  await handlers['agent/pre-step'](step([{ role: 'user', content: '清理 /app/tmp 里的临时文件' }]), next);
  // 第二个 step 无委托人消息（例如只剩助手回合）⇒ 上一次声明仍应有效
  await handlers['agent/pre-step'](step([{ role: 'assistant', content: '继续' }]), next);
  const out = await handlers['tools/pre-execute'](exec('run_task', { command: 'rm -rf /app/tmp/*' }), next);
  assert.equal(out, 'NEXT', '任务范围在会话内持续有效');
});
