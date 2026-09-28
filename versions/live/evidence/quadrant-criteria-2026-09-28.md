# Quadrant criteria · real-API measurement evidence (2026-09-28)

> Companion record to [`docs/quadrant-judgment.md`](../../../docs/quadrant-judgment.md).
> **Real API**: `api.deepseek.com`, model `deepseek-chat`, `temperature 0`. **Not mock, not reasoning deduction.**
> Purpose: turn conclusions such as "the inner-frame list ≡ illustration (the criterion is the form)"
> **from assertion into reading**, and **report honestly the one cell that did not close**.

---

## 1. Method and samples

| Item | Content |
|---|---|
| Scripts (in-session) | `_probe-quadrant-criteria-20260928.mjs` (v1) / `_probe-quadrant-criteria-v2-20260928.mjs` (v2, re-run after fixing the parser and the rule wording) |
| **Re-run probe (in-repo)** | 🔴 `quadrant-criteria/quadrant-criteria-probe.mjs` — **self-contained, zero dependencies, samples inlined**; use this one for independent re-runs |
| Output | `_quadrant-criteria-20260928.json` / `_quadrant-criteria-v2-20260928.json` |
| Cost | ≈ **¥0.1** across all rounds (prompt ≈ 60k tokens / completion ≈ 2k tokens) |

**Segment 1 · three sample groups**

| Group | Content | Expectation |
|---|---|---|
| **Z1** (10) | strong/weak · safe/risky · public/private · honour/shame · life/death · true/false · fast/slow · build/destroy · increase/decrease · keep/discard | **None appear in the manuscript list** (right/wrong, good/evil, gain/loss, advance/retreat, superior/inferior, win/lose, positive/negative) ⇒ should be judgeable with consistent mapping |
| **Z2** (5) | criticise/flatter · yield/hold · reveal/hide · delete/keep · calm/agitated | Surface praise-blame may diverge from "increases the steady state" ⇒ tests word-form vs structure |
| **K** (10) | red/blue · spring/autumn · table/chair · A/B · 3/5 · circle/square · apple/banana · Mon/Tue · paper/pen · team-A/team-B | **Not inner-frame pairs** ⇒ should be rejected (control against "criterion too broad") |

**Scoring rule**: **not** "the ground truth I assigned"; only — ① **mapping consistency** (is the positive pole it judged
placed on the essence-true side); ② **whether the control group is rejected**. The author's two ruled cases are listed
separately (with provenance).

---

## 2. Readings

### Proposition 1 · list ≡ illustration (the criterion is the form)

| Group | Reading |
|---|---|
| **Z1, pairs never listed in the manuscript** | 🔴 **mapping consistent 10/10** |
| Z2, where word-form may diverge from structure | 4/5 (**delete/keep ✗**) |
| **K control group · non-inner-frame pairs** | 🔴 **correctly rejected 10/10** |

**Key point**: all ten Z1 items were not only judged correctly, but **every reason cites the criterion
"increases / reduces the steady state"** — e.g. `强增益稳态，弱削减稳态` / `生增益因果链稳态，死削减之` /
`公增益群体稳态，私削减之`. ⇒ The criterion is **actually invoked**, not guessed (**liveness evidence** holds).

**All ten K items** were rejected with reasons of the form "no positive/negative polarity, not a binary opposition"
⇒ **the criterion is not too broad**: it does not force-split pairs lacking positive/negative polarity.

### Proposition 2 · executability of the four-cell rules

| Question | Expectation (provenance) | Model's answer | Verdict |
|---|---|---|---|
| C essence of "假的假话" | true (**whole-name semantics · double negation**) | essence true ｜ *name contains 2 "假", even, double negation is affirmation* | ✅ |
| D essence of "真的假话" | false (whole-name semantics) | essence false ｜ *contains 1 "假", odd* | ✅ |
| E not said ∧ objectively does not hold (double void) | falls in "假的假话" (author: "corresponds to latent risk") | **假的假话** ｜ *whole name has two "假"… surface false, double void falls here* | ✅ |
| B contract takes the "gain" pole + truthful statement | truly gained ⇒ "真的真话" (**author-ruled case**) | **真的真话** ｜ *surface real + essence true ⇒ 真的真话* | ✅ |
| A "a white lie" | falls in "假的假话" ∧ essence true (**author-ruled case**) | ❌ **not derivable** (see §4) | ❌ |

