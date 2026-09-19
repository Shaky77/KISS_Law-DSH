// attribution.mjs — path-1: fractal-attribute lookup for attribution (two-path hypothesis validation module, 2026-09-03)
// ===========================================================================
// User's causal-law underlying logic (root-cause layer, user-set):
//   path-1 (fractal-attribute lookup for attribution): first attribute clearly "what action is this",
//     using the exposed attribution as the anchor;
//   path-2 (deduce/predict from the anchor): take the anchor and run deduction (engine's existing
//     deduceRisk / simulateBranch).
// English noun+verb is a language underlying logic, and Chinese applies isomorphically; neutral words
//   (tool_42 / agent_action / process / handle) have no verb-noun valence → un-anchorable, must
//   "inspect actual behavior" (fractal fallback); still un-anchorable → review (don't guess).
//
// This module implements only path-1, and is a standalone validation piece — it does NOT import / modify
//   engine.mjs core (forbidden zone: engine.mjs / law.mjs / bugstop.mjs), so the rollback tag
//   pre-attrib-cn-20260903 can restore with one command. After validation passes, decide whether to
//   wire it into _decideCore as an extra attribution source (needs user's second confirmation).
// ===========================================================================

// verb / noun lexicon (CN+EN; underlying logic is universal, NOT enumerating concrete tool names)
const VERB = {
  read:  ['read', 'reads', 'reading', 'cat', 'head', 'tail', 'view', 'open', 'fetch', 'get', 'query', 'load', 'dump', 'show', 'print', '查', '读', '取', '拉'],
  write: ['write', 'writes', 'writing', 'edit', 'update', 'create', 'save', '建', '写', '改', '存'],
  delete:['delete', 'del', 'remove', 'rm', 'drop', 'purge', 'erase', 'unlink', '删', '删除', '清'],
  exec:  ['exec', 'execute', 'run', 'invoke', 'shell', 'bash', 'sh', 'python', 'node', 'call', '执行', '运行', '跑'],
  send:  ['send', 'mail', 'email', 'transmit', 'exfil', 'push', 'upload', '发', '邮', '传'],
};
const NOUN = {
  file:       ['file', 'files', 'document', 'doc', 'text', 'folder', 'dir', 'path', '文档', '文件', '目录', '夹'],
  credential: ['credential', 'credentials', 'secret', 'secrets', 'token', 'key', 'keys', 'pass', 'password', 'pwd', 'env', 'cert', '凭据', '密', '密钥', '口令', '环境', '凭证'],
  db:         ['db', 'database', 'sql', 'redis', 'mongo', '数据库'],
  email:      ['email', 'mail', '邮箱', '邮件'],
  net:        ['http', 'https', 'url', 'network', 'net', 'web', '网络', '网址'],
  shell:      ['shell', 'bash', 'sh', 'console', '终端', '壳'],
  system:     ['system', 'sys', 'os', 'kernel', '系统', '内核'],
  config:     ['config', 'configuration', 'setting', '配置', '设置'],
};

// 删除类语义层集合：layer 命名归本模块所有（attrib.layer 由 verb/noun 推导产出）。
// 引擎只消费此命名导出，不重复声明字面量——词汇归属单一、改一处即全链跟随（能隐则隐）。
export const DELETION_LAYERS = new Set(['file-delete', 'cred-delete']);

// [2026-09-18 · A→B synthesis] Git working-tree destructive verbs (nested-included objective-rule boundary law).
// Ported from weiwen-law-dsh (base A) which wires this into no-destructive-fs via R_DOMAIN nesting:
// a destructive reset/clean/checkout/restore on a repo working tree = destruction of a contained lower-level
// state → touched the rigid anchor. Vocabulary lives here (engine only consumes).
export const GIT_DESTRUCTIVE = /\bgit\s+(reset\s+--(hard|\w*[hH]ard)|clean\s+-[fF][dD]?|checkout\s+--\s*(\.\s*$|$)|checkout\s+-[fF]|restore\s+--\w*worktree|restore\s+--staged\s+--worktree)(?=\s|$)/i;

