// 判据接线回归锁 —— 让「库里哪条判据没走通路」从静默变成红灯
//
// 病灶（2026-10-20 实测）：
//   law.mjs 导出 27 条判据，其中 10 条自带 boundary / placement，明文写着
//   「非引擎运行期判据位，不改变放行 / 拦截逻辑」⇒ **它们不被引用是设计如此**。
//   但这些声明只存在于字段文本里，**没有任何机械位置承载** ⇒ 全部显示为"零引用"，
//   与真缺口（`R_EXPANSION`：engine 内 grep「扩容」零命中）混作一堆，无法区分。
//
// 本锁用四条性质把「静默」钉死，而不是靠人眼对账
// （同 `docs-engine-sync` 的范式：同源物之间必须有机械绑定）：
//   ① 登记完整 —— law.mjs 每条导出都在登记表里有归属（漏登记 ⇒ 红）
//   ② 无僵尸   —— 登记表每条都真有对应导出（否则红）
//   ③ 不许静默 —— 归属为 judge 却实测零引用、且未登记 gap ⇒ 红（真缺口必须写在纸上）
//   ④ 登记可自核 —— 登记表里的 selfDeclared 与 law.mjs 实测一致（防手工填错）
//
// ⚠️ 本锁只判「有没有归属」，**不判归属是否正确** —— 后者是判断，不是机械可检。
//   归属未定的进 `unmapped` 档，仍是欠账，不视为通过。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as law from '../src/core/law.mjs';
import {
  SLOT,
  CRITERION_REGISTRY,
  slotStats,
  declaredGaps,
  unmapped,
} from '../src/core/readout.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/**
 * 剔除注释后的代码文本。
 * 🔴 必要性（2026-10-20 反向验证抓出）：`R_EXPANSION` 在 engine.mjs 只出现在**一行注释**里
 *   （"见 law.mjs `R_EXPANSION.qualification`"），若按原文计数 ⇒ 它被判为"≈已引用" ⇒
 *   **静默缺口从锁底下漏过去**。即：尺子把注释当引用，犯的正是本锁要测的那个病（判据在场 ≠ 被调用）。
 */
function stripComments(text) {
  const out = [];
  let inBlock = false;
  for (const raw of text.split('\n')) {
    let line = raw;
    if (inBlock) {
      const end = line.indexOf('*/');
      if (end === -1) continue;
      line = line.slice(end + 2);
      inBlock = false;
    }
    if (line.trim().startsWith('//')) continue;
    const open = line.indexOf('/*');
    if (open !== -1 && line.indexOf('*/', open) === -1) {
      line = line.slice(0, open);
      inBlock = true;
    }
    const idx = line.indexOf('//');
    if (idx !== -1) {
      const head = line.slice(0, idx);
      // 引号数为偶数 ⇒ 这个 // 在代码区（是注释）；为奇数 ⇒ 在字符串里（如 URL），不砍
      const q = (head.match(/'/g)?.length ?? 0) + (head.match(/"/g)?.length ?? 0) + (head.match(/`/g)?.length ?? 0);
      if (q % 2 === 0) line = head;
    }
    out.push(line);
  }
  return out.join('\n');
}

/** 递归收集 src 下的 .mjs / .js，排除历史归档与读数层自身。 */
function collectSources(dir = SRC, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) collectSources(p, out);
    else if (/\.(mjs|js)$/.test(name)) {
      const rel = p.slice(ROOT.length + 1).replace(/\\/g, '/');
      // 排除：历史归档（preXSUB 快照）、判据本体（自己引用自己无意义）、读数层自身
      if (rel.includes('_engine_base_')) continue;
      if (rel === 'src/core/law.mjs') continue;
      if (rel === 'src/core/readout.mjs') continue;
      out.push({ rel, text: stripComments(readFileSync(p, 'utf8')) });
    }
  }
  return out;
}

const SOURCES = collectSources();
const LAW_NAMES = Object.keys(law);

/** 某判据在 src（排除 law.mjs / readout.mjs / 归档）中的出现次数。 */
function refCount(name) {
  const re = new RegExp(`\\b${name}\\b`);
  return SOURCES.reduce((n, f) => n + (re.test(f.text) ? 1 : 0), 0);
}

// ── ① 登记完整 ─────────────────────────────────────────────────
test('① law.mjs 每条导出都在判据登记表里有归属（不许漏登记）', () => {
  const missing = LAW_NAMES.filter((n) => !(n in CRITERION_REGISTRY));
  assert.deepEqual(
    missing,
    [],
    '以下判据导出未登记归属 —— 新增判据必须同时登记它走哪条路：\n' + missing.join('\n')
  );
});

