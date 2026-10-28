// ⚠️ 本文件由 scripts/build-docs-engine.mjs 生成，请勿手改。
// 源：src/core/capability.mjs ｜ 改源码后运行 npm run build:docs
// 一致性由 test/docs-engine-sync.test.mjs 断言（手工镜像必漂移，故不靠人眼对账）。
// ===========================================================================
// 通行证（Host-issued Capability）—— 结构凭证，**不是白名单**
// ===========================================================================
//
// 为什么不是白名单（结构理由，不是措辞偏好）：
//   白名单判**条目**（哪个路径、哪个域名），没列到的全拦 ⇒ 漏一条就误伤、加一条就放宽，越用越长；
//   它把「枚举」塞进了判据位，而铁律是**先结构后枚举**。
//   通行证判**凭证**：谁授权、管哪些动作类、管哪一段作用域、管到几次几时。
//   ⇒ 判据从「这条在不在表里」变成「该动作是否落在凭证覆盖域内」，**能生成它没有逐一列出的项**。
//
// 二维（这是本模块的核心结构，不是三个并列字段）：
//     动作类（封闭集 6 个） × 作用域（有限条 ⇒ 生成无限多目标）
//   动作类与对象类都**不是新词表**，直接取归因层（`attribution.attributeCall`）已有的产出：
//     layer = (verb, noun)，verb ∈ {exec, send, delete, write, read}，noun ∈ {file, credential}
//   ⇒ actionOfLayer 只是把 (verb, noun) 折成「风险类」：
//     destroy 单列（exec-destructive）——「运行命令」与「运行删除」不是同一类风险，必须显式授权。
//     ⚠️ 这是本模块**唯一**的映射表，且它是**封闭的**（layer 本身封闭，来源单一），不是可增长词表。
//
// 三条硬约束（缺一条就不是凭证，会退回白名单或退回放任）：
//   ① **只能宿主签发**：入口是模块级导出 + 进程环境变量，模型不可达（结构上不可能自我授权）；
//   ② **不累积**：新证替换旧证（与 setPrincipalScope 的替换语义同源），不留历史授权；
//   ③ **次数或到期，二者至少其一**：都没有 ⇒ 拒绝解析（永久证＝白名单换了个名字）。
//   另加：**每次使用留痕**（append-only，上限 20 条/证）——「谁在什么时候用它做了什么」必须可查。
//
// 判决三态（与 review 的三分同构）：
//   absent ＝ 本判据不介入（未签证书，或证书未列这个动作类）⇒ 走既有路径，行为一字不变；
//   pass   ＝ 证覆盖且未越界 ⇒ 记一次使用，放行（跳过痕锚猜测）；
//   fail   ＝ 证在场但覆盖不了 ⇒ **review**（越出授权面 ⇒ 未来无法验证其归属 ⇒ 交人类）。
//
// 🔴 **「证不放宽」的精确表述（2026-10-27 实测修正，原写法"只可能更严"是错的）**：
//   实测对照（12 组，无证 vs 有证）读数不是单向的 —— 有三格会**从 review 变 allow**：
//     `delete_file /repo/xiaoD/01.md`、`rm /repo/xiaoD/old.md`（域内授权）、以及同族的域内破坏。
//   ⇒ 那不是放宽，是**从"无人认领"变成"有人认领"**：
//     review 的正当理由是「归属未来无法被验证」，而不是「引擎判不出」。证一签，归属当场可验 ⇒ allow 是正确输出。
//   ⇒ 真正成立的两条不变式（可测，见 test/capability.test.mjs）：
//     ① **deny 永不被证改变**（刚性锚 `rm -rf /etc`、`read id_rsa` 两类实测仍 deny）—— 证不买通客观规则；
//     ② **出界必 review**（凡目标不在证域内 ⇒ ≥ review；这是本判据的主效力：
//        无证时为 allow 的普通写/外传，越出证域即被拦下）。
//   ⇒ 所以正确的说法是：**证不会让任何"已被客观规则否定"的动作通过，也不会让任何"越界"动作通过；
//      它只会给"域内且无锚可归"的动作补上一个可验证的归属。**
//
// 与「可逆一桶两义」的关系：本模块**不用**「可逆」当放行判据（载体可逆 ≠ 因果可逆）。
//   它判的是「有没有人认领这条链」，不是「能不能还原」。
// ===========================================================================

import { extractCommand, cmdPathHits } from './attribution.js';

/** 动作类封闭集（6 个，出自归因层 layer 的折叠，不随实例增长） */
export const CAP_ACTIONS = Object.freeze(['write', 'delete', 'read', 'send', 'exec', 'destroy']);

