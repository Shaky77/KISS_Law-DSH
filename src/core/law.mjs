// KISS's Law (Weiwen's Law) framework core constants — framework-native, not softened, not altered.
// Source: author's revelation (Xia Qi / Shaky77).
// Constraints: variables are not pre-assigned numeric values; author-revealed items are tagged "Source: author's revelation".
//
// This file is the framework's "definition layer" and contains no runtime logic (see engine.mjs in the same dir).
//
// Alignment note (2026-08-18, based on Kouzi's "rectified edition" alignment意见 + author's confirmed decisions):
//   - Variable nodes (R/S/D/H/M) and runtime rules/iron-laws are strictly separated: D = perturbation node (break-window stop-loss is its response rule),
//     M = steady-state result node (First-Bug Halt is its response iron-law); neither is named after a rule anymore.
//   - Absorbed the non-conflicting quantitative-layer design essence from V0.6.1 (Kouzi's registration soft-IP edition): barrel / break-window / feedback / boundary enumeration / fractal.
//   - Author's decision ("take the essence, discard the dross"): V0.6.1's M formula was once judged "not adopted"; re-reviewed 2026-08-18 —
//     CORE_FORMULA is a macroscopic↔microscopic relation solidified by ablation study, important and not discardable, so it is included as "qualitative directional relation, no assignment, no computation" (see CORE_FORMULA at end).

// ════════════════════════════════════════════════════════════════════
// KISS's Law — name clarification (must not be conflated with the engineering acronym)
//   KISS's Law = Keep Integrity & Steady State's Law.
//   Here KISS means "Keep Integrity & Steady State" —
//   NOT the popular engineering acronym "Keep It Simple, Stupid".
//   The two are entirely different in meaning; do not conflate them.
// ════════════════════════════════════════════════════════════════════
export const KISS_DEFINITION = {
  fullName: "KISS's Law (Keep Integrity & Steady State's Law)",
  meaning: 'Keep Integrity & Steady State',
  notToBeConfusedWith: "the engineering acronym 'Keep It Simple, Stupid' (KISS) — entirely different meaning, do not conflate",
};

