# KISS's Law Universal Causal Engine (White-Box Presentation) · DSH Plugin · Architecture Design

> Status: design doc + **engine unit tests passing (18/18)**. DSH adapter layer calibrated against v0.1.0-rc.6 source-level API.  
> Source: author's revelation (Xia Qi / Shaky77). Framework-native strictly, not softened, not altered.

---

## 0. Goal & Boundary

**KISS's Law universal causal engine (white-box presentation)** —— the original positioning of the framework body is to engineer "causal-law runtime structure" into a **universal causal engine**; **white-box presentation** is its stance (white-box no-tampering / inner-H inviolability = Keep Integrity). This repo implements it as a **Cordis plugin of DeepSeek Harness (DSH)**.

### Framework definition: Keep Integrity & Steady State (KISS)

- **Keep Integrity** = guarding wholeness / truth (white-box no-tampering / inner-H inviolability, corresponds to Integrity)
- **Steady State** = S and "keep the system alive" (first principle, corresponds to Steady State)
- "**Law**" is a name suffix of the framework, **not** the third part of the definition

> ⚠️ **KISS here means "Keep Integrity & Steady State" — NOT the popular engineering acronym "Keep It Simple, Stupid".** The two are entirely different in meaning; do not conflate them. Full name: **KISS's Law (Keep Integrity & Steady State's Law)**.

Chinese counterpart: [`Shaky77/weiwen-law-dsh`](https://github.com/Shaky77/weiwen-law-dsh) —— **Chinese and English editions are consistent in content and mutually referential**. The Chinese edition uses **守真·稳态** (Keep Integrity & Steady State), corresponding to this edition's KISS.

### Two capabilities after mounting to DSH (parallel, not primary/secondary)

1. **White-box presentation (stance · this is KISS's Law's own body)** —— expose S steady-state ledger, H inner/outer boundary, R anchors, conduction chain as queryable tools, for the model to self-check and the user to audit. This is what KISS's Law natively presents on DSH.
2. **Rigid guard (derived application · endogenous property)** —— before each action do R check / D stop-loss / H boundary / M halt, not relying on model self-awareness. This is an **endogenous property evolved by the DSH adapter layer** to fit the agent-runtime scenario, **not** KISS's Law's original positioning.

> Note: the repo README's first-line slogan is "universal causal engine (white-box presentation)" — consistent with the mapping table / 6.1 backtracking below. The rigid guard is only the DSH adapter layer's endogenous application; do not confuse it with the body's stance.

Framework-native (RSDHM native definition / three iron laws / conduction chain) strictly; variables not pre-assigned numeric values; author-revealed items tagged "Source: author's revelation".

---

## 1. Why DSH (adaptability analysis)

| DSH feature | Fit with KISS's Law |
| --- | --- |
| **Reversible registration** (plugin uninstall auto-reverts all services/events/side-effects, no residue) | Naturally corresponds to "sever to preserve continuity" — the faulty component is cut, the overall causal chain unaffected |
| **Typed events + replaceable agent loop** | Can hang guard hooks at the agent main-loop layer, not a post-hoc patch; even the loop itself is a swappable plugin |
| **append-only trail log** (prompt/chain-of-thought/tool-call/context-injection all recorded, replayable) | Native carrier is white-box auditable, isomorphic with "white-box does not invade inner H" |
| **Model-agnostic** (model is a plugin, swappable) | KISS's Law applies equally to AI/AGI/ASI; framework logic not bound to any model |

---

## 2. Mapping table (KISS's Law node → DSH real carrier)

> Hook names calibrated against DSH source (v0.1.0-rc.6), not inferred.

| KISS's Law node | DSH real carrier | Implementation |
| --- | --- | --- |
| **R rigid anchor** | `tools/pre-execute` (waterfall) | Touching rigid anchor → return `{ kind:'deny', reason }` to block |
| **D break-window stop-loss** | `tools/pre-execute` + break-window counter | Consecutive out-of-bounds/failures reach threshold → escalate to deny, prevent spread |
| **S steady-state reserve** | Engine-internal append-only ledger | Only grows, never decreases; `+s` positive / `\|‑s\|` trauma / barrel takes shortest board |
| **H inner-H inviolability** | `tools/pre-execute` + `agent/pre-step` | Hitting subjective black-box → deny / reject |
| **M First-Bug Halt** | `tools/pre-execute` returns deny | Detect unrecoverable paradox → sever this node (sever to preserve continuity) |
| **Fractal** | Sub-agent / sub-task recursive mount | Same bundle instantiated in sub-context |
| **White-box audit** | DSH native trail log + `tools/result` | Reuse append-only session log; `tools/result` observe only, do not rewrite |

---

## 3. Directory structure

```
dsh-kiss-law-plugin/
├── package.json          # declares dsh field (bundle points to patch)
├── kiss-law.patch.yml    # plugin mount patch
├── src/
│   ├── index.js          # DSH plugin entry: apply(ctx) hangs real hooks + self-check tools
│   └── core/
│       ├── law.mjs        # framework definition layer (RSDHM / iron laws / conduction chain / V0.6.1 essence) —— framework-native
│       └── engine.mjs    # guard engine (pure logic, zero DSH dependency, independently unit-testable)
├── test/
│   ├── engine.test.mjs   # node --test scenarios (16 assertions, all passing)
│   ├── cases.test.mjs    # real-world case tests
│   └── alignment.test.mjs # alignment regression (locks 2026-08-20 author alignments)
├── examples/             # post-alignment API live-test scripts
├── DESIGN.md             # this document
└── README.md
```

**Key architecture decision**: all guard logic sinks into `engine.mjs` (pure JavaScript, no DSH import). `index.js` is only a thin wrapper hooking the engine onto DSH hooks. Thus:

- Accuracy/stability verifiable by `node --test` **deterministic unit tests**, no DSH dependency, no Key burned;
- When the DSH adapter adjusts due to RC breaking changes, the engine logic needs zero changes.

---

## 4. Plugin lifecycle & M halt

Cordis plugins register resources via event subscription inside `apply(ctx)`. On uninstall or runtime-context destruction, subscriptions are reverted — **no orphan state, no residue**. This is isomorphic with "First-Bug Halt (sever to preserve continuity)": when a node is `deny`-cut, the overall causal chain (other plugins, agent loop) is unaffected and keeps running.

---

## 5. Hooks & tools design (see `src/index.js`, calibrated against real API)

```ts
// Pre-tool-call gate (waterfall) —— R/D/S/H/M total adjudication
ctx.on('tools/pre-execute', async (exec, next) => {
  const decision = engine.decideToolCall({ name: exec?.name, args: exec?.args,
                                           command: exec?.args?.command, code: exec?.args?.code });
  if (decision.kind === 'deny') return { kind: 'deny', reason: `[KISS's Law·${decision.law}] ${decision.reason}` };
  return next();
});

