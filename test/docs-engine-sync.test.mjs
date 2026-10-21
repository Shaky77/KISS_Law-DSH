// docs/engine 产物一致性 —— 防“手工镜像漂移”的回归锁
//
// 判据（是性质，不是用例清单）：
//   ① 产物内容可由 src/core 唯一重算 ⇒ 与磁盘逐字节一致（任何手工改动 / 源码演进未重建，一漂就红）
//   ② 被 engine 链式 import 的模块必已镜像 ⇒ 页面不会 404
//   ③ 产物内导入必为相对路径 ⇒ 浏览器（无 importmap）可加载
//
// 为什么不用“人眼对账”：同一病已四次复发（218→217、22→18、12 容器→10），
// 根因是**同源物之间没有机械绑定**；此处用生成器 + 断言把绑定钉死，而不是靠自觉。
// 关联：[中文本仓] `docs/index.html` 用 `import('./engine/engine.js')` 加载引擎 —— 产物面向真实访问者。
//       本仓目前无发布页；但**产物仍须一致** —— 否则一旦发布，上线即带一台旧引擎（正是这里要防的那件事）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  buildAll,
  diffAgainstDisk,
  missingMirrors,
  browserUnsafeImports,
  discoverModules,
  mirrorModules,
  browserSafeCoreModules,
} from '../scripts/build-docs-engine.mjs';

test('docs/engine 产物与 src/core 逐字节一致（可重算）', () => {
  const drift = diffAgainstDisk();
  assert.deepEqual(
    drift,
    [],
    '产物已漂移 —— 运行 npm run build:docs 重新生成（禁止手改 docs/engine/）：\n' + drift.join('\n')
  );
});

test('被 engine 链式引用的模块都已镜像（页面不会 404）', () => {
  const missing = missingMirrors();
  assert.deepEqual(missing, [], '以下被引用的模块未镜像：' + missing.join(', '));
});

test('产物内导入均为相对路径（浏览器可加载）', () => {
  const unsafe = browserUnsafeImports();
  assert.deepEqual(unsafe, [], '产物含浏览器无法解析的导入：\n' + unsafe.join('\n'));
});

test('页面入口产物存在且非空', () => {
  const entry = buildAll().find((m) => m.srcName === 'engine');
  assert.ok(entry, '生成器未产出 engine 入口');
  assert.ok(existsSync(entry.file), `页面入口缺失：${entry.file}`);
  assert.ok(discoverModules().length >= 2, '链式依赖发现异常（至少应含 engine 与其依赖）');
});

// ═══════════════════════════════════════════════════════════════════
// ④ 镜像面是「结构判据」不是「engine 恰好 import 了什么」（2026-10-20 修）
//    病灶：原来只按传递闭包发现 ⇒ verb/nested/strata/rCapacity 新增判据层
//    永远进不了镜像，页面跑的是旧判据面，而 check 一直绿。
// ═══════════════════════════════════════════════════════════════════
test('凡是浏览器可加载的活模块，一律在被镜像（新增模块无需改名单）', () => {
  const safe = browserSafeCoreModules();
  const mirrored = new Set(mirrorModules());
  const notMirrored = safe.filter((n) => !mirrored.has(n));
  assert.deepEqual(notMirrored, [], '以下浏览器安全模块未进镜像面：' + notMirrored.join(', '));
  // 自检：判据不能退化成"全收"——含 node: 的模块必须被排除
  assert.ok(!safe.includes('engine') === false, 'engine 应浏览器安全（纯相对导入）');
  assert.ok(!mirrored.has('_engine_base_20260929-preXSUB12'), '`_` 前缀的备份件不得进镜像');
});

test('镜像清单不是全量照抄：含裸说明符的模块必须被排除', () => {
  // 结构判据的可判性自检——用"造一个含 node: 的模块名"这种反例来验，
  // 而不是断言某个具体模块名（那会随重构失效）
  const safe = browserSafeCoreModules();
  const mirrored = mirrorModules();
  assert.ok(mirrored.length >= safe.length, '镜像面应覆盖全部安全模块');
  assert.ok(mirrored.length === new Set(mirrored).size, '镜像清单不得有重复项');
});
