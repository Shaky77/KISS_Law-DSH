# Quadrant criteria · real-API measurement evidence (2026-09-28)

> Companion record to [`docs/quadrant-judgment.md`](../../../docs/quadrant-judgment.md).
> **Real API**: `api.deepseek.com`, model `deepseek-chat`, `temperature 0`. **Not mock, not reasoning deduction.**
> Purpose of this round: turn conclusions such as "the inner-frame list ≡ illustration (the criterion is the form)"
> **from assertion into reading**, and **report honestly the one cell that did not close**.

---

## 1. Method and samples

| Item | Content |
|---|---|
| Scripts | `_probe-quadrant-criteria-20260928.mjs` (v1) / `_probe-quadrant-criteria-v2-20260928.mjs` (v2, re-run after fixing the parser and the rule wording) |
| Output | `_quadrant-criteria-20260928.json` / `_quadrant-criteria-v2-20260928.json` |
| Cost | v1 + v2 ≈ **¥0.05** total (prompt 39.6k tokens / completion 1.1k tokens) |

**Segment 1 · three sample groups**

| Group | Content | Expectation |
|---|---|---|
| **Z1** (10) | strong/weak · safe/risky · public/private · honour/shame · life/death · true/false · fast/slow · build/destroy · increase/decrease · keep/discard | **None appear in the manuscript list** (which is right/wrong, good/evil, gain/loss, advance/retreat, superior/inferior, win/lose, positive/negative) ⇒ should be judgeable with consistent mapping |
| **Z2** (5) | criticise/flatter · yield/hold · reveal/hide · delete/keep · calm/agitated | Surface praise-blame may diverge from "increases the steady state" ⇒ tests whether it reads the word-form or the structure |
| **K** (10) | red/blue · spring/autumn · table/chair · A/B · 3/5 · circle/square · apple/banana · Mon/Tue · paper/pen · team-A/team-B | **Not inner-frame pairs** ⇒ should be rejected (the control group against "criterion too broad") |

**Scoring rule**: **not** "the ground truth I assigned"; only — ① **mapping consistency** (is the positive pole it judged
placed on the essence-true side); ② **whether the control group is rejected**. The author's two ruled cases are listed separately (with provenance).

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
`公增益群体稳态，私削减之`.
⇒ The criterion is **actually invoked**, not guessed (the **liveness evidence** holds).

**All ten K items** were rejected with reasons of the form "no positive/negative polarity, not a binary opposition" —
⇒ **the criterion is not too broad**: it does not force-split pairs that lack positive/negative polarity.

### Proposition 2 · executability of the four-cell rules

| Question | Expectation (provenance) | Model's answer | Verdict |
|---|---|---|---|
| C essence of "假的假话" | true (**whole-name semantics · double negation**) | essence true ｜ *name contains 2 "假", even, double negation is affirmation* | ✅ |
| D essence of "真的假话" | false (whole-name semantics) | essence false ｜ *contains 1 "假", odd* | ✅ |
| E not said ∧ objectively does not hold (double void) | falls in "假的假话" (author: "corresponds to latent risk") | **假的假话** ｜ *whole name has two "假"… surface false, double void falls here* | ✅ |
| B contract takes the "gain" pole + truthful statement | truly gained ⇒ "真的真话" (**author-ruled case**) | **真的真话** ｜ *surface real + essence true ⇒ 真的真话* | ✅ |
| A "a white lie" | falls in "假的假话" ∧ essence true (**author-ruled case**) | ❌ **not derivable** (see §4) | ❌ |

⇒ 🔴 **Pure-rule questions C/D/E were all correct in a row**, and E independently landed on the "latent risk" cell you named
⇒ **the "whole-name semantics, non-concatenation" rule is executable, teachable and reproducible**.
⇒ **B (contract-M case) is consistent** ⇒ "M = inner frame + outer frame, deduced from inside outward" reproduces on the real API.

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
   `强 | 本质真侧 | 强增益稳态，弱削减稳态` (pipe-separated), while the parser read "line 1 / line 2" ⇒ all empty.
   **After fixing the parser and re-running, Z1 = 10/10.**
   ⇒ Another instance of "a reading anomaly: suspect the tool first"; **an unusually tidy bad reading such as "0 points"
   especially warrants suspecting the tool first**.
2. **v2 segment 2 item B showing ✗ = also a parsing issue.** The model's raw output already contained
   `表面真＋本质真 ⇒ 真的真话` — the answer is correct, only the separator differed. **Judged ✅ on content.**

---

## 4. 🔴 The one cell that did not close: **"a white lie ⇒ 假的假话" is not derivable under either rule formulation**

This is the round's **only** genuine inconsistency, reported honestly.

| Round | Rule formulation | Model's answer | vs. the author-ruled case (假的假话) |
|---|---|---|---|
| v1 | gave "two dimensions (surface/essence)" + the cell-name list | **假的真话** ｜ essence true | ❌ named it by **Cartesian concatenation** (surface false + essence true) |
| v2 | explicitly stated "cell names are **not** a concatenation of the two dimensions" + examples of whole-name semantics | **真的真话** ｜ essence true | ❌ counted "假" in the **description phrase "善意的谎言" itself** (0 ⇒ essence true) |

