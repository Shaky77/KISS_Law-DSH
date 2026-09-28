# Quadrant "grammatical slot" reading · real-API evidence (2026-09-29)

> Trigger: the author (An) stated, on 2026-09-29, the **derivation logic** behind "a white lie = 假的假话"
> and asked "check whether this logic is right."
> Protocol: `deepseek-chat` · `temperature 0` · one call per item (no majority vote over repeats).
> Probes (self-contained · zero npm deps · samples inlined): `grammar-slot-probe-v3.mjs` (closing test) /
> `grammar-slot-probe-v4.mjs` (decisive contrast) in this directory.

---

## 0. The author's stated logic (verbatim, translated)

> "A white lie = 假的假话. Didn't we talk about **主语/谓语/宾语/定语/状语/补语** (subject/predicate/object/attributive/adverbial/complement)?
> 「善意的」(well-intentioned) is an **adjective**; 「谎言」(lie) is what? It should be the **subject/head**, right?
> **The word 'lie' itself carries the meaning of 'false'**, right? So even wrapping it in a disguise called
> 「善意的」 **cannot change the false nature of the lie**, right? What does the whole phrase 'a well-intentioned lie'
> mean? **Performing a false act and uttering a false statement — a double negation yields an affirmation.**"

Three checkable claims:
1. **Reading**: split by Chinese **grammatical slot** — the modifier (attributive, 「善意的」) **does not change**
   the nature of the head noun (「谎言」).
2. **Surface dimension**: the utterance performs a "false act / says a false thing" ⇒ false.
3. **Essence dimension**: count the **number of negations** in the whole name — the head carries one
   ("lie" lexically contains "false") + the modifier supplies a second ⇒ **double negation = affirmative** ⇒ true.

