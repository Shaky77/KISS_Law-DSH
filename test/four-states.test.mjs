// Four states (trustee's ruling, 2026-10-29): allow once / always allow / refuse / defer
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, setPrincipalScope, clearReviewMemory } from '../src/index.js';

function mockCtx(script = []) {
  const handlers = {};
  const asks = [];
  let i = 0;
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: () => {} },
    get: (n) => (n === 'approval' ? {
      request: async (req) => { asks.push(req); return script[i++] ?? 'unavailable'; },
    } : undefined),
  };
  return { ctx, handlers, asks };
}
const next = async () => 'NEXT';
const exec = (name, args = {}, callId = 'c1') => ({ token: 't', callId, name, arguments: args, agent: 'main', signal: null });
// A call that produces a review (writing a system file ⇒ medium-risk deduction)
const REVIEW = () => exec('write', { path: '/etc/hosts', content: '127.0.0.1 x' }, 'r' + Math.random());

test('state ① allow once (allowed-once): this call goes through, the same kind asks again', async () => {
  setPrincipalScope(null);
  clearReviewMemory();
  const { ctx, handlers, asks } = mockCtx(['allowed-once', 'allowed-once']);
  apply(ctx);
  const o1 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(o1, 'NEXT', 'allow once ⇒ this call goes through');
  const o2 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(o2, 'NEXT');
  assert.equal(asks.length, 2, 'allow once ≠ permanent: the same kind must ask again');
});

test('state ② always allow (outcome=always): the same kind is not asked again, and it is revocable', async () => {
  setPrincipalScope(null);
  clearReviewMemory();
  const { ctx, handlers, asks } = mockCtx(['always', 'always']);
  apply(ctx);
  await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(asks.length, 1);
  const o2 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(o2, 'NEXT', 'the same kind follows the always-allow');
  assert.equal(asks.length, 1, 'always allow ⇒ the same kind is not asked again (effect side of the fourth state)');
  assert.ok(clearReviewMemory() >= 1, 'always-allow must be revocable');
  await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(asks.length, 2, 'after revocation the same kind asks again');
});

test('state ③ refuse (rejected): not executed + cooldown for this kind (no collateral on other kinds)', async () => {
  setPrincipalScope(null);
  clearReviewMemory();
  const { ctx, handlers, asks } = mockCtx(['rejected', 'allowed-once']);
  apply(ctx);
  const o1 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(o1.kind, 'deny');
  assert.match(o1.reason, /Trustee's verdict/, 'a refusal must name that the trustee ruled it');
  const o2 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(asks.length, 1, 'no re-ask of this kind during cooldown');
  assert.match(o2.reason, /Following your previous verdict/);
});

test('state ④ defer (cancelled): not executed + kept + **no cooldown** (it is not a refusal)', async () => {
  setPrincipalScope(null);
  clearReviewMemory();
  const { ctx, handlers, asks } = mockCtx(['cancelled', 'allowed-once']);
  apply(ctx);
  const o1 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(o1.kind, 'deny', 'deferred ⇒ not executed this round');
  assert.match(o1.reason, /deferred/, 'the receipt must say "deferred", not pose as a refusal');
  assert.doesNotMatch(o1.reason, /Trustee's verdict/, 'deferred ≠ refused: no refusal label');
  const o2 = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(asks.length, 2, 'defer carries no cooldown ⇒ the same kind asks again (the human has not ruled)');
  assert.equal(o2, 'NEXT');
});

test('control: no answer (unavailable) ⇒ fail-closed, silent as in 0.2.14', async () => {
  setPrincipalScope(null);
  clearReviewMemory();
  const { ctx, handlers } = mockCtx(['unavailable']);
  apply(ctx);
  const o = await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(o.kind, 'deny');
  assert.doesNotMatch(o.reason, /deferred/, 'no answerer ≠ deferred (one is no channel, the other is the human suspending)');
});