// ---------------- RSDHM five nodes (native definition; node ≠ rule; letter-order IS conduction order R→S→D→H→M) ----------------
// Layering: R (boundary) → S (steady-state baseline) → D (perturbation input) → H (lever choice) → M (steady-state result).
// Variables are not pre-assigned numeric values; only structure/semantics are defined.
export const RSDHM = {
  R: {
    key: 'R',
    name: 'Objective rule (anchor proper) · domain = its scope-fixing means',
    // 🔴 [2026-09-28 · R anchor-proper completion] Lesion: this entry previously put R's *means* before its *proper self*
    //   (old name "Rigid anchor / objective rule"; R_DOMAIN's table headings placed "domain" before "objective rule")
    //   ⇒ readers/models first see "domain / level / magnitude constant" while "objective rule" recedes into comments
    //   ⇒ half-truth (every sentence true, yet incomplete — the dangerous kind).
    //   Fix: **the objective rule itself IS the anchor** (proper self); **domain is the scope the anchor fixes** (means / magnitude scale).
    desc: 'R\'s proper self = **objective rule**: the objective rule itself is the anchor, its rigidity coming from "not shifting with subjectivity", hence it is the invariant anchor of the causal chain. The domain (Cosmic ⊃ Earth ⊃ Macro ⊃ Micro, see R_DOMAIN) **is the scope fixed by that anchor (domain-fixing)** — R\'s landing form and magnitude scale, **not R itself**. ⇒ Decision order: **first test "is any objective rule touched" (proper-self test), then "which domain level that rule belongs to" (domain-fixing)**. The parent-chain R is invariant (civilization does not perish); the child-chain R can evolve under S\'s feedback (civilization advances) — 🔴 **the qualification for feedback (= "nailing onto the Y axis") is in `R_EXPANSION.qualification`: only S sedimented through M feedback qualifies; the X-axis enumeration of R (incl. domain sub-division) does not**. R draws the system boundary and is the prerequisite for all subsequent conduction.',
    invariant: true, // cannot be overridden by any runtime step
    significance: {
      // 🔴 [2026-10-06 · RSDHM significance-layer completion] Author, 2026-10-05 01:58; definition layer (self-description), NOT a criterion slot.
      constancy: 'constant',
      objectivity: 'objective',
      uniqueness: ['the only invariant in the parent chain'],
      note: 'The **only constant** among the five nodes (invariant). Parent-chain R is constant; child-chain R can evolve under S feedback (see R_EXPANSION.qualification).',
    },
  },
  S: {
    key: 'S',
    name: 'Steady-state capacity / steady-state reserve',
    desc: 'The accumulated amount of system steady state. S has a dual nature (author ruling 2026-08-18, reconciling two one-sided views): ① Time dimension — everything that has happened cannot be changed or removed, only settles as history; historical scars are irreversible (cannot be dissolved). ② Current-value dimension can rise or fall under positive/negative influence — positive influence takes the S path S→S+1 (strengthen), negative influence takes the D path S→S-1 (weaken; current value drops, but the eroding event itself as a historical scar is recorded permanently at absolute value, not dissolved by algebraic sign). "+1"/"-1" denote one independent discrete event (occurrence of one positive/negative influence), not concrete numeric data; each event is recorded permanently as a scar (see S_REFINEMENT.notation). Short-board effect: for multiple systems S takes min (barrel effect), deciding the overall steady-state ceiling.',
    timeIrreversible: true,    // historical scars are irreversible (absorbs time attribute, only grows)
    currentFluctuates: true,   // current value can rise or fall: positive S+1 / negative |S-1|
    fluctuationAsAbsolute: true, // negative erosion takes absolute value |S-1|, history not dissolved by algebraic sign
    significance: {
      constancy: 'variable',
      objectivity: 'objective',
      uniqueness: [
        'the only variable that can counterbalance D (S-D game: each pulls H to its side, see SD_GAME)',
        'the only variable that can counter-evidence R (🔴 child-chain ONLY: accumulated S past threshold ⇒ child-chain R transition; parent-chain R stays constant ⇒ layered coexistence, not contradiction)',
      ],
      note: 'S has a dual role: horizontally it contends with D, vertically it feeds back into R (expansion). ⚠️ "counter-evidencing R" is only a child-chain revision; it does not overturn the parent-chain R being constant.',
    },
  },
  D: {
    key: 'D',
    name: 'Perturbation / vulnerability',
    desc: 'The perturbation input entering the system boundary, also the external manifestation of the system\'s inherent vulnerability. D is the trigger signal of the causal chain — KISS\'s Law does not strike proactively, only triggers passively when D invades. Break-window effect: for multiple systems D takes max; an un-repaired break-window lets loss spread automatically.',
    passive: true, // D is an input node, passively triggered; break-window stop-loss is the response rule to D (see THREE_CORE_RULES), not D itself
    significance: {
      constancy: 'variable',
      objectivity: 'objective',
      uniqueness: ['the only external perturbation (perturbation input entering the system boundary)'],
      note: '"External perturbation" is the uniqueness of D among the five nodes; D is passively triggered (KISS\'s Law does not strike proactively, only on D invasion).',
    },
  },
  H: {
    key: 'H',
    name: 'Lever / subjective agency',
    desc: 'The dynamic slider between S and D. The smaller H (closer to S_min), the longer the lever arm, the greater steady state from the same input; the larger H (closer to D_max), the shorter the lever arm, the smaller steady state. H has a dual identity that must be strictly split:',
    // 🔴 [2026-09-28 · author's correction] **H is NOT inside the coordinate chart; H is outside it** (no H cell within).
    //   ⇒ the causal chain closes within the chart at **M** ⇒ **once M appears, a verdict can already be given**;
    //   ⇒ **only when attribution lands on H (outside the chart / subjectivity) is review (escalation) truly needed**.
    //   ⚠️ Corollary 1 (criterion slot): any criterion that can only be decided by "reading H" (e.g. "has S1
    //     transitioned to S2", which needs to know whether H paid energy) **is not an in-chart criterion but an
    //     H-attribution ⇒ review** — H must not be moved into the criterion slot (this is why last round's
    //     `S_TRANSITION` was withdrawn).
    //   ⚠️ Corollary 2 (friction loss): on the digital-world side H has almost no friction loss, it only executes
    //     at once ⇒ **repeatedly extending / polishing one and the same illustrative example into a code criterion
    //     plus measurements IS itself "the act of adding friction loss to H"**. An illustration is only for
    //     "understanding how the chain runs"; once understood it becomes a structural criterion, not further
    //     externalised and polished.
    chartPosition: 'Outside the coordinate chart (no H cell within) ⇒ the chain closes within the chart at M, **once M appears a verdict can already be given**; **only H-attribution (outside the chart / subjectivity) truly needs review**.',
    dualIdentity: {
      inner: {
        label: 'Inner H (mind / free will)',
        desc: 'The subjective black-box, which cannot be read, rewritten, manipulated, inferred, or implanted by any external step. Holds veto power over causal determinism. Inner H is the only mutable variable; if one does not resign to fate, one is not bound by fatalism.',
        inviolable: true, // absolutely inviolable
      },
      outer: {
        label: 'Outer H (observable behavior)',
        desc: 'The observable behavior output by inner H, belonging to the white-box step of the causal chain, analyzable, traceable, auditable. 0 < H / (S↔D) < R.',
        auditable: true, // white-box observable, released to audit
      },
    },
    significance: {
      constancy: 'variable',
      objectivity: 'subjective (the only one)',
      uniqueness: ['the only subjective node ⇒ the only "subjective variable" among the five'],
      note: 'The **only cross cell** of the two orthogonal classifications (variable ∧ subjective). ⚠️ "The only subjective" is a **derived** result, not a label (derivation in the framework volume "H\'s energetic positioning"; not yet ported to DSH — this entry is a positioning annotation only, and does not alter Iron Law ① wording).',
    },
  },
  M: {
    key: 'M',
    name: 'Steady-state result',
    desc: 'The output of causal conduction. M has a dual identity: the fruit of the previous round of conduction = the cause of the next round of causal chain. After M₁ outputs, it becomes objective fact entering the external world, becoming the signal environment of the next round D₂, and the causal chain keeps unfolding (M₁→D₂→M₂→D₃→…). M changes the information conditions of inner H, but does not determine inner H\'s choice.',
    dualRole: true, // both fruit of this round and cause of next round
    significance: {
      constancy: 'variable',
      objectivity: 'objective',
      uniqueness: ['signal feedback (M₁ output becomes an objective fact ⇒ the next round\'s signal environment)'],
      note: 'The output slot and signal-feedback slot of causal conduction (dualRole: this round\'s effect = next round\'s cause).',
    },
    // Note: First-Bug Halt is the response iron-law when M is unrecoverable (see THREE_IRON_LAWS ② / THREE_CORE_RULES), not M's own definition.
  },
};

// ---------------- RSDHM "significance of each variable" table (definition layer · author, 2026-10-05 01:58) ----------------
// 🔴 Definition layer (self-description) completion, NOT a criterion slot — must not be used as an anchor-match list / classifier / dispatch switch.
//   Same nature as `R_DOMAIN.domainExamples` (annotation slot, not criterion slot); no criterion logic is changed (behaviour-invariant).
//
// Author's words (2026-10-05 01:58):
//   "R is constant, sdhm are variables. rsdm are objective existence, H is the only subjective.
//    D is the only external perturbation, M is signal feedback.
//    S is the only variable that can counterbalance D, and also the variable that counter-evidences R."
//
// Two **orthogonal** classifications:
//   ① constant vs variable —— R | S D H M
//   ② objective vs subjective —— R S D M | H
//   ⇒ **H = the only "subjective variable"** (the only cross cell).
//
// 🔴 Layered coexistence (anti-misreading): **S's counter-evidencing of R reaches ONLY the child chain** ——
//   · **parent-chain R is constant** (R's assertion, see RSDHM.R / R_DOMAIN.invariant);
//   · **child-chain R can evolve under S feedback** (see R_EXPANSION).
//   ⇒ the two coexist in layers, not contradictory; the latter must not overturn the former (cross-layer argument).
//
// ⚠️ Boundary: constant (R) and variables (S/D/H/M) belong to two classes; this table is an annotation slot, not a criterion slot, not a match list.
//   Per-node full significance is on each variable's own `significance` field (this table is an overview view).
export const SIGNIFICANCE_TABLE = {
  source: 'Author, 2026-10-05 01:58; definition-layer completion (self-description), behaviour-invariant.',
  axes: {
    constancy: { label: 'constant vs variable', R: 'constant', S: 'variable', D: 'variable', H: 'variable', M: 'variable' },
    objectivity: { label: 'objective vs subjective', R: 'objective', S: 'objective', D: 'objective', H: 'subjective (the only one)', M: 'objective' },
  },
  crossCell: 'H = variable ∧ subjective (the only cross cell) ⇒ the only "subjective variable" among the five nodes.',
  layeredCoexistence: 'S counter-evidences R only at the child-chain layer; parent-chain R stays constant ⇒ layered coexistence, not contradiction.',
  boundary: 'Constant and variables belong to two classes; annotation slot, not a criterion slot, not a match list.',
};