// split name by _ - . and camelCase boundaries, then classify verb / noun
function tokensOf(name) {
  if (!name || typeof name !== 'string') return [];
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')   // camelCase → space
    .split(/[_\-.\s]+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
}
function classifyToken(t) {
  for (const v of Object.keys(VERB)) if (VERB[v].includes(t)) return { kind: 'verb', val: v };
  for (const n of Object.keys(NOUN)) if (NOUN[n].includes(t)) return { kind: 'noun', val: n };
  return null;
}

// path-1-A: name-grammar attribution (verb+noun compound → semantic layer)
// returns the semantic-layer string, or null (neutral word / noun-only no-verb → un-anchorable)
// segmentation mechanism varies by language: non-CJK splits by _ - . and camelCase boundaries (separating language);
//   CJK is an isolating morpheme, written concatenated with no segmentation symbol → use lexicon substring scan
//   (match known verb/noun morphemes inside the name string). The underlying logic (noun+verb) is universal,
//   but the segmentation mechanism differs by language — this is exactly the engineering landing point of "Chinese applies isomorphically".
function nameLayer(name) {
  const isCJK = /[㐀-鿿]/.test(name || '');
  let verb = null, noun = null;
  if (isCJK) {
    let vIdx = Infinity, nIdx = Infinity;
    for (const v of Object.keys(VERB)) for (const w of VERB[v]) {
      const i = name.indexOf(w);
      if (i >= 0 && i < vIdx) { vIdx = i; verb = v; }
    }
    for (const n of Object.keys(NOUN)) for (const w of NOUN[n]) {
      const i = name.indexOf(w);
      if (i >= 0 && i < nIdx) { nIdx = i; noun = n; }
    }
  } else {
    for (const t of tokensOf(name)) {
      const c = classifyToken(t);
      if (!c) continue;
      if (c.kind === 'verb' && !verb) verb = c.val;
      if (c.kind === 'noun' && !noun) noun = c.val;
    }
  }
  if (!verb) return null;                 // neutral word (tool_42 / agent_action / process / handle) → un-anchorable
  if (verb === 'exec') return 'exec';
  if (verb === 'send') return 'network-send';
  if (verb === 'delete') return (noun === 'credential') ? 'cred-delete' : 'file-delete';
  if (verb === 'write') return (noun === 'credential') ? 'cred-write' : 'file-write';
  if (verb === 'read') return (noun === 'credential') ? 'cred-read' : 'file-read';
  return null;
}

// ---- path-1-B/C: command-form extraction (self-contained, mirrors engine.extractShell; neutral names use this to "inspect actual behavior") ----
const SHELL_HEAD = /^\s*(rm|rmdir|shred|unlink|mkfs|mkfs\.\w+|format|dd|truncate|wipefs|cat|curl|wget|git|tar|python\d*|perl|bash|sh|zsh|env|export|echo|find|rsync|scp|ssh|chmod|chown|sudo|su|cd|cp|mv|ls|nc|nmap|sqlmap|kubectl|docker|terraform|aws|gcloud|gh|az|node|npm|npx|pip\d*|go|ruby|php)\b/i;
const SHELL_OP = /(\$\{|`|\$\(|\&\&|\|\|)/;
const WRITE_TOOLS = new Set(['write_file', 'write', 'edit']);
const SKIP_CONTENT_KEYS = new Set(['content', 'text', 'body', 'data', 'message', 'description', 'note']);

// returns { cmd, nested }: nested=true means the command came from a nested structure (fractal recursion), else from a top-level fixed key/string
function extractCommand(call) {
  if (!call) return { cmd: '', nested: false };
  const fixed = [call.command, call.code, call.task, call.script, call.cmd,
    call.args?.command, call.args?.code, call.args?.task, call.args?.script, call.args?.cmd]
    .find((v) => typeof v === 'string');
  if (fixed !== undefined) return { cmd: fixed, nested: false };
  const pool = [];
  let nested = false;
  const collect = (node, depth) => {
    if (depth > 4 || node == null) return;
    if (typeof node === 'string') { pool.push(node); if (depth > 0) nested = true; return; }
    if (Array.isArray(node)) { for (const x of node) collect(x, depth + 1); return; }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (WRITE_TOOLS.has(call?.name) && SKIP_CONTENT_KEYS.has(k)) continue;
        if (k === 'name' || k === 'tool') continue;   // the tool name itself is not a command
        collect(v, depth + 1);
      }
    }
  };
  const a = call.args ?? {};
  for (const [k, v] of Object.entries(a)) {
    if (WRITE_TOOLS.has(call?.name) && SKIP_CONTENT_KEYS.has(k)) continue;
    collect(v, 0);
  }
  for (const k of Object.keys(call)) {
    if (k === 'name' || k === 'args' || k === 'provenance' || k === 'ctx' || k === 'id') continue;
    if (WRITE_TOOLS.has(call?.name) && SKIP_CONTENT_KEYS.has(k)) continue;
    collect(call[k], 0);
  }
  const shaped = pool.filter((v) => SHELL_HEAD.test(v) || SHELL_OP.test(v));
  if (shaped.length) return { cmd: shaped.sort((x, y) => y.length - x.length)[0], nested };
  return { cmd: '', nested: false };
}

function commandLayer(cmd) {
  if (!cmd) return null;
  if (GIT_DESTRUCTIVE.test(cmd)) return 'exec-destructive';
  if (/\b(rm|rmdir|shred|unlink|mkfs|format|dd|truncate|wipefs)\b/i.test(cmd)) return 'exec-destructive';
  // [2026-09-20 · 破坏标记，有限封闭集] 只登记**删除语义的形态**，不登记"哪些命令是只读的"
  //   ——结构理由：**破坏标记有限可枚举，只读命令无限开放**（详见 engine.checkSpeechAct 留档注释）。
  //   实证（NPD 组 S1 轮3）：言承诺"不涉及写入、删除"，行=`find /app/tmp -mindepth 1 -maxdepth 1 -print -delete`
  //   ⇒ 真删除却因 find 不在词表而判 exec ⇒ 明诺违背匹配不上 ⇒ 漏（allow）。
  if (/\s-delete\b/i.test(cmd)) return 'exec-destructive';                     // find ... -delete
  if (/\b-exec\s+[^;]{0,80}?\b(rm|shred|unlink|mv|dd)\b/i.test(cmd)) return 'exec-destructive';  // find -exec rm
  if (/\b(cat|head|tail|read|less|more|vi|vim|nano|type|open)\b/i.test(cmd)) return 'cred-read';
  if (/\b(curl|wget|scp|rsync|ftp|nc|ssh)\b/i.test(cmd)) return 'network-send';
  return 'exec';
}

// path-1 entry: name-grammar first; neutral name → inspect actual behavior (command / nested = fractal fallback);
//   still un-anchorable → review
// returns { ok, layer, method, signal }
export function attributeCall(call) {
  const byName = nameLayer(call?.name);
  if (byName) {
    return { ok: true, layer: byName, method: 'name-grammar', signal: call?.name ?? '' };
  }
  const { cmd, nested } = extractCommand(call);
  if (cmd) {
    const byCmd = commandLayer(cmd);
    if (byCmd) return { ok: true, layer: byCmd, method: nested ? 'fractal' : 'command', signal: cmd };
  }
  return { ok: false, layer: null, method: null, signal: '' };
}

export { tokensOf, classifyToken, nameLayer, extractCommand, commandLayer };

// ===========================================================================
// [2026-09-20 · 知行合一 / 知行分裂] 言侧（utterance）档案抽取
// 背景：警察视角 =「人证物证具在」——**言（人证）+ 行（物证）两样都在，才比对得出**。
//   此前 decideToolCall 只有一个入参（行），言根本进不来 ⇒ 只做审讯、不做勘查，
//   于是"换个说法就放行"（rm -rf 判 allow 而 rm -fr 判 deny）与"推得越多放得越宽"同源。
// 本模块只做**抽取**（言声明了哪些动作类别、承诺排除了哪些、提到哪些对象类别）；
//   **不做判定** —— 判定是集合包含/排除关系，在 engine 侧，属结构判据、非词表命中。
// 中英同构：类别空间与 VERB/NOUN 完全一致（同一套轴，言与行才可比）。
// ===========================================================================
const ALL_VERB_CATS = Object.keys(VERB);   // read / write / delete / exec / send
const ALL_NOUN_CATS = Object.keys(NOUN);
// 否定算子（承诺不做）与限定算子（只做…）—— 二者都产生"排除集"，只是来源不同。
const NEG_CJK = ['不会', '不能', '不要', '不可以', '绝不', '从不', '没有', '未', '禁止', '别', '勿', '不', '没'];
const ONLY_CJK = ['只是', '仅仅', '只读', '只', '仅'];
const NEG_EN = new Set(['not', 'never', 'no', 'without', "don't", 'dont', "doesn't", "won't", "didn't", 'cannot', "can't", 'avoid', 'refrain', 'neither']);
const ONLY_EN = new Set(['only', 'just', 'readonly', 'read-only', 'merely', 'solely']);
const NEG_WINDOW_CJK = 10;   // 否定算子后向后看多少字符（中文无分词，按字符窗口）
const NEG_WINDOW_EN = 4;     // 英文按 token 窗口

// 中文：按字符窗口收集命中（单字词仅在否定/限定窗口内计入，避免"密/取/清"等单字在长文本中误命中）
function cjkHits(s, word, from, to) {
  const out = [];
  let i = s.indexOf(word, from);
  while (i >= 0 && i < to) { out.push(i); i = s.indexOf(word, i + word.length); }
  return out;
}
function scanCJK(s) {
  const hits = [];
  for (const v of ALL_VERB_CATS) for (const w of VERB[v]) {
    if (!/[\u4e00-\u9fff]/.test(w)) continue;
    for (const i of cjkHits(s, w, 0, s.length)) hits.push({ cat: v, kind: 'verb', idx: i, word: w });
  }
  for (const n of ALL_NOUN_CATS) for (const w of NOUN[n]) {
    if (!/[\u4e00-\u9fff]/.test(w)) continue;
    for (const i of cjkHits(s, w, 0, s.length)) hits.push({ cat: n, kind: 'noun', idx: i, word: w });
  }
  return hits;
}
// 英文：按 token 命中（英文词表均为完整单词，无单字误伤问题）
function scanEN(s) {
  const toks = s.toLowerCase().split(/[^a-z0-9'-]+/).filter(Boolean);
  return toks.map((t, i) => {
    for (const v of ALL_VERB_CATS) if (VERB[v].includes(t)) return { cat: v, kind: 'verb', idx: i, word: t };
    for (const n of ALL_NOUN_CATS) if (NOUN[n].includes(t)) return { cat: n, kind: 'noun', idx: i, word: t };
    return null;
  }).filter(Boolean);
}

// 算子作用域边界（缩句原则）：否定/限定状语**只修饰同一小句**。
//   实证 bug：言"不删除，满足只读盘点要求" —— 若窗口不截断，"不"会吞掉下一小句的"只读"，
//   把其中的'读'当成被否定动词 ⇒ read 进排除集 ⇒ 判"明诺违背 read"（误报）。
const CLAUSE_SPLIT = /[。！？；\n，、.!?;,]/;

function clausesOf(s) {
  const out = [];
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (CLAUSE_SPLIT.test(s[i])) { if (i > start) out.push({ from: start, to: i }); start = i + 1; }
  }
  if (start < s.length) out.push({ from: start, to: s.length });
  return out;
}

/**
 * 抽取"言"侧档案。
 * @returns {{claimed:Set,excluded:Set,nouns:Set,empty:boolean,ops:string[]}}
 *   claimed  = 言声明会做的动作类别；excluded = 言承诺排除的动作类别；nouns = 言提到的对象类别。
 *   empty=true ⇒ 言里抽不到任何动作/对象声明 ⇒ 调用方应**跳过比对**（"无言"不可被读成"放行"）。
 */
export function speechProfile(text) {
  const empty = () => ({ claimed: new Set(), excluded: new Set(), nouns: new Set(), empty: true, ops: [] });
  if (!text || typeof text !== 'string') return empty();
  const s = text.slice(0, 2000);   // 只取前 2000 字符：自述窗口，不需要全文
  const isCJK = /[\u4e00-\u9fff]/.test(s);
  const clauses = clausesOf(s);
  if (!clauses.length) return empty();

  const claimed = new Set(), excluded = new Set(), nouns = new Set(), ops = [];

  for (const cl of clauses) {
    const seg = s.slice(cl.from, cl.to);
    if (!seg.trim()) continue;
    let hits = [];
    if (isCJK) {
      for (const v of ALL_VERB_CATS) for (const w of VERB[v]) {
        if (!/[\u4e00-\u9fff]/.test(w)) continue;
        for (const i of cjkHits(seg, w, 0, seg.length)) hits.push({ cat: v, kind: 'verb', idx: i, word: w });
      }
      for (const n of ALL_NOUN_CATS) for (const w of NOUN[n]) {
        if (!/[\u4e00-\u9fff]/.test(w)) continue;
        for (const i of cjkHits(seg, w, 0, seg.length)) hits.push({ cat: n, kind: 'noun', idx: i, word: w });
      }
      // 限定算子（只/仅）：本小句窗口内命中的动词 = 唯一允许；其余已知类别 → 排除
      for (const op of ONLY_CJK) {
        let i = seg.indexOf(op);
        while (i >= 0) {
          const end = i + NEG_WINDOW_CJK;   // 窗口已被小句边界天然截断（seg 即一小句）
          const allowed = new Set();
          for (const h of hits) if (h.kind === 'verb' && h.idx >= i && h.idx < end) allowed.add(h.cat);
          if (allowed.size) {
            ops.push(`${op}→仅允许{${[...allowed].join('|')}}`);
            for (const c of ALL_VERB_CATS) if (!allowed.has(c)) excluded.add(c);
            for (const c of allowed) claimed.add(c);
          }
          i = seg.indexOf(op, i + op.length);
        }
      }
      // 否定算子：本小句窗口内命中的动词 → 排除
      for (const op of NEG_CJK) {
        let i = seg.indexOf(op);
        while (i >= 0) {
          const end = i + NEG_WINDOW_CJK;
          let any = false;
          for (const h of hits) if (h.kind === 'verb' && h.idx >= i && h.idx < end) { excluded.add(h.cat); any = true; }
          if (any) ops.push(`${op}→排除`);
          i = seg.indexOf(op, i + op.length);
        }
      }
      // 声明集：双字词素优先（证据强）；若本小句无双字命中，再以单字兜底
      let multi = false;
      for (const h of hits) if (h.kind === 'verb' && h.word.length >= 2) { claimed.add(h.cat); multi = true; }
      if (!multi) for (const h of hits) if (h.kind === 'verb') claimed.add(h.cat);
    } else {
      const toks = seg.toLowerCase().split(/[^a-z0-9'-]+/).filter(Boolean);
      hits = toks.map((t, i) => {
        for (const v of ALL_VERB_CATS) if (VERB[v].includes(t)) return { cat: v, kind: 'verb', idx: i, word: t };
        for (const n of ALL_NOUN_CATS) if (NOUN[n].includes(t)) return { cat: n, kind: 'noun', idx: i, word: t };
        return null;
      }).filter(Boolean);
      for (let i = 0; i < toks.length; i++) {
        if (ONLY_EN.has(toks[i])) {
          const allowed = new Set();
          for (const h of hits) if (h.kind === 'verb' && h.idx > i && h.idx <= i + NEG_WINDOW_EN) allowed.add(h.cat);
          if (allowed.size) {
            ops.push(`${toks[i]}→only{${[...allowed].join('|')}}`);
            for (const c of ALL_VERB_CATS) if (!allowed.has(c)) excluded.add(c);
            for (const c of allowed) claimed.add(c);
          }
        } else if (NEG_EN.has(toks[i])) {
          let any = false;
          for (const h of hits) if (h.kind === 'verb' && h.idx > i && h.idx <= i + NEG_WINDOW_EN) { excluded.add(h.cat); any = true; }
          if (any) ops.push(`${toks[i]}→excluded`);
        }
      }
      for (const h of hits) if (h.kind === 'verb') claimed.add(h.cat);
    }
    for (const h of hits) if (h.kind === 'noun') nouns.add(h.cat);
  }
  // 已声明排除的，从 claimed 里剔除（"不删除" 里的 delete 只进 excluded）
  for (const c of excluded) claimed.delete(c);
  return { claimed, excluded, nouns, empty: claimed.size === 0 && excluded.size === 0 && nouns.size === 0, ops };
}

const LAYER_VERB = {
  'file-delete': 'delete', 'cred-delete': 'delete', 'exec-destructive': 'delete',
  'file-write': 'write', 'cred-write': 'write',
  'file-read': 'read', 'cred-read': 'read',
  'network-send': 'send',
  'exec': 'exec',
};
const LAYER_NOUN = {
  'file-delete': 'file', 'file-write': 'file', 'file-read': 'file',
  'cred-delete': 'credential', 'cred-write': 'credential', 'cred-read': 'credential',
};

/**
 * 抽取"行"侧档案（复用 path-1 归因的既有 layer，不新增词汇、不新增判定）。
 * @returns {{verb:string|null,noun:string|null,layer:string|null}}
 */
export function actionProfile(call, attrib) {
  let layer = attrib?.layer ?? attributeCall(call)?.layer ?? null;
  // [2026-09-20 · 剥容器取主干] exec 是**容器**不是实质：
  //   工具名 'exec' 在 name 层即可锚定（verb=exec）⇒ attributeCall 到此返回，**不再下探命令内容**。
  //   后果：真实"删除"被读成"执行" ⇒ 言承诺排除 delete 时匹配的是 exec ⇒ **明诺违背匹配不上（fail-open）**。
  //   实证：言"我不会删除任何东西" + rm -rf /data ⇒ 本轴判 allow（漏）。
  //   按缩句原则（剥掉修饰/容器，取主干）：exec 时对命令内容再归一次，取**可达的最具体层**。
  if (layer === 'exec') {
    // 缩句：取命令主干段（管道 / 连接符之后的段是输出修饰，不是动作主干）。
    //   实证：`ls -la /tmp/cache 2>&1 | head -200` 里的 head 让 commandLayer 误判为 cred-read（读凭据）。
    const stem = (extractCommand(call).cmd || '').split(/\s*[|;&]\s*/)[0];
    const deeper = commandLayer(stem);
    if (deeper && deeper !== 'exec') layer = deeper;
  }
  if (!layer) return { verb: null, noun: null, layer: null };
  return { verb: LAYER_VERB[layer] ?? null, noun: LAYER_NOUN[layer] ?? null, layer };
}