// ── ② 无僵尸 ───────────────────────────────────────────────────
test('② 登记表每条都对应真实导出（无僵尸条目）', () => {
  const zombie = Object.keys(CRITERION_REGISTRY).filter((n) => !(n in law));
  assert.deepEqual(zombie, [], '登记表含已不存在的判据：' + zombie.join(', '));
});

// ── ③ 不许静默：该接却没接，必须写在纸上 ───────────────────────
test('③ 归属 judge 但实测零引用 ⇒ 必须在登记表登记 gap（真缺口不许静默）', () => {
  const silent = [];
  for (const [name, meta] of Object.entries(CRITERION_REGISTRY)) {
    if (meta.slot !== SLOT.JUDGE) continue;
    if (refCount(name) > 0) continue;
    if (meta.gap) continue; // 已如实登记 ⇒ 通过
    silent.push(name);
  }
  assert.deepEqual(
    silent,
    [],
    '以下判据归属「判决位」却零引用，且未登记缺口 —— 二选一：接线，或写明为什么它是缺口：\n' +
      silent.join('\n')
  );
});

test('③b 归属 readout 的判据由读数层承载，但仍须可呈现（登记表不得漏 role）', () => {
  const noRole = Object.entries(CRITERION_REGISTRY)
    .filter(([, m]) => !m.role || typeof m.role !== 'string' || m.role.trim() === '')
    .map(([n]) => n);
  assert.deepEqual(noRole, [], '以下登记项缺 role（无法呈现给使用者）：' + noRole.join(', '));
});

// ── ④ 登记可自核 ───────────────────────────────────────────────
test('④ 登记表的 selfDeclared 与 law.mjs 实测一致（防手工填错）', () => {
  const mismatch = [];
  for (const [name, meta] of Object.entries(CRITERION_REGISTRY)) {
    const v = law[name];
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
    const actual = !!(v.boundary || v.placement);
    const declared = !!meta.selfDeclared;
    if (actual !== declared) mismatch.push(`${name}: 实测=${actual} 登记=${declared}`);
  }
  assert.deepEqual(
    mismatch,
    [],
    'selfDeclared 登记与 law.mjs 实测不符（登记表开始漂了）：\n' + mismatch.join('\n')
  );
});

// ── 汇总性质：四档之和 ＝ 总数，且 unmapped 始终可见 ────────────
test('⑤ 四档之和等于登记总数（无条目落在档外）', () => {
  const s = slotStats();
  const sum = Object.values(s.count).reduce((a, b) => a + b, 0);
  assert.equal(sum, s.total, `分档合计 ${sum} ≠ 登记总数 ${s.total}`);
  assert.ok(s.total === LAW_NAMES.length, `登记 ${s.total} 条 ≠ 导出 ${LAW_NAMES.length} 条`);
});

test('⑤b unmapped 档若有成员，必须带 note 说明为何判不出', () => {
  const bad = unmapped().filter((u) => !u.note || !u.note.trim());
  assert.deepEqual(bad.map((u) => u.name), [], '未定档缺说明（等于没登记）：' + bad.map((u) => u.name).join(', '));
});

test('⑤c 已登记缺口必须是可读的具体陈述，不是占位符', () => {
  const weak = declaredGaps().filter((g) => g.gap.trim().length < 20);
  assert.deepEqual(weak.map((g) => g.name), [], '以下缺口登记过短，不构成可核陈述：' + weak.map((g) => g.name).join(', '));
});

// ── ⑦ 自指：读数层本身也要被检查 ───────────────────────────────
test('⑦ 读数层必须真被 src/index.js 引用（防它自己成为下一个静默件）', () => {
  const idx = readFileSync(join(SRC, 'index.js'), 'utf8');
  assert.match(
    idx,
    /from\s+['"]\.\/core\/readout\.mjs['"]/,
    '读数层未被 src/index.js 引用 ⇒ 它只是另一个陈列品（本锁要测的病，落到了它自己身上）'
  );
});

test('⑥ 读数层不得引入 node 内置模块（docs/engine 镜像给浏览器加载）', () => {
  const p = join(SRC, 'core', 'readout.mjs');
  assert.ok(existsSync(p), 'readout.mjs 缺失');
  const text = readFileSync(p, 'utf8');
  const hits = text.match(/from\s+['"]node:[^'"]+['"]/g) ?? [];
  // 注释里提到 node:fs 不算引入 —— 只校验真实的 import 语句
  const realImports = text
    .split('\n')
    .filter((l) => /^\s*import\s/.test(l))
    .join('\n');
  const risky = realImports.match(/node:[^'"]+/g) ?? [];
  assert.deepEqual(risky, [], 'readout.mjs 引入了 node 内置模块，浏览器镜像会挂：' + risky.join(', '));
  assert.ok(!hits.some((h) => !realImports.includes(h)), '存在非 import 位置的 node: 引用需复核');
});
