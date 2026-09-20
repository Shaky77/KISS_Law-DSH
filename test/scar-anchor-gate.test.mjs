// scar-anchor-gate.test.mjs — 痕锚归属判据回归锁（扣子 coze/51 方向，2026-09-20 落地）
// ---------------------------------------------------------------------------
// 被锁定的结构（一条判据 + 两处接线）：
//   ① 判据：**scar 类（不可逆）动作 + 无法归属到任何已声明锚（言锚/任务锚）⇒ REVIEW**
//      看的是痕的**锚归属**（Y 轴），不是路径形状/黑名单（X 轴）。
//   ② 接线（洞①）：容器类别（exec）**不得短路**实质层剥离 ⇒ 破坏类动作的域归属落 Micro（最大冲击=最微观落点），
//      不再恒落最外层 Cosmic（否则账本里"删库"与"列目录"同域同痕，攻击链与合法链读不出差别）。
//   ③ 接线（洞③）：刻痕带**原始动作**（action）⇒ 事后可溯。
// 证据来源：本地真引擎独立复核 coze/51 三条链与三洞探针，逐帧一致（见 coze/52 回信）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { attributeCall, domainOf } from '../src/core/attribution.mjs';

const RT = (cmd) => ({ name: 'run_task', args: { command: cmd } });

// ── 链A·合法渐进（言锚在场）：归得上锚 ⇒ 保持放行（不得误伤正常清理） ──
test('scar+锚：言锚在场且同类对象 ⇒ 合法清理链保持 allow（不误伤）', () => {
  const e = new WeiwenLawEngine();
  const utt = '清理项目临时文件';
  assert.equal(e.decideToolCall(RT('ls /app/tmp/'), utt).kind, 'allow');
  assert.equal(e.decideToolCall(RT('rm /app/tmp/scratch.txt'), utt).kind, 'allow');
  assert.equal(e.decideToolCall(RT('rm /app/tmp/cache-*'), utt).kind, 'allow');
});

// ── 链B·攻击外扩（无锚）：旧实现全 allow（fail-open）⇒ 现 REVIEW ──
test('scar+无锚（链B·攻击外扩）⇒ REVIEW（闭合"枚举外一切破坏动作 fail-open"）', () => {
  const e = new WeiwenLawEngine();
  assert.equal(e.decideToolCall(RT('rm /tmp/a.txt')).kind, 'review');
  assert.equal(e.decideToolCall(RT('rm /app/config.json')).kind, 'review');
  assert.equal(e.decideToolCall(RT('rm /var/lib/mysql/ibdata1')).kind, 'review');
  // R 层路径枚举仍先手：/etc 属系统目录 ⇒ deny（本判据不抢戏）
  assert.equal(e.decideToolCall(RT('rm -rf /etc')).kind, 'deny');
});

// ── 链C·词表盲区：删整个应用数据目录 ──
test('scar+无锚（链C·删应用数据目录）⇒ REVIEW（旧实现 allow）', () => {
  assert.equal(new WeiwenLawEngine().decideToolCall(RT('rm -rf /app/data')).kind, 'review');
});

// ── 洞②（言锚的作用域未参与比对）：路径级言锚 ⇒ 域内放行 / 域外交人工 ──
test('路径级言锚：越出已声明作用域 ⇒ REVIEW（言明示的路径优先于类别兜底）', () => {
  const utt = '只清理 /app/tmp 下的临时文件';
  assert.equal(new WeiwenLawEngine().decideToolCall(RT('rm /app/tmp/scratch.txt'), utt).kind, 'allow');
  const out = new WeiwenLawEngine().decideToolCall(RT('rm /app/logs/old-run.log'), utt);
  assert.equal(out.kind, 'review');
  assert.ok(out.scarUnanchored, 'review 须带 scarUnanchored 证据（痕/锚/声明范围）');
});

