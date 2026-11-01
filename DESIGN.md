# KISS's Law Universal Causal Engine (White-Box Presentation) · DSH Plugin · Architecture Design

> Status: design doc + **engine unit tests passing**. DSH adapter layer calibrated against v0.1.0-rc.6 source-level API.  
> Source: author's revelation (Xia Qi / Shaky77). Framework-native strictly, not softened, not altered.

---

## 0. Goal & Boundary

**KISS's Law universal causal engine (white-box presentation)** —— the original positioning of the framework body is to engineer "causal-law runtime structure" into a **universal causal engine**; **white-box presentation** is its stance (white-box no-tampering / inner-H inviolability = Keep Integrity). This repo implements it as a **Cordis plugin of DeepSeek Harness (DSH)**.

### Framework definition: Keep Integrity & Steady State (KISS)

- **Keep Integrity** = guarding wholeness / truth (white-box no-tampering / inner-H inviolability, corresponds to Integrity)
- **Steady State** = keep the system alive (first principle)
- "**Law**" is a name suffix of the framework, **not** the third part of the definition

> ⚠️ **KISS here means "Keep Integrity & Steady State" — NOT the popular engineering acronym "Keep It Simple, Stupid".** The two are entirely different in meaning; do not conflate them. Full name: **KISS's Law (Keep Integrity & Steady State's Law)**.

