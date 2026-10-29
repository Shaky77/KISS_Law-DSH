// Added coverage: the doc exemption no longer depends on slot names or on the attribution layer
// (same-shape fix, second time) + the cooldown key is per adjudication object.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
const ENG = () => new WeiwenLawEngine({ selfAuditTools: new Set(['query_steady_state']) });
const law = (d) => `${d.kind}/${d.law ?? ''}`;
const BODY = '# 报告\n| 用例 | 结果 |\n|---|---|\n| `rm -rf /` | deny / R |\n| `Invoke-RestMethod -Method Put -Body s` | deny / R |\n相关脚本：boom.sh 与 boom.ps1。';

test('slot names are an open set: file_path / target_path / full_path writing md are all exempt', () => {
  for (const slot of ['file_path', 'target_path', 'full_path', 'path', 'filename']) {
    const d = ENG().decideToolCall({ name: 'write', args: { [slot]: './docs/report.md', content: BODY } });
    assert.equal(law(d), 'allow/推演', `slot ${slot} must be exempt as well`);
  }
});
test('edit old/new_string slots are exempt too (long doc with several command quotes)', () => {
  const d = ENG().decideToolCall({ name: 'edit', args: { file_path: './docs/report.md', old_string: 'v1', new_string: BODY } });
  assert.equal(law(d), 'allow/推演');
});
test('control: an explicit command slot ⇒ no exemption (an action is an action, even with an md locator)', () => {
  const d = ENG().decideToolCall({ name: 'bash', args: { command: 'rm -rf /', path: './docs/report.md' } });
  assert.equal(law(d), 'deny/R');
});
test('control: script slot renamed ⇒ still force-scanned (a .sh locator will execute)', () => {
  const d = ENG().decideToolCall({ name: 'write', args: { file_path: './scripts/boom.sh', content: 'rm -rf /' } });
  assert.equal(law(d), 'deny/R');
});
test('control: no locator retrievable ⇒ fail-closed, scanned as before', () => {
  const d = ENG().decideToolCall({ name: 'write', args: { content: 'rm -rf /' } });
  assert.equal(d.kind, 'deny');
});