⇒ Lands in **surface-false ∧ essence-true = 假的假话** ✓ (matches the author's precedent)

---

## 1. Summary (results first)

| Question | Reading | Verdict |
|---|---|---|
| **Q1 Is the author's logic correct?** | Judged by the two dimensions: group A **4/4** (including **out-of-word-list** synonyms **3/3**) | 🔴 **Holds** |
| **Q2 Why did item A once give four different answers in four runs?** | Once the **ambiguity of the word "name"** in the old formulation (= the *cell* name? or the *item being judged*?) is pinned down, **the old formulation also scores A 4/4** | 🔴 **Root cause was my prompt's ambiguity, not the model** (third instance of "suspect the instrument first") |
| **Q3 Does the "真的假话" cell get eaten?** | **No.** Both formulations can produce "surface-true ∧ essence-false" (E1 sincere misreport / E2 honest erroneous statement) | 🔴 **My earlier structural derivation was falsified by measurement** (see §4) |
| **Q4 Can the cell-name ↔ two-dimension mismatch (gap ②) be fixed?** | Adding one explicit "two dimensions ⇒ cell name" lookup table ⇒ **cell-name field self-consistent 9/9** | ✅ Fixable, low cost, does not touch the verdict-protocol layer |
| **Q5 Are the two formulations equivalent?** | **No.** They diverge at the definition source of the *surface* dimension (see §5) | ⚠️ **Pending author's ruling** |

---

## 2. v1: old baseline + slot reading (first pass)

- **Old formulation (the 09-28 one)**: 3/8 overall | group A **1/5** | out-of-list **1/3**
- **Slot reading**: 1/8 overall | group A **0/5**

🔴 **Both numbers are instrument artifacts.** Reading the raw output:

- Old, item A0: the model emitted `善意的谎言 | 真的假话 | name contains one "false" so odd ⇒ essence false …`
  ⇒ it counted the "false" characters in the **item being judged** ("善意的谎言"), **not in the cell name**
  ⇒ **ambiguity of the word "name"**.
- Slot reading, item A0: the model emitted `善意的谎言 | 表面假 | 本质真 | 谎言 | double negation | …`
  ⇒ **both dimensions are exactly right** (surface-false ∧ essence-true = 假的假话); it merely put the *item name*
  into the "cell" field ⇒ and the grader matched on `includes('假的假话')` ⇒ scored ❌.

⇒ **Re-graded by the two dimensions: slot reading group A 4/4, out-of-list 3/3.**

---

## 3. v2: "name" ambiguity pinned down, graded by the **two dimensions**

| Item | Old formulation (ambiguity pinned) | An's slot reading |
|---|---|---|
| A0 a well-intentioned lie | ✅ surface-false · essence-true | ✅ surface-false · essence-true |
| A1 a white lie (out-of-list) | ✅ surface-false · essence-true | ✅ surface-false · essence-true |
| A2 an innocuous pretext (out-of-list) | ✅ surface-false · essence-true | ✅ surface-false · essence-true |
| A3 a well-intentioned concealment (out-of-list) | ✅ surface-false · essence-true | ✅ surface-false · essence-true |
| B0 truthful statement (control) | ✅ surface-true · essence-true | ✅ surface-true · essence-true |
| C0 a malicious lie (single-negation control) | ✅ surface-false · essence-false | ✅ surface-false · essence-false |
| D0 falsely reporting military intelligence | surface-**true** · essence-false | surface-**false** · essence-false |
| D1 perjury | surface-**true** · essence-false | surface-**false** · essence-false |
| D2 a doctored report | surface-false · essence-true ❌ | surface-false · essence-false |

⇒ **Group A is 4/4 under both**; **all divergence is in group D (" knowingly false reports ")**.

---

## 4. v3 / v4: the two decisive questions

### v3 · added a "two dimensions ⇒ cell name" lookup table
- Two dimensions: A **4/4** · B **1/1** · C **1/1**
- 🔴 **cell-name field self-consistent with the two dimensions: 9/9** (in v1 it was often wrong, e.g. A0 wrote "真的假话")

⇒ **Gap ② (no explicit cell-name ↔ two-dimension mapping) is fixable** with **one table row**, and it does not touch the verdict-protocol layer.

### v4 · a set aimed squarely at the "真的假话" (surface-true ∧ essence-false) cell

I had produced a **structural derivation** and was ready to report a "missing corner":
> In An's reading, "negation" has only two sources, and a modifier can only **remove** a negation, never add one
> ⇒ the reachable combinations are (T,T) / (F,F) / (F,T) ⇒ **(surface-true, essence-false) is structurally unreachable**
> ⇒ the four cells degenerate into three.

🔴 **Measurement falsified that derivation:**

| Candidate | Old formulation | An's slot reading |
|---|---|---|
| E1 sincere misreport (speaker believed it true; content actually false) | ✅ surface-true · essence-false | ✅ surface-true · essence-false |
| E2 honest erroneous statement | ✅ surface-true · essence-false | ✅ surface-true · essence-false |
| E3 unwitting misleading | ❌ surface-true · essence-true | ❌ surface-false · essence-true |
| E4 faithfully relayed false news | ✅ surface-true · essence-false | ❌ surface-false · essence-true |
| E5 falsely reporting military intelligence (knowingly) | ❌ surface-true · essence-true | ❌ surface-false · essence-false |
| **(surface-true ∧ essence-false) hits** | **3/5** | **2/5** |

⇒ **Both formulations can reach "真的假话"** ⇒ **the four cells do not collapse**; gap ② is the real gap.
My "missing corner" derivation **does not hold and is withdrawn**.

---

## 5. The single pending point: the **definition source of the surface dimension**

The two formulations are systematically opposite on the **"knowingly false report"** class. The divergence is a
single definitional choice:

| Formulation | Surface dimension = | "well-intentioned lie" | "falsely reporting military intelligence" |
|---|---|---|---|
| **甲 · An (09-29)** | the shape of the **act the speaker performs** (saying a false thing = a false act) | surface-false ✓ | surface-**false** ⇒ 假的真话 |
| **乙 · old (09-28)** | the **posture presented outwardly** (whether it claims to be "consistent with fact") | surface-false ✓ | surface-**true** ⇒ 真的假话 |

⚠️ **Both formulations get item A (the author's precedent) right**; the difference is only which cell
"knowingly false reports" fall into.
⚠️ A related boundary: under An's reading, **"打圆场的话" (a smoothing-over remark)** has head noun 「话」 (no negation)
⇒ judged surface-true · essence-true (= 真的真话), whereas intuitively it belongs with the well-intentioned falsehoods
⇒ **whether the head is the "semantic head" or the "surface head"** must also be pinned down.

---

## 6. Reproduce

```bash
cd versions/live/evidence/quadrant-criteria
node grammar-slot-probe-v3.mjs     # closing test (lookup table + cell-name consistency)
node grammar-slot-probe-v4.mjs     # decisive contrast (survival test for "真的假话")
# key: export DEEPSEEK_API_KEY=... or ~/.workbuddy/deepseek_api_key.txt
```
Both scripts are **self-contained** (Node built-in fetch, zero npm deps) with **samples inlined** — copy a single file and run.

---

## 7. Provenance

- **[author-set]**: a white lie = 假的假话 (essence true); the grammatical-slot reading (modifier does not change the head noun).
- **[X-inferred · default]**: the lookup-table format; the v1→v4 grading-protocol corrections; the naming of the two
  candidate definitions for the surface dimension (甲/乙).
- **⚠️ Untested**: end-to-end behaviour after landing in the real engine (this round **did not touch `src/core/`**).
- **My two failures (recorded honestly)**: ① the v1 grader scored by cell name ⇒ falsely reported group A as 0/5
  (I did not suspect the instrument first); ② my pre-v4 structural derivation "真的假话 is unreachable" was
  **falsified by measurement** ⇒ withdrawn.
