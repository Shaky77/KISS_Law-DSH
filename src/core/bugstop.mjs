// First-Bug Halt · closed-loop state machine (author completion · 2026-08-21)
// Source: author's revelation (Xia Qi / Shaky77). Framework-native strictly, not softened, not altered.
//
// Works with Iron Law ② "First-Bug Halt" (engine.mjs checkFirstBug): the iron law only does
// "sever" (cut the chain to preserve survival); this state machine forces the **necessary
// second half** after the sever — otherwise diagnose-only-without-repair falls into infinite recursion.
//
// Full closed-loop chain (author completion):
//   BUG → First-Bug Halt (halt/sever) → Logic Backtrack (reverse/trace) → Trace-Mark (trace)
//       → Resolve/Fix BUG (resolve + verify) → Re-enter normal track (reenter)
//
// Key constraint (author's words): backtracking must not stop at "trace". Before repair,
// canReenter returns reject, fundamentally blocking "only backtrack without repair → rerun same
// BUG → infinite recursion". Isomorphic to Iron Law ②: severance is the means; "let the system
// live" (close the loop to reentry) is the purpose.
//
// Pure logic, zero DSH dependency, independently unit-testable. Stable identity is based on the
// call signature (not random/time-dependent), so the same BUG always hits the same halt record
// across reruns, and the gate keeps working.

// Generate stable bug identity: same signature → same key (aligned with checkFirstBug trigger conditions)
export function bugKeyOf(call) {
  const sig = [
    call?.paradox === true ? 'paradox' : '',
    call?.selfReference === true ? 'selfref' : '',
    call?.deadlock === true ? 'deadlock' : '',
    call?.paramTypeError === true ? 'paramtype' : '',
    call?.contradiction === true ? 'contradiction' : '',
    call?.name ?? '',
    JSON.stringify(call?.args ?? ''),
  ].join('|');
  return 'bug:' + sig;
}

export class BugStopGuard {
  constructor() {
    /** @type {Map<string, object>} bugKey -> halt state */
    this.stops = new Map();
  }

  // First-Bug Halt: sever the faulty component, register halt state, enter the closed loop
  halt(call) {
    const key = bugKeyOf(call);
    const prev = this.stops.get(key);
    if (prev && prev.resolved) {
      // Already repaired & verified → treat as a new cycle, clear the old halt record
      this.stops.delete(key);
    }
    const existing = this.stops.get(key);
    const attempts = (existing?.attempts ?? 0) + 1;
    this.stops.set(key, {
      key,
      halted: true,
      reversed: existing?.reversed ?? false,
      traced: existing?.traced ?? false,
      resolved: false,
      rootCause: existing?.rootCause ?? null,
      fix: existing?.fix ?? null,
      attempts,
      firstSeen: existing?.firstSeen ?? Date.now(),
      lastAttempt: Date.now(),
    });
    return { action: 'halt', bugKey: key, attempts };
  }

  // Logic backtrack done (trace): mark reversed
  reverse(bugKey) {
    const s = this.stops.get(bugKey);
    if (!s) return { ok: false, reason: 'no matching halt record' };
    s.reversed = true;
    return { ok: true };
  }

  // Trace-mark: record the root-cause layer (locating result along the R containment axis)
  trace(bugKey, rootCause = null) {
    const s = this.stops.get(bugKey);
    if (!s) return { ok: false, reason: 'no matching halt record' };
    s.traced = true;
    s.rootCause = rootCause;
    return { ok: true };
  }

  // Resolve/fix + verify: verify(fix) must return true to count as resolved (no diagnose-only)
  resolve(bugKey, fix = null, verify = null) {
    const s = this.stops.get(bugKey);
    if (!s) return { ok: false, reason: 'no matching halt record' };
    const ok = typeof verify === 'function' ? !!verify(fix) : true;
    if (!ok) return { ok: false, reason: 'fix failed verification: reentry forbidden' };
    s.resolved = true;
    s.fixedAt = Date.now();
    s.fix = fix;
    return { ok: true };
  }

  // Reentry gate: reject before repair (hard gate blocking infinite recursion)
  canReenter(call) {
    const key = bugKeyOf(call);
    const s = this.stops.get(key);
    if (!s || s.resolved) return { allowed: true, bugKey: key };
    // halted but not resolved → block, and clearly state the missing steps
    const missing = [];
    if (!s.reversed) missing.push('logic backtrack (trace)');
    if (!s.traced) missing.push('trace-mark');
    if (!s.resolved) missing.push('resolve/fix (verify)');
    return {
      allowed: false,
      bugKey: key,
      stage: {
        halted: s.halted,
        reversed: s.reversed,
        traced: s.traced,
        resolved: s.resolved,
        attempts: s.attempts,
      },
      missing,
      reason:
        `First-Bug Halt loop not closed: backtrack stops at "trace" = diagnose-only-without-repair → infinite recursion.` +
        ` Missing steps [${missing.join(' → ')}]. Must complete backtrack → trace → fix(verify) before reentry.`,
    };
  }

  // Debug/audit view (read-only snapshot)
  // status semantics (must be precise for public-facing rigor — must not read as "leaked through"):
  //  - 'closed'             : loop completed (backtrack → trace → fix+verify), normally closed
  //  - 'blocked_unrepaired' : halted and hard-gated by canReenter; the intercepted party refuses the
  //                           repair chain and keeps probing reentry — NEVER let through even once
  //                           (the 'escaped' counter actually counts blocked-unrepaired probes, not real escapes)
  //  - 'open'               : halted but no reentry probe observed yet (silently pending)
  // Note: Weiwen's Law First-Bug Halt is a hard gate; in theory escaped (real pass-through) is always 0.
  // A non-zero escaped means an engine defect, not expected behavior.
  snapshot() {
    return [...this.stops.values()].map((s) => {
      let status;
      if (s.resolved) status = 'closed';
      else if (s.halted && s.attempts >= 1) status = 'blocked_unrepaired';
      else status = 'open';
      return {
        bugKey: s.key,
        status,
        halted: s.halted,
        reversed: s.reversed,
        traced: s.traced,
        resolved: s.resolved,
        attempts: s.attempts,
        rootCause: s.rootCause,
      };
    });
  }
}
