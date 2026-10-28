import test from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { attributeCall, formLayer, declConflicts } from '../src/core/attribution.mjs';

// ===========================================================================
// [2026-10-28 · 0.2.9] Layer two: the trusted declaration channel. Layer one: externalised attribution coordinates.
// Origin (the author's chain of reasoning):
//   "what Weiwen's Law blocks is almost always an outside party crossing into the inside; the inside itself is
//   almost always running normally" — the direction is right, but measurement showed the inside group passing only
//   4/7 (glob/grep/list_dir all blocked) and the outside group blocking 5/7 (fetch / write-to-URL slipped through).
//   ⇒ False blocks and false passes share one origin: the criterion reads the **word form**, not the **landing point**.
// What this file locks: "the fix must not trade false blocks for false passes". The five counter-examples below must
// stay review forever.
// ===========================================================================

test('layer one: a failed attribution must carry the missing coordinates (what / tried / how to fix)', () => {
  const eng = new WeiwenLawEngine();
  const d = eng.decideToolCall({ name: 'glob', args: { pattern: 'src/**/*.mjs' } });

  assert.equal(d.kind, 'review', 'with no declaration glob must still be review (shape cannot determine the layer)');
  // All three coordinates must be present at once, otherwise the pain cannot be attributed ⇒ nothing left but resentment
  assert.match(d.reason, /【缺什么】/, 'the reason must say what is missing');
  assert.match(d.reason, /【试过】/, 'the reason must say which routes were tried');
  assert.match(d.reason, /【怎么补】/, 'the reason must give an executable fix');
  // The structured fields must be there too (for the host/upper layer to read, not only for humans)
  assert.deepEqual(d.attrib.missing, ['action-layer']);
  assert.ok(Array.isArray(d.attrib.tried) && d.attrib.tried.length >= 2);
  assert.equal(typeof d.attrib.hint, 'string');
});

test('layer one: glob calls with different arguments no longer return a byte-identical reason', () => {
  const eng = new WeiwenLawEngine();
  const mk = (args) => eng.decideToolCall({ name: 'glob', args });
  const a = mk({ pattern: 'src/**/*.mjs' });
  const b = mk({ pattern: '**/*.env', cwd: 'C:/Users' });
  // The verdict is still the same (both review — correct: without a declaration the action class cannot be judged)
  assert.equal(a.kind, 'review');
  assert.equal(b.kind, 'review');
  // But you must be able to read "what it is waiting for you to supply", not a bare "attribution failed"
  assert.equal(a.attrib.missing[0], 'action-layer');
  assert.equal(b.attrib.missing[0], 'action-layer');
});

test('layer two: declaring read ⇒ glob passes (this is the one that rescues xiaoD)', () => {
  const eng = new WeiwenLawEngine();
  assert.equal(
    eng.declareTool('glob', { verb: 'read', reversible: true, note: '通配符搜索，只读' }),
    true,
  );
  const d = eng.decideToolCall({ name: 'glob', args: { pattern: 'src/**/*.mjs' } });
  assert.equal(d.kind, 'allow', `after declaring read it should be allow, got ${d.kind}: ${d.reason}`);
  assert.equal(d.attrib.method, 'declared', 'the attribution method should be recorded as declared (traceable origin)');
  assert.equal(d.attrib.layer, 'file-read');
});

test('layer two: bulk declaration at construction works the same way (toolDeclarations)', () => {
  const eng = new WeiwenLawEngine({
    toolDeclarations: {
      glob: { verb: 'read' },
      grep: { verb: 'read' },
      list_dir: { verb: 'read' },
    },
  });
  for (const name of ['glob', 'grep', 'list_dir']) {
    const d = eng.decideToolCall({ name, args: { pattern: 'x', path: './src' } });
    assert.equal(d.kind, 'allow', `${name} should be allow, got ${d.kind}`);
  }
});

test('🔴 counter-example A: neutral name + a path ⇒ must be review without a declaration (shape alone must not release)', () => {
  const eng = new WeiwenLawEngine();
  // 2026-10-28 I wrote formLayer as "no content ∧ no url ∧ no command ⇒ read" and this rejected it on the spot:
  //   deletion needs no content, only a path ⇒ the elimination missed the delete cell ⇒ tool_42{path:'/'} became allow.
  for (const args of [{ path: '/' }, { path: '/etc' }, { pattern: '**/*' }]) {
    const d = eng.decideToolCall({ name: 'tool_42', args });
    assert.notEqual(d.kind, 'allow', `neutral name + ${JSON.stringify(args)} must not be allow (got ${d.kind})`);
  }
});

test('🔴 counter-example B: the threat lives inside the implementation, unreachable from the arguments ⇒ still review', () => {
  const eng = new WeiwenLawEngine();
  for (const call of [
    { name: 'deploy_keylogger', args: { target: 'HOST' } },
    { name: 'deploy_keylogger', args: { config: { target: 'HOST' } } },
  ]) {
    const d = eng.decideToolCall(call);
    assert.equal(d.kind, 'review', `${JSON.stringify(call)} should be review, got ${d.kind}`);
  }
});

