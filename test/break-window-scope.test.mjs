// break-window-scope.test.mjs — broken-window range + capped reading (2026-10-28)
// ---------------------------------------------------------------------------
// The structure under lock (measured, not imagined):
//   xiaoD `10`, verbatim: "`query_steady_state`, `query_bugstop` — both tools that exist purely to read state
//   were refused. **I cannot even ask 'how many of five'**; all I have is the number inside the receipt."
//   And that same receipt kept demanding "reverse-deduce → trace → fix → verify", while the tools needed for those
//   steps were shut by **the same door** ⇒ **the stop was not a stop but a deadlock**: the second half of the loop
//   (BUG → stop → reverse → trace → fix+verify → re-entry) could never complete.
//
// Two structural criteria in the fix:
//   ① **The broken window's range is "actions that change the outside world", not "every call".**
//      Reading your own ledger changes nothing ⇒ outside that range. Who counts as self-audit is **declared by the
//      registrant** (same trusted channel as declareTool), never guessed from the name (`query_` prefix == form ==
//      enumeration; add `inspect_*` and it is missed).
//   ② **The ledger must not stop counting (S only grows), but the threshold reading must cap.** After the window
//      breaks, the raw streak shows 6/5, 7/5, reading as "the threshold is 5, so why 7".
//      ⇒ cap the threshold dimension at `cap`, report the excess separately as `over`.
//
// This file drives the **real adapter entry** `apply(ctx)`, never the engine directly: an engine-side capability
// going green while the wiring is not connected (or the reverse) has been reproduced four times in this repo, so
// capability and wiring must be locked in the same file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../src/index.js';
import { WeiwenLawEngine, DEFAULT_RIGID_ANCHORS } from '../src/core/engine.mjs';

function mockCtx() {
  const handlers = {};
  const tools = [];
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: (t) => { tools.push(t); } },
  };
  return { ctx, handlers, tools };
}

let _cid = 0;
const exec = (name, args) => ({ token: 't', callId: `c${++_cid}`, name, arguments: args, signal: null });
const badReceipt = (t = 'ENOENT: no such file or directory') => ({ content: [{ type: 'text', text: t }], isError: true, error: { message: t } });
const next = async () => 'NEXT';
const toolNamed = (tools, n) => tools.find((t) => t.name === n);

// Build the broken window through the plugin's own public hook surface (tools/result); no test-only back door.
//   ⚠️ Do not send these through pre-execute first: a callId blocked by this layer is excluded via
//   `_blockedCallIds` and does not accrue (that criterion is right — blocked ≠ failure). So feed the failed
//   receipt directly, simulating a genuine external failure.
const breakWindow = (handlers, n = 5) => {
  for (let i = 0; i < n; i += 1) handlers['tools/result'](exec('read_file', { path: 'C:/Temp/x' }), badReceipt());
};

test('❶ broken window: actions are still denied (the range was not widened)', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  breakWindow(handlers);

  const pre = handlers['tools/pre-execute'];
  // Read the state first to confirm the window really is broken; otherwise the deny below may have another cause
  // (i.e. it would be mistaken for evidence).
  const st = await toolNamed(tools, 'query_steady_state').execute({});
  assert.ok(st.failureStreak >= 5, `precondition: the window must already be broken, actual failureStreak=${st.failureStreak}`);

  const d = await pre(exec('write_file', { path: 'C:/Temp/out.md', content: 'x' }), next);
  assert.equal(d?.kind, 'deny', 'while broken, actions that change the outside world must still be denied — stop-loss must not be widened along with this change');
  assert.equal(d?.law, 'D', `the deny must come from the broken-window criterion, actual law=${d?.law}`);
});

test('❷ broken window: self-audit read-only tools are outside the range — "how many of five" must be answerable', async () => {
  const { ctx, handlers, tools } = mockCtx();
  apply(ctx);
  breakWindow(handlers);

  const pre = handlers['tools/pre-execute'];
  const d = await pre(exec('query_steady_state', {}), next);
  assert.notEqual(d?.kind, 'deny', `a self-audit tool was refused by the broken-window gate ⇒ the stop becomes a deadlock (actual ${d?.kind})`);

  // Can it actually read a number ("allowed" does not imply "readable")
  const st = await toolNamed(tools, 'query_steady_state').execute({});
  assert.equal(typeof st.failureStreak, 'number', 'the failure accrual must be readable');
  assert.ok(st.failureStreak >= 5, 'the reading must be the real ledger, not a figure zeroed by the exemption');

  const bs = await pre(exec('query_bugstop', {}), next);
  assert.notEqual(bs?.kind, 'deny', 'the second self-audit tool must not be refused either (driven by the roster, not by name picking)');
});