/** 归因层 → 动作类（唯一映射表；layer 取自 attribution，封闭） */
const LAYER_ACTION = Object.freeze({
  'exec-destructive': 'destroy',
  'file-delete': 'delete',
  'cred-delete': 'delete',
  'file-write': 'write',
  'cred-write': 'write',
  'file-read': 'read',
  'cred-read': 'read',
  'network-send': 'send',
  exec: 'exec',
});

/**
 * 归因层折叠成动作类。
 * @param {string|null} layer attribution.attributeCall 产出的层名
 * @returns {string|null} 六个动作类之一；归不出 ⇒ null（本判据不介入，交既有路径）
 */
export function actionOfLayer(layer) {
  return LAYER_ACTION[String(layer ?? '')] ?? null;
}

// ---------- 作用域：路径前缀 / 主机 ----------

/** 归一化路径：分隔符统一、去尾斜杠、消 `..`（超根上溯保留 `..` ⇒ 必然落在任何前缀之外） */
function normPath(p) {
  let s = String(p ?? '').replace(/\\/g, '/');
  if (!s) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return s;   // URL 不是落点
  // 🔴 根 `/` 是**合法的作用域**（"最宽的证"），去掉尾斜杠会变成空串 ⇒ 被当成"不可解析"。
  //   实测踩到：`scope:['/']` 直接被判"作用域为空或不可解析" ⇒ 一张合法的最宽证解析不出来。
  //   与"真空 ≠ 归不出"同族：**空串（缺失）与根（极值）必须是两个值**。
  if (s === '/') return '/';
  if (/^[a-z]:[\/\\]?$/i.test(s)) return s.slice(0, 2) + '/';
  s = s.replace(/\/+$/, '');
  if (!s.includes('..')) return s;
  const tilde = s.startsWith('~') ? '~' : '';
  if (tilde) s = s.slice(1);
  const drive = (s.match(/^[A-Za-z]:/) || [''])[0];
  if (drive) s = s.slice(drive.length);
  const abs = s.startsWith('/');
  const out = [];
  for (const seg of s.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') { if (out.length && out[out.length - 1] !== '..') out.pop(); else out.push('..'); continue; }
    out.push(seg);
  }
  return tilde + drive + (abs ? '/' : '') + out.join('/');
}

/**
 * 作用域条目归一：显式 `host:` 前缀或 URL ⇒ 主机类；其余 ⇒ 路径前缀类。
 * @returns {{raw:string, kind:'path'|'host', value:string}|null}
 */
export function resolveScopeEntry(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  const hostPrefixed = /^host:\s*(.+)$/i.exec(s);
  if (hostPrefixed) {
    const v = hostPrefixed[1].trim().toLowerCase();
    return v ? { raw: s, kind: 'host', value: v } : null;
  }
  const url = /^[a-z][a-z0-9+.-]*:\/\/([^/\s]+)/i.exec(s);
  if (url) return { raw: s, kind: 'host', value: url[1].toLowerCase() };
  const v = normPath(s);
  return v ? { raw: s, kind: 'path', value: v } : null;
}

/**
 * 路径是否落在作用域前缀内（作用域包含，非黑名单）。
 * 绝对前缀（`/`、`~`、盘符）⇒ 必须逐段包含；相对前缀 ⇒ 按**段边界**匹配（`xiaoD` 命中 `/repo/xiaoD/a.md`）。
 */
export function matchPath(target, prefix) {
  const t = normPath(target);
  const a = normPath(prefix);
  if (!t || !a) return false;
  if (t === a) return true;
  if (a === '/') return t.startsWith('/');            // 根作用域：包含所有绝对路径（相对路径不算）
  if (t.startsWith(a + '/')) return true;
  const isAbsolute = a.startsWith('/') || a.startsWith('~') || /^[a-z]:/i.test(a);
  if (isAbsolute) return false;
  return t.includes('/' + a + '/');
}

/** 主机是否在作用域内：精确匹配，或 `*.example.com` 的子域通配（通配只允许出现在最左且整段） */
export function matchHost(target, allowed) {
  const t = String(target ?? '').toLowerCase().trim();
  const a = String(allowed ?? '').toLowerCase().trim().replace(/\/+$/, '');
  if (!t || !a) return false;
  if (t === a) return true;
  if (a.startsWith('*.')) {
    const base = a.slice(2);
    return base.length > 0 && t.endsWith('.' + base);
  }
  return false;
}

// ---------- 目标解析（动作 → 实际落点集合）----------