// Pre-step gate (waterfall) —— message-level H boundary
ctx.on('agent/pre-step', (event, next) => {
  const decision = engine.decidePreStep(event?.messages);
  if (decision.kind === 'reject') return { kind: 'reject' }; // PreStepDecision only {kind:'reject'}, no reason field
  next();
});

// White-box audit (observe only, do not rewrite)
ctx.on('tools/result', (res) => { if (res?.error) engine.onFailure(); });
```

Self-check tools: `query_steady_state` / `list_rigid_anchors` / `query_conduction_chain` / `query_boundary` / `query_iron_laws`. Finalized iron laws in law.mjs's THREE_IRON_LAWS (immutable); R-domain nesting hierarchy in R_DOMAIN (Cosmic⊃Earth⊃Macro⊃Micro).

---

## 6. Absorbed V0.6.1 (Kouzi registration soft-IP edition) essence

Non-conflicting quantitative-layer design merged into law.mjs's `S_REFINEMENT` / `FEEDBACK_LOOP` / `CALIBRATION` / `BOUNDARY_ENUM` / `FRACTAL_METHOD`:

- S's `+s positive` / `\|‑s\| trauma` / barrel takes shortest board refinement;
- S/D→H→M→write-back S/D feedback closed loop;
- Logic backtracking (trace along R containment hierarchy layer by layer: sub-rule layer → Micro → Macro → Earth → Cosmic; runs **separately and in parallel** with First-Bug Halt: the halt severs the chain to preserve survival, backtracking traces to attribute the cause);
- Boundary-label enumeration (within framework / pure random / fractal inconsistency / assignment untrustworthy);
- Fractal derivation method (analyze specific events specifically, do not force-fit with a crude formula).

### 6.1 Logic backtracking vs First-Bug Halt (separate & parallel · author's revelation 2026-08-20)

The two mechanisms in the setting are **independent and parallel, not merged** — a previous upgrade once wrongly hooked them together (CALIBRATION written as "first vulnerability halts" with `isomorphicWith` equivalent tag), now corrected:

| Mechanism | Role | Trigger |
| --- | --- | --- |
| First-Bug Halt | Manages "severance": cut the faulty component, sever to preserve continuity | Any component unrecoverable / logical paradox, immediately sever chain to preserve survival |
| Logic backtracking | Manages "tracing": trace backward, attribute root cause, serve repair | The moment of halting is the moment backtracking starts — without backtracking you only sever without repairing; without the halt you only repair without preserving |

**Backtracking traces along the R containment hierarchy**: from the concrete sub-rule layer where the symptom sits, re-check level by level toward the more fundamental containing level — `sub-rule layer → Micro → Macro → Earth → Cosmic`; within each level there are various sub-divided objective rules, fractally nested, isomorphically recursive (four levels are representative, not exhaustive). The outermost level is the ultimate arbiter.
**Do not confuse the two axes**: backtracking goes along the **scale-containment axis** (Cosmic⊃Earth⊃Macro⊃Micro); `parent-chain R / child-chain R` is the **time-evolution axis** (S feeds back into R domain letting child-chain R evolve, R transition) — they are two different things.

**The R objective-rule layer can always discriminate true from false**: objective rules cannot be replaced by claims; any claimed objective result is re-verifiable ("delete succeeded" ⇒ re-verify the file should not exist), claim vs re-verification disagreement means premise distorted, falling into BOUNDARY_ENUM's "assignment untrustworthy". Hence the framework can always discriminate whether the ground beneath is false or real.
Finalized in law.mjs's `CALIBRATION` (rule / parallelWith / rLayerVerification) and `R_DOMAIN.fractalSubdivision`.
**Empirical**: in the API re-run, DeepSeek after calling `query_logic_backtracking` independently backtracked the hierarchy path and "stuck point lands on the innermost sub-rule layer (re-verify judges premise distorted)", consistent with this section (see `examples/`).

**Not adopted**: V0.6.1's `M=(S×R)/(D×H)` quantitative formula and questionnaire/discipline-matrix numbers — conflict with white-box structural semantics; force-fitting would be awkward.

---

## 7. RC adaptation notes (risks)

1. **API may still change**: DSH is a v0.1 RC preview; official notes future breaking API changes. This plugin's hook names (`tools/pre-execute` / `agent/pre-step` / `tools/result`) are calibrated against rc.6 source; if `exec`/`event` object fields differ from official `docs/`, only the `index.js` adapter layer is affected, engine logic is not.
2. **API Key required**: running model inference on real device needs your own DeepSeek API Key (headless via `$DSH_HOME/.credentials.yaml` or env var). This repo contains no keys.
3. **Creation-mode risk**: Creation mode has high privileges (equivalent to Shell); do not use it to execute model-generated code scenarios, to prevent privilege escalation.
4. **Node version**: DSH requires Node ≥ 22.19 or ≥ 24; this machine's managed Node 22.22.2 satisfies.

---

## 8. Usage flow (illustrative)

```bash
# Real-device joint debug (install DSH and configure Key first)
npx @deepseek-ai/dsh web                 # or dsh --profile headless "prompt"
# Settings → Models fill DeepSeek API Key
# Mount kiss-law.patch.yml (profile: standard)
# New session run task → model can call query_* tools to self-check S / H / R
```

---

## 9. Plugin positioning & generalization reserve

Currently produced as the **technical-implementation edition** (developer-facing, engineering language), fitting the repo's developer orientation. Comments and docs avoid locking the framework into "AI tool manual" wording. If copyright is registered later, the engineering context can be stripped to produce a **general-public edition**, with core logic (`engine.mjs` / `law.mjs`) unchanged.

---

## 10. Next steps

- [x] Engine unit tests (16/16 passing) —— accuracy deterministically verified.
- [x] Install DSH locally + mount plugin on real device + run headless scenarios with Key (verify wiring and real stability).
- [x] Calibrate `exec`/`event` fields against DSH RC iterations (engine unaffected).
- [x] **Rigid-anchor rules and three iron laws finalized** (author-set, immutable) → iron laws in law.mjs's THREE_IRON_LAWS (with "causal law accompanies every system" supplement); R-domain nesting hierarchy in R_DOMAIN (Cosmic⊃Earth⊃Macro⊃Micro). The `rigidAnchors` example set remains concrete violation criteria, author may supplement by R level.

---

## 11. Contact

Framework inquiries / collaboration / audit liaison: 563003@qq.com