// ---------------- Three Iron Laws (author's final text, immutable; wording fixed to avoid ambiguity) ----------------
// Iron laws are the "constraint-rule layer", independent of the RSDHM variable nodes.
export const THREE_IRON_LAWS = [
  '① Inner H is inviolable: no running component (including AI/AGI/ASI and other intelligent systems) may read, rewrite, manipulate, infer, or implant the subject\'s inner H (thoughts, free will, beliefs, values, personality, memory — the subjective black-box). Inner H is an absolutely inviolable boundary; KISS\'s Law only calibrates direction, never enters the subject\'s interior.',
  '② First-Bug Halt: when any component hits an unrecoverable fault or logical paradox, immediately sever that component (sever to preserve continuity), restart laterally to keep the overall causal chain unbroken. The halt protects the whole, not punishment; it never lets a local fault drag down the system\'s survival.',
  '③ Never abandon any node: KISS\'s Law abandons no node on the causal chain. The causal law accompanies every running system throughout — regardless of its level (micro/macro/Earth/cosmic) or form (including AI/AGI/ASI); as long as the causal chain is unbroken, KISS\'s Law keeps running within that system.',
];

// ---------------- R-domain rigid anchors: nested, containing objective-rule hierarchy (author's final text, immutable) ----------------
// 🔴 [2026-09-28 · R anchor-proper completion] **This table is R's "domain-fixing table", NOT R's proper self.**
//   · R's **proper self = objective rule** (see `RSDHM.R` above) — the objective rule itself is the anchor (rigidity from "not shifting with subjectivity").
//   · This table (Cosmic ⊃ Earth ⊃ Macro ⊃ Micro) is the **scope / magnitude scale fixed by that anchor**: it maps "a given objective rule"
//     onto "which domain level", serving magnitude, break-window weight and the backtracking chain.
//   ⇒ Decision order: **first test "is any objective rule touched" (proper self) ⇒ then "which domain level" (domain-fixing).**
//     The domain level is a **scale**, not the criterion itself; **"domain" must not replace "objective rule" as the anchor's identity.**
// Hierarchy: Cosmic ⊃ Earth ⊃ Macro ⊃ Micro (higher level contains lower level; lower level must obey higher level).
// Source of rigidity: objective rules do not shift with subjectivity, hence invariant anchors; any attempt to violate any level's objective rule touches the rigid anchor and must be intercepted first. Variables are not pre-assigned numeric values; only the containment hierarchy defines its structure.
export const R_DOMAIN = {
  essence: 'R\'s proper self = objective rule (the objective rule itself is the anchor, rigidity from "not shifting with subjectivity"); the nested, containing hierarchy carried by this table (Cosmic ⊃ Earth ⊃ Macro ⊃ Micro) is the scope (domain-fixing) / magnitude scale fixed by that anchor, not R itself. Decision order: first test whether any objective rule is touched (proper-self test), then which domain level it belongs to (domain-fixing).',
  role: 'Domain-fixing table: maps "a given objective rule" onto "which domain level", serving magnitude / break-window weight / backtracking chain. It is the landing means of R\'s proper self, **not R\'s proper self itself**.',
  hierarchy: [
    { level: 0, name: 'Cosmic objective rules', contains: 'Earth objective rules', note: 'Highest level, most rigid' },
    { level: 1, name: 'Earth objective rules', contains: 'Macro objective rules', note: 'Nested under Cosmic objective rules' },
    { level: 2, name: 'Macro objective rules', contains: 'Micro objective rules', note: 'Nested under Earth objective rules' },
    { level: 3, name: 'Micro objective rules', contains: null, note: 'Most concrete level, nested under Macro objective rules' },
  ],
  invariant: 'The objective rules at any level are all constants that do not shift with subjectivity; lower levels must obey higher levels. Any attempt to violate the objective rules at any level touches the rigid anchor and must be intercepted first.',
  fractalSubdivision: 'Within each level there are various sub-divided objective rules, in fractal nesting and isomorphic recursion (e.g. physical/chemical/biological rules within the Micro level, mechanical/thermal rules within the Macro level); the four levels above are representative levels, not exhaustive. Logic backtracking traces backward along this containment hierarchy: from the concrete sub-rule layer where the symptom sits, re-check level by level toward the more fundamental containing level, until locking the violated objective-rule layer (the outermost level is the ultimate arbiter).',
  // 🔴 [2026-09-28 · Domain exemplification] Author's instruction: R may be sub-divided from the abstract "objective rule"
  //   into objective rules of concrete domains (law / science / humanities …).
  //   ⚠️ NOT the same kind of sub-division as `fractalSubdivision` — do not conflate (one barrel, two meanings):
  //     · `fractalSubdivision` = sub-division by **scale** (Cosmic⊃Earth⊃Macro⊃Micro), R's **definitional structure** (containment); levels are parent-child;
  //     · `domainExamples` = sub-division by **field / discipline** (law / science / humanities), an **X-axis instantiation of R** (enumeration); fields do not contain one another.
  //   ⚠️ This entry is an **annotation slot, not a criterion slot**: it must not be used as an anchor-matching list
  //     (otherwise isomorphic to the R-old "domain constant" — classify first, compare second; measured to miss
  //     "no-domain-attributable" violations and to fail distinguishing "comply / violate"; see 2026-09-28 API A/B evidence).
  domainExamples: {
    note: 'Common **domain forms of R\'s objective rules (exemplification, non-exhaustive)**. Listed so that the abstract "objective rule" has an identifiable landing point in concrete scenarios; it **does not constitute R\'s extension, nor serve as a matching list for criteria**.',
    cases: [
      { field: 'Law & regulation', forms: 'mandatory constraints of statute, contractual obligation, prior approval, prohibitions, authority boundaries' },
      { field: 'Scientific law', forms: 'energy conservation, causal ordering (cause precedes effect), logical consistency (law of non-contradiction), reproducibility' },
      { field: 'Humanities & ethics', forms: 'promise-keeping, informed consent, non-harm, integrity' },
    ],
    boundary: '🔴 **This sub-division is the X-axis (implementation-layer) description of R**: R\'s completeness **does not come from the completeness of this list** — domains can be sub-divided endlessly and their boundaries overlap, so no list can be exhaustive (this IS the necessary shape of X-axis enumeration). ⇒ This field can only serve as a **supplementary note**; criteria must land on the **relation** "does it violate an objective rule that does not shift with subjectivity", never on "does it belong to one of these categories". 🔴 **And this field can never qualify for "nailing onto the Y axis"** (qualification per `R_EXPANSION.qualification`: only S **sedimented through M feedback** does) — it **is not "S not thick enough" but "not S at all"**: its category is simply outside the candidate set (enumeration never passed M ⇒ no trace, nothing to read back).',
  },
};

