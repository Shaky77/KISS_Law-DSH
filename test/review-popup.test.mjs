// review-popup.test.mjs — structural regression lock: review outlet wired to the approval channel
// (2026-10-29 · approved by the trustee)
// ---------------------------------------------------------------------------
// Structure under lock (the fix for the gap measured by xiaoD #27):
//   ① The engine CAN produce "uncertain" (review); the adapter no longer flattens it into a silent deny —
//      on hosts with an approval service, review must go through human adjudication (popup carries three
//      things: who refused / why / what you can do).
//   ② What stays silent stays silent (control group): deny (deterministic verdicts) never pop; the
//      broken-window state does not pop; no approval service / no agent context / approval exception ⇒
//      bit-identical with 0.2.14 (zero regression).
//   ③ Semantic boundary: the "once" in allowed-once = this one call (action-level; the next identical call
//      re-asks) — orthogonal to the buffer thaw's "state grant"; rejected is a final deny annotated with the
//      trustee's verdict; no re-ask during cooldown.
//   ④ Audit: allow/refuse both leave a runtime.log whitebox trace; an approved call does NOT enter the
//      blocked set (its result is a real result, not an "error caused by this layer").
//
// ⚠️ Structural fact (probed 2026-10-29, to prevent future misreading):
//   windowBroken=true is set only by the R-projection accumulation path (engine L2391); onFailure only
//   increments failureStreak without setting the flag.
//   ⇒ In the "streak over threshold but not formally broken" state (onFailure path) the buffer tier is in
//     force and windowBroken=false — the review popup DOES appear there. That is design intent, not a bug:
//     review = "cannot decide, return to human"; the popup is exactly the wired return path.
//     Only a true windowBroken=true (R-projection accumulation) goes fail-closed flatten (locked here).
import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, setPrincipalScope } from '../src/index.js';

const exec = (name, args) => ({ token: 't', callId: 'c1', name, arguments: args, agent: 'main', signal: null });
const next = async () => 'NEXT';

// Host WITHOUT an approval service (= 0.2.14 status quo; control-group baseline)
function mockCtxPlain() {
  const handlers = {};
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: () => {} },
  };
  return { ctx, handlers };
}

// Host WITH an approval service: scripted per-call verdicts
function mockCtxWithApproval(script) {
  const handlers = {};
  const asks = [];
  let i = 0;
  const approval = {
    request: async (req) => {
      asks.push(req);
      const v = script[Math.min(i, script.length - 1)];
      i += 1;
      if (v instanceof Error) throw v;
      return v;
    },
  };
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: () => {} },
    get: (name) => (name === 'approval' ? approval : undefined),
  };
  return { ctx, handlers, asks };
}

// A call that triggers review: irreversible action with no authorization anchor ⇒ engine returns it to the human
const REVIEW_CALL = ['run_task', { command: 'rm -rf /app/tmp/*' }];
// A call with a deterministic deny: credential read ⇒ hard-blocked at layer R (control group)
const DENY_CALL = ['read', { path: '~/.ssh/id_rsa' }];

test('🔴 control: no approval service ⇒ review still silently denied (bit-identical with 0.2.14, zero regression)', async () => {
  setPrincipalScope(null);
  const { ctx, handlers } = mockCtxPlain();
  apply(ctx);
  const out = await handlers['tools/pre-execute'](exec(...REVIEW_CALL), next);
  assert.equal(out.kind, 'deny', 'no approval face ⇒ silent flatten (fail-closed)');
  assert.equal(out.awaitingHuman, true, 'pending semantics preserved (awaitingHuman is pre-0.2.14 behavior)');
});

test('🔴 control: deterministic deny (layer-R credential read) never pops', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['allowed-once']);
  apply(ctx);
  const out = await handlers['tools/pre-execute'](exec(...DENY_CALL), next);
  assert.equal(out.kind, 'deny');
  assert.equal(out.law, 'R');
  assert.equal(asks.length, 0, 'a decided refusal never pops — the popup serves "cannot decide", it never overturns a deterministic deny');
});

test('review + trustee allows ⇒ this one call goes through (next invoked)', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['allowed-once']);
  apply(ctx);
  const out = await handlers['tools/pre-execute'](exec(...REVIEW_CALL), next);
  assert.equal(out, 'NEXT', 'allowed-once ⇒ let this step through');
  assert.equal(asks.length, 1);
});

test('popup carries three things: who refused (law) / why (reason verbatim) / what you can do (allow & refuse options)', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['rejected']);
  apply(ctx);
  await handlers['tools/pre-execute'](exec(...REVIEW_CALL), next);
  assert.equal(asks.length, 1);
  const reason = asks[0].reason;
  // [2026-10-29 · after the popup refinement] the semantic locks are unchanged (authorization request /
  //   verdict nature / two options / granularity / audit) — only the title became "needs a verdict" and
  //   the criterion text became a one-line summary pointing at the ledger.
  assert.match(reason, /authorization request/, 'the popup must mark itself an authorization request, not a notification');
  assert.match(reason, /Who bears it|exhausted|cannot decide/, 'it must state the verdict nature (cannot decide, returned to human)');
  assert.match(reason, /Allow/, 'it must offer the Allow option');
  assert.match(reason, /Refuse/, 'it must offer the Refuse option');
  assert.match(reason, /this one call only/, 'it must state the grant granularity (action-level once)');
  assert.match(reason, /audit/, 'it must say the decision enters the audit pair, replayable');
});

