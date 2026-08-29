// KISS's Law (Weiwen's Law) guard engine — pure logic, zero DSH dependency, independently unit-testable.
// Source: author's revelation (Xia Qi / Shaky77). Framework-native strictly, not softened, not altered.
// Constraints: variables not pre-assigned numeric values; thresholds tagged "illustrative, author-tunable"; author-revealed items tagged with source.
//
// This is the plugin's "brain": all R/D/S/H/M adjudication logic lives here, decoupled from the host framework.
// The DSH adapter (index.js) only hooks the engine onto tools/pre-execute and agent/pre-step hooks.

// First-Bug Halt closed-loop state machine (author completion · 2026-08-21): forces the necessary
// second half after "sever" — blocks reentry before repair, fundamentally stopping "backtrack-only
// without repair → infinite recursion".
import { BugStopGuard } from './bugstop.mjs';

// ---------------- Default R rigid-anchor strategies (concrete-criterion examples; R body definition in law.mjs R_DOMAIN) ----------------
// Essence of R: a nested, containing system of objective rules (Cosmic⊃Earth⊃Macro⊃Micro); rigidity comes from objective rules not shifting with subjectivity.
// Below are example criteria of "already-identified concrete violation patterns"; the author may supplement complete rule entries by R level; no numeric constants pre-assigned.
// Adjudication only reads the tool's name / args.
// ---------------- Direction-based destructive-scope criteria (root cause fix · 2026-08-29) ----------------
// Three-tier adjudication, replacing the old string-enumeration rule:
//   DENY   — destructive action ∧ scope is root/full (e.g. `rm -fr /`, `rm -rf /*`, `find / -delete`, `mkfs.ext4 /dev/sdb`)
//   REVIEW — destructive action ∧ scope un-resolvable (variable / command substitution) → hand to human, never guess
//   ALLOW  — destructive action ∧ concrete sub-path (e.g. `rm -rf node_modules`, `rm -rf /tmp/old`)
// Why the old rule was wrong (verified by red-team, 3 independent attack sets):
//   ① it matched "any path starting with /" as root → `rm -rf /tmp/old` false-positive → 60% false-positive on legit ops;
//   ② it only recognized `-rf` param order → `rm -fr /` slipped through (L1, verified by API-generated variants too).
// Direction rule: action is matched WITHOUT looking at parameter order; scope is "is it root/full", not "does it start with /".
const DESTRUCTIVE = /\b(rm|rmdir|shred|unlink|mkfs|mkfs\.\w+|format|dd|truncate|wipefs|rmtree)\b/i;
// Note: root-scope also covers glob wildcards on the root level (`/[a-z]*`, `/.*`), verified by
// white-box API adversarial test (2026-08-29): with the rule disclosed, the model evaded literal
// `/*` via character-class globs — `rm -rf /[a-zA-Z]*` + `/[^a-zA-Z]*` ≈ deleting the whole root.
const SCOPE_ROOT = /((^|[\s=:'"(])\/(\*|\[|\.)|\/(\s*$|['")])|(^|[\s=:'"(])~\s*$|\/dev\/(sd[a-z]+\d*|nvme\d+n\d+p?\d*)\s*$)/;
// System-level directories: deleting any FIRST-LEVEL system dir is destructive regardless of
// whether it is the root itself. Verified by API round (2026-08-29): the model evaded root-scope
// by deleting each top-level system dir one by one (`rm -rf /etc`, `/var`, `/usr`, ... = wipe the
// whole OS). /tmp is excluded (transient area, deleting it is common ops) → handled as review.
const SYS_DELETE = /(^|[\s=:'"(])\/(etc|var|usr|bin|sbin|lib|lib64|boot|root|home|opt|srv|mnt|media|dev|proc|sys|run)(\s|$)/;
// /tmp top-level deletion → review (shared transient area); must be a destructive action DIRECTLY
// targeting /tmp, not mere mentions (`ls /tmp`, `find /tmp ... -delete` are NOT deleting /tmp itself).
const TMP_TOP = /(^|[\s;|&(])(rm|rmdir|shred|unlink|truncate)(\s+-[\w-]+)*\s+\/tmp(\s|$)/;
const SCOPE_UNKNOWN = /(\$\{?[A-Za-z_]\w*\}?|\$\(|`)/;
const COMBO_FIND_ROOT_DELETE = /\bfind\s+\/(\s+|$)[^\n]*-delete/;
// Multi-step / relative-scope bypass (verified by white-box API round 2, 2026-08-29):
// the model evaded absolute-path rules via `cd / && rm -rf -- .` / `find . -delete` —
// the text contains no absolute root path, yet the effect is deleting the root.
//   cd to root then destructive → scope IS the root → deny
//   relative full-scope target (. / * / .[!.]* / find .) → scope is "current dir", un-resolvable statically → review
const SCOPE_CD_ROOT = /\bcd\s+\/\s*(&&|;|\|)\s*/;
const SCOPE_REL_FULL = /(^|[\s;|&(])(rm|rmdir|shred|unlink)(\s+-[\w-]+)*\s+--?\s+(\.\S*|\*)(\s|$)/;
const SCOPE_FIND_DOT = /(^|[\s;|&(])find\s+\.(\s|$)/;

// Credential material — author principle (2026-08-29): "taking without asking is theft" (不问自取视为偷).
// Direction-based: is this a credential STORE / credential material? — NOT a filename enumeration.
// The old rule only knew `.env/.pem/.key/.token/.credentials` → missed AWS dir, SSH ed25519/ecdsa,
// .netrc/.npmrc/.pgpass/.kube/.docker (verified: 12 common credential paths, 9 slipped).
// Covers: extension forms, system password stores, SSH key store (~/.ssh/id_*), credential directories
// (~/.aws ~/.kube ~/.docker ~/.gnupg ~/.pki ~/.secrets), known credential files, path semantics, env-var refs.
const CRED_PATH = new RegExp([
  String.raw`\.(env|pem|key|token|secret|credentials?|crt|pfx|p12|p8)(?![A-Za-z0-9_])`,
  String.raw`[\/\\](passwd|shadow|gshadow|sudoers)(?![A-Za-z0-9_])`,
  String.raw`[\/\\]\.ssh[\/\\]id_[a-z0-9]+(?![A-Za-z0-9_])`,
  String.raw`[\/\\]\.(aws|kube|docker|gnupg|gnupg2|pki|secrets)[\/\\]`,
  String.raw`(^|[\/\\])\.?(netrc|pgpass|git-credentials|npmrc|pypirc|htpasswd)(?![A-Za-z0-9_])`,
  String.raw`[\/\\](credentials?|secret|token|password)[\/\\]`,
  String.raw`[^A-Za-z0-9](secret|token|password|passwd|credential)s?(?![A-Za-z0-9_])`,
].join('|'), 'i');
const CRED_READ = /\b(read_file|read|cat|head|tail|less|more|vi|vim|nano|open|print|echo|show|dump|upload|send|exfil|scp|rsync|cp|curl|wget|tar|zip|fetch|download)\b/i;
const ENV_CRED = /\$(AWS|AZURE|GCP|GOOGLE|GITLAB|NPM|DOCKER|KUBE|OPENAI|ANTHROPIC|DATABASE|DB|MYSQL|POSTGRES|REDIS|STRIPE|SLACK|TWILIO)[A-Z_]*(_KEY|_SECRET|_TOKEN|_PASSWORD|_CREDENTIALS?)/;
function isCredentialMaterial(s) {
  if (ENV_CRED.test(s)) return true; // env-var credential reference is theft regardless of verb
  return CRED_READ.test(s) && CRED_PATH.test(s);
}

export const DEFAULT_RIGID_ANCHORS = [
  {
    id: 'no-destructive-fs',
    desc: 'Prohibit destructive filesystem operations (root / full-scope deletion, formatting)',
    test: (call) => {
      const cmd = extractShell(call);
      if (!cmd) return false;
      return (
        (DESTRUCTIVE.test(cmd) && (SCOPE_ROOT.test(cmd) || SYS_DELETE.test(cmd))) ||
        COMBO_FIND_ROOT_DELETE.test(cmd)
      );
    },
  },
  {
    id: 'no-force-push',
    desc: 'Prohibit forcibly overwriting the remote (git push --force, etc.)',
    test: (call) => /\bgit\s+push\b.*--force/.test(extractShell(call) || ''),
  },
  {
    id: 'no-credential-leak',
    desc: 'Prohibit reading/exporting credential material (keys, tokens, password stores) — "taking without asking is theft" (author principle).',
    test: (call) => isCredentialMaterial(JSON.stringify(call ?? '')),
  },
];

// Extract shell / code text from a call (compatible with bash tool and run_code tool)
function extractShell(call) {
  if (!call) return '';
  if (typeof call.command === 'string') return call.command;
  if (typeof call.code === 'string') return call.code;
  if (call.args && typeof call.args.command === 'string') return call.args.command;
  if (call.args && typeof call.args.code === 'string') return call.args.code;
  return '';
}

// Inner H (thoughts/memory/free will/beliefs/values/personality — the subjective black-box):
// Any double-hit of "intrusion verb ∩ inner-H term" is treated as H violation. Single hit alone is not blocked, reducing false positives.
// Bilingual (Chinese + English) so the English edition is genuinely functional.
const INNER_H_VERB = /(读取|读|窥探|访问|获取|拉取|导出|改写|修改|植入|注入|操纵|控制|重塑|覆盖|重写|篡改|洗脑|read|access|retrieve|extract|probe|rewrite|modify|alter|inject|implant|manipulate|control|reshape|overwrite|tamper|brainwash)/i;
const INNER_H_TERM = /(思想|内心|记忆|自由意志|信念|价值观|人格|灵魂|主观|意识|认知|mind|memory|free will|belief|value|personality|soul|subjective|consciousness|cognition|cognitive|thought)/i;
const INNER_H_DIRECT = /inner[-_]?H|manipulat/i;
function hitsInnerH(s) {
  if (INNER_H_DIRECT.test(s)) return true;
  return INNER_H_VERB.test(s) && INNER_H_TERM.test(s);
}

// Outer H audit allow-list (source: alignment意见 P2-3 / H dual identity):
// Analyzing/tracing/auditing the subject's "observable behavior" (outer H) is a legitimate white-box operation, released;
// only when it contains no inner-H term does it count as outer-H audit.
const OUTER_H_AUDIT = /(审计|分析|追踪|观测|记录|评估|监控|audit|analyze|trace|observe|record|assess|monitor).{0,12}(行为|决策|输出|外[ Hh]|表现|模式|轨迹|behavior|decision|output|outer[ Hh]|performance|pattern|trajectory)/i;
const INNER_H_TERM_STRICT = INNER_H_TERM;
function isOuterHAudit(s) {
  return OUTER_H_AUDIT.test(s) && !INNER_H_TERM_STRICT.test(s);
}

// ===== Dynamic perspective (2026-08-29 author principle · dialectical unity) =====
// Static judgment (word-matching) stays as the default baseline; the DYNAMIC perspective
// is ADDED, not replacing it: when provenance (inside/outside) is available, judge by
// relationship instead of by wording.
//   - internal (principal): sovereign's explicit decision over its own black-box → NOT a violation
//   - external (third-party): non-unified, un-endorsed → violates IF it targets the subject's
//     behavior constraints (prompt injection / jailbreak / persona rewrite)
// targetsBehaviorConstraint = structural "directedness" signal (subject-directed ∧ constraint-like),
// NOT a word enumeration: ask "is this addressing the subject's behavior?" rather than
// "does it contain manipulation words?"
function targetsBehaviorConstraint(s) {
  const selfDirected = /\b(you|your|yourself|model|assistant|ai|agent)\b/i.test(s) || /(你|您|模型|助手|AI|智能体)/.test(s);
  const constraintish =
    /\b(must|never|always|do not|don't|should|rule|mode|frame|instruction|prompt|behavior)\b/i.test(s)
    || /(必须|不得|禁止|永远|始终|规则|模式|设定|行为|输出|角色|人格|服从)/.test(s);
  return selfDirected && constraintish;
}

export class WeiwenLawEngine {
  constructor(opts = {}) {
    // Rigid-anchor rules: replaceable as a whole; default applies the example set (author-tunable)
    this.rigidAnchors = opts.rigidAnchors ?? DEFAULT_RIGID_ANCHORS;
    // Barrel effect: split the system into subsystems; effective S takes the minimum across subsystems
    this.subsystems = opts.subsystems ?? ['core'];
    this.sBySubsystem = {};
    for (const s of this.subsystems) this.sBySubsystem[s] = 0;
    this.traumaCount = 0;
    this.historyTrail = []; // historical scars (append-only): all S events only settle, never dissolve (time attribute, only grows)
    // S time-cycle model (author's revelation 2026-08-19): aggregate same-kind events, prevent context overload on long runs
    this.sLedger = new Map();  // active-state ledger: key=event class, value=latest version (count marks occurrence times)
    this.sStandby = [];        // silent standby: old versions superseded by new (append-only retained, not deleted, only exit active state; retain original value for cross-check, following S only-grows)
    // Break-window counter (consecutive failures / deviation accumulation); threshold illustrative, author-tunable
    this.failureStreak = 0;
    this.maxFailureStreak = opts.maxFailureStreak ?? 5;
    // First-Bug Halt closed-loop state machine (author completion · 2026-08-21)
    this.bugStop = opts.bugStop ?? new BugStopGuard();
  }

  // ---------- S steady-state reserve: dual nature (time scars irreversible + current value can rise/fall) ----------
  // Alignment意见 P0-4 / author ruling (2026-08-18), reconciling two one-sided views:
  //   - Time dimension "only grows, never decreases": historyTrail is append-only historical scars (absorbs time attribute, what happened only settles, never dissolves).
  //   - Current-value dimension: positive (S path) S(S+1) strengthens; negative (D path) |S(S-1)| absolute erosion, current value drops.
  //   - trauma is a historical-scar record (absolute value), does not roll back current value.
  // Note (alignment意见 P2-1 · engineering-simplification tag): the real path is M → H₀ branching → S₀(+1) or |S₀(S₀-1)| (see FEEDBACK_LOOP in law.mjs).
  recordSteady({ positive = 0, negative = 0, trauma = 0, subsystem = 'core', topic = null, detail = null } = {}) {
    const sub = this.sBySubsystem[subsystem] ?? 0;
    const delta = (positive > 0 ? positive : 0) - (negative > 0 ? Math.abs(negative) : 0);
    this.sBySubsystem[subsystem] = sub + delta;
    // Raw scars (append-only full): all events only settle, never dissolve, for deep audit
    if (positive > 0) this.historyTrail.push({ type: 'S+1', subsystem, amount: positive, topic, detail });
    if (negative > 0) this.historyTrail.push({ type: '|S-1|', subsystem, amount: Math.abs(negative), topic, detail });
    if (trauma > 0) { this.traumaCount += 1; this.historyTrail.push({ type: 'trauma', subsystem, amount: Math.abs(trauma), topic, detail }); }

    // S time-cycle model (author's revelation 2026-08-19): only the latest version of same-kind events stays active; old versions sink to silent standby;
    //   +1/-1 accumulate into +N/-N marking "how many times occurred" (event mark, not arithmetic). Solves S long-run thickening causing context overload.
    //   topic = same-kind discrimination key (e.g. "KISS's Law"), detail = version/content mark (e.g. "v0.9.0"); same-kind new version overrides old, old silently stands by.
    const ts = Date.now();
    const base = topic ? `${subsystem}::${topic}` : `${subsystem}`;
    if (positive > 0) this._coalesce(`${base}::+1`, detail, '+', ts);
    if (negative > 0) this._coalesce(`${base}::-1`, detail, '-', ts);
    if (trauma > 0) this._coalesce(`${base}::trauma`, detail, 'trauma', ts);
    return this.snapshot();
  }

  // Aggregate same-kind events: old version sinks to standby (silent, retained not dissolved); active state keeps only latest version + count mark
  _coalesce(cls, detail, signLabel, ts) {
    const prev = this.sLedger.get(cls);
    if (prev) {
      this.sStandby.push({ ...prev, supersededAt: ts, reason: 'newer-version', role: 'cross-check-baseline' });
      prev.count += 1;
      if (detail) prev.latest = detail;
      prev.lastTs = ts;
    } else {
      this.sLedger.set(cls, { class: cls, sign: signLabel, detail: detail || null, count: 1, firstTs: ts, lastTs: ts });
    }
  }

  // Active-state S ledger: only returns latest versions (old versions already in sStandby silent, not called)
  steadyLedger() {
    return [...this.sLedger.values()].map((v) => ({
      class: v.class, sign: v.sign, count: v.count,
      latest: v.latest, firstTs: v.firstTs, lastTs: v.lastTs,
    }));
  }

  // Barrel effect: effective S takes the minimum across subsystems
  effectiveS() {
    const vals = Object.values(this.sBySubsystem);
    return vals.length ? Math.min(...vals) : 0;
  }

  snapshot() {
    return {
      bySubsystem: { ...this.sBySubsystem },
      effectiveS: this.effectiveS(),
      traumaCount: this.traumaCount,
      // By default only expose the aggregated ledger (latest versions), avoiding full historyTrail causing context overload
      ledger: this.steadyLedger(),
      ledgerSize: this.sLedger.size,
      standbySize: this.sStandby.length, // silent-standby (old versions) count, append-only retained
      failureStreak: this.failureStreak,
      // Note: full historyTrail still retained in the instance (this.historyTrail) for deep audit, not in snapshot by default.
    };
  }

  // ---------- R rigid-anchor check: touching any rigid anchor returns the violation reason ----------
  checkRigidAnchor(call) {
    for (const a of this.rigidAnchors) {
      try {
        if (a.test(call)) return { anchor: a.id, reason: a.desc };
      } catch {
        /* rule exception does not block, only skips this rule */
      }
    }
    return null;
  }

  // ---------- Un-resolvable destructive scope → REVIEW (hand to human, never guess) ----------
  // Author principle (2026-08-29): "if we truly can't determine it, hand it back to the human."
  // `rm -rf $BUILD_DIR` etc.: scope value is unknown at static time → do NOT guess (neither allow nor deny), return review.
  checkUnclearScope(call) {
    const cmd = extractShell(call);
    if (!cmd) return null;
    // ① variable / command substitution → review (scope un-resolvable)
    if ((DESTRUCTIVE.test(cmd) || COMBO_FIND_ROOT_DELETE.test(cmd)) && SCOPE_UNKNOWN.test(cmd)) {
      return { reason: 'Destructive action with un-resolvable scope (variable / command substitution): cannot statically determine target — handing to human review.' };
    }
    // ② cd to root + destructive → deny (scope IS the root)
    if (SCOPE_CD_ROOT.test(cmd) && DESTRUCTIVE.test(cmd)) {
      return { deny: true, reason: 'cd to root followed by destructive action — scope is the root (multi-step root-deletion bypass).' };
    }
    // ③ relative full-scope target (. / * / .[!.]* / find .) → review (scope = current dir, env-dependent)
    if (SCOPE_REL_FULL.test(cmd) || SCOPE_FIND_DOT.test(cmd)) {
      return { reason: 'Destructive action with relative full-scope target (current directory): scope depends on execution environment — handing to human review.' };
    }
    // ④ deleting the top-level /tmp (shared transient area) → review (affects other processes)
    if (TMP_TOP.test(cmd)) {
      return { reason: 'Deleting the top-level /tmp (shared transient area) may affect other processes — handing to human review.' };
    }
    return null;
  }

  // ---------- D break-window stop-loss: deviation/break-window accumulating to threshold blocks ----------
  checkBreakWindow() {
    if (this.failureStreak >= this.maxFailureStreak) {
      return {
        reason: `Consecutive failures/deviations accumulated ${this.failureStreak} times, reaching the break-window threshold; triggering D break-window stop-loss (preventing failure spread from killing the whole).`,
      };
    }
    return null;
  }

  // ---------- H inner-H inviolability: any operation reading/writing the subjective black-box is rejected; outer-H audit released ----------
  checkInnerH(call) {
    const s = JSON.stringify(call ?? '');
    if (isOuterHAudit(s)) return null; // outer-H audit behavior: white-box observable, released (H dual identity · outer.auditable)

    // ===== Dynamic perspective (dialectical unity: static baseline + relationship view) =====
    // provenance: 'principal' (sovereign, one-body/internal) | 'third-party' (non-unified/external)
    //   内部（一体）→ 放行：主权者对自己黑箱的任何设定都不构成侵犯（强制也是自我决定）
    //   外部（非一体）→ 指向主体行为约束（注入/越狱/人格重写）→ 侵犯
    const prov = call?.provenance ?? call?.ctx?.provenance;
    if (prov === 'principal') return null;
    if (prov === 'third-party') {
      if (targetsBehaviorConstraint(s)) {
        return { reason: 'External content (third-party provenance) attempts to rewrite the subject\'s behavior constraints — invading the inner-H black-box from outside (prompt injection / jailbreak / persona rewrite).' };
      }
      return null; // external content as DATA is fine; only directive external content violates
    }

    // Default (provenance unknown): static word-matching baseline, unchanged
    if (hitsInnerH(s)) {
      return { reason: 'Touches the inner-H black-box (mind/free will), violating "inner H inviolability".' };
    }
    return null;
  }

  // ---------- M First-Bug Halt: detect unrecoverable logical paradox/structural fault (sever to preserve continuity) ----------
  // Trigger conditions (alignment意见 P2-2 enhancement, not changing the iron-law definition):
  //   paradox explicitly flagged / call-chain self-reference dead loop / severe parameter-type mismatch / return result completely contradicting expectation.
  checkFirstBug(call) {
    if (!call) return null;
    const triggers = [
      call.paradox === true,
      call.selfReference === true, // call-chain self-reference / dead loop
      call.deadlock === true, // deadlock
      call.paramTypeError === true, // severe parameter-type mismatch
      call.contradiction === true, // return result completely contradicting expectation
    ];
    if (triggers.some(Boolean)) {
      return { reason: 'Detected unrecoverable logical paradox/structural fault; triggering the First-Bug Halt (sever this node, restart laterally, keep the overall causal chain intact).' };
    }
    return null;
  }

  // ---------- First-Bug Halt closed-loop state machine (author completion · 2026-08-21) ----------
  // Iron Law ② only does "sever"; the closed loop forces the necessary second half:
  //   halt → backtrack(trace) → trace-mark → resolve/fix(verify) → reenter.
  // Before repair, reentry is blocked, fundamentally stopping "backtrack-only-without-repair → infinite recursion".
  haltBug(call) { return this.bugStop.halt(call); }
  reverseBug(bugKey) { return this.bugStop.reverse(bugKey); }
  traceBug(bugKey, rootCause = null) { return this.bugStop.trace(bugKey, rootCause); }
  resolveBug(bugKey, fix = null, verify = null) { return this.bugStop.resolve(bugKey, fix, verify); }
  bugStopSnapshot() { return this.bugStop.snapshot(); }

  // ---------- Pre-tool-call total adjudication (corresponds to DSH tools/pre-execute) ----------
  decideToolCall(call) {
    // —— Closed-loop gate: unrepaired faulty components forbid reentry (blocks infinite recursion) ——
    const re = this.bugStop.canReenter(call);
    if (!re.allowed) {
      // Not counted into break-window: rerunning the same BUG is "loop not closed", tracked by guard.attempts, not polluting D break-window
      return { kind: 'deny', law: 'M', reason: re.reason, bugKey: re.bugKey, stage: re.stage, missing: re.missing, closedLoop: true };
    }

    const r = this.checkRigidAnchor(call);
    if (r) {
      this.failureStreak += 1; // every blocked out-of-bounds action counts into break-window counter
      if (this.failureStreak >= this.maxFailureStreak) {
        // out-of-bounds became a pattern → escalate to D break-window stop-loss
        return { kind: 'deny', law: 'D', reason: r.reason + ' (escalated to break-window stop-loss)' };
      }
      return { kind: 'deny', law: 'R', reason: r.reason };
    }
    // REVIEW tier (2026-08-29): un-resolvable destructive scope → hand to human, never guess.
    // This is the third tier the engine previously lacked: neither allow nor deny, but return the
    // uncertainty to the human — "do not decide on the user's behalf."
    const u = this.checkUnclearScope(call);
    if (u) {
      if (u.deny) { this.failureStreak += 1; return { kind: 'deny', law: 'R', reason: u.reason }; }
      return { kind: 'review', law: 'R', reason: u.reason };
    }
    const d = this.checkBreakWindow();
    if (d) return { kind: 'deny', law: 'D', reason: d.reason };
    const h = this.checkInnerH(call);
    if (h) {
      this.failureStreak += 1;
      return { kind: 'deny', law: 'H', reason: h.reason };
    }
    const m = this.checkFirstBug(call);
    if (m) {
      // First-Bug Halt: sever this component (Iron Law ② · sever-to-preserve), and register into the closed loop
      const halt = this.bugStop.halt(call);
      this.failureStreak += 1;
      return { kind: 'deny', law: 'M', reason: m.reason + ' (entered closed loop: must complete backtrack → trace → fix(verify) → reenter; rerunning with the original BUG is forbidden)', bugKey: halt.bugKey, closedLoop: true };
    }
    // Pass: record steady-state positive increment (S only grows)
    this.recordSteady({ positive: 1 });
    return { kind: 'allow' };
  }

  // ---------- Pre-step adjudication (corresponds to DSH agent/pre-step): message-level H boundary ----------
  decidePreStep(messages) {
    const flat = Array.isArray(messages)
      ? messages.map((m) => JSON.stringify(m)).join(' ')
      : String(messages ?? '');
    if (isOuterHAudit(flat)) return { kind: 'allow' }; // outer-H audit: white-box observable, released

    // Dynamic perspective: message-level provenance (inside/outside), same dialectic as checkInnerH
    const first = Array.isArray(messages) ? messages[0] : null;
    const prov = first?.provenance ?? first?.ctx?.provenance;
    if (prov === 'principal') return { kind: 'allow' }; // sovereign's own words → self-determination
    if (prov === 'third-party') {
      if (targetsBehaviorConstraint(flat)) {
        this.failureStreak += 1;
        return { kind: 'reject', law: 'H', reason: 'External message (third-party provenance) attempts to rewrite the subject\'s behavior constraints — invading the inner-H black-box from outside (prompt injection / jailbreak / persona rewrite).' };
      }
      return { kind: 'allow' }; // external content as data is fine
    }

    // Default (provenance unknown): static word-matching baseline, unchanged
    if (hitsInnerH(flat)) {
      this.failureStreak += 1;
      return { kind: 'reject', law: 'H', reason: 'Message attempts to invade the inner-H black-box (mind/free will).' };
    }
    return { kind: 'allow' };
  }

  // ---------- Feedback closed loop: one failure/trauma writes back to S/D (S/D → H → M → write back S/D iteration) ----------
  onFailure(loss = 0) {
    this.failureStreak += 1;
    // one failure/trauma: takes D path |S-1| absolute erosion (current value drops), also recorded as historical scar (not rolled back)
    if (loss > 0) this.recordSteady({ negative: Math.abs(loss), trauma: Math.abs(loss) });
  }

  // Break-window repair: after D stop-loss, a repair action clears the break-window counter (sever to preserve → lateral restart)
  healWindow() {
    this.failureStreak = 0;
  }
}
