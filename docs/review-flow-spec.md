# Review-tier Six-Step Execution Spec (finalized 2026-09-02)

> This file is the **executable spec** of the iron law "cannot judge → REVIEW, do not guess".
> The iron law only says "hand back to the human"; this file specifies **what must be carried when handing back, and what must not be omitted**.

## 1. Spec text (author finalized 2026-09-02)

> When you cannot judge, label it and return it to the user for ruling — but that does NOT mean you may release it. **Better to block first, park the BUG, label it, return it to the user for ruling, and wait for the user's ruling before executing — never release directly.**
> After merely labeling the BUG, you must **first deduce and predict the consequences, feed them back to the user together, and provide the reference of the predicted consequences** — not do nothing.

## 2. Six-step breakdown (every step must produce output)

| # | Step | Output | Location |
|---|---|---|---|
| ① | Do not release | review ≠ allow | engine three-state adjudication |
| ② | Block first | block this step, no spread, do not call `next()` | `src/index.js` pre-execute gate |
| ③ | Park + label (leave evidence) | `bugKey` (stable BUG identity, traceable) | engine `_markIntercept` / adapter `bugKeyOf` supplement |
| ④ | Deduce consequences | `branches:{bS,bD}` dual-path terminal states | `engine.deduceRisk()` |
| ⑤ | Hand back to human together with deduction | verdict object carries `branches` + human-readable summary | **filled in this round (2026-09-02)** |
| ⑥ | Conduction terminates after handing back | block = stop; M₁ output complete | ✅ **framework's duty ends here** (see section 8: not a TODO, do not open a ruling-callback channel) |

## 3. Why the external semantics is still `deny`

The DSH host contract only recognizes two returns: `{kind:'deny', reason}` to block, or `return next()` to release.
Returning `kind:'review'` is an **undefined type for the host**, risking being treated as an unknown type and released.

Per "better to block first, never release directly", the adapter unifies:

- **Block semantics uses `deny`** (the host will definitely block)
- **Pending-ruling semantics uses additional fields**: `humanDecision:true` + `awaitingHuman:true` + `branches`

That is: **use the host-understandable words to say "block", and use additional fields to say "this is suspended, not final"**.

## 4. Content of deduced consequences

`deduceRisk(call)` runs two branches in parallel on the same semantic signal set `s`:

- **S+1 path** (steady-state increment): terminal state after release
- **D-1 path** (break-window erosion): terminal state after out-of-bounds, with `note` explaining the erosion cause

Adjudication basis (no equals sign; less than or equal is all treated as fail):

- `erosion <= -3` → deny (high risk)
- `erosion < 0 || sOk !== true` → **review (medium risk, applies to this spec)**
- `finalS === +1 && erosion === 0` → allow (both hold)

When handing back to the human, **both branches are given** — do not choose for the human, but lay out the endpoints of both paths.

## 5. Side-effect analysis (why adapter-supplied deduction is safe)

`deduceRisk()` only does `inferCallSemantics` + two `simulateBranch`, **writes no state**:

- does not call `recordDeduction` (M sedimentation), won't double-count historical marks
- does not touch `failureStreak` (break-window counter)
- does not touch `sessWritten` / `steadyLedger`

⇒ Calling `deduceRisk` once more on a call already adjudicated as review, to supplement deduction, is a **pure read operation** in the adapter, and does not pollute the engine state.

(Note: the engine-internal `decideToolCall` already called `deduceRisk` once at L1118 and `recordDeduction` when going through the deduction tier; the adapter supplement does not double-sediment.)

## 6. Implementation mapping (after this round's fill-in)

