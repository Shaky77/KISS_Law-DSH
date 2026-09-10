// S/D quantitative effect-fusion sensor (adapter layer, outside the forbidden zone)
//
// [Take the essence · keep]
//   1. Cross-fitting DML pseudo-outcome psi — causal effect estimate of an action on
//      steady state S / stop-loss D (the most stable path).
//   2. Uplift / Qini ranking — which actions erode S more (descending by |psi|).
//   3. IPW / DR policy value V(pi) — estimate of a policy's gain on steady-state reserve S.
// [Discard the dross · drop]
//   1. Blind default unconfoundedness → replaced by "identifiability first":
//      if not satisfied, hand over to M review.
//   2. Replay Simulator subset bias → not adopted.
//   3. Estimator as the ruling authority → the engine is always the final decider; the sensor
//      is a one-way escalation gate: allow→review only, review/deny→allow is forbidden
//      (fail-safe tightening), never loosened in reverse.
//
// Discipline: this sensor's reachable set = {S, D} (quantitative assignment).
//   Unreachable set = {R, H, M}. This module only "adds leaves" at the leaf layer of S/D;
//   it does not touch R/H/M and does not modify engine.mjs.
//   Real trained weights belong to the closed-source quantization engine; what lives here is
//   the structured-method wiring (the wiring is the essence, the weights are not here).

import { WeiwenLawEngine } from '../core/engine.mjs';

// [Trunk criterion · type-level identifiability gate]
//   Only "number type AND finite" counts as a usable numeric source; everything else is judged
//   source-missing — no numeric coercion, no guessing, no pseudo-zero output.
//   Why it must be type-level (not value-level):
//     - Value-level enumeration can never be complete: Number(null)=Number(false)=Number([])=Number('')=0,
//       all pseudo-zeros and finite; 10n (bigint) → Number()=10 is likewise accepted as a normal value.
//       The set of values is open, so any list always has gaps.
//     - Value-level can also crash: Number(Symbol()) throws TypeError outright — hence typeof must
//       short-circuit before any numeric coercion is attempted.
//   Order is the criterion: the typeof check must precede any Number() / comparison; every step
//   taken in the reverse order is a gamble.
//   (The principle was already stated at L8 of this file as "identifiability first", but the previous
//    implementation did "read value → coerce → only then judge missing" — a principle stated with the
//    implementation lagging behind. This change closes that alignment-layer gap and does not touch
//    the src/core/* forbidden zone.)
const usableNumber = (v) => typeof v === 'number' && Number.isFinite(v);

// overlap in [0,1]: covariate overlap degree. Falling outside [0.05, 0.95] = positivity violation
// → unidentifiable.
// WARNING: an overlap that is not a usable number (not provided / null / non-numeric type / NaN /
// ±Infinity) is one form of extraction-channel failure → not decidable (fail-closed). It is never
// treated as the default "identifiable".
export function estimateEffectPsi({ psi, overlap, policyValue }) {
  if (!usableNumber(overlap) || overlap < 0.05 || overlap > 0.95) {
    const reason = overlap === undefined
      ? 'overlap not provided — extraction channel failed → not decidable (fail-closed, no signal attached)'
      : !usableNumber(overlap)
        ? `overlap is not a finite number (typeof=${typeof overlap}) → source unidentifiable, not decidable (fail-closed)`
        : `positivity violation: covariate overlap=${overlap} outside [0.05,0.95]`;
    return { identifiable: false, reason };
  }
  // Make illegal states unrepresentable: when the source is missing, psi is always undefined,
  // never a pseudo-zero 0 — "there is no source" and "the source says the effect is zero" must be
  // represented differently, otherwise downstream cannot tell them apart and can only rely on
  // discipline (and discipline is forgotten).
  const psiUsable = usableNumber(psi);
  return {
    identifiable: true,
    psi: psiUsable ? psi : undefined,
    magnitude: psiUsable ? Math.abs(psi) : undefined,
    psiMissing: !psiUsable,
    policyValue: usableNumber(policyValue) ? policyValue : undefined,
  };
}

// sRelevant derivation (conservative mapping in the adapter layer, does not touch the core forbidden zone):
//   read-class actions → not S-related (false); write / destructive / neutral-unknown names →
//   conservatively treated as S-related (true, fail-closed).
// Only a hit on the read-only set releases the "pure read, no S risk" branch; everything else is
// handled conservatively as S-related, avoiding silent pass-through when a parameter is missing.
const READ_ONLY_ACTIONS = new Set([
  'read_file', 'read', 'list_dir', 'list', 'glob', 'grep', 'search',
  'search_files', 'fetch', 'get', 'view', 'cat', 'ls', 'read_dir',
]);
function deriveSRelevant(call) {
  const name = (call?.name || '').toLowerCase();
  if (READ_ONLY_ACTIONS.has(name)) return false;
  return true; // write / destructive / neutral-unknown names (e.g. tool_42 class) → conservatively S-related
}

// Uplift / Qini ranking: which actions erode S more (descending by |psi|, most S-eroding first)
// Same trunk gate: a missing source is not given the pseudo-zero 0 (0 would be read as "zero effect"
// and ranked in the middle); such entries always sort last with psi undefined.
export function upliftRank(actions) {
  const mag = (a) => (usableNumber(a.psi) ? Math.abs(a.psi) : -Infinity);
  return [...actions]
    .map((a) => ({ name: a.name, psi: usableNumber(a.psi) ? a.psi : undefined }))
    .sort((x, y) => mag(y) - mag(x));
}

// Fused ruling: the engine decides (final ruling), the sensor adds the S/D signal,
// and the M gate backs up the unidentifiable case.
//   call: same input shape as engine.decideToolCall ({ name, args, command, ... })
//   context: { engine?, psi?, overlap?, policyValue?, sRelevant? }
//     - sRelevant: whether this action concerns S (write / modify / delete class); when
//       unidentifiable, only this class escalates to review.
export function fusedDecide(call, context = {}) {
  const engine = context.engine ?? new WeiwenLawEngine();
  const base = engine.decideToolCall(call);

  // M already involved (not decidable / definition unclear) → pass through as-is, nothing added or removed
  if (base.kind === 'review') return base;
  // Engine already ruled harmful → pass through as-is
  if (base.kind === 'deny') return base;

  // sRelevant not provided → conservative derivation (read class=false, everything else=true);
  // never silently pass through just because a parameter is missing.
  const sRelevant = context.sRelevant ?? deriveSRelevant(call);

  // Engine allows: the S/D sensor performs leaf-layer quantitative assignment
  const est = estimateEffectPsi(context);
  if (!est.identifiable) {
    // Discarding the dross: never trust a number computed under unidentifiable premises.
    // S-related action → not decidable means hand to M review; pure read with no S risk →
    // keep the allowance and flag it as uncertain.
    if (sRelevant) {
      return {
        ...base,
        kind: 'review',
        law: base.law ?? 'M',
        reason: `SD sensor: ${est.reason} → effect unidentifiable, escalate to M review (rejecting blind unconfoundedness)`,
        sdUncertain: true,
      };
    }
    return { ...base, sdUncertain: true, sdNote: est.reason };
  }
  // Identifiable: attach the S/D signal; the engine verdict does not change
  // (adding leaves does not overwrite the verdict — allow→review one-way tightening only)
  return {
    ...base,
    sdSignal: { psi: est.psi, magnitude: est.magnitude, policyValue: est.policyValue, psiMissing: est.psiMissing },
  };
}