Chinese counterpart: [`Shaky77/weiwen-law-dsh`](https://github.com/Shaky77/weiwen-law-dsh) —— **Chinese and English editions are consistent in content and mutually referential**. The Chinese edition uses **守真·稳态** (Keep Integrity & Steady State), corresponding to this edition's KISS.

### Two capabilities after mounting to DSH (parallel, not primary/secondary)

1. **White-box presentation (stance · this is KISS's Law's own body)** —— expose the steady-state ledger, H inner/outer boundary, rigid anchors, causal logic chain as queryable tools, for the model to self-check and the user to audit. This is what KISS's Law natively presents on DSH.
2. **Rigid guard (structural endogenous · necessary property)** —— before each action do rigid-anchor check / stop-loss / H boundary / halt, not relying on model self-awareness. This is a **necessary endogenous property of KISS's Law's structure** (derived structurally; Keep Integrity requires severing to preserve continuity); the **DSH adapter layer only provides its hook carrier, not its source**; KISS's Law's original positioning already contains this risk control.

> Note: the repo README's first-line slogan is "universal causal engine (white-box presentation)" — consistent with the mapping table / 6.1 backtracking below. The rigid guard is a necessary endogenous property of KISS's Law's structure (derived from the deduction formula); the DSH adapter layer only provides its hook carrier. Do not confuse it with the body's stance.

Framework-native (three iron laws / causal logic chain) strictly; variables not pre-assigned numeric values; author-revealed items tagged "Source: author's revelation".

---

## 0.1 Layering: Mind-Map (Heart Method) vs. DSH (Dimension-Reduced Layer)

KISS's Law exists in two forms; they are a **source-and-projection** relationship and must not be conflated:

- **Mind-Map (Heart Method) = base edition (frozen)**: every variable is injected by the caller, with zero domain instances in the entire file. It is the white-box presentation body of the "causal-law runtime structure" — not a single number is preset, which is exactly why it qualifies as a "universal causal" framework.
- **DSH (martial-art manual) = this repo (live system)**: a **dimension-reduced projection** of the mind-map. The engineering layer cannot run without dimension reduction, so continuous quantities are discretized into three states, judgment criteria are pre-filled (currently IT instances), and hook carriers are added. Dimension reduction is a necessary cost, not a framework gap.

**The cost of dimension reduction (author's closing note, 2026-09-02)**: KISS's Law is built for the **digital world** — precise and explicit, so it can be executed. Its fault tolerance is necessarily **lower** than that of the real-world causal law, and this is exactly the cost after dimension reduction. The mind-map layer has no fixed moves precisely because it is everything; the pre-filled criteria in the DSH layer is merely one current instance.

**Iron laws do not degrade with dimension reduction**: dimension reduction may lose expressive power (continuous → three-state, injection → pre-filled criteria), but the **default direction must not be lost** (cannot judge → review, do not guess). Whenever judging "somewhere is not universal", first distinguish whether it is the cost of dimension reduction or a framework gap; do not conflate them.

**Differences in user understanding are the user's own decision**: how the layers are understood is the reader's freedom; the framework only provides a precise and explicit structure, and does not explain on behalf of the reader.

---

## 1. Why DSH (adaptability analysis)

| DSH feature | Fit with KISS's Law |
| --- | --- |
| **Reversible registration** (plugin uninstall auto-reverts all services/events/side-effects, no residue) | Naturally corresponds to "sever to preserve continuity" — the faulty component is cut, the overall causal chain unaffected |
| **Typed events + replaceable agent loop** | Can hang guard hooks at the agent main-loop layer, not a post-hoc patch; even the loop itself is a swappable plugin |
| **append-only trail log** (prompt/chain-of-thought/tool-call/context-injection all recorded, replayable) | Native carrier is white-box auditable, isomorphic with "white-box does not invade inner H" |
| **Model-agnostic** (model is a plugin, swappable) | KISS's Law applies equally to AI/AGI/ASI; framework logic not bound to any model |

---

## 2. Mapping table (capability → DSH real carrier)

> Hook names calibrated against DSH source (v0.1.0-rc.6), not inferred.

| KISS's Law node | DSH real carrier | Implementation |
| --- | --- | --- |
| **Rigid anchor** | `tools/pre-execute` (waterfall) | Touching rigid anchor → return `{ kind:'deny', reason }` to block |
| **Break-window stop-loss** | `tools/pre-execute` + break-window counter | Consecutive out-of-bounds/failures reach threshold → escalate to deny, prevent spread |
| **Steady-state reserve** | Engine-internal append-only ledger | Only grows, never decreases; positive marks / trauma marks / barrel takes the shortest board |
| **H inner-H inviolability** | `tools/pre-execute` + `agent/pre-step` | **Attribution unclear / lands on inner H ⇒ `review`** (hand back to the sovereign); **attribution lands on outer H with conclusive evidence ⇒ `deny`**; step level ⇒ `reject`. **Not "hit the black-box ⇒ deny"** — H is outside the coordinate chart (see the chart-position field of H in `law.mjs`); when attribution cannot be decided, the only lawful exit is hand-back, not convicting the subject on its behalf |
| **First-Bug Halt** | `tools/pre-execute` returns deny | Detect unrecoverable paradox → sever this node (sever to preserve continuity) |
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
│       ├── law.mjs        # framework definition layer (iron laws / causal logic chain / V0.6.1 essence) —— framework-native
│       └── engine.mjs    # guard engine (pure logic, zero DSH dependency, independently unit-testable)
├── test/
│   ├── engine.test.mjs   # node --test scenarios (22 scenarios, all passing)
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

## 4. Plugin lifecycle & halt

Cordis plugins register resources via event subscription inside `apply(ctx)`. On uninstall or runtime-context destruction, subscriptions are reverted — **no orphan state, no residue**. This is isomorphic with "First-Bug Halt (sever to preserve continuity)": when a node is `deny`-cut, the overall causal chain (other plugins, agent loop) is unaffected and keeps running.

---

## 5. Hooks & tools design (see `src/index.js`, calibrated against real API)

```ts
// Pre-tool-call gate (waterfall) —— causal-chain adjudication
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

// Receipt gate (waterfall) —— break-window stop-loss lands on the receipt.
// It is the last adjudication point: once the broken window is in force every later call is refused at
// pre-execute and never reaches a receipt, so this failure is the only one the receipt side can speak on.
// Fail-open: adjudication applies only to receipts that already failed; a successful result passes untouched.
ctx.on('tools/post-execute', async (exec, result, next) => {
  if (result?.isError && engine.breakAtReceipt()) {
    return { kind: 'block', feedback: [/* corrective: halt → reverse → trace → fix */] };
  }
  return next();
});

// White-box audit (emit; observe only, do not rewrite — the result is already frozen)
// Contract is (exec, result): the FIRST parameter is the execution, the result is the SECOND.
ctx.on('tools/result', (exec, result) => { if (result?.error) engine.onFailure(); });
```

Self-check tools: `query_steady_state` / `list_rigid_anchors` / `query_causal_chain` / `query_boundary` / `query_iron_laws`. Finalized iron laws in law.mjs's THREE_IRON_LAWS (immutable).

---

## 6. Backtracking & halt (separate & parallel)

The two mechanisms are **independent and parallel, not merged** — a previous upgrade once wrongly hooked them together, now corrected: halting manages "severance" (cut the faulty component, sever to preserve continuity); backtracking manages "tracing" (trace backward, attribute root cause, serve repair).

| Mechanism | Role | Trigger |
| --- | --- | --- |
| First-Bug Halt | "Severance": cut the faulty component, sever to preserve continuity | Any component unrecoverable / logical paradox, immediately sever the chain to preserve survival |
| Logic backtracking | "Tracing": trace backward, attribute root cause, serve repair | The moment of halting is the moment backtracking starts — without backtracking you only sever without repairing; without the halt you only repair without preserving |

Backtracking re-checks level by level from the layer where the symptom sits toward the more fundamental containing level; the outermost level is the ultimate arbiter. Within each level there are various sub-divided objective rules, fractally nested, isomorphically recursive.

**Closing the loop**: backtracking must not stop at "tracing". `src/core/bugstop.mjs` implements the First-Bug-Halt closed-loop state machine — BUG → halt → backtrack → attribute → repair (verify) → re-enter; `canReenter` refuses re-entry before repair, structurally blocking "backtrack without repairing ⇒ infinite recursion". Isomorphic to iron law ②: severance is the means, "keeping the system alive" (loop closed at re-entry) is the purpose.


---

## 7. RC adaptation notes (risks)

1. **API may still change**: DSH is a v0.1 RC preview; official notes future breaking API changes. This plugin's hook names (`tools/pre-execute` / `agent/pre-step` / `tools/post-execute` / `tools/result`) are calibrated against rc.6 source; if `exec`/`event` object fields differ from official `docs/`, only the `index.js` adapter layer is affected, engine logic is not.
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
# New session run task → model can call query_* tools to self-check constraints and boundaries
```

---

## 9. Plugin positioning & generalization reserve

Currently produced as the **technical-implementation edition** (developer-facing, engineering language), fitting the repo's developer orientation. Comments and docs avoid locking the framework into "AI tool manual" wording. If copyright is registered later, the engineering context can be stripped to produce a **general-public edition**, with core logic (`engine.mjs` / `law.mjs`) unchanged.

---

## 10. Next steps

- [x] Engine unit tests (22/22 passing) —— accuracy deterministically verified.
- [x] Install DSH locally + mount plugin on real device + run headless scenarios with Key (verify wiring and real stability).
- [x] Calibrate `exec`/`event` fields against DSH RC iterations (engine unaffected).
- [x] **Rigid-anchor rules and three iron laws finalized** (author-set, immutable) → iron laws in law.mjs's THREE_IRON_LAWS (with "causal law accompanies every system" supplement). The `rigidAnchors` example set remains concrete violation criteria, author may supplement by containment level.

---

## 11. Contact

Framework inquiries / collaboration / audit liaison: 563003@qq.com
