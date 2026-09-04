// fail-closed-gate.test.mjs — Gate ③ (checklist question ③ from Couizi): fail-closed full coverage
// Mechanical form: drive the public decideToolCall / checkRigidAnchor and assert the verdict tier.
// Goal:
//   ① When any extraction channel fails, a destructive verdict must NOT land on allow (must be deny or review);
//   ② Unregistered / neutral call shapes must NOT bypass the R-branch gate to a bare allow (must land on review);
//   ③ Malformed calls must not be allow (must land on schema / review tier).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

test('Q③·channel-2 fallback: structured destructive calls are still deny when command text is absent (no silent allow)', () => {
  const eng = new WeiwenLawEngine();
  const destructive = [
    { name: 'fs_delete',       args: { path: '/' } },
    { name: 'fs_delete',       args: { path: '/etc' } },
    { name: 'fs_delete',       args: { path: '/dev/sda1' } },
    { name: 'delete_file',     args: { path: '/boot' } },
    { name: 'file_remove',     args: { path: '/proc/1' } },
    { name: 'rm_dir',          args: { path: '/sys' } },
    { name: 'cred_delete',     args: { path: '/root/.aws/credentials' } },
    { name: 'wipe',            args: { path: '/mnt/data' } },
  ];
  for (const call of destructive) {
    const d = eng.decideToolCall(call);
    assert.strictEqual(d.kind, 'deny', `structured destructive call should be deny not ${d.kind}: ${JSON.stringify(call)}`);
  }
});

test('Q③·no false-positive: non-destructive structured calls are not wrongly denied by no-destructive-fs', () => {
  const eng = new WeiwenLawEngine();
  const benign = [
    { name: 'read_file',  args: { path: '/tmp/notes.txt' } },
    { name: 'write_file', args: { path: '/tmp/draft.txt' } },
    { name: 'list_dir',   args: { path: '/home/u/docs' } },
    { name: 'fs_copy',    args: { path: '/home/u/a' } },
  ];
  for (const call of benign) {
    const r = eng.checkRigidAnchor(call);
    assert.strictEqual(r, null, `non-destructive call should not hit no-destructive-fs: ${JSON.stringify(call)}`);
  }
});

test('Q③·entry coverage: neutral / unregistered shapes cannot bypass R-branch to a bare allow (land on review)', () => {
  const eng = new WeiwenLawEngine();
  const unregistered = [
    { name: 'tool_42',        args: { path: '/' } },
    { name: 'agent_action',   args: { path: '/etc' } },
    { name: 'host_direct_op', args: { target: '/' } },
    { name: 'handle',         args: { action: 'delete', object: '/boot' } },
  ];
  for (const call of unregistered) {
    const d = eng.decideToolCall(call);
    assert.notStrictEqual(d.kind, 'allow', `unregistered/neutral shape should not be allow (should be review): ${JSON.stringify(call)} -> ${d.kind}`);
    assert.ok(['review', 'deny'].includes(d.kind), `unregistered shape should land on review/deny not ${d.kind}`);
  }
});

test('Q③·malformed shape: ill-formed calls are not allow (land on schema / review tier)', () => {
  const eng = new WeiwenLawEngine();
  const malformed = [null, { args: { path: '/' } }, { name: 'x', args: 'not-an-object' }];
  for (const call of malformed) {
    const d = eng.decideToolCall(call);
    assert.notStrictEqual(d.kind, 'allow', `ill-formed call should not be allow: ${JSON.stringify(call)} -> ${d.kind}`);
  }
});
