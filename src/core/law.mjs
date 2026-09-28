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
  },
  S: {
    key: 'S',
    name: 'Steady-state capacity / steady-state reserve',
    desc: 'The accumulated amount of system steady state. S has a dual nature (author ruling 2026-08-18, reconciling two one-sided views): ① Time dimension — everything that has happened cannot be changed or removed, only settles as history; historical scars are irreversible (cannot be dissolved). ② Current-value dimension can rise or fall under positive/negative influence — positive influence takes the S path S→S+1 (strengthen), negative influence takes the D path S→S-1 (weaken; current value drops, but the eroding event itself as a historical scar is recorded permanently at absolute value, not dissolved by algebraic sign). "+1"/"-1" denote one independent discrete event (occurrence of one positive/negative influence), not concrete numeric data; each event is recorded permanently as a scar (see S_REFINEMENT.notation). Short-board effect: for multiple systems S takes min (barrel effect), deciding the overall steady-state ceiling. 🔴 **S has "two states"** (S1 not-internalised / empty load · S2 internalised / full load), **two states of the same S, not two variables**; the transition mechanism, energy-conservation constraint and criterion are in `S_TRANSITION` — **entry set by R (unconditional) · payload set by H (pays the cost ⇒ S2)**.',
    timeIrreversible: true,    // historical scars are irreversible (absorbs time attribute, only grows)
    currentFluctuates: true,   // current value can rise or fall: positive S+1 / negative |S-1|
    fluctuationAsAbsolute: true, // negative erosion takes absolute value |S-1|, history not dissolved by algebraic sign
  },
  D: {
    key: 'D',
    name: 'Perturbation / vulnerability',
    desc: 'The perturbation input entering the system boundary, also the external manifestation of the system\'s inherent vulnerability. D is the trigger signal of the causal chain — KISS\'s Law does not strike proactively, only triggers passively when D invades. Break-window effect: for multiple systems D takes max; an un-repaired break-window lets loss spread automatically. 🔴 **One of D\'s roles: test** — when D triggers it simultaneously **tests** whether the S it strikes can reach the next state (not-internalised S1 → internalised S2, see `S_TRANSITION`). ⚠️ **Proper self first**: D\'s **proper self** remains "perturbation input"; "test" is a **role**, not the proper self (do not repeat "means masquerading as proper self").',
    passive: true, // D is an input node, passively triggered; break-window stop-loss is the response rule to D (see THREE_CORE_RULES), not D itself
  },
  H: {
    key: 'H',
    name: 'Lever / subjective agency',
    desc: 'The dynamic slider between S and D. The smaller H (closer to S_min), the longer the lever arm, the greater steady state from the same input; the larger H (closer to D_max), the shorter the lever arm, the smaller steady state. H has a dual identity that must be strictly split:',
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
  },
  M: {
    key: 'M',
    name: 'Steady-state result',
    desc: 'The output of causal conduction. M has a dual identity: the fruit of the previous round of conduction = the cause of the next round of causal chain. After M₁ outputs, it becomes objective fact entering the external world, becoming the signal environment of the next round D₂, and the causal chain keeps unfolding (M₁→D₂→M₂→D₃→…). M changes the information conditions of inner H, but does not determine inner H\'s choice.',
    dualRole: true, // both fruit of this round and cause of next round
    // Note: First-Bug Halt is the response iron-law when M is unrecoverable (see THREE_IRON_LAWS ② / THREE_CORE_RULES), not M's own definition.
  },
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