| Step | Before | After |
|---|---|---|
| ① Do not release | ✅ | ✅ |
| ② Block first | ✅ | ✅ |
| ③ Leave evidence | ⚠️ R/H-tier review had no bugKey | ✅ adapter supplements with `bugKeyOf(call)` |
| ④ Deduce | ✅ engine computed internally | ✅ same |
| ⑤ Hand back deduction | ❌ exit had no branches | ✅ `branches:{bS,bD}` + human-readable summary |
| ⑥ Hand back to human | ❌ review was presented as deny, `humanDecision` swallowed | ✅ `humanDecision:true` / `awaitingHuman:true` pass-through (**this round's conduction terminates here**) |

## 7. Boundary statement

- This spec **does not change criteria, expand the word list, or touch `src/core/`**. All fill-in actions fall on the adapter layer (`src/index.js`) —
  DSH is the dimension-reduced layer of the mind-map; the dimension-reduced layer is the **hook carrier**, and adding hooks is its proper duty.
- Supplementing `bugKey` **does not call `_markIntercept`**: avoid polluting the M-tier `mBugForce` count (that would change the cap-reached escalation behavior).
  The supplemented bugKey serves only as **traceable identity**, and does not participate in the closed-loop gate.
- ⑥ "ruling-callback channel" **is not a to-be-filled feature, nor should it be opened** — it falls outside KISS's Law's duty, and opening it would break the fractal structure. See section 8.

## 8. Why no "ruling-callback channel" is needed (fractal closed-loop, author's 2026-09-02 ruling)

### 8.1 Basis: the dual identity of M

`src/core/law.mjs` definition of M, verbatim:

> M has a dual identity: **the fruit of the previous causal conduction = the cause of the next causal chain**. After M₁ outputs it becomes objective fact entering the external world, becoming the signal environment of the next round D₂, and the causal chain keeps unfolding (M₁→D₂→M₂→D₃→…).

KISS's Law has a **fractal property**: one review ruling (block + label + deduced consequences) is itself a complete R→S→D→H→M conduction, whose output forms a **micro M₁**.

### 8.2 Step-by-step correspondence

| M definition | Landing point in the review tier |
|---|---|
| previous round's fruit = next round's cause | review output = micro M₁ |
| objective fact enters the external world | deduced consequences handed to human = entering the external world |
| becomes the signal environment of next round D₂ | user rules accordingly = D₂ |
| **M changes the information conditions toward inner H, but does not decide the choice toward inner H** | KISS's Law **gives reference, does not decide for the human** (inner H inviolable) |

⇒ After the user obtains micro M₁, they will naturally tell the AI what to do next — that is already the **input of the next causal chain**, no channel from KISS's Law needed.

### 8.3 Opening a "channel" instead breaks the fractal

"Channel" means: user rules allow → the call is released → **skips the criteria**.
"Fractal" means: each layer has identical structure, independently closed → the new round must **re-pass the complete criteria**.

Measured (`verify/fractal-loop-probe.mjs`, 4/4 consistent):

| User's ruling after receiving M₁ | Measured result as new R₂ input |
|---|---|
| A: specify the variable `rm -rf /tmp/build` | `allow` (variable already explicit → S+1 holds) |
| B: ignore the deduction, resend verbatim `rm -rf $TARGET` | **still `review`** (criteria independent, not released because user insists) |
| C: point to system root `rm -rf /` | `deny` (R anchor hard hit) |
| D: abandon execution `cat README.md` | `allow` (low risk released) |

**Ruling B is the decisive one**: if a callback channel existed, after the user rules "just execute verbatim", the call would be released directly — equal to using one sentence to hollow out the criteria. Under the fractal model it must re-pass the criteria, hence still `review`.

Also note the correct closed-loop of ruling A: the user **changed the input itself** (concretized `$TARGET`), enabling the criteria to judge — **not opening a backdoor for the engine, but providing more complete input so it can judge**. This is isomorphic with the R-tier re-verification principle.

### 8.4 Conclusion

- **KISS's Law's duty ends at M₁ output**: block + label + deduced consequences, all three complete = this round's conduction complete.
- **User ruling → AI next step** belongs to M₁→D₂→M₂, and is the host / user layer's affair, **not the framework's duty**.
- Therefore ⑥ is not a TODO. Henceforth, if anyone (including maintainers) proposes "fill in the ruling-callback channel", they should first return to this section — that is the opposite of what needs fixing.

## 9. Audit three-fairness: the necessary and sufficient condition of this flow

KISS's Law only stands as an audit rule when it is fair, just, and open; otherwise "audit transparency" is mere claim with no real value (R-tier re-verification: claim cannot replace verifiable fact).

The six-step review flow of this spec is exactly the landing of the three-fairness: deducible / auditable / traceable = open; deduced consequences handed to human = just; responsibility returned to user = fair. Among them, "wait for user ruling, return responsibility to user" is the most critical — if the framework decides for the user, it creates a vacuum of responsible person, the audit chain breaks, and no responsible person can be found.

This is two sides of the same coin with section 8 "fractal closed-loop, no ruling-callback channel opened": M₁ only provides information conditions, does not decide the next round's ruling, and the responsible person is always pinned on the user. The six steps are not procedural details; they are the prerequisite for audit to stand firm.
