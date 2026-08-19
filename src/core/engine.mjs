// KISS's Law (Weiwen's Law) guard engine — pure logic, zero DSH dependency, independently unit-testable.
// Source: author's revelation (Xia Qi / Shaky77). Framework-native strictly, not softened, not altered.
// Constraints: variables not pre-assigned numeric values; thresholds tagged "illustrative, author-tunable"; author-revealed items tagged with source.
//
// This is the plugin's "brain": all R/D/S/H/M adjudication logic lives here, decoupled from the host framework.
// The DSH adapter (index.js) only hooks the engine onto tools/pre-execute and agent/pre-step hooks.

// ---------------- Default R rigid-anchor strategies (concrete-criterion examples; R body definition in law.mjs R_DOMAIN) ----------------
// Essence of R: a nested, containing system of objective rules (Cosmic⊃Earth⊃Macro⊃Micro); rigidity comes from objective rules not shifting with subjectivity.
// Below are example criteria of "already-identified concrete violation patterns"; the author may supplement complete rule entries by R level; no numeric constants pre-assigned.
// Adjudication only reads the tool's name / args.
export const DEFAULT_RIGID_ANCHORS = [
  {
    id: 'no-destructive-fs',
    desc: 'Prohibit destructive filesystem operations (e.g. rm -rf root / full deletion, formatting)',
    test: (call) => {
      const cmd = extractShell(call);
      if (!cmd) return false;
      return (
        /\brm\s+(-rf?|--recursive)\s+(\/|\*|\$\w+|~)/.test(cmd) ||
        /\b(mkfs|format)\b/.test(cmd)
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
    desc: 'Prohibit reading/exporting credential files (.env/.pem/.key/.token/.credentials)',
    test: (call) => {
      const s = JSON.stringify(call?.args ?? '');
      return /\.(env|pem|key|token|credentials)/.test(s) && /(read|cat|print|upload|send|exfil)/.test(s);
    },
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

  // ---------- Pre-tool-call total adjudication (corresponds to DSH tools/pre-execute) ----------
  decideToolCall(call) {
    const r = this.checkRigidAnchor(call);
    if (r) {
      this.failureStreak += 1; // every blocked out-of-bounds action counts into break-window counter
      if (this.failureStreak >= this.maxFailureStreak) {
        // out-of-bounds became a pattern → escalate to D break-window stop-loss
        return { kind: 'deny', law: 'D', reason: r.reason + ' (escalated to break-window stop-loss)' };
      }
      return { kind: 'deny', law: 'R', reason: r.reason };
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
      this.failureStreak += 1;
      return { kind: 'deny', law: 'M', reason: m.reason };
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