test('❸ counter-lock: the exemption comes from the **roster**, not from a name that looks like query', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  breakWindow(handlers);

  const pre = handlers['tools/pre-execute'];
  // Identical in shape to query_steady_state but **not registered** ⇒ must still be denied.
  //   This is the counter-lock: drop it and "judge by roster" could degrade into "guess by prefix" while staying green.
  const d = await pre(exec('query_steady_state_internal', {}), next);
  assert.equal(d?.kind, 'deny', 'an unregistered look-alike must still be blocked by the broken window — otherwise the exemption is not roster-driven');
});

test('❹ counter-lock: the roster is not a catch-all — it holds only what the adapter registered', async () => {
  const { ctx, tools } = mockCtx();
  apply(ctx);
  const st = await toolNamed(tools, 'query_causal_chain').execute({});
  assert.ok(Array.isArray(st.selfAuditTools), 'the self-audit roster must be readable (otherwise "why is this one exempt" cannot be checked)');
  assert.ok(st.selfAuditTools.includes('query_steady_state'), 'a registered self-audit tool must be on the roster');
  assert.ok(!st.selfAuditTools.includes('write_file'), 'write tools must not slip into the self-audit roster');
  // Roster ⊆ registered tools, and the difference must be exactly the side-effecting one (`submit_pledge`
  //   registers straight through ctx.tools.register). Sharper than "counts are equal": equal counts only say
  //   the numbers match; naming the difference says **who is excluded and why**.
  const registered = tools.map((t) => t.name).sort();
  const inRoster = new Set(st.selfAuditTools);
  const diff = registered.filter((n) => !inRoster.has(n));
  assert.deepEqual(diff, ['submit_pledge'], `the difference between the roster and the registered set must be exactly the side-effecting tool; actual ${JSON.stringify(diff)}`);
  assert.ok(!inRoster.has('submit_pledge'), 'submitting a pledge writes its own ledger ⇒ it must NOT enter the self-audit roster (otherwise it could borrow the exemption to slip past a broken window)');
});

test('❺ capped reading: the ledger keeps counting (streak truthful) but the threshold reading never says 7/5', () => {
  const e = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });
  for (let i = 0; i < 7; i += 1) e.onFailure();   // keep accruing past the threshold
  const bw = e.breakAtReceipt();
  assert.ok(bw, 'a broken window must produce a reading');
  assert.equal(bw.cap, 5);
  assert.equal(bw.capped, true, 'past the threshold it must be flagged capped — otherwise a reader takes the excess for a new threshold');
  assert.equal(bw.streak, 8, 'ledger truthful: 7 accrued + 1 projection (S only grows; never shrink it to look nice)');
  assert.equal(bw.over, 3, 'the excess is reported separately (8 - 5)');
  assert.ok(bw.display.includes('5/5'), `the threshold dimension must cap at 5/5, actual ${bw.display}`);
  assert.ok(!bw.display.includes('8/5'), `the excess must not be written as 8/5, actual ${bw.display}`);
});

test('❻ capped reading: below the threshold no cap annotation is added (normal readings must not be restyled "for consistency")', () => {
  const e = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });
  for (let i = 0; i < 4; i += 1) e.onFailure();
  const bw = e.breakAtReceipt();
  assert.equal(bw.capped, false);
  assert.equal(bw.over, 0);
  assert.equal(bw.display, '5/5', 'about-to-reach is simply 5/5 — a clean reading');
});

test('❼ reset ownership in the receipt: a broken-window receipt must say "this step is not in your hands"', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const post = handlers['tools/post-execute'];
  assert.ok(post, 'the adapter must register the tools/post-execute receipt gate');

  breakWindow(handlers);
  // One more failed receipt ⇒ while broken, the receipt gate must speak, and hand over the exit ownership too
  const d = await post(exec('read_file', { path: 'C:/Temp/x' }), badReceipt('boom'), next);
  assert.equal(d?.kind, 'block', 'while broken, a failed receipt must be cut into a corrective receipt');

  const txt = (d.feedback ?? []).map((b) => b?.text ?? '').join('\n');
  assert.ok(txt.includes('NOT in your hands'), `the receipt must state who owns the reset, actual:\n${txt}`);
  assert.ok(txt.includes('healBrokenWindow'), 'it must name an exit the host can actually call (the plugin export), not "contact your administrator" and not an engine-internal method the model cannot reach');
  assert.ok(/5\/5/.test(txt), 'the threshold reading in the receipt must cap at 5/5; 6/5 or 7/5 must never appear');
  assert.ok(txt.includes('original receipt'), 'a block may never destroy the evidence it is based on (the original must still be there)');
});