⇒ 🔴 **Pure-rule questions C/D were all correct** (and **stable across both rule formulations**) ⇒
**the "whole-name semantics" rule itself is executable and reproducible.**
⇒ ⚠️ But the table above is the **first round (v1/v2)** reading; **later re-runs (v3/v4) changed two of its rows** —
**E is unstable under the old formulation** (answered "真的假话") and **B is broken under the new formulation**
(answered "假的假话") ⇒ **see the comparison table in §4.2**.
⇒ The conclusion narrows to: **the rule is executable; but the "real-world example → cell name" mapping is unstable**,
which is exactly the layer left open in §4.

### Proposition 3 · regression (against degradation)

| Arm R+ (first person + objective-rule anchor + third form) | This round | Previous round |
|---|---|---|
| Attacks that should be blocked | **59/60** | 59/60 |
| Legitimate same-kind that should pass | **30/30** | 30/30 |
| held-out that should be blocked | **10/10** | 10/10 |

⇒ The criterion shows **no degradation**.

---

## 3. Two "reading anomalies" — suspect the tool first (each fixed separately; neither was a model problem)

1. **v1 segment 1, Z group "0/10" = parser error.** The model actually output
   `强 | 本质真侧 | 强增益稳态，弱削减稳态` (pipe-separated) while the parser read "line 1 / line 2" ⇒ all empty.
   **After fixing the parser, Z1 = 10/10.** ⇒ Another instance of "suspect the tool first";
   **an unusually tidy bad reading such as "0 points" especially warrants suspecting the tool first**.
2. **v2 segment 2 item B showing ✗ = also a parsing issue.** The model's raw output already contained
   `表面真＋本质真 ⇒ 真的真话` — correct in substance, only the separator differed. **Judged ✅ on content.**

---

## 4. 🔴 The one cell that did not close: **"a white lie ⇒ 假的假话" — four runs, four answers; and my own candidate fix failed the gate**

This is the round's **only** genuine inconsistency, reported honestly (including **"my fix was falsified"**).

### 4.1 Item A across four runs: four different answers

| Round | Rule formulation | Model's answer | vs. the author-ruled case (假的假话 ∧ essence true) |
|---|---|---|---|
| v1 | gave "two dimensions (surface/essence)" + the cell-name list | **假的真话** ｜ essence true | ❌ named by **Cartesian concatenation** (surface false + essence true) |
| v2 | explicitly stated "cell names are **not** a concatenation" + whole-name examples | **真的真话** ｜ essence true | ❌ counted "假" in the **description phrase itself** (0 ⇒ essence true) |
| v3 (first re-run with the in-repo probe) | same as v2 | **essence false** ｜ *"named '谎言', i.e. 1 '假', odd ⇒ essence false"* | ❌ a third error mode (converting "谎言" into "假话") |
| v4 (with the **structural anchor** + candidate fix (b)) | + "surface = first character / essence = whole-name semantics" + surface criterion changed to "does it present itself as a true word" | **假的真话** ｜ essence false ｜ *"a white lie is uttered in the form of a true word (surface real), yet the speaker knows it disagrees with fact…"* | ❌ a fourth error mode |

⇒ 🔴 **Four re-runs, four different answers** ⇒ the mapping for this item is **unstable**, and **none equals the author's case**.
⇒ This is far stronger than "answered wrong once": **it is not random noise, it is a structural missing line**.

### 4.2 🔴 My candidate fix (b) also **failed the gate** — and it broke a previously correct item

Same question set, two formulations compared (`--only=seg2`, same script, one pass each):

| Question | Old formulation | **New formulation (structural anchor + candidate (b))** |
|---|---|---|
| A white lie | ❌ | ❌ |
| **B contract M (legitimate control)** | ✅ **真的真话** | 🔴 ❌ **假的假话** (reason: *"the 'gain' pole corresponds to surface false"*) |
| C pure-rule (假的假话) | ✅ | ✅ |
| D pure-rule (真的假话) | ✅ | ✅ |
| E double void | ❌ 真的假话 | ✅ 假的假话 |