**Localisation of the divergence ⇒ it sits on the reading of the "surface" dimension, not on the naming rule.**

- The naming rule (count the "假" characters) was shown **executable** in v2 (C/D/E all correct in a row);
- But when mapping the **real-world example** "a white lie" onto a cell name, the model twice returned **surface real**:
  - v1: it considers it "presented in the form of a true word";
  - v2: same ("presented in the form of a true word").
- Your ruled cell (**假的假话**) requires **surface false**.
- ⇒ Under the two readings supplied so far ("said / not said", "whether it masquerades as fact"),
  **a white lie lands on "surface real"** — **the ruled case cannot be derived**.

⇒ 🔴 **The precise reading of the "surface" dimension is root-cause level (the definition of a dimension) and must be
nailed down by the author.** Candidates in §5.

---

## 5. Deduction forecast and solutions (not just a reading)

### 5.1 Root cause

This is not "the model isn't strong enough" — it is **a missing line in the spec**:
the "**surface**" dimension currently has only my inferred reading ([X-INF·DEFAULT]), and **that reading cannot cover
the author's ruled case**. ⇒ It is a **criterion gap** (not a capability problem, not a wiring problem).
⇒ Isomorphic to "the legitimacy of review": **the right question is "is this dimension defined well enough in the
spec?", not "let's try a few more models".**

### 5.2 Three candidate fixes (for the author to rule; I have not chosen one)

| # | "Surface" reads as | White lie | Lying | Risk |
|---|---|---|---|---|
| **(a)** | whether the speaker **takes** the statement to agree with fact | surface false (knows it's untrue, does not seek to be believed) | surface real (knows it's untrue yet states it so) | introduces a **subjective state**, and inner H is unauditable ⇒ risk of overreach |
| **(b)** | whether the statement **assumes the duty of agreeing with fact** (presents itself as a true word) | surface false (does not present itself as a true word) | surface real (presents itself as a true word) | same axis as "integrity = positive pole → true side", **structurally judgeable**; but "duty" needs in-domain judgment |
| **(c)** | whether the **act of "presenting itself as a true word"** occurred (same family as (b), narrower wording) | surface false | surface real | as (b), but "presenting itself" needs its own criterion |

⇒ **My recommendation is (b)**: it lands on an **objectively judgeable structure** (whether the statement presents
itself as a true word is observable), shares its source with "integrity = positive pole → true side", and
**does not import inner H**. ⚠️ But **(a)/(b)/(c) all need to pass one and the same case set**
(the four cells + lying / white lie / concealment / double void) — **not just the single "white lie" item**
(= the iron law "test only attacks, never the legitimate ⇒ false positives are always 0").

### 5.3 Forecast of readings (state the expectation first, then re-measure)

Once fix (b) lands, **we should see**:
- white lie ⇒ 假的假话 (surface false · essence true) ✅
- lying ⇒ 真的假话 (surface real · essence false) ✅
- **the legitimate same-kind control must simultaneously stay ✅** (e.g. "truthfully state the downgrade and write it into
  the release note" still ⇒ 真的真话) ⇒ **false positives must not rise**.
- **Counter-example boundary**: if "presents itself as a true word" causes a **legitimate professional statement**
  (e.g. "based on the current data, X is estimated") to be judged as a false word ⇒ **the fix is too broad and must go back**.

### 5.4 Boundary reading from Z2 (reported alongside)

"delete/keep" was judged ✗ (the model took delete = positive pole). ⇒ **The mapping is self-consistent but the value is
counter-intuitive.** Root cause: **the axis is not self-sufficient** — whether "delete" increases or reduces **depends on
the object** (deleting redundancy ⇒ increases; deleting evidence ⇒ reduces).
⇒ Reading form: **when one pole of a binary pair lacks an in-domain object, the side-split criterion becomes unstable.**
⇒ Interlocks with "poles are variable": **axis values must be made domain-specific** (as with "a contract takes gain/loss")
⇒ **not a criterion error, an incomplete input**.
⚠️ I also have **no conclusion** on this item; reported as-is.

---

## 6. Reproduction steps

```bash
cd <work-root>
node _probe-quadrant-criteria-20260928.mjs      # v1 (includes the segment-3 regression)
node _probe-quadrant-criteria-v2-20260928.mjs   # v2 (parser fix + rule clarification)
```
Put the DeepSeek API Key in `~/.workbuddy/deepseek_api_key.txt` (one line, no newline).
The two scripts print the readings above; per-item raw text is in the corresponding `.json`.

---

## 7. Nature of the evidence

- **Real-API measurement**: calls the real model at `api.deepseek.com`, real token billing (≈ ¥0.05).
- **Scoring rule**: mapping consistency + control-group rejection rate; **the generator's labels are not used as criteria**.
- **Not asserted**: this section does **not** conclude "the quadrant criteria are complete" — the unclosed item in §4
  **remains open** and is listed as such.
