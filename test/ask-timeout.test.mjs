// The popup must not freeze the adjudicator (trustee's measurement, 2026-10-29: while the popup was
// pending she could not even send a message). Fix: the question has a deadline; on expiry it is
// withdrawn ⇒ lands as "defer" (action not executed, not a refusal, no cooldown, human free).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, setPrincipalScope, setReviewAskTimeout } from '../src/index.js';

function mockCtx(script = []) {
  const handlers = {};
  const asks = [];
  let i = 0;
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: () => {} },
    get: (n) => (n === 'approval' ? {
      request: async (req) => {
        asks.push(req);
        // The human never answers ⇒ honour the abort signal and throw AbortError
        // (contract: abort ⇒ the request settles 'cancelled').
        if (script[i] === 'hang') {
          return new Promise((_res, rej) => {
            req.signal?.addEventListener?.('abort', () => {
              const e = new Error('The operation was aborted');
              e.name = 'AbortError';
              rej(e);
            });
          });
        }
        return script[i++] ?? 'unavailable';
      },
    } : undefined),
  };
  return { ctx, handlers, asks };
}
const next = async () => 'NEXT';
const exec = (name, args = {}, callId = 'c1') => ({ token: 't', callId, name, arguments: args, agent: 'main', signal: null });
const REVIEW = () => exec('write', { path: '/etc/hosts', content: '127.0.0.1 x' }, 'r' + Math.random());

test('the request carries a signal (the host can withdraw; the human need not stay)', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtx(['allowed-once']);
  apply(ctx);
  await handlers['tools/pre-execute'](REVIEW(), next);
  assert.equal(asks.length, 1);
  assert.ok(asks[0].signal, 'the request must carry an abort signal (prerequisite for withdrawal)');
  assert.match(asks[0].reason, /need not stay here|no answer within/, 'the popup text must state the deadline');
});

test('no answer ⇒ deadline withdrawal ⇒ lands as defer (not a refusal, no cooldown)', async () => {
  setPrincipalScope(null);
  setReviewAskTimeout(60);   // production default is 120 s; shortened here (the deadline is injectable)
  const { ctx, handlers } = mockCtx(['hang']);
  apply(ctx);
  const t0 = Date.now();
  const out = await handlers['tools/pre-execute'](REVIEW(), next);
  const dt = Date.now() - t0;
  assert.ok(dt < 5000, `must end within the deadline (measured ${dt}ms), never wait forever`);
  assert.equal(out.kind, 'deny', 'no answer ⇒ the action is not executed');
  assert.match(out.reason, /deferred/, 'no answer (deadline withdrawal) ⇒ lands as defer');
  assert.doesNotMatch(out.reason, /Trustee's verdict/, 'defer is not a refusal');
  setReviewAskTimeout(120000);
});