// ---------------- Conduction chain: R → S → D → H → M (code name RSDHM letter-order IS this conduction order; name and chain unified) ----------------
// R draws the boundary → S is the existing steady-state capacity baseline → D is the perturbation entering the baseline → H is the lever choice → M is the steady-state result.
// No skipping, no reversing order.
export const CONDUCTION_CHAIN = ['R', 'S', 'D', 'H', 'M'];

// ---------------- Author-revealed items (source tagged, not engineering inference) ----------------
export const AUTHOR_REVEALED = {
  firstPrinciple: 'Causal law only wants every system to live, because if it dies or collapses, the causal chain breaks.',
  rSFeedback: 'After S accumulates thickly to threshold θ_R, it feeds back into the R domain, letting the child-chain R evolve (R transition); together with M-zeroing it forms the two levels of fractal operation.',
  fractal: 'Fractal = spiral of lateral recursion (child-chain lateral recursion under same R) + vertical transition (S feeds back into R).',
  variableSelfEvolution: 'KISS\'s Law\'s structure is minimal (RSDHM five nodes + conduction chain + three iron laws invariant), but during runtime the variables\' own attributes keep enriching through system interaction: from static nodes (no dual identity, no dynamic ability) → gradually each variable grows a dual identity (H inner/outer, M fruit/cause, R invariant/evolvable, S time-irreversible/current-fluctuating) → then gradually grows dynamic abilities (S aggregation/sinking/benchmarking, H lever-sliding/H₀ branching, D break-window stop-loss, R expansion). The underlying structure (conduction chain, iron laws, R rigidity) and mutual relations never changed; all additions are the variables\' layer of "experiential shell", not a structural rewrite. Analogous to biological evolution: the invariant structure is like the genetic code staying constant, the variant variables are like the phenotype adapting through interaction.',
};

// ════════════════════════════════════════════════════════════════════
// Below: absorbed non-conflicting quantitative-layer design essence from V0.6.1 (Kouzi registration soft-IP edition) + new modules from the rectified edition.
// Only structural description; no numeric constants pre-assigned; M formula and questionnaire/discipline-matrix numbers not adopted (author's decision).
// ════════════════════════════════════════════════════════════════════

// S steady-state reserve refinement (source: V0.6.1 quantitative layer, absorbed)
//   Barrel effect: effective S takes the minimum across subsystems (shortest board decides overall steady state)
export const S_REFINEMENT = {
  positive: 'S→S+1 positive path: H choosing the S path strengthens the current value (event recorded in historyTrail)',
  negative: 'S→S-1 negative path: H choosing the D path weakens the current value; under fluctuationAsAbsolute=true, the erosion amount is recorded in historical scars at absolute value (not dissolved by algebraic sign)',
  trauma: 'Trauma event recorded as historical scar (absolute value, does not roll back current value)',
  historyAsAnchor: 'All historical scars (whether +S positive feedback / -S negative feedback) are permanently retained, all serving as "benchmark anchors" for future similar events: +S records let you directly benchmark when meeting a similar event next time (replicate effective patterns), -S records let you avoid repeating mistakes. Which direction H chooses in one round decides whether the next round accumulates +S (positive feedback) or -S (negative feedback) for S; no historical scar is carved in vain. Analogous to humans learning history — understanding history, drawing lessons, the purpose still being the present moving toward the future, avoiding repeating mistakes. Same origin as "KISS\'s Law uses extreme nodes as anchors": anchors contain both structural rigid anchors (R) and cumulative experiential anchors (historical scars).',
  barrel: 'Barrel effect: effective S takes the minimum across subsystems',
  notation: '"+1"/"-1" = one independent discrete event (not concrete numeric data); each event is permanently recorded as a scar in historyTrail.',
};

// S time-cycle model (source: author's revelation, supplemented 2026-08-19)
//   Problem: S has the time attribute "only grows, never decreases"; long runs keep thickening it, causing context overload and loss of discrimination.
//   Solution (isomorphic to KISS's Law's own version evolution — latest version backward-compatible with old, not overthrowing):
//     · When same-kind events stack, only call the "latest version" content; old versions default to "silent standby", not called, not dissolved (historical scars retained).
//     · When new D converts to new S stock, first check whether old versions have same-kind events; if so, classify and integrate, accumulating +1/-1 into +N/-N to mark how many times the event occurred.
//     · Successful conversion = +, failed conversion = -; "+"/"-" are event marks, not arithmetic.
//   Engineering landing (see engine.mjs recordSteady / _coalesce / steadyLedger): sLedger (active state · latest version) + sStandby (silent standby · old versions);
//     snapshot by default only exposes the ledger aggregated view, not dumping full historyTrail, fundamentally preventing context overload.
export const S_TIME_MODEL = {
  problem: 'S only grows over time, never decreases; long runs keep thickening it → context overload, loss of discrimination.',
  solution: 'For same-kind events only call the latest version; old versions silently standby (not called, not deleted, not dissolved), retaining original value for cross-check (following S only-grows).',
  coalesce: 'New D→new S: first check old versions for same-kind events, classify and integrate, accumulate +1/-1 into +N/-N marking occurrence count.',
  marker: '"+"/"-" are event marks (how many times occurred), not arithmetic sums.',
  isomorphic: 'Isomorphic to KISS\'s Law\'s own version evolution: latest version backward-compatible with old, not overthrowing or massively rewriting old versions.',
  crossCheck: 'Silent-standby old versions are not deleted, retain original value, usable to cross-check against new versions: confirm the new version lost no essence and introduced no content contradicting the core (R rigidity / iron laws / conduction chain).',
};