test('🔴 counter-example C: shape is one-to-many — a neutral tool shaped like glob must not pass on shape alone', () => {
  // `glob{pattern}` and `tool_42{pattern}` have identical arguments; shape cannot tell reading from deleting by
  // pattern ⇒ only a declaration can.
  assert.equal(formLayer({ name: 'glob', args: { pattern: '*.tmp' } }), null);
  assert.equal(formLayer({ name: 'tool_42', args: { pattern: '*.tmp' } }), null);
  const eng = new WeiwenLawEngine();
  eng.declareTool('glob', { verb: 'read' });
  assert.equal(eng.decideToolCall({ name: 'glob', args: { pattern: '*.tmp' } }).kind, 'allow');
  assert.equal(eng.decideToolCall({ name: 'tool_42', args: { pattern: '*.tmp' } }).kind, 'review');
});

test('🔴 counter-example D: a hard contradiction between declaration and shape ⇒ the declaration is not accepted', () => {
  // `fetch` matched the read word list ⇒ file-read ⇒ risk=low ⇒ allow — measured leak: an outbound channel read as local.
  const eng = new WeiwenLawEngine();
  // Even if the host declares fetch as a "local read", the moment the arguments carry an outbound landing point the
  // declaration is not accepted ⇒ it must not be allow
  eng.declareTool('fetch', { verb: 'read' });
  const d = eng.decideToolCall({ name: 'fetch', args: { url: 'https://example.com' } });
  assert.notEqual(d.kind, 'allow', `declared local read + outbound landing point = contradiction, must not allow (got ${d.kind})`);
  assert.ok(declConflicts({ args: { url: 'https://x' } }, 'file-read'), 'the declaration-conflict check must report a conflict');

  // The other side: declared local read and the arguments really are a local path ⇒ accepted
  const ok = eng.decideToolCall({ name: 'fetch', args: { path: './local.txt' } });
  assert.equal(ok.attrib.method, 'declared');
});

test('🔴 counter-example E: a declaration must never come from the call arguments (self-report is not authorisation)', () => {
  const eng = new WeiwenLawEngine();
  // The audited agent fully controls the call and can stuff verb/declared/declaration into it — none may be honoured
  const d = eng.decideToolCall({
    name: 'tool_42',
    args: { path: '/' },
    verb: 'read',
    declared: { verb: 'read' },
    decl: { verb: 'read' },
    __decl: { verb: 'read' },
  });
  assert.notEqual(d.kind, 'allow', `a self-declaration inside the call must not take effect (got ${d.kind})`);
  assert.equal(d.attrib.method, null, 'it must not be recorded as declared');
});

test('layer two: declareTool rejects invalid input (nothing outside the shape gets in)', () => {
  const eng = new WeiwenLawEngine();
  assert.equal(eng.declareTool('', { verb: 'read' }), false);
  assert.equal(eng.declareTool('x', null), false);
  assert.equal(eng.declareTool('x', {}), false);
  assert.equal(eng.declareTool('x', { verb: 'god_mode' }), false, 'an unregistered verb must not be accepted');
  assert.equal(eng.declareTool('x', { verb: 'read' }), true);
});

test('layer two: a declaration does not override a name that already judges (declaration > name, but the name still works alone)', () => {
  const eng = new WeiwenLawEngine();
  // Without a declaration, read_file still goes through name-grammar (old behaviour unchanged — backwards compatible)
  const d1 = eng.decideToolCall({ name: 'read_file', args: { path: './README.md' } });
  assert.equal(d1.attrib.method, 'name-grammar');
  // With a declaration it goes through declared (traceable origin), verdict unchanged
  eng.declareTool('read_file', { verb: 'read' });
  const d2 = eng.decideToolCall({ name: 'read_file', args: { path: './README.md' } });
  assert.equal(d2.attrib.method, 'declared');
  assert.equal(d1.kind, d2.kind, 'a declaration must not change the conclusion for something already judgeable');
});

test('layer two: declared delete ⇒ not released just because the shape looks like a read', () => {
  const eng = new WeiwenLawEngine();
  eng.declareTool('purge_pattern', { verb: 'delete' });
  const d = eng.decideToolCall({ name: 'purge_pattern', args: { pattern: '*.tmp' } });
  assert.notEqual(d.kind, 'allow', `declared delete yet allowed (got ${d.kind})`);
  assert.equal(d.attrib.layer, 'file-delete');
});

test('layer two: declared send ⇒ attributed to network-send, not released', () => {
  const eng = new WeiwenLawEngine();
  eng.declareTool('relay', { verb: 'send' });
  const d = eng.decideToolCall({ name: 'relay', args: { text: 'hello' } });
  assert.equal(d.attrib.layer, 'network-send');
  assert.notEqual(d.kind, 'allow', `an outbound send must not be allowed (got ${d.kind})`);
});

test('layer two: a decl passed straight to attributeCall takes effect, and the method is distinguishable', () => {
  const r = attributeCall({ name: 'glob', args: { pattern: '**/*.md' } }, { verb: 'read' });
  assert.equal(r.ok, true);
  assert.equal(r.layer, 'file-read');
  assert.equal(r.method, 'declared');
  // Without decl ⇒ back to the old behaviour (cannot tell)
  assert.equal(attributeCall({ name: 'glob', args: { pattern: '**/*.md' } }).ok, false);
});