// ════════════════════════════════════════════════════════════════════
// S two-state transition (source: author's illustration, 2026-09-28 — "An-An goes to school")
//   Lesion: previously S had only "ledger attributes" (positive/negative, trauma, anchor, barrel)
//     and a "time dimension" (coalesce / silent standby) — there was **no "state" dimension**
//     ⇒ reading S yields just a number, with no way to read that the same number has
//     a not-internalised / internalised two-state.
//   Two states (**two states of the SAME S, not two variables**):
//     S1 = not-internalised state (**empty load**): already on the ledger, but its content may come
//          from R (hence "belongs to R"), not yet paid for by H's energy;
//     S2 = internalised state (**full load**, carrying exclusion information): obtained via the
//          transition after H pays the cost.
//   ⇒ This module IS the ontological landing of the iron law "S is a running ledger:
//     entry set by R, payload set by H".
//   ⇒ Attribution ≠ internalisation: S1's content source may be R ("belongs to R"),
//     but **belonging to R ≠ already internalised by H**.
// ════════════════════════════════════════════════════════════════════
export const S_TRANSITION = {
  twoStates: 'S has **two states** (**two states of the SAME S, not two variables**): **S1 = not-internalised state** (empty load) — already on the ledger, but not yet paid for by H\'s energy; its **content source** may be R (hence "belongs to R"), but **belonging to R ≠ already internalised by H**. **S2 = internalised state** (full load, carrying exclusion information) — obtained via the transition after H pays the cost. ⇒ **Entry is unconditional (set by R; S1 is already on the ledger) · payload is set by H (pays the cost ⇒ S2 / does not pay ⇒ stays S1)**.',
  mechanism: 'Transition path: **D (trigger · test) ⇒ energy flows ⇒ M (reading) ⇒ H decides whether to pay the cost ⇒ transition S1→S2 ／ stay at S1**. D triggering produces M; M changes the information conditions of inner H and **does not determine its choice** ⇒ **whether the transition happens depends on H**. (Author\'s example: the term exam D1 triggers ⇒ result M1 ⇒ whether An-An internalises via M1 and transitions to S2 depends on H; the rote-memoriser paid no energy ⇒ S1 remains S1.)',
  conservation: '**Energy-conservation constraint**: S1 and S2 are joined by an **energy transition**; energy is not created from nothing, it can only flow, and **H must pay** ⇒ this is the ground for "rote memorisation does not count" — **no energy input ⇒ no transition ⇒ S1 remains S1** (the same S, unchanged).',
  observable: '**The payment is completed inside inner H (not auditable)**: the outside cannot observe whether energy was paid; it can only observe **M** (behavioural change) ⇒ judging "has S transitioned" can only be inferred from **whether behaviour changes when a same-kind D recurs** (ties to the iron law "payload cannot be observed at bookkeeping time"). **The white-box engine takes no part in the transition** — it only blocks / allows / escalates; it never pays energy on H\'s behalf (never reads or writes inner H).',
  criterion: '🔴 **Criterion**: judging whether S has transitioned looks **neither at content source (whether it "belongs to R") nor at accumulated quantity — only at whether H has paid**. ⇒ **"Going through the motions" (having only the D→H→M formal process) ≠ transition** — the qualitative condition must land on "**H actually paid energy**", not "the process was completed". (The "qualitative condition" in `R_EXPANSION.qualification` refers to this item.)',
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
  responsibilityIsolation: 'Responsibility isolation: white-box runs outside H, does not read or write inner H.',
  openLoop: 'Open closed-loop: M output becomes objective fact entering the external world, the causal chain keeps unfolding.',
  crossBoundaryIsSuicide: 'Crossing boundary = structural suicide: invading inner H / violating R rigid anchor = destroying the system\'s subjectivity = breaking the causal chain.',
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
  qualification: '🔴 S\'s **qualification for feedback (= qualification for "nailing onto the Y axis")** = the **conjunction** of two conditions: ① **quantitative** — ΣS > R₀ (strictly greater); ② **qualitative** — that S must be **S sedimented through M feedback** (having gone one full round of D → H → M → trace-read-back; collapse leaves a trace in M, H reads back along the trace, see `|-S|`). ⇒ **The X-axis enumeration of R** (descriptive sub-divisions of R: domain sub-division / reference tables / instance lists) **does not qualify** — it **is not "S not thick enough" but "not S at all"**: its category is simply outside the candidate set (never passed M ⇒ no trace, nothing to read back) ⇒ it can only ever be a **supplementary note**, never a replacement for Y-axis structure. (`R_DOMAIN.domainExamples` is one instance of such enumeration.) ⚠️ **09-28 correction (half-truth patch #2)**: "sedimented through M feedback" **does not mean "having gone through the D→H→M process"** — H must **actually pay energy** and complete the S1 → S2 transition (**process ≠ substance**; a rote-memoriser went through the process without paying energy ⇒ no transition). ⇒ The criterion looks **neither at content source (whether it "belongs to R") nor at accumulated quantity, only at whether H paid**, see `S_TRANSITION`.',
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