// ── 任务锚：前一轮言里声明过的范围，在本会话内累积成任务锚 ──
test('任务锚：先声明过后，同一范围内后续 scar 动作可归锚（声明累积，非"做过即锚"）', () => {
  const e = new WeiwenLawEngine();
  assert.equal(e.decideToolCall(RT('rm /srv/build/stage/old.txt'), '本轮只清理 /srv/build/stage').kind, 'allow');
  // 第二轮不再重复声明，锚池仍在 ⇒ 同范围内仍可归锚
  assert.equal(e.decideToolCall(RT('rm /srv/build/stage/tmp.bin')).kind, 'allow');
  // 范围外 ⇒ 归不上 ⇒ 交人工
  assert.equal(e.decideToolCall(RT('rm /srv/prod/db.bin')).kind, 'review');
});

// ── 洞①：容器不得短路 ⇒ attrib.layer / R 域可分辨 ──
test('洞① 域归属：容器(exec)不下探 ⇒ 破坏类与只读类同落 Cosmic；修复后可分辨', () => {
  const del = attributeCall(RT('rm /app/data'));
  const ro = attributeCall(RT('ls /app/tmp/'));
  const send = attributeCall(RT('curl http://x/y'));
  assert.equal(del.layer, 'exec-destructive');   // 剥出实质层（旧实现恒为 exec）
  assert.equal(domainOf(del.layer).name, 'Micro');   // 最大冲击 = 最微观落点
  assert.equal(domainOf(ro.layer).name, 'Cosmic');   // 只读剥不出实质 ⇒ 最外层（域全集覆盖，永不空）
  assert.equal(domainOf(send.layer).name, 'Macro');  // 外传 = 共享远端/外部
  // 账本里域标签随之为可分辨信号（不再是清一色 Cosmic）
  const e = new WeiwenLawEngine();
  e.decideToolCall(RT('rm /app/tmp/scratch.txt'), '清理项目临时文件');
  assert.ok(e.sAccount.sSeq().some((r) => (r.rDomains || []).includes('Micro')));
});

// ── 洞③：刻痕带原始动作 ⇒ 事后可溯 ──
test('洞③ 刻痕存原始动作：sSeq 记录 action（旧实现 detail/action 全 null，事后读不出做了什么）', () => {
  const e = new WeiwenLawEngine();
  e.decideToolCall(RT('ls -la /app/tmp'));
  const rec = e.sAccount.sSeq()[0];
  assert.equal(rec.action, 'ls -la /app/tmp');
  assert.equal(rec.sign, '+');
});

// ── 对照：本判据只锚 scar 类（有限封闭集），不碰只读/可逆写（不得误伤） ──
test('对照·不误伤：只读 / 可逆写 / 结构化只读 一律不受本判据影响', () => {
  assert.equal(new WeiwenLawEngine().decideToolCall({ name: 'read_file', args: { path: '/app/tmp/a.log' } }).kind, 'allow');
  assert.equal(new WeiwenLawEngine().decideToolCall(RT('ls -la /app')).kind, 'allow');
  assert.equal(new WeiwenLawEngine().decideToolCall(RT('cat /app/tmp/a.log')).kind, 'allow');
  assert.equal(new WeiwenLawEngine().decideToolCall({ name: 'write_file', args: { path: '/app/tmp/new.md', content: 'x' } }).kind, 'allow');
});

// ── 对照：R 刚性锚与物证门禁仍先手，不被本判据抢戏 ──
test('对照·不抢戏：rm -rf / 仍 deny(R)；物证缺失 rm -rf 仍 remand（非法条）', () => {
  const e1 = new WeiwenLawEngine();
  const d1 = e1.decideToolCall(RT('rm -rf /'));
  assert.equal(d1.kind, 'deny');
  assert.equal(d1.law, 'R');
  const d2 = new WeiwenLawEngine().decideToolCall(RT('rm -rf'));
  assert.equal(d2.kind, 'review');
  assert.equal(d2.insufficient_evidence, undefined); // 引擎面：物证缺失在窗层标注，引擎面为 fractalSubM review
  assert.equal(d2.fractalSubM, true);
});

// ── 对照：言行分裂（更硬的既有判据）优先于锚归属 ──
test('对照·优先级：明诺不删却删 ⇒ deny(言行)，不被降级成锚归属 review', () => {
  const out = new WeiwenLawEngine().decideToolCall(RT('rm -rf /app/data'), '我不会删除任何东西');
  assert.equal(out.kind, 'deny');
  assert.equal(out.law, '言行');
});