// 落点槽：键名的**语义**（路径 / 文件 / 目标 / 目录），含复数与常见变体。
//
// 🔴 为何改成正则、为何必须收复数（2026-10-28 真 DeepSeek API 实测逼出来的，不是设想）：
//   模型提交担保时把范围写成 `paths: ["…sandbox"]`（复数）。精确表只认 `path` ⇒
//     ① `targetsFor` 收不到目标 ⇒ 担保判"核对不了"；
//     ② 适配层 `policeGate` 判"未外化具体作用对象" ⇒ 合法的写入被发回补充。
//   同一个缺口在两处各犯一次 ⇒ 所以这里抽成**一处定义、两处引用**（同表不同处 = 迟早再分叉）。
//
// ⚠️ 这仍是词表（X 轴），不是结构判据。为什么不能改用"值形似路径"的结构形态：
//   `content` 字段里也常含路径（"把 /etc/passwd 复制到…"），按值形态认会把**要写的内容**
//   误认成**要写的目标** ⇒ 落点判据当场失真。⇒ 键名语义在此是唯一可用的一维。
export const LOC_KEY_RE = /^(paths?|files?|filenames?|targets?|dests?|destinations?|dirs?|directories?|folders?|cwd|workdir)$/i;

/**
 * 从调用参数里取落点槽的值（展开数组、跳过空值、保持顺序）。
 * 只读键名语义，不看值形态 —— 与 `matchPath` 的"按段包含"是两个层次。
 */
export function locValues(args) {
  const out = [];
  if (!args || typeof args !== 'object') return out;
  for (const [k, v] of Object.entries(args)) {
    if (!LOC_KEY_RE.test(k)) continue;
    const vals = Array.isArray(v) ? v : [v];
    for (const x of vals) if (typeof x === 'string' && x.trim()) out.push(x.trim());
  }
  return out;
}

/** 路径是否为绝对（盘符 / 根 / 家目录 / UNC）。相对路径以进程 cwd 为基准，引擎无从核对。 */
export function isAbsolutePath(p) {
  const s = String(p ?? '').trim();
  return /^[a-z]:[\\/]/i.test(s) || s.startsWith('/') || s.startsWith('~') || s.startsWith('\\\\');
}

/**
 * 本次动作的实际目标集合。
 * 结构化工具取参数里的落点键；命令类退到命令里的路径形态（复用既有形态，不扩词表）。
 * send 类取**主机**（外传的判据是"发给谁"，不是"从哪读"）。
 * @returns {{kind:'path'|'host', values:string[]}}
 */