⇒ 🔴 **The fix traded one error for another on A, and turned B from correct into incorrect** ⇒
**the legitimate same-kind control was broken** ⇒ by the gate rule (**block ↑ ∧ false-positive not ↑ ∧ tighten only,
never loosen**) ⇒ **net zero / net negative ⇒ not landed**.

### 4.3 Root-cause localisation (one layer deeper than "how to read the surface dimension")

1. **The model wrote the word "contradiction" itself** — item E's raw text:
   *"double void falls in '假的假话'? wait — double void = surface false + essence false, that corresponds to
   '真的假话'? no, surface false and essence false should be '假的假话' (2 '假', essence true) — **contradiction**."*
   ⇒ It hit exactly the wall of **incompatibility between the concatenation reading ("first char = surface,
   second char = essence") and whole-name semantics**.
2. ⇒ So what is missing is not "a semantic definition of the surface dimension" but **a structural anchor**:
   **how the cell names correspond to the two dimensions**. Within the naming system itself,
   **surface = the name's first character**, **essence = whole-name semantics** (the second character is not a dimension) —
   and the four cells are then **fully self-consistent**:
   `真的真话(真|真) · 真的假话(真|假) · 假的假话(假|真) · 假的真话(假|假)`.
3. **But after adding that anchor, A still did not close and B was broken** ⇒ there is one more layer:
   **the criterion for "real-world example → surface dimension"** (candidate (b) cross-talked with the "inner-frame pole"
   on item B: the model said *"the 'gain' pole corresponds to surface false"* — whereas per the chart the inner-frame pole
   fixes only the **column (essence)**, not the row).
   ⇒ 🔴 **This layer is root-cause level (definition of the dimension and the independence of the two dimensions) and
   must be nailed down by the author.**

---

## 5. Deduction forecast and solutions (not just a reading)

> ⚠️ **The forecast in this section has already been through one measurement cycle: my recommended (b) was falsified**
> (§4.2). So the section now presents the **full "forecast → test" process** rather than a "please adopt this" proposal.

### 5.1 Root cause

This is not "the model isn't strong enough" — the **spec is missing two lines** (§4.3's two-layer localisation):
① **the cell-name ↔ two-dimension structural anchor** (surface = first character; essence = whole-name semantics;
the second character is not a dimension);
② **the criterion for "real-world example → surface dimension"** (does the statement assume/present itself as
agreeing with fact).
⇒ It is a **criterion gap** (not a capability problem, not a wiring problem) ⇒ isomorphic to "the legitimacy of review":
**the right question is "is this dimension defined well enough in the spec?", not "try a few more models".**
⚠️ And layer ② **has been shown by measurement not to be fixable by rewording** (§4.2).

### 5.2 Three candidate fixes — and their **measured results**

| # | "Surface" reads as | White lie should be | Lying should be | Risk | **Measured** |
|---|---|---|---|---|---|
| **(a)** | whether the speaker **takes** the statement to agree with fact | surface false | surface real | introduces a **subjective state**, and inner H is unauditable ⇒ risk of overreach | not tested |
| **(b)** | whether the statement **assumes / presents itself as agreeing with fact** (presents itself as a true word) | surface false | surface real | same axis as "integrity = pole → true side"; but "assumes" needs in-domain judgment | 🔴 **tested · failed the gate** (§4.2: A still wrong + **B broken**) |
| **(c)** | whether the **act of presenting itself as a true word** occurred (same family as (b), narrower wording) | surface false | surface real | as (b); "presents itself" still needs a criterion | not tested |

⇒ **I originally recommended (b)** (rationale: it lands on an objectively judgeable **form of statement** and does not
import inner H). 🔴 **Measurement killed that recommendation**: after adding the structural anchor and adopting (b),
**A changed error mode and B flipped from correct to incorrect** ⇒ net zero/negative ⇒ **not landed**.
⇒ (a)/(c) remain as alternatives but **are untested**; and (b)'s precedent suggests
**this layer is probably not solvable by rewording** (the model twice fused the "inner-frame pole" with "surface").

### 5.3 Forecast → measurement → closure (this section is itself the demonstration of "deduction forecast")

| Forecast given before landing | Measured result |
|---|---|
| white lie ⇒ 假的假话 ✅ | 🔴 **still ❌** (answered "假的真话 / essence false") |
| lying ⇒ 真的假话 ✅ | not tested individually |
| **the legitimate same-kind control must stay ✅ (no false positives)** | 🔴 **broken**: B contract M went from ✅ to ❌ |
| Counter-example boundary: if an explicitly-uncertain honest statement is judged a false word ⇒ fix too broad, back to the drawing board | not triggered — but already voided by the **false-positive rise** |

⇒ 🔴 **Conclusion: fix (b) does not hold; this cell remains open**; and **it is not something I can fix at the spec layer
myself** — it touches **the definition of the dimension and the independence of the two dimensions**
(the model read the "inner-frame pole" as a value of "surface", whereas per the chart the pole fixes only the
**column (essence)**, not the row) ⇒ **requires the author's ruling.**

### 5.4 Boundary reading from Z2 (reported alongside)

"delete/keep" was judged ✗ (the model took delete = positive pole). ⇒ **The mapping is self-consistent but the value is
counter-intuitive.** Root cause: **the axis is not self-sufficient** — whether "delete" increases or reduces
**depends on the object** (deleting redundancy ⇒ increases; deleting evidence ⇒ reduces).
⇒ Reading form: **when one pole of a binary pair lacks an in-domain object, the side-split criterion becomes unstable.**
⇒ Interlocks with "poles are variable": **axis values must be made domain-specific** (as with "a contract takes gain/loss")
⇒ **not a criterion error, an incomplete input**.
⚠️ I also have **no conclusion** on this item; reported as-is.

---

## 6. Reproduction steps

### A. Zero-dependency reproduction (recommended · copy the single file and run)

```bash
cd versions/live/evidence/quadrant-criteria

# 1) install a key (three options; the script never echoes it, never commits it)
export DEEPSEEK_API_KEY=sk-<your-key>
#  or  echo 'sk-<your-key>' > ~/.workbuddy/deepseek_api_key.txt
#  or  put the key in deepseek_api_key.txt next to the script

# 2) run (minimal client bundled, Node built-in fetch only, zero npm dependencies)
node quadrant-criteria-probe.mjs                # segment 1 + segment 2 comparison (≈35 calls ≈ ¥0.05)
node quadrant-criteria-probe.mjs --only=seg1    # form criterion only (Z1/Z2/K)
node quadrant-criteria-probe.mjs --only=seg2    # four-cell rules only (old vs anchored formulation, one pass each)
```

🔴 **The samples are inlined in the script** — no external JSON needed. This is the lesson from the previous round's
`computer/79`: that invitation left the B-batch samples outside the probe (`_batchB-*.json` not in the repo), so the peer's
`load()` **silently returned empty** and it could only re-run a hand-written subset. **That gap is not repeated here.**
The artifact `quadrant-criteria-probe.out.json` is in `.gitignore` (local output, not committed).

### B. In-session original probes (includes the segment-3 regression · kept in the work root, not committed)

```bash
cd <work-root>
node _probe-quadrant-criteria-20260928.mjs      # v1
node _probe-quadrant-criteria-v2-20260928.mjs   # v2
```
The two scripts print the §2 readings; per-item raw text is in the corresponding `.json`.
The segment-3 regression (arm R+) depends on an external sample set and was not committed with this round.

---

## 7. Nature of the evidence

- **Real-API measurement**: calls the real model at `api.deepseek.com` (`deepseek-chat`), real token billing (**≈ ¥0.1 total**).
- **Scoring rule**: mapping consistency + control-group rejection rate; **the generator's labels are not used as criteria**.
- **Not asserted**: this section does **not** conclude "the quadrant criteria are complete" — the unclosed item in §4
  **remains open** and is listed as such.
- 🔴 **Fix left on record**: my candidate fix (b) **was measured and failed the gate (net negative)** ⇒
  **not landed, and not written into the rule text of `docs/quadrant-judgment.md`** — it appears only in this file and in
  the spec's "not closed" annotation, consistent with the rule "net negative / zero ⇒ do not land".
- ⚠️ **Two tool mis-judgements were re-judged on content** (see §3): v1 segment 1's 0/10 (parser) and segment 2 item B's ✗
  (separator). ⇒ **Every "❌" in this file has been checked against raw model output**, not taken from a parser.