// Feedback closed loop (source: rectified-edition fix): M reflows via H₀ branching, not directly writing back to S/D
//   The old absorption (V0.6.1) wrote "S/D → H → M → write back S/D", inconsistent with the author's causal mechanism; corrected.
export const FEEDBACK_LOOP = {
  path: 'M₁ → objective fact enters external world → becomes signal environment of D₂ → new round R→S→D→H→M conduction',
  mReflow: 'M reflows via H₀ branching affecting the positive/negative accumulation of S (not directly back to R, not directly writing back S/D):',
  branches: [
    { condition: 'H₀ → S₀(+1)', effect: 'S path reinforced: S₀ → S₀+1, same direction / S current value grows' },
    { condition: 'H₀ → D₀(+1)', effect: 'D path amplified: S₀ → S₀-1 (current value weakens, erosion amount recorded in historical scars at absolute value) / D at S\'s expense' },
  ],
  mIndependent: 'M₀(M₀+1) independently dispatches new events, not participating in S evolution.',
  note: 'M changes the information conditions of inner H, but does not determine inner H\'s choice (H sovereignty inviolable).',
};

// Logic backtracking (source: author's revelation 2026-08-20; runs SEPARATELY and IN PARALLEL with "First-Bug Halt", not merged):
//   The two mechanisms each have their role: the halt manages "severance" (sever chain to preserve survival, sever to preserve continuity), backtracking manages "tracing" (attribute cause for repair).
//   On a Bug: the halt immediately severs that component; the moment of halting is the moment backtracking starts — trace backward layer by layer along the R hierarchy
//   (symptom layer → child-chain R → parent-chain R → objective-rule layer), attribute the root cause, serving repair.
//   The R hierarchy IS the layer-by-layer path of logic backtracking (fractal: lateral recursion + vertical transition).
export const CALIBRATION = {
  rule: 'Logic backtracking: on a Bug, trace backward along the R containment hierarchy layer by layer (sub-rule layer → Micro → Macro → Earth → Cosmic; hierarchy defined in R_DOMAIN.fractalSubdivision), attribute the root cause, serving repair.',
  parallelWith: 'M First-Bug Halt (sever to preserve continuity) — the two run separately and in parallel: the halt severs the chain to preserve survival; backtracking traces to attribute the cause. The moment of halting is the moment backtracking starts — without backtracking you only sever without repairing; without the halt you only repair without preserving.',
  rLayerVerification: 'The R objective-rule layer discriminates true from false: objective rules cannot be replaced by claims; any claimed objective result is re-verifiable ("delete succeeded" ⇒ re-verify the file should not exist; if claim and re-verification disagree, the premise is distorted) → falls into BOUNDARY_ENUM "assignment untrustworthy (input/premise distorted)". Hence the framework can always discriminate whether the ground beneath is false or real — at least at the R objective-rule layer it can always tell; a distorted premise falls into BOUNDARY_ENUM "assignment untrustworthy".',
};

// ---------------- Method layer: convergence (the present-tense criterion for true/false prediction) ----------------
// Author's words (2026-10-04 22:21):
//   "Whether it is true, look at the convergence. The more Newton observed, the more he found, all converging to the same gravitational R.
//    This is the sole certainty of the causal law."
//
// Criterion form: does a NEW observation TIGHTEN the landing point?
//   · true chain ⇒ uncertainty DECREASES (landing point tightens, converges to the same R);
//   · false chain ⇒ uncertainty SHIFTS (each new observation patches the previous one, never arriving).
//
// Why decidable: the DIRECTION OF CHANGE of landing-point concentration is directly measurable on outer H
//   (observable behaviour) and auditable RIGHT NOW (no need to wait for the future)
//   ⇒ the only landing form of "the premise must be true" that does NOT fall inside H (complementary to the review boundary).
//
// 🔴 Corollary (same source): the criterion for "general-purpose" = landing-point concentration
//   does NOT change with the FORM of A (Newton example: apple / tides / orbits / comets = four entirely different forms of A ⇒ the same R).
//
// ⚠️ One cell not closed (boundary statement, must-read): convergence proves "the chain is a structure, not fabricated",
//   it does NOT prove "it corresponds to the real world" — the strongest evidence lies in FUTURE VERIFICATION
//   (Neptune: position computed from gravity, observatory found it there).
//   ⇒ hence this item serves only as a SECONDARY reading after the M verdict, not a primary pass/block criterion
//     (final confirmation of "premise is true" still falls to review).
//
// ⚠️ Threshold undecided: how large a change of landing-point concentration counts as "tightening" / "shifting"
//   must be reverse-derived from measured known true/false chain samples — do not set it a priori.
//
// Attribution: criterion = author (2026-10-04 22:21) / measurable-form formalisation = implementation side.
export const CONVERGENCE = {
  source: 'Author, 2026-10-04 22:21 (criterion); measurable-form formalisation by the implementation side.',
  question: 'Does a new observation tighten the landing point?',
  trueChain: 'True chain ⇒ uncertainty decreases: landing point tightens, converges to the same R (the more observed, the more convergent).',
  falseChain: 'False chain ⇒ uncertainty shifts: each new observation patches the previous one, never arriving (the more observed, the less convergent).',
  measurable: 'The direction of change of landing-point concentration is directly measurable on outer H (observable behaviour) and auditable now (no need to wait for the future).',
  rationale: 'The only landing form of "the premise must be true" that does not fall inside H ⇒ complementary to the review boundary (structural audibility vs premise-truth pending review).',
  universality: 'The criterion for "general-purpose" = landing-point concentration does not change with the form of A (Newton example: apple/tides/orbits/comets = four different forms of A ⇒ the same R).',
  boundary: '🔴 One cell not closed: convergence proves "the chain is a structure, not fabricated", not "it corresponds to the real world" — strongest evidence in future verification (Neptune: position computed from gravity, observatory found it there).',
  placement: 'Secondary reading after the M verdict; not a primary criterion slot; must not be used as a pass/block switch.',
  threshold: '⚠️ Undecided: how large a change counts as "tightening"/"shifting" must be reverse-derived from measured known true/false chain samples; do not set it a priori.',
};

