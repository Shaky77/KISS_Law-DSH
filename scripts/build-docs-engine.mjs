#!/usr/bin/env node
// ── docs/engine 生成器 ─────────────────────────────────────────────────────
//
// 为什么存在：
//   GitHub Pages 直接发布 ./docs 目录、没有构建步骤，而浏览器只能加载 .js
//   模块（不能加载 .mjs）。所以页面需要一份 src/core/*.mjs 的 .js 镜像。
//
// 纪律：
//   docs/engine/ 是**产物目录** —— 请勿手改。
//   改完 src/core/ 下的源码后运行：npm run build:docs
//
// 绑定（这才是本脚本的重点）：
//   手工维护的同源副本没有机械绑定 ⇒ **必然漂移**（实测：页面曾长期跑着一个
//   三周前的旧引擎）。故此处不靠人眼对账：
//     · 产物头部自带"由本脚本生成"标记；
//     · test/docs-engine-sync.test.mjs 断言产物与 src 逐字节一致 ⇒ 一漂就红。
//
// 用法：
//   node scripts/build-docs-engine.mjs           # 生成 / 覆盖（幂等）
//   node scripts/build-docs-engine.mjs --check   # 只校验：不一致则退出码 1

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'src', 'core');
const OUT_DIR = join(ROOT, 'docs', 'engine');

// ── 导入说明符扫描器（结构解，取代裸正则）────────────────────────────────
//
// 🔴 为什么需要（2026-10-21 中英对齐实测）：
//   英文仓的注释与文案是英文散文，里面有 "from 'regex verb-guessing'"、
//   desc 字符串里的 'rigidity from "not shifting with subjectivity"'、
//   "not a TIME PREDICTOR (does not answer '...')" 这类**自然语言里的 from**。
//   裸正则 `(?:from|import)\s*['"]…['"]` 会把它们当成 import 语句 ⇒
//     · 产物被误判为"含裸说明符、浏览器加载不了"（docs-engine-sync ③）；
//     · engine 被误判为"非纯相对导入、浏览器不安全"（同测试 ⑤）。
//   中文注释几乎不撞（散文里很少出现 from＋引号），所以这条 bug 只在英文本仓现形 ——
//   **这正是"中英对齐"暴露出来的第一个结构缺口：判据读的是词形，不是语义位置。**
//
//   判据不是"文本里有没有 from '"，而是"**代码里**有没有 import 语句"
//   ⇒ 走状态机：注释整段跳过、字符串整段跳过，只在 code 态认 import/export/from 关键字。
//   改注释措辞躲正则 = 枚举（下一个词又会撞）；状态机 = 结构。
//
//   形态覆盖：import x from '…' ／ import {a} from '…' ／ import * as ns from '…'
//            export … from '…' ／ import '…'（副作用）／ import('…')（动态）
//   排除：`x.from('…')`（from 前是 `.`）／`import.meta`（后面不是引号或括号）。
//
// ── 适用域｜LANGUAGE DOMAIN ─────────────────────────────────────────────────
// 🔴 上面那段「为什么需要」的**根因说明，是依英文语义编撰的**。
//    换一种语言重写本仓时，**此段的结论可能不再成立** ——
//    这**不是判据本身的缺陷**，而是**语言在书写层提供的隔离强度不同**所致的必然分歧：
//      · 英文：`from` 既是 import 关键字、又是普通介词 ⇒ 散文与代码在书写层**不隔离**；
//      · 中文：散文走中文字符、关键字走英文 ⇒ **天然字符级隔离**，同一个裸正则撞不上。
//    ⚠️ 反过来说：中文仓过去一直是绿的，**是「运气对的」，不是「结构对的」** ——
//       它靠的是字符系统的隔离，不是判据的正确。
//
// 🔴 但**整体结构与中文版完全一致**（判据形态相同，不是两套做法）：
//    判的始终是「**代码里**有没有 import 语句」，不是「**文本里**有没有 from」。
//    ⇒ 两仓都装这个扫描器；中文仓是**预防性**的，英文仓是**必要性**的。
//      差别在语言，不在结构。
//
// 🔴 处置纪律（甲/乙/丙三档，详见 docs/README.md「Criterion language domain」）：
//    本条属**丙档 · 语言歧义边界** ⇒ **不可修，只可标域**。
//    凡见到「换语言就失效」的判据，先分档再动手：
//      甲（锚标识符/语法位）＝ 通用，无需标；
//      乙（锚自然语言文案）＝ 合法性是借来的，须记「借自哪个文件、何时失效」；
//      丙（锚语言自身的歧义边界）＝ 必然失效且非缺陷，须标本块这样的适用域。
//    把丙档当甲档去「修」，会改坏它；把乙档当丙档去「标」，会放着真缺陷不修。
//
// 检索：`grep -rn "LANGUAGE DOMAIN" .` 可列出全部同域标注。
// ───────────────────────────────────────────────────────────────────────────
export function scanSpecifiers(text) {
  const out = [];
  const n = text.length;
  let i = 0;
  let state = 'code'; // code | line | block

  const readQuoted = (j) => {
    const q = text[j];
    let k = j + 1;
    let val = '';
    while (k < n) {
      const ch = text[k];
      if (ch === '\\') { val += text[k + 1] ?? ''; k += 2; continue; }
      if (ch === q) return { value: val, end: k + 1 };
      val += ch;
      k++;
    }
    return null;
  };
  const skipWs = (j) => { while (j < n && /\s/.test(text[j])) j++; return j; };

  while (i < n) {
    const c = text[i];
    const c2 = text[i + 1];

    if (state === 'line') {
      if (c === '\n') state = 'code';
      i++; continue;
    }
    if (state === 'block') {
      if (c === '*' && c2 === '/') { state = 'code'; i += 2; continue; }
      i++; continue;
    }

    // ── code 态 ──
    if (c === '/' && c2 === '/') { state = 'line'; i += 2; continue; }
    if (c === '/' && c2 === '*') { state = 'block'; i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const r = readQuoted(i);           // 普通字符串整体跳过：里面的 from 不是语句
      i = r ? r.end : i + 1;
      continue;
    }

    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(text[j])) j++;
      const word = text.slice(i, j);

      if (word === 'import' || word === 'export') {
        const k0 = skipWs(j);
        if (text[k0] === "'" || text[k0] === '"') {            // import '…'
          const r = readQuoted(k0);
          if (r) out.push(r.value);
        } else if (text[k0] === '(') {                          // import('…')
          const k1 = skipWs(k0 + 1);
          if (text[k1] === "'" || text[k1] === '"') {
            const r = readQuoted(k1);
            if (r) out.push(r.value);
          }
        }
        // 其余（import x / import {a} / export *）等后面的 from 关键字命中
        i = j; continue;
      }

      if (word === 'from') {
        // 排除成员访问 `x.from(...)`：前一个非空白字符是 `.` 就不是 import 语句
        let p = i - 1;
        while (p >= 0 && /\s/.test(text[p])) p--;
        const prev = p >= 0 ? text[p] : '';
        if (prev !== '.') {
          const k0 = skipWs(j);
          if (text[k0] === "'" || text[k0] === '"') {
            const r = readQuoted(k0);
            if (r) out.push(r.value);
          }
        }
        i = j; continue;
      }

      i = j; continue;
    }

    i++;
  }
  return out;
}

