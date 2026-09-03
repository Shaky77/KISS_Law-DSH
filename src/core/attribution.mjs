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
  if (/\b(rm|rmdir|shred|unlink|mkfs|format|dd|truncate|wipefs)\b/i.test(cmd)) return 'exec-destructive';
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