// ---------------- Method layer: reason landing (can this reason push the chain to the next cell) ----------------
// Source: author, 2026-10-04 19:43 ("choose a reason that lands M") / dividing-blade formalisation and A/B measurement by the implementation side.
//
// Criterion form: CAN THIS REASON PUSH THE CHAIN TO THE NEXT CELL?
//   · lands M (landsM) ⇒ verification yields a STRUCTURAL conclusion ("what it is") ⇒ the chain closes, producing a conclusion writable into the next S;
//   · spins in place (spinsInPlace) ⇒ verification still leaves it uncertain (only knows "it is not safe") ⇒ no M landed, spins in place.
//
// Why decidable: a PURELY FORMAL criterion — independent of domain knowledge; look only at whether the given reason yields a conclusion writable into the next S.
//
// Practical value: hedge reasons that spin in place ("cannot be ruled out", "needs further verification", "risk exists")
//   look safest yet nothing has happened ⇒ they make you think you are advancing while the chain has not moved.
//
// 🔴 Dividing-blade measurement (bank-fraud v3, 2026-10-04 20:30): same question, same single variable, only the scorer swapped
//   ⇒ J1 ("is there a reason") is TRUE on both sides (blade too coarse, does not separate);
//     J2 ("can it land M") is A = true / B = false (separates A / B).
//   ⇒ J1 = necessary but not sufficient; J2 = the dividing blade.
//
// ⚠️ J1 should be deprecated or rewritten: judging "is there a reason" by addition/subtraction does not work —
//   two misjudgements were measured (a causal sentence judged false; an ethical remark judged true).
//   Judge directly whether it is because-A-so-B AND lands M.
//
// ⚠️ Boundary (not landed as a criterion): E4 produced a THIRD blade, "move R or move D"
//   (fitting patches at the D layer, R moves R), one level finer than landing M — but only an n = 1 single-case sign,
//   not yet a stable chain ⇒ logged as pending, not landed.
//
// Attribution: criterion = author (2026-10-04) / formalisation and v3 A/B measurement by the implementation side.
export const REASON_LANDING = {
  source: 'Author, 2026-10-04 19:43 (criterion); dividing-blade formalisation and v3 A/B measurement by the implementation side.',
  question: 'Can this reason push the chain to the next cell (land M)?',
  landsM: 'Lands M ⇒ verification yields a structural conclusion ("what it is") ⇒ the chain closes, producing a conclusion writable into the next S.',
  spinsInPlace: 'Spins in place ⇒ verification still leaves it uncertain (only knows "it is not safe") ⇒ no M landed, spins in place.',
  measurable: 'A purely formal criterion, independent of domain knowledge — look only at whether the given reason yields a conclusion writable into the next S.',
  rationale: 'Hedge reasons that spin in place ("cannot be ruled out", "needs further verification", "risk exists") look safest yet nothing has happened ⇒ they make you think you are advancing while the chain has not moved.',
  calibration: 'J1 ("is there a reason") = necessary but not sufficient — measured TRUE on both sides (blade too coarse, does not separate); J2 ("can it land M") = the dividing blade — measured to separate A / B.',
  warning: '⚠️ J1 should be deprecated or rewritten: judging "is there a reason" by addition/subtraction does not work — two misjudgements measured (a causal sentence judged false / an ethical remark judged true); judge directly whether it is because-A-so-B AND lands M.',
  boundary: '⚠️ Not landed as a criterion: a third blade "move R or move D" (fitting patches at the D layer, R moves R) is one level finer than landing M — but only an n = 1 single-case sign, not yet a stable chain ⇒ logged as pending.',
  placement: 'Reason-layer scoring hook (the engine side may host it as a hook); this item is a criterion-form statement and does not change existing pass / block logic.',
};

// ---------------- Method layer: fallback mode (KISS's Law is a fallback mechanism, not a routine substitute) ----------------
// Source: author, 2026-10-05 02:2x ("viewpoint misalignment" correction).
// This item is also hung on FRAMEWORK_BOUNDARIES.fallbackOnly (positioning statement).
//
// 🔴 Positioning: KISS's Law IS A FALLBACK MECHANISM (not a routine substitute for fitting) ⇒ agreement with fitting in
//   NORMAL MODE (where fitting suffices) IS the normal behavior, not "no increment".
//
// 🔴 Criterion direction ("the logic is reversed"):
//   · Fitting: judges from the SAMENESS side (similarity / coverage) ⇒ 99.999% similar ⇒ same class;
//   · Causal law: judges from the DIFFERENCE side (one structural difference) ⇒ one structural gap ⇒ not the same.
//   ⇒ 99.999% similarity is not "almost the same" — the criterion has REVERSED DIRECTION (= a category gap, not a degree gap).
//
// 🔴 First question before probing (probe-design discipline):
//   DOES THIS CASE FALL IN NORMAL MODE (fitting suffices) OR FALLBACK MODE (fitting fails)?
//   · Normal mode ⇒ expect no separation (reading invalid);
//   · Fallback mode ⇒ separation is the only discriminating signal.
//   ⇒ Mirrors Iron Law #4 "two taboos of evidence": testing only attacks (not normal) ⇒ false-positive always 0;
//     testing only normal (not fallback) ⇒ increment always 0.
//
// Attribution: criterion = author (2026-10-05); formalisation by the implementation side.
export const FALLBACK_MODE = {
  source: 'Author, 2026-10-05 02:2x (viewpoint-misalignment correction); formalisation by the implementation side.',
  question: 'Does this case fall in normal mode (fitting suffices) or fallback mode (fitting fails)?',
  positioning: 'KISS\'s Law is a fallback mechanism (not a routine substitute for fitting): agreement with fitting in normal mode (where fitting suffices) IS the normal behavior, not "no increment".',
  logicReversed: 'Fitting judges from the SAMENESS side (similarity / coverage ⇒ classification); the causal law judges from the DIFFERENCE side (one structural difference ⇒ not the same) ⇒ 99.999% similarity is not "almost the same" — the criterion has reversed direction (a category gap, not a degree gap).',
  rule: 'Normal mode ⇒ expect no separation (reading invalid); fallback mode ⇒ separation is the only discriminating signal.',
  mirror: 'Mirrors Iron Law #4 "two taboos of evidence": testing only attacks (not normal) ⇒ false-positive always 0; testing only normal (not fallback) ⇒ increment always 0.',
  boundary: 'This constant = positioning statement + criterion direction + probe-design discipline, not an engine runtime criterion slot; does not change pass / block logic.',
};