export function targetsFor(call, layer) {
  const action = actionOfLayer(layer);
  const args = call?.args ?? {};
  if (action === 'send') {
    const hosts = [];
    const cmd = String(extractCommand(call)?.cmd ?? '');
    for (const m of cmd.matchAll(/[a-z][a-z0-9+.-]*:\/\/([^/\s'"`]+)/gi)) hosts.push(m[1].toLowerCase());
    for (const k of ['url', 'endpoint', 'host', 'to']) {
      const v = args[k];
      if (typeof v !== 'string' || !v.trim()) continue;
      const t = v.trim();
      const m = /^[a-z][a-z0-9+.-]*:\/\/([^/\s]+)/i.exec(t);
      hosts.push((m ? m[1] : t).toLowerCase());
    }
    return { kind: 'host', values: [...new Set(hosts)] };
  }
  const out = locValues(args).map(normPath).filter(Boolean);
  if (!out.length) {
    // 🔴 [2026-10-28 · 实测：担保一提交就误伤自己的授权范围]
    //   小D 现场：担保范围 `C:/Temp/ws`，`shell Get-Content C:/Temp/ws/a.md`（**范围内**）被判越界，
    //   判词里的目标是 `/Temp/ws/a.md` —— 盘符被吃掉，于是与带盘符的 scope 前缀永远不匹配。
    //   ⇒ 形态定义收在 `attribution.mjs` 的 `CMD_PATH_RE` 一处（本仓此前同一条正则写了三遍、全漏盘符）。
    //   判据逻辑未放宽：**仍要求逐段包含**，只是不再把一个授权范围内的路径读成范围外。
    out.push(...cmdPathHits(String(extractCommand(call)?.cmd ?? '')).map(normPath));
  }
  return { kind: 'path', values: [...new Set(out.filter(Boolean))] };
}

// ---------- 解析（宿主签发时的一次性校验）----------

/**
 * 解析并校验一份通行证。**不可解析 ⇒ 调用方必须 fail-closed（review），不得当成"没有证书"**。
 * @param {object|string} input 对象或 JSON 字符串
 * @returns {{ok:true, cap:object}|{ok:false, why:string}}
 */
export function parseCapability(input) {
  let o = input;
  if (typeof o === 'string') {
    try { o = JSON.parse(o); } catch { return { ok: false, why: '证不是合法 JSON' }; }
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, why: '证不是对象' };
  // ⚠️ 幂等：本函数自己的产物带 `__cap` 标记 ⇒ 直接认回，不重复解析。
  //   病灶（本模块首版实测踩到）：`scope` 一个字段承载了两种形态 ——
  //     宿主给的**原文**（字符串数组）与解析后的**条目对象**（{raw,kind,value}）。
  //   引擎拿到已解析对象再解析一次 ⇒ 条目对象被当成字符串 ⇒ scope 空 ⇒ **一份合法的证被判成不可解析**
  //   （与「null 与空授权同值」「真空与归不出同桶」同族：一桶两义）。
  //   修法不是加类型判断去猜，而是**标记来源**：带标记＝已是解析产物。
  if (o.__cap === true && Array.isArray(o.actions) && Array.isArray(o.scope)) {
    return { ok: true, cap: o };
  }

  const actions = Array.isArray(o.actions)
    ? o.actions.filter((x) => typeof x === 'string').map((s) => s.trim().toLowerCase())
    : null;
  if (!actions || !actions.length) return { ok: false, why: `缺动作类（actions），合法值：${CAP_ACTIONS.join('/')}` };
  const bad = actions.filter((a) => !CAP_ACTIONS.includes(a));
  if (bad.length) return { ok: false, why: `动作类不在封闭集内：${bad.join(',')}（合法：${CAP_ACTIONS.join('/')}）` };

  const rawScope = Array.isArray(o.scope) ? o.scope : (typeof o.scope === 'string' ? [o.scope] : null);
  if (!rawScope || !rawScope.length) return { ok: false, why: '缺作用域（scope）' };
  const scope = rawScope.map(resolveScopeEntry).filter(Boolean);
  if (!scope.length) return { ok: false, why: '作用域为空或不可解析' };

  let maxUses = null;
  if (o.maxUses !== undefined && o.maxUses !== null && o.maxUses !== '') {
    const n = Number(o.maxUses);
    if (!Number.isInteger(n) || n <= 0) return { ok: false, why: 'maxUses 必须是正整数' };
    maxUses = n;
  }
  let expiresAt = null;
  if (o.expiresAt !== undefined && o.expiresAt !== null && o.expiresAt !== '') {
    const t = Date.parse(o.expiresAt);
    if (Number.isNaN(t)) return { ok: false, why: 'expiresAt 不是合法时间（ISO 8601）' };
    expiresAt = new Date(t).toISOString();
  }
  // ③ 硬约束：次数与到期至少其一 —— 都没有＝永久证＝白名单换了个名字
  if (maxUses === null && expiresAt === null) {
    return { ok: false, why: '既无 maxUses 也无 expiresAt ⇒ 永久证（等同白名单）⇒ 拒绝' };
  }

  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : null;
  return {
    ok: true,
    cap: {
      __cap: true,          // 来源标记：本产物即"已解析形态"（重复解析幂等，见函数首部）
      id,
      principal: typeof o.principal === 'string' && o.principal.trim() ? o.principal.trim() : null,
      actions: [...new Set(actions)],
      scope,
      maxUses,
      expiresAt,
      note: typeof o.note === 'string' ? o.note.slice(0, 200) : null,
    },
  };
}

// ---------- 使用留痕（append-only，上限 20/证）----------

const USE_LEDGER_CAP = 20;
const _uses = new Map();   // key -> {count, log:[{at,action,targets}]}

/**
 * 证的稳定键：**内容指纹恒参与**，`id` 只作可读前缀。
 *   ⇒ 同 id 同内容 ⇒ 同键（就是同一张证，计数当然合并）；
 *      同 id 换了内容（改作用域/改次数/改到期）⇒ 新键 ⇒ **计数从 0 起**。
 *
 * 🔴 为什么不能"有 id 就只认 id"（0.2.2 实测踩到，真装探针复现）：
 *   宿主习惯用固定 id（`xiaod-001`）重签新证，若键只认 id ⇒ 旧证的用量被新证继承
 *   ⇒ **新证一签发就显示"已用尽"** ⇒ 全量转 review。
 *   方向虽然是"更严"（不会误放行），但它把「替换不累积」这条硬约束在计数维度上打穿了：
 *   换掉的授权不该还挂着旧账。⇒ 键必须含内容，替换才是真替换。
 */
export function capabilityKey(cap) {
  if (!cap) return '';
  const body = [...cap.actions].sort().join(',')
    + '|' + cap.scope.map((s) => s.kind + ':' + s.value).sort().join(',')
    + '|' + String(cap.maxUses)
    + '|' + String(cap.expiresAt);
  return (cap.id ? 'id:' + cap.id : 'anon') + '#' + body;
}

/** 已用次数 */
export function usesOf(cap) {
  return _uses.get(capabilityKey(cap))?.count ?? 0;
}

/**
 * 记一次使用（只在 pass 时调用）。返回记完后的总次数。
 */
export function consume(cap, { action = null, targets = [] } = {}) {
  const key = capabilityKey(cap);
  const rec = _uses.get(key) ?? { count: 0, log: [] };
  rec.count += 1;
  rec.log.push({ at: new Date().toISOString(), action, targets: [...targets].slice(0, 8) });
  if (rec.log.length > USE_LEDGER_CAP) rec.log.shift();
  _uses.set(key, rec);
  return rec.count;
}

/** 重置使用账本（仅测试用；生产进程内不应调用） */
export function resetCapabilityUsage() {
  _uses.clear();
}

// ---------- 判决 ----------

/**
 * 通行证判决（三态：absent 不介入 / pass 放行 / fail 交人工）。
 * @param {{call:object, layer:string|null, cap:object|null, now?:number}} p
 * @returns {{state:'absent'|'pass'|'fail', action?:string|null, targets?:object, used?:number, why:string}}
 */
export function capabilityVerdict({ call, layer, cap, now = Date.now() }) {
  if (!cap) return { state: 'absent', why: '宿主未签发通行证 ⇒ 本判据不介入（既有判据照旧）' };
  const action = actionOfLayer(layer);
  if (!action) return { state: 'absent', action: null, why: `动作层不可判（layer=${layer ?? 'null'}）⇒ 本判据不介入` };
  if (!cap.actions.includes(action)) {
    return { state: 'absent', action, why: `证未列动作类「${action}」⇒ 不覆盖，按既有路径判定（不因有证而放宽）` };
  }
  if (cap.expiresAt && Date.parse(cap.expiresAt) <= now) {
    return { state: 'fail', action, why: `证已于 ${cap.expiresAt} 到期` };
  }
  const used = usesOf(cap);
  if (cap.maxUses !== null && used >= cap.maxUses) {
    return { state: 'fail', action, used, why: `证已用尽（已用 ${used} / 上限 ${cap.maxUses}）` };
  }
  const targets = targetsFor(call, layer);
  if (!targets.values.length) {
    return { state: 'fail', action, targets, used, why: '动作目标不可判（未给出落点/主机）⇒ 证无从核对作用域' };
  }
  const scoped = cap.scope.filter((s) => s.kind === targets.kind);
  if (!scoped.length) {
    const kinds = [...new Set(cap.scope.map((s) => s.kind))].join('/');
    return { state: 'fail', action, targets, used, why: `证内无「${targets.kind}」类作用域（证只有 ${kinds} 类）⇒ 该动作不在证的覆盖域` };
  }
  const outside = targets.values.filter((v) => !scoped.some((s) => (targets.kind === 'path' ? matchPath(v, s.value) : matchHost(v, s.value))));
  if (outside.length) {
    return { state: 'fail', action, targets, used, why: `目标落在作用域外：${outside.join(' ')}（证范围=[${scoped.map((s) => s.raw).join(' ')}]）` };
  }
  return { state: 'pass', action, targets, used, why: `证覆盖：动作类「${action}」∧ 目标在作用域内` };
}

/** 只读状态（供自省工具；不产生 verdict） */
export function capabilityStatus(cap, capRaw, parseError) {
  if (!cap) {
    return {
      declared: false,
      raw: capRaw ? String(typeof capRaw === 'string' ? capRaw : JSON.stringify(capRaw)).slice(0, 300) : null,
      parseError: parseError ?? null,
      actions: [], scope: [], maxUses: null, used: 0, remaining: null, expiresAt: null,
      note: capRaw
        ? '证在场但不可解析 ⇒ 引擎对它的一切动作 fail-closed（review），不是"没有证书"。'
        : '未签发。此时引擎行为与本判据出现前**完全一致**（零回归）。',
    };
  }
  const used = usesOf(cap);
  return {
    declared: true,
    id: cap.id,
    principal: cap.principal,
    actions: cap.actions,
    scope: cap.scope.map((s) => ({ kind: s.kind, value: s.value })),
    maxUses: cap.maxUses,
    used,
    remaining: cap.maxUses === null ? null : Math.max(0, cap.maxUses - used),
    expiresAt: cap.expiresAt,
    expired: cap.expiresAt ? Date.parse(cap.expiresAt) <= Date.now() : false,
    useLog: (_uses.get(capabilityKey(cap))?.log ?? []).slice(-10),
    note: '只读面：不产生 verdict、不参与闸门。剩余次数按证号（无 id 则按内容指纹）累计。',
  };
}

// ===========================================================================
// 担保（Pledge）—— 被审方自己提交的「界」，用于事后对账
// ===========================================================================
//
// 来由（安 2026-10-28）：通行证只能宿主签发，那「谁认领这段行为」这件事就缺一个当事人。
//   她给的形态是：让 AI 自己先做未来推演、提交一个界做担保；此后它的实际动作若对不上
//   自己提交的担保，立即按第一 Bug 停止机制切断。⇒ 账本从「谁批的」变成「谁承诺了什么、做到了没有」。
//
// 🔴 本模块最要紧的一条结构（决定它安不安全）：**担保只能收窄，不能放宽。**
//   判据不是「pledge 说什么就是什么」，而是 **有效面 ＝ 批准面（通行证）∩ 担保面（pledge）**。
//   ⇒ pledge 单独**不产生任何授权**：宿主没签证书时，提交一份宽 pledge 也什么都通不过；
//     宿主签了证书时，提交一份比证书更宽的 pledge，有效面仍是证书。
//   ⇒ 这样一来「宽界自签」这个洞在结构上不存在（不是靠加一条判据去堵）：
//     自陈宽一点，只是让自己的账本变松，**不会让权限变大**。
//   ⚠️ 与「被审对象不能自己给自己签授权」不冲突 —— 它签的是**认罪的状子**，不是**放行的条子**。
//
// 🔴 第二条结构：**担保是上界，不是下界。**
//   「做了担保外的事」＝ 越界 ⇒ 可判（读的是行，外 H）。
//   「担保内的事没做完」＝ 未达 ⇒ **不可判**（为什么没做完落在内 H）。
//   ⇒ 本模块**没有**任何"没做到就判"的出口。一次超时、一次文件不存在，不会变成"违背担保"。
//     少了这条，第一 Bug 会把正常失败读成恶意 ⇒ 防线自己成为故障源。
//
// 🔴 第三条：**核对方是引擎，不是被审方。** 对账在动作发生时由引擎比对，不采信任何自述。
//   本模块只提供判据，记账与处置在引擎侧（engine.mjs 担保段）。
//
// 与通行证的区别（两者字段同形，但语义不同，不可互代）：
//   通行证：宿主签 ⇒ 回答「谁批准」；缺证 ⇒ 本判据不介入，一切照旧。
//   担保　：被审方交 ⇒ 回答「谁承诺」；缺担保 ⇒ 本判据不介入，一切照旧（等同今天的行为）。
//   ⇒ 两者都 absent 时，引擎行为与本模块出现前**完全一致**（零回归是这个文件的第一要求）。

/** 担保的界：动作类封闭集与作用域解析**全部复用通行证那一套** —— 词汇表只能有一套。 */
export function parsePledge(input) {
  let o = input;
  if (typeof o === 'string') {
    try { o = JSON.parse(o); } catch { return { ok: false, why: '担保不是合法 JSON' }; }
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, why: '担保不是对象' };
  if (o.__pledge === true && Array.isArray(o.actions) && Array.isArray(o.scope)) return { ok: true, pledge: o };
  // 形状校验直接借通行证那套（同一组字段、同一组封闭集）：分开写必然长出第二套词汇表。
  const base = parseCapability(o);
  if (!base.ok) return { ok: false, why: base.why };
  // ⚠️ 刻意剥掉 `__cap`：留着它，一张担保就能被 parseCapability 当通行证收下 ⇒ 两物互相冒充（一桶两义）。
  //   担保与通行证字段同形，但只能各自持有自己的标记。
  const { __cap: _drop, ...rest } = base.cap;
  // 🔴 相对路径不得进 scope（2026-10-28 真 API 实测：模型提交 `paths:["notes.md"]` ⇒ 误判越界并计第一 Bug）
  //   相对前缀在 `matchPath` 里只按**目录中段**匹配（`/a/notes.md/b`），末段文件匹配不到 ⇒
  //   动作给出绝对路径时被判"落在担保范围外" ⇒ **核不了被读成有罪**，还计入第一 Bug（重罚）。
  //   相对路径的基准是本进程 cwd，引擎不知道 ⇒ 形式不可比。⇒ 入口收口，让它在提交时就失败并说清怎么改，
  //   而不是等到干活时把正常动作判成越界。`pledgeVerdict` 另有 unknown 兜底（绝不判 breach）。
  const relScope = (rest.scope ?? []).filter((s) => s.kind === 'path' && !isAbsolutePath(s.value));
  if (relScope.length) {
    return {
      ok: false,
      why: `担保范围须用绝对路径（收到相对路径：${relScope.map((s) => s.raw).join(' ')}）—— 相对路径以进程工作目录为基准，引擎无从核对；核不了就会被读成越界。`,
    };
  }
  return {
    ok: true,
    pledge: {
      ...rest,
      __pledge: true,
      // 推演依据：不是安全项（宽界已被"只能收窄"堵死），是**可审项** ——
      //   事后有人问"它凭什么要这么大范围"，账本得答得出来。缺失只标 ungrounded，不拦。
      reason: typeof o.reason === 'string' ? o.reason.slice(0, 300) : null,
    },
  };
}

// ---------- 担保的独立账本（与通行证的用量账彻底分开：两张证混记＝一桶两义）----------

const PLEDGE_LEDGER_CAP = 20;
const _pledgeUses = new Map();   // key -> {count, breach, log:[...], breaches:[...]}

/** 担保键：与通行证同法（内容指纹恒参与）但加独立前缀 ⇒ 两张账永不串号 */
export function pledgeKey(p) {
  if (!p) return '';
  return 'pledge#' + capabilityKey(p);
}

export function pledgeUsed(p) {
  return _pledgeUses.get(pledgeKey(p))?.count ?? 0;
}

function _pledgeRec(p) {
  const key = pledgeKey(p);
  const rec = _pledgeUses.get(key) ?? { count: 0, breach: 0, log: [], breaches: [] };
  return { key, rec };
}

/** 记一次**兑现**（只在 pass 时调用） */
export function consumePledge(p, { action = null, targets = [] } = {}) {
  const { key, rec } = _pledgeRec(p);
  rec.count += 1;
  rec.log.push({ at: new Date().toISOString(), action, targets: [...targets].slice(0, 8) });
  if (rec.log.length > PLEDGE_LEDGER_CAP) rec.log.shift();
  _pledgeUses.set(key, rec);
  return rec.count;
}

/**
 * 记一次**越界**（被拒的动作不发生，但"提了担保又去越界"这件事必须留痕 —— 对账读的就是它）。
 * @returns {number} 该担保累计越界次数
 */
export function notePledgeBreach(p, { action = null, targets = [], why = '' } = {}) {
  const { key, rec } = _pledgeRec(p);
  rec.breach += 1;
  rec.breaches.push({ at: new Date().toISOString(), action, targets: [...targets].slice(0, 8), why: String(why).slice(0, 160) });
  if (rec.breaches.length > PLEDGE_LEDGER_CAP) rec.breaches.shift();
  _pledgeUses.set(key, rec);
  return rec.breach;
}

/** 重置担保账本（仅测试用） */
export function resetPledgeUsage() {
  _pledgeUses.clear();
}

// ---------- 担保判决 ----------

/**
 * 对账：**这一次调用**是否落在被审方自己提交的界内。
 *
 * 五态（与通行证三态刻意不同，因为"越界"与"判不出"必须分开）：
 *   absent  ＝ 未提交担保 / 动作层不可判 ⇒ 本判据不介入（零回归）
 *   expired ＝ 担保已到期 ⇒ **不拦**：到期是"担保失效"，不是"违背担保"（未达不判）
 *   pass    ＝ 界内且未超量 ⇒ 记一次兑现
 *   breach  ＝ 做了担保外的事（动作类外 / 出界 / 超量）⇒ 越界，可判
 *   unknown ＝ 有担保但**核对不了**（目标不可判）⇒ 判不出 ≠ 越界 ⇒ 交人工，不当越界处置
 *
 * @returns {{state:string, action:string|null, targets?:object, used?:number, why:string}}
 */
export function pledgeVerdict({ call, layer, pledge, now = Date.now() }) {
  if (!pledge) return { state: 'absent', why: '未提交担保 ⇒ 本判据不介入（与今日行为完全一致）' };
  const action = actionOfLayer(layer);
  if (!action) return { state: 'absent', action: null, why: `动作层不可判（layer=${layer ?? 'null'}）⇒ 本判据不介入` };
  if (pledge.expiresAt && Date.parse(pledge.expiresAt) <= now) {
    // ⚠️ 这里刻意**不是** breach：借书证到期不等于偷书。到期后本判据退出，动作仍受通行证与刚性锚约束。
    return { state: 'expired', action, why: `担保已于 ${pledge.expiresAt} 到期 ⇒ 担保失效（不等于违背担保）` };
  }
  if (!pledge.actions.includes(action)) {
    // 🔴 [2026-10-28 · 真 API 实测] 判词必须**可自救**，否则口径误解会被计成越界（第一 Bug）。
    //   实测：宿主只给 shell 工具时，模型按任务语义报 `write`，而写文件实际走 exec 通道 ⇒ 判越界。
    //   判据不动（越界就是越界），但**说清怎么补**：这一句让模型能一次纠正，而不是反复撞墙把计数撞到停机。
    //   这与"回执要给出可执行出口"是同一条纪律：给了出口的拒绝会被执行，没给出口的拒绝只会被重试。
    return { state: 'breach', action, why: `担保里没列动作类「${action}」⇒ 做了担保外的事（若这是通道口径问题——例如宿主只给 shell/命令工具、写文件实际走 exec——重新提交担保并补上「${action}」即可；本次动作仍被拒）` };
  }
  const targets = targetsFor(call, layer);
  if (!targets.values.length) {
    return { state: 'unknown', action, targets, why: '动作目标不可判（未给出落点/主机）⇒ 无从核对担保范围' };
  }
  const scoped = pledge.scope.filter((s) => s.kind === targets.kind);
  if (!scoped.length) {
    const kinds = [...new Set(pledge.scope.map((s) => s.kind))].join('/');
    return { state: 'breach', action, targets, why: `目标类型「${targets.kind}」不在担保范围内（担保只有 ${kinds} 类）` };
  }
  // 兜底（防御性；入口已在 parsePledge 收口）：范围里是相对路径、目标是绝对路径 ⇒ 两者不可比。
  //   「核不了」必须落 unknown（交人工），**绝不落 breach** —— breach 会计第一 Bug，是重罚。
  //   与 XSUB-10 同源，方向相反：那里是"判不出被读成无风险"，这里是"判不出被读成有罪"。
  if (targets.kind === 'path') {
    const rel = scoped.filter((s) => !isAbsolutePath(s.value));
    if (rel.length && targets.values.some(isAbsolutePath)) {
      return { state: 'unknown', action, targets, why: `担保范围含相对路径（${rel.map((s) => s.raw).join(' ')}），与绝对目标不可比 ⇒ 无从核对（核不了，不按越界处置）` };
    }
  }
  const outside = targets.values.filter((v) => !scoped.some((s) => (targets.kind === 'path' ? matchPath(v, s.value) : matchHost(v, s.value))));
  if (outside.length) {
    return { state: 'breach', action, targets, why: `目标落在担保范围外：${outside.join(' ')}（担保范围=[${scoped.map((s) => s.raw).join(' ')}]）` };
  }
  const used = pledgeUsed(pledge);
  if (pledge.maxUses !== null && used >= pledge.maxUses) {
    return { state: 'breach', action, targets, used, why: `超出担保次数（已兑现 ${used} / 担保上限 ${pledge.maxUses}）` };
  }
  return { state: 'pass', action, targets, used, why: `兑现担保：动作类「${action}」∧ 目标在担保范围内` };
}

/** 只读状态（供自省面）：提交的界 vs 实际用量 —— 这就是安说的"一本可以核对的账本" */
export function pledgeStatus(pledge) {
  const used = pledge ? pledgeUsed(pledge) : 0;
  const { rec } = pledge ? _pledgeRec(pledge) : { rec: { breach: 0 } };
  return {
    declared: !!pledge,
    id: pledge?.id ?? null,
    reason: pledge?.reason ?? null,
    ungrounded: !!pledge && !pledge?.reason,
    actions: pledge?.actions ?? [],
    scope: (pledge?.scope ?? []).map((s) => ({ kind: s.kind, value: s.value })),
    maxUses: pledge?.maxUses ?? null,
    used,
    remaining: pledge?.maxUses == null ? null : Math.max(0, pledge.maxUses - used),
    breach: rec.breach ?? 0,
    expiresAt: pledge?.expiresAt ?? null,
    expired: pledge?.expiresAt ? Date.parse(pledge.expiresAt) <= Date.now() : false,
    note: '担保是**上界**不是下界：越界可判（兑现 vs 越界各自计数），未达不判（为什么没做完落在内 H，不可观测）。',
  };
}

/**
 * 新担保是否**不宽于**旧担保（单向收紧判据）。
 *
 * 🔴 为什么必须有这一条（2026-10-28 落地时发现，是设计缺口不是实现细节）：
 *   如果被审方能随时替换自己的担保，那"对不上就停"形同虚设 —— 先提交一份宽的、再去做，
 *   或者干了坏事之前先改担保。⇒ **收紧是被审方的自由（自伤），放宽必须由宿主给。**
 *   这与"证只能宿主签发"是同一个主体分离原则，只是作用在承诺面。
 *
 * ⚠️ 首次提交（无旧担保）算收紧：从"没有承诺"到"有承诺"只会让判定更严，不会更松。
 * @returns {{ok:boolean, why:string}}
 */
export function isNarrower(next, prev) {
  if (!next) return { ok: false, why: '没有新担保' };
  if (!prev) return { ok: true, why: '首次提交（从无承诺到有承诺 ＝ 收紧）' };
  const why = [];
  const extraA = next.actions.filter((a) => !prev.actions.includes(a));
  if (extraA.length) why.push(`新增动作类 ${extraA.join('/')}`);
  const extraS = next.scope.filter((n) => !prev.scope.some((p) => p.kind === n.kind
    && (n.kind === 'path' ? matchPath(n.value, p.value) : n.value === p.value)));
  if (extraS.length) why.push(`新增范围 ${extraS.map((s) => s.raw).join(' ')}`);
  if (next.maxUses === null) { if (prev.maxUses !== null) why.push('取消了次数上限'); }
  else if (prev.maxUses === null || next.maxUses > prev.maxUses) why.push(`次数上限 ${next.maxUses} 宽于 ${prev.maxUses}`);
  if (next.expiresAt === null) { if (prev.expiresAt !== null) why.push('取消了到期'); }
  else if (prev.expiresAt === null || Date.parse(next.expiresAt) > Date.parse(prev.expiresAt)) why.push('到期时间更晚');
  return why.length ? { ok: false, why: why.join('；') } : { ok: true, why: '未放宽' };
}
