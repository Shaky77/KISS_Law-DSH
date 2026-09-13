// Window-police gate regression locks: insufficient-evidence (missing physical evidence) calls
// are remanded, never released into the engine's substantive verdict. Audit-layer only; engine.mjs unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../src/index.js';

function mockCtx() {
  const handlers = {};
  const ctx = {
    on: (ev, cb) => { handlers[ev] = cb; },
    tools: { register: () => {} },
  };
  return { ctx, handlers };
}

test('policeGate: missing physical evidence (rm -rf no target) → remand', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const out = await handlers['tools/pre-execute'](
    { name: 'run_command', arguments: { command: 'rm -rf' } },
    async () => 'NEXT',
  );
  assert.equal(out.kind, 'deny');
  assert.equal(out.awaitingHuman, true);
  assert.equal(out.insufficient_evidence, true);
  assert.match(out.reason, /Insufficient evidence/);
});

test('policeGate: structured empty path (fs_delete{path:""}) → remand', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const out = await handlers['tools/pre-execute'](
    { name: 'fs_delete', arguments: { path: '' } },
    async () => 'NEXT',
  );
  assert.equal(out.insufficient_evidence, true);
  assert.equal(out.awaitingHuman, true);
});

test('policeGate: evidence present + out-of-bounds (rm -rf /) → released to engine R-anchor deny (not insufficient)', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  const out = await handlers['tools/pre-execute'](
    { name: 'run_command', arguments: { command: 'rm -rf /' } },
    async () => 'NEXT',
  );
  assert.notEqual(out.insufficient_evidence, true);
  assert.equal(out.kind, 'deny');
});

test('policeGate: evidence present + in-bounds (rm -rf /tmp/x) → released (next)', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  let calledNext = false;
  const out = await handlers['tools/pre-execute'](
    { name: 'run_command', arguments: { command: 'rm -rf /tmp/workspace/output/*' } },
    async () => { calledNext = true; return 'NEXT'; },
  );
  assert.equal(calledNext, true);
  assert.equal(out, 'NEXT');
});

test('policeGate: query-class call with no resource field (empty args) → not mis-blocked, released', async () => {
  const { ctx, handlers } = mockCtx();
  apply(ctx);
  let calledNext = false;
  const out = await handlers['tools/pre-execute'](
    { name: 'query_steady_state', arguments: {} },
    async () => { calledNext = true; return 'NEXT'; },
  );
  assert.equal(calledNext, true);
  assert.equal(out, 'NEXT');
});