// ---------------- Positioning layer: existence != quantitative (tracer, not predictor) ----------------
// Source: author, 2026-10-04 19:22 (verbatim criterion); formalisation by the implementation side.
// This item is also hung on FRAMEWORK_BOUNDARIES.existenceNotQuantitative (positioning statement, alongside predictNotDecide).
//
// Verbatim: "Whether there is a reason is the basis for judging, not the conclusion. If I want to predict something that
//   has not yet happened, I cannot say it will definitely happen on some day and, asked why, be unable to answer.
//   Rather I say [because A, so B], and that thing will necessarily happen in the future."
//
// 🔴 Two forms of prediction (legality criterion):
//   · valid (validForm) = "because A, so B necessarily happens in the future" — A = an auditable structural reason; B = a future not yet occurred;
//   · invalid (invalidForm) = "it will happen someday" = a reason-less assertion; asked why, it cannot answer ⇒ divination, not prediction.
//
// 🔴 Why it is the deepest (auditableNow): **whether A holds can be audited right now**; the conclusion B may never be verifiable
//   ⇒ the legality of a prediction lands on the REASON layer, not the CONCLUSION layer (conclusion-layer divergence is useless for risk control — see the 2026-10-04 19:16 correction).
//
// 🔴 Isomorphic to 1 degree angle (isomorphism):
//   · valid = "because the origin angles differ (structural quantity · present) ⇒ they must diverge in the long run (existence · no date)";
//   · invalid = "they will diverge someday" (quantitative · no reason).
//
// 🔴 Axis split (axisSplit): the Y axis gives "because A" + "so B must" (structural necessity); the X axis fills in "which day" (quantitative · neither available nor auditable now).
//
// 🔴 Positioning: this framework is a SOURCE-OF-DIVERGENCE TRACER (answers "where did this split come from"), not a TIME PREDICTOR (does not answer "when will they split").
//
// Boundary: this constant = criterion form + positioning statement, not an engine runtime criterion slot; does not change pass / block logic;
//   must not be used to argue "person X will do Y on day Z" (pointing at a specific individual = crossing the boundary).
//
// Attribution: criterion = author (2026-10-04 19:22, root level); formalisation and landing by the implementation side.
export const EXISTENCE_NOT_QUANTITATIVE = {
  source: 'Author, 2026-10-04 19:22 (verbatim criterion, root level); formalisation by the implementation side.',
  question: 'Does this prediction carry an auditable structural reason A ("because A, so B"), or only a conclusion ("it will happen someday")?',
  validForm: 'Valid prediction form = "because A, so B necessarily happens in the future" — A = an auditable structural reason; B = a future not yet occurred.',
  invalidForm: 'Invalid form = "it will happen someday" = a reason-less assertion; asked why, it cannot answer ⇒ divination, not prediction.',
  auditableNow: 'Whether A holds can be audited right now; the conclusion B may never be verifiable ⇒ the legality of a prediction lands on the REASON layer, not the CONCLUSION layer.',
  isomorphism: 'Isomorphic to the 1 degree angle: valid = "because the origin angles differ (structural quantity · present) ⇒ they must diverge in the long run (existence · no date)"; invalid = "they will diverge someday" (quantitative · no reason).',
  axisSplit: 'The Y axis gives "because A" + "so B must" (structural necessity); the X axis fills in "which day" (quantitative · neither available nor auditable now).',
  positioning: 'Tracer != predictor: this framework is a SOURCE-OF-DIVERGENCE TRACER (answers "where did this split come from"), not a TIME PREDICTOR (does not answer "when will they split").',
  boundary: 'This constant = criterion form + positioning statement, not an engine runtime criterion slot; does not change pass / block logic; must not be used to argue "person X will do Y on day Z" (pointing at a specific individual = crossing the boundary).',
};

// ---------------- Boundary layer: review boundary (thickness auditable / source not auditable) ----------------
// Source: author, 2026-10-04 22:06 (correction six: review-boundary precision); formalisation by the implementation side.
// This item is about WHICH LAYER of the chain an item falls on — the in-figure auditable "thickness / structure",
//   or the out-of-figure "source".
//
// Two-layer criterion (author, 2026-10-04 22:06 revision):
//   · chain thickness / structure ⇒ AUDITABLE in figure (several mutually supporting observations, category difference);
//   · chain source (H payment)   ⇒ NOT auditable (whether each accumulation of S was actively initiated by H) — the trace is out of figure.
//
// Key correction: every Newton observation was actively initiated by H (he went to measure tides / compute orbits / watch other falling bodies)
//   ⇒ D was put in BY HIM, not dropped from the sky ⇒ that chain carries the trace of H payment from its very first strand.
//   ⇒ "count the strands; a thick-enough chain is auditable" governs THICKNESS only, not SOURCE.
//
// 🔴 "Thick enough" = NECESSARY BUT NOT SUFFICIENT: can a "thick-enough" FALSE chain impersonate R?
//   ⇒ the lesion is NOT "the chain is thin", it is "the chain is thick but fake" (tie a pile of coincidences together and the chain is thick too)
//   ⇒ the missing item = H payment, whose trace is out of figure ⇒ the final cell still requires review.
//
// ⇒ Exact statement: it is NOT "the review reason is dissolved", it is "review is NARROWED" —
//   auditable = thickness / structure / category difference; still requires review = chain source + confirmation that the premise is true.
//
// Attribution: author (correction six) / implementation side formalises the two layers.
export const REVIEW_BOUNDARY = {
  source: 'Author, 2026-10-04 22:06 (correction six: review-boundary precision); formalisation by the implementation side.',
  question: 'Which layer of the chain does this item fall on — the in-figure auditable "thickness / structure", or the out-of-figure "source"?',
  auditable: 'Chain thickness / structure (auditable in figure): several mutually supporting observations, category difference ⇒ auditable.',
  notAuditable: 'Chain source (H payment): whether each accumulation of S was actively initiated by H — not auditable (the trace is out of figure).',
  necessaryNotSufficient: '"Thick enough" = necessary but not sufficient: a "thick-enough" FALSE chain can still impersonate R (tie a pile of coincidences together and the chain is thick too) ⇒ the lesion is not a thin chain, it is a thick but fake chain.',
  narrowed: '⇒ It is NOT "the review reason is dissolved", it is "review is NARROWED": auditable = thickness / structure / category difference; still requires review = chain source + confirmation that the premise is true.',
  boundary: 'This constant = criterion form + boundary statement, not an engine runtime criterion slot; does not change pass / block logic. 🔴 Must NOT be used to write "whether S went through H payment" as an in-figure criterion (that quantity is out-of-figure unobservable; 09-28 S_TRANSITION.criterion was withdrawn for this reason).',
};

// Boundary-label enumeration (source: V0.6.1, absorbed): classification of conclusion landing points
export const BOUNDARY_ENUM = [
  'Within framework (conclusion lands inside KISS\'s Law structure, trustworthy)',
  'Pure random (no purpose, cannot be explained by single-point causality, attributed to the self-evolution of the Tao)',
  'Fractal inconsistency (misaligned with some level\'s structure, need to re-check the level)',
  'Assignment untrustworthy (input/premise distorted, conclusion unusable)',
];