// 页面加载面：从入口 engine 出发，按**静态相对导入的传递闭包**自动发现
// （不硬编码名单 —— 新增模块只要被 engine 链式 import，就自动进镜像，不会漏）
export function relativeSpecifiers(text) {
  return scanSpecifiers(text)
    .filter((s) => s.startsWith('./'))
    .map((s) => s.replace(/^\.\//, ''));
}

export function discoverModules(entry = 'engine') {
  const seen = new Set();
  const queue = [entry];
  while (queue.length > 0) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const text = readFileSync(join(SRC_DIR, `${name}.mjs`), 'utf8');
    for (const spec of relativeSpecifiers(text)) queue.push(spec.replace(/\.mjs$/, ''));
  }
  return [...seen];
}

function eolOf(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

// 把 .mjs 相对导入改写为 .js（唯一必需的转换：`from './x.mjs'` → `from './x.js'`）
export function rewriteSpecifiers(text) {
  return text
    .replace(/(from\s*['"]\.\/[A-Za-z0-9_./-]+)\.mjs(['"])/g, '$1.js$2')
    .replace(/(import\s*['"]\.\/[A-Za-z0-9_./-]+)\.mjs(['"])/g, '$1.js$2');
}

export function banner(srcName, eol) {
  return [
    '// ⚠️ 本文件由 scripts/build-docs-engine.mjs 生成，请勿手改。',
    `// 源：src/core/${srcName}.mjs ｜ 改源码后运行 npm run build:docs`,
    '// 一致性由 test/docs-engine-sync.test.mjs 断言（手工镜像必漂移，故不靠人眼对账）。',
    '',
  ].join(eol);
}

// 镜像面 ＝ 传递闭包 ∪ 「浏览器安全」的核心模块
//
// 🔴 为什么要补这一条（2026-10-20 修）：原来只按 engine 的传递闭包发现模块，
//    于是 verb / nested / strata / rCapacity 这些**新增的判据层**永远进不了镜像 ——
//    页面能跑，但跑的是三周前的判据面。这不是「漏了几份文件」，是把
//    「镜像该覆盖什么」退化成了「engine 恰好 import 了什么」= 枚举随人增长。
//
// 判据（结构，不看名单）：src/core/ 下凡是**不含裸说明符**（node:xxx、包名）的模块，
//    浏览器就能加载 ⇒ 一律应进镜像。新增模块无需改这里，自动被覆盖。
//    反过来，含 node: 的模块（如 index.js 用 node:fs）自动被排除，不会把页面打挂。
export function browserSafeCoreModules() {
  const out = [];
  for (const f of readdirSync(SRC_DIR)) {
    if (!f.endsWith('.mjs')) continue;
    // 备份/历史件（`_` 前缀）不是活模块 ⇒ 不进镜像。判据是前缀，不是名单。
    if (f.startsWith('_')) continue;
    const name = f.replace(/\.mjs$/, '');
    const text = readFileSync(join(SRC_DIR, f), 'utf8');
    const specs = allSpecifiers(text);
    if (specs.every((s) => s.startsWith('./') || s.startsWith('../'))) out.push(name);
  }
  return out;
}

// 镜像清单 ＝ 闭包（保证入口链完整）∪ 浏览器安全的全部核心模块（保证判据面不落后）
export function mirrorModules() {
  const set = new Set(discoverModules());
  for (const n of browserSafeCoreModules()) set.add(n);
  return [...set].sort();
}

// 产出全部目标文件内容：返回 [{ file, content, srcName }]
export function buildAll() {
  return mirrorModules().map((name) => {
    const srcPath = join(SRC_DIR, `${name}.mjs`);
    const src = readFileSync(srcPath, 'utf8');
    const eol = eolOf(src);
    return {
      srcName: name,
      file: join(OUT_DIR, `${name}.js`),
      content: banner(name, eol) + rewriteSpecifiers(src),
    };
  });
}

// 未镜像但被引用的模块（应为空；非空 ⇒ 页面会在浏览器里 404）
export function missingMirrors() {
  return mirrorModules()
    .filter((name) => !existsSync(join(OUT_DIR, `${name}.js`)))
    .map((name) => `docs/engine/${name}.js`);
}

// 产物里的**全部**导入说明符（含非相对形态，用于检出浏览器加载不了的写法）
// ⚠️ 必须走 scanSpecifiers 状态机：英文散文/字符串里的 "from '…'" 不是 import（见上方扫描器说明）。
export function allSpecifiers(text) {
  return scanSpecifiers(text);
}

// 产物里的“浏览器加载不了”的导入：裸包名（如 node:fs / 依赖名）在无 importmap 的页面里必 404
export function browserUnsafeImports() {
  const bad = [];
  for (const name of mirrorModules()) {
    const file = join(OUT_DIR, `${name}.js`);
    if (!existsSync(file)) continue;
    for (const spec of allSpecifiers(readFileSync(file, 'utf8'))) {
      if (!spec.startsWith('./')) bad.push(`docs/engine/${name}.js → '${spec}'（浏览器无法解析裸说明符）`);
    }
  }
  return bad;
}

// 比对产物与磁盘：返回不一致项列表（空 = 一致）
//
// 判据是**内容**，不是字节 —— 行尾（CRLF/LF）是 checkout 产物而非内容：
// 本仓 core.autocrlf=true，索引里存 LF、工作树可能是 CRLF，故两侧都先归一到 LF 再比。
// 否则换一台机器 clone 后断言会假红（把"环境差异"误报成"漂移"）。
export function normalizeEol(text) {
  return text.replace(/\r\n/g, '\n');
}

export function diffAgainstDisk() {
  const drift = [];
  for (const item of buildAll()) {
    if (!existsSync(item.file)) {
      drift.push(`${item.file} —— 缺失`);
      continue;
    }
    const disk = normalizeEol(readFileSync(item.file, 'utf8'));
    if (disk !== normalizeEol(item.content)) {
      drift.push(`${item.file} —— 内容与 src/core/${item.srcName}.mjs 不一致`);
    }
  }
  return drift;
}

function main(argv) {
  const check = argv.includes('--check');
  const modules = mirrorModules();

  if (check) {
    const drift = [...diffAgainstDisk(), ...browserUnsafeImports()];
    if (drift.length === 0) {
      console.log(`✅ docs/engine 与 src/core 一致（${modules.length} 个模块：${modules.join(' / ')}）`);
      return 0;
    }
    console.error('❌ docs/engine 已漂移，运行 npm run build:docs 重新生成：');
    for (const d of drift) console.error(`   · ${d}`);
    return 1;
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const built = buildAll();
  for (const item of built) writeFileSync(item.file, item.content, 'utf8');
  console.log(`✅ 已生成 ${built.length} 个模块 → docs/engine/`);
  for (const item of built) console.log(`   · ${item.srcName}.mjs → docs/engine/${item.srcName}.js`);
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