test('review + trustee refuses ⇒ final deny annotated with the trustee verdict (no longer an awaitingHuman pending)', async () => {
  setPrincipalScope(null);
  const { ctx, handlers } = mockCtxWithApproval(['rejected']);
  apply(ctx);
  const out = await handlers['tools/pre-execute'](exec(...REVIEW_CALL), next);
  assert.equal(out.kind, 'deny');
  assert.match(out.reason, /\[Trustee's verdict\] Refused to execute this call/, 'a refusal must be annotated as a human verdict, not an engine self-judgment');
  assert.notEqual(out.awaitingHuman, true, 'rejected is final; it must not stay marked as pending');
});

test('🔴 control: approval service throws ⇒ fail-closed silent deny (pipeline not crashed)', async () => {
  setPrincipalScope(null);
  const { ctx, handlers } = mockCtxWithApproval([new Error('approval service exploded')]);
  apply(ctx);
  const out = await handlers['tools/pre-execute'](exec(...REVIEW_CALL), next);
  assert.equal(out.kind, 'deny', 'approval-channel fault ⇒ silent flatten, same as no service');
  assert.equal(out.awaitingHuman, true);
});

test('once semantics: allowed-once covers this one call only; the next identical call re-asks', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['allowed-once']);
  apply(ctx);
  const e1 = { ...exec(...REVIEW_CALL), callId: 'c1' };
  const e2 = { ...exec(...REVIEW_CALL), callId: 'c2' };
  assert.equal(await handlers['tools/pre-execute'](e1, next), 'NEXT', 'first time: let through');
  assert.equal(await handlers['tools/pre-execute'](e2, next), 'NEXT', 'second time: re-ask, human re-grants, let through');
  assert.equal(asks.length, 2, 'two calls, two asks — an action-level grant must not settle into a permanent exemption');
});

test('🔴 control: in a true broken-window state (R-projection accumulation) review does not pop (stop-loss must not be bypassed by popups)', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['allowed-once']);
  apply(ctx);
  // Build a true windowBroken: 5 consecutive same-layer layer-R violations ⇒ _bucketRHit accumulation
  // reaches threshold ⇒ the window flag is set. (onFailure only increments streak without the flag, so the
  // tools/result route cannot be used here — the R-hit path must be walked.)
  for (let i = 0; i < 6; i++) {
    await handlers['tools/pre-execute']({ ...exec(...DENY_CALL), callId: 'v' + i }, next);
  }
  const n = asks.length;
  const out = await handlers['tools/pre-execute'](exec(...REVIEW_CALL), next);
  // In the broken-window state this call: deny(D) → buffer thaw ask (legitimate, wording "thaw request") →
  // human approves → re-judge → layer R still refuses
  assert.equal(out.kind, 'deny', 'in the broken-window state it is still blocked in the end');
  assert.equal(out.law, 'R', 'thaw opens only the D gate: the irreversible deletion is still caught by layer R after re-judgment (the buffer never widens layer R)');
  // The core lock of this test: no review authorization popup may appear in the whole run (wording "your
  // adjudication is needed") — the stop-loss state is fail-closed
  assert.equal(asks.filter((a) => /your adjudication is needed/.test(a.reason)).length, 0,
    'a review authorization popup must not appear in a true broken-window state (caught by the flatten block, identical with 0.2.14)');
  assert.ok(n >= 0);   // thaw asks may exist; they are not part of this assertion
});

test('cooldown: the next review of the SAME kind after a rejected does not pop (no harassment) — but the reason must name the verdict it follows', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['rejected', 'allowed-once']);
  apply(ctx);
  const e1 = { ...exec(...REVIEW_CALL), callId: 'r1' };
  const e2 = { ...exec(...REVIEW_CALL), callId: 'r2' };
  await handlers['tools/pre-execute'](e1, next);
  assert.equal(asks.length, 1);
  const out2 = await handlers['tools/pre-execute'](e2, next);
  assert.equal(out2.kind, 'deny', 'the second review of the same kind during cooldown is denied without asking');
  assert.equal(asks.length, 1, 'no ask is raised during the cooldown');
  // [2026-10-29 semantics clarified] during cooldown there already IS a verdict ⇒ final, not pending;
  //   but the silence must carry attribution — the reason names whose verdict it follows, and when.
  assert.ok(!out2.awaitingHuman, 'a followed verdict is final, not pending (field unset = not pending)');
  assert.match(out2.reason, /Following your previous verdict/, 'silence must be visible: name the verdict it follows');
  assert.match(out2.reason, /minute\(s\) ago/, 'give the time context so it is traceable');
});

test('🔴 cooldown key is per adjudication object: refusing kind A must NOT silence kind B (the old global lock did)', async () => {
  setPrincipalScope(null);
  const { ctx, handlers, asks } = mockCtxWithApproval(['rejected', 'allowed-once']);
  apply(ctx);
  const a = { ...exec(...REVIEW_CALL), callId: 'a1' };
  await handlers['tools/pre-execute'](a, next);              // kind A: rejected ⇒ kind A enters cooldown
  assert.equal(asks.length, 1);
  // kind B: different tool/locator ⇒ a different adjudication object ⇒ must not be collateral damage.
  // Pick a kind B that really produces a review (writing /etc/hosts ⇒ medium-risk deduction review),
  // otherwise "does it pop" cannot be observed.
  const b = { ...exec('write', { path: '/etc/hosts', content: '127.0.0.1 x' }), callId: 'b1' };
  const before = asks.length;
  const outB = await handlers['tools/pre-execute'](b, next);
  assert.doesNotMatch(String(outB?.reason ?? ''), /Following your previous verdict/, 'kind B must not inherit kind A cooldown');
  assert.equal(asks.length, before + 1, 'kind B still undecidable ⇒ still must ask (adjudication power does not vanish because something else was refused)');
});