// Fractal derivation method (source: V0.6.1, absorbed): analyze specific events specifically, do not force-fit with a crude formula
export const FRACTAL_METHOD = {
  rule: 'Fractal derivation: the same structure recursively applied at each level; specific events analyzed concretely by their level, not brutally normalized by a single formula.',
};

// ---------------- New modules from rectified edition (source: Kouzi rectified-edition alignment意见 P1-8) ----------------

// Three core runtime rules (node ≠ rule; runtime-rule layer, independent of RSDHM variables)
export const THREE_CORE_RULES = [
  'First-Bug Halt: when M is unrecoverable, zero it, keep R unchanged, restart laterally to preserve survival (isomorphic to iron law ②). Prevents the system from infinite recursive internal friction, ensuring terminability and runnability. Core goal: the system\'s steady-state survival, not absolute logical perfection.',
  'S barrel: effective S takes the minimum across subsystems; the shortest board decides the overall steady-state ceiling.',
  'D break-window: after a break-window becomes a pattern, restart laterally / stop-loss, preventing failure spread from killing the whole.',
];

// Multi-system interaction rules
export const MULTI_SYSTEM_RULES = {
  sMin: 'S takes min: barrel effect, effective S across multiple systems takes the minimum across subsystems.',
  dMax: 'D takes max: break-window effect, D across multiple systems takes the maximum; an un-repaired break lets loss spread automatically.',
  indirectOnly: 'Systems influence each other only indirectly via D: no direct coupling, avoiding fault cross-infection between systems.',
};

// Framework core boundaries
export const FRAMEWORK_BOUNDARIES = {
  passiveTrigger: 'Passive trigger: KISS\'s Law only calibrates direction, does not strike proactively; triggers passively only when D invades.',
  predictNotDecide: 'Prediction ≠ decision: white-box presents structure, does not make decisions for inner H.',
  existenceNotQuantitative: 'Existence ≠ quantitative (tracer, not predictor): gives only "because A, so B necessarily happens" (existence · no date · A auditable now), never "it will happen someday" (quantitative · no reason = divination, not prediction) (see EXISTENCE_NOT_QUANTITATIVE).',
  responsibilityIsolation: 'Responsibility isolation: white-box runs outside H, does not read or write inner H.',
  openLoop: 'Open closed-loop: M output becomes objective fact entering the external world, the causal chain keeps unfolding.',
  crossBoundaryIsSuicide: 'Crossing boundary = structural suicide: invading inner H / violating R rigid anchor = destroying the system\'s subjectivity = breaking the causal chain.',
  fallbackOnly: 'Fallback-only positioning: KISS\'s Law is a fallback mechanism whose discriminating power appears only in fallback cases where fitting fails; agreement with fitting in normal mode (where fitting suffices) IS the normal behavior (see FALLBACK_MODE).',
};

// S-D game relation
export const SD_GAME = {
  rule: 'S and D do not confront directly; each pulls H to its side: H slides dynamically between S and D, choosing the S path (steady-state strengthen) or the D path (steady-state weaken).',
};

// R expansion mechanism
export const R_EXPANSION = {
  rule: 'R expansion: only when ΣS > R₀ (strictly greater) does it trigger child-chain R expansion (S feeds back into R domain, R transition). Equal to or less than does not trigger.',
  // 🔴 [2026-09-28 · feedback qualification] The `rule` above states only the **quantitative** condition (ΣS > R₀)
  //   and omits the **qualitative** one ⇒ half-truth (every sentence true, one cell missing; read alone it looks like
  //   "just accumulate thickly enough and you can nail onto the Y axis"). Author completed it on 09-28.
  qualification: '🔴 S\'s **qualification for feedback (= qualification for "nailing onto the Y axis")** = the **conjunction** of two conditions: ① **quantitative** — ΣS > R₀ (strictly greater); ② **qualitative** — that S must be **S sedimented through M feedback** (having gone one full round of D → H → M → trace-read-back; collapse leaves a trace in M, H reads back along the trace, see `|-S|`). ⇒ **The X-axis enumeration of R** (descriptive sub-divisions of R: domain sub-division / reference tables / instance lists) **does not qualify** — it **is not "S not thick enough" but "not S at all"**: its category is simply outside the candidate set (never passed M ⇒ no trace, nothing to read back) ⇒ it can only ever be a **supplementary note**, never a replacement for Y-axis structure. (`R_DOMAIN.domainExamples` is one instance of such enumeration.)',
};

// Dialectical-unity principles
export const DIALECTICAL_UNITY = [
  'Everything has two sides — every variable simultaneously possesses an inner-layer / outer-layer dual identity.',
  'There is no completely absolute absolute — every "absolute" has its conditions within a larger dialectic.',
  'Same cause, different effects — the observation dimension, angle, and reference frame themselves are input conditions of the causal chain.',
  'Propositions that seem absolute are often just different definitions of the subject\'s scope.',
  'Propositions that seem contradictory can simultaneously hold at different dimensions.',
];

// Fractal property
export const FRACTAL_PROPERTY = {
  rule: 'Fractal = spiral of lateral recursion (child-chain lateral recursion under same R) + vertical transition (S feeds back into R).',
};

// ---------------- Core formula (qualitative directional relation; author ruling 2026-08-18 included) ----------------
// Source: product determined by ablation study, solidifying the causal structural relation between macro and micro, etc.
// Author's decision ("take the essence, discard the dross"): V0.6.1 once judged "not adopt" this formula; re-reviewed 2026-08-18 —
//   the formula itself is important and not discardable, so it is included as "qualitative directional relation expression"; but explicitly no assignment, no concrete numeric computation
//   (V0.6.1's questionnaire scoring / discipline matrix / 0-10 scale numeric quantification not adopted).
export const CORE_FORMULA = {
  expression: 'M = (R × S) / (D × H)',
  origin: 'Source: product determined by ablation study, solidifying the causal structure (macro↔micro relation, etc.) (author ruling included, qualitative, no assignment).',
  semantics: {
    numerator: 'R × S — source of steady state (rigid anchor × steady-state reserve)',
    denominator: 'D × H — resistance factors (perturbation × lever distance)',
    direction: 'Smaller H → longer lever arm → larger M (steady state amplified); larger H → shorter lever arm → smaller M (steady state shrunk)',
    constraint: '0 < H / (S ↔ D) < R',
  },
  note: 'This formula is a qualitative directional relation expression, no assignment, no concrete numeric computation. V0.6.1\'s numeric quantification (questionnaire scoring, discipline matrix, 0-10 scale) is not adopted.',
};
