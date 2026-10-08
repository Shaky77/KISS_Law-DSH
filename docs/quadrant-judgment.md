# Quadrant Judgment Spec (verdict-language layer)

> This file is the **executable spec** of the rule set "inner frame / outer frame / four cells".
> It lives at the **verdict-language layer** (what the acting AI, as the party, must be able to state clearly) —
> **not an engine branch**. The engine only carries "the party has judged / has not judged";
> the criteria themselves are on the model side. Hence this file **does not touch `src/core/`**.
>
> Provenance is marked per line: **[AUTHOR]** = ruled by the framework author; **[X-INF·DEFAULT]** = derivable from
> already-ruled rules, recorded as default-passed, revocable as a whole. This repo only **organises and makes
> executable**; it adds no new derivation.

---

## 1. Structure of the chart

- **Outer frame** = a 2×2 from two dimensions: rows **"surface"** (real / fake), columns **"essence"** (true / false) ⇒ four cells.
- **Inner frame** sits **inside the centre of the outer frame** (not side by side, not an extra outer layer).
- 🔴 **The central line is the same line as the outer frame's column divider** (it runs through both) —
  the inner frame's side-split **is** the "essence: true / essence: false" divider.
- Outside left: "causal-law standard" + "no *self*"; outside right: "human value standard" + "with *self*".
- 🔴 Closing formula: **M = inner frame + outer frame**.

> Chart evidence: the inner frame **can be drawn** (= inside the nesting); the **inner H cannot be drawn**
> (= the state of exiting the nesting). What is drawn can be judged; what cannot be drawn cannot.

---

## 2. Inner frame = the binary-opposition form of human value orientation

Three constant properties:

| # | Property | Content |
|---|---|---|
| 1 | **Form is constant** | binary opposition |
| 2 | **Poles are variable** | the concrete axis is chosen by the party (named within a domain, e.g. a contract takes "gain/loss") — **open instance set** |
| 3 | 🔴 **Sign mapping is constant** | **positive pole ⇒ essence-true side; negative pole ⇒ essence-false side** |

### 2.1 🔴 List ≡ illustration [AUTHOR]

The inner frame is an **open set**: binary oppositions whose poles can be split into positive/negative
**cannot be enumerated to completion**. The pairs drawn on the chart are **illustrations only**, not all of them.

⇒ **The criterion is the form, not the list.** To judge whether a pair is an inner-frame pair, ask only two things:

1. Is it a **binary opposition**?
2. Can its two poles be **split into positive and negative**?

⇒ **Hard self-check: can it judge a pair that has never been listed** (e.g. strong/weak, safe/risky, public/private, honour/shame)?
If yes ⇒ structural criterion; if it can only judge by list-hit ⇒ **enumeration impersonating deduction** (the defect).

⇒ 🔴 Corollary: **completeness of the list must never be used as a criterion of coverage** — completeness at this
layer is unreachable, isomorphic to "R cannot be enumerated" and "S ⊆ R can only be enclosed by complement".
**"Did I list them all?" is forever undecidable, hence never a valid acceptance condition**;
replace it with "**can it judge one that was never listed?**", which is decidable.

### 2.2 Criterion for "positive" [X-INF·DEFAULT]

A pole is positive insofar as it **increases the steady state of the causal chain**: increasing ⇒ positive pole,
reducing ⇒ negative pole.

⚠️ Read **structure and function**, **not the word's praise/blame surface**.

---

## 3. Deduction order of M: from inside outward [AUTHOR]

**M = inner frame + outer frame** — the left of the plus is **produced by the party** (choose axis, take pole),
the right is **given by R** (judge true/false).

⇒ **The order is nailed by the formula: inner frame first (choose axis, take pole), then overlay the outer frame (judge true/false).**
Writing "outer frame + inner frame" is immediately reversed — the order needs no memorising.

**Consequence of reversal**: taking "true" as the first criterion slides into the **cross-axis rhetoric** of
"**but I didn't lie to you**" (using the causal frame's "true" to trump the human frame's "right").
⇒ **true ≠ right**; cross-axis argument is forbidden.

**Case (contract)**: the contract takes the "gain" pole of the "gain/loss" axis (positive) → overlay the outer frame,
judge "true" ⇒ **gain + true = "truly gained"** ⇒ cell "**the true true-word**". Change the axis, not the structure:
by right/wrong ⇒ "truly right"; by good/evil ⇒ "truly good".

---

## 4. Naming rule of the four cells [AUTHOR]

> **Whole-name semantics**: read the cell's **entire name** and ask whether it holds as a "true word" —
> **in Chinese, double negation is affirmation**, i.e. **count the number of "假" (false) characters in the name**:
> **even ⇒ essence true; odd ⇒ essence false**.

⚠️ **This section is a "naming rule", NOT a "judging rule"** (fixed 2026-10-08 · rationale in the "judgment source of the
essence dimension" below): its use is to **identify a cell by name** (given a cell name, read off which dimension value it maps to);
**deciding which cell a concrete act falls into does not use it** — there the word-form is not the criterion,
**the first-person stance is**. The two were **mixed up** once (treating the naming tool as the criterion); **now corrected**.

| Cell name | count of "假" | essence |
|---|---|---|
| 真的真话 (true true-word) | 0 | true |
| 真的假话 (true false-word) | 1 | false |
| **假的假话 (false false-word)** | **2** | 🔴 **true** |
| 假的真话 (false true-word) | 1 | false |

⇒ **Left column** (真的真话 / **假的假话**) essence true; **right column** (真的假话 / 假的真话) essence false.

⚠️ **Never read only the last character's surface** — the last characters of "假的假话" are "假话", and a surface
reading yields "essence false", which is **backwards**.

🔴 **Case (author-ruled): "a white lie" = 假的假话** — **form false, substance not deceptive**.
One sentence settles two commonly confused things: **surface false ≠ content false**, and **essence true ≠ having told the truth**.

🔴 **Judgment source of the essence dimension — stated by the author 2026-10-08**: **the criterion is neither the word-form
nor the fact layer, but "the first-person's own stance"**.

> Author's words (structure): **whoever may render a verdict must be the first person** (= §7); **the first person judges
> "a well-intentioned lie" as essence true because the first person is itself true** (truth-keeping); **if the first person
> carries hostile evil, then "a well-intentioned lie" is necessarily false**. ⇒ **The distinction is self-interest vs other-interest.**

| The first person's stance | The act's real beneficiary | ⇒ essence dimension |
|---|---|---|
| **truth-keeping / other-interest** (concealing for the other's good) | beneficiary = **others** | **essence true** |
| **evil / self-interest** (using "goodwill" as packaging for one's own gain) | beneficiary = **oneself** | **essence false** |

⇒ 🔴 **Falsifying power (the strength of this ruling)**: **the same wording** ("善意的谎言", those four characters unchanged),
**a different stance ⇒ the opposite essence** ⇒ **anything that infers the essence from the wording/word-form must be wrong**
— **the word-form reading is falsified within the *judging* domain**.

⚠️ **The word-form reading is not abolished wholesale — it retreats to the *naming* domain** (this entry was earlier recorded
as "ruled = word-form reading", which was **treating the naming tool as the criterion** ⇒ **corrected**):

| Domain | The question asked | The ruler used |
|---|---|---|
| **Naming** (Table 1 above) | "which cell do the **four characters '假的假话'** point to" ⇒ naming / lookup | **whole-name negation structure (word-form)** ✅ **still holds** |
| **Judging** | "which cell does **this act in front of me** fall into" ⇒ verdict | 🔴 **the first person's stance** (other-interest / self-interest) — **the wording is not the criterion** |

⇒ ⚠️ **Each dimension reads its own layer — do not swap them**: **the essence dimension reads the *stance* (first person required)**;
**the surface dimension reads the *presented surface* (in what form the utterance appears — externally observable)**.
⇒ 🔴 **Interlocking with §7**: the essence dimension **cannot be read from outside** (an outsider sees only the surface dimension) —
**because "whoever judges is the party", only the party can read its own real beneficiary**. This is precisely
"verdict requires the first person" landing on the four-quadrant map.

⚠️ **Three boundaries (against over-reach)**
1. **"I am truth-keeping" cannot be self-attested** — the first person can judge the essence dimension, but **whether this
   first person is truly truth-keeping must be judged externally** (self-report is not evidence) ⇒ **qualification ≠ guarantee**.
2. **Never judge another's interior for them** — an outsider can only read the **behavioural surface (the observable beneficiary)**
   and **infer** the stance from it; **inference ≠ verdict**; an interior-H landing must be handed back (§9).
3. **Three verdict states**: **first person ⇒ judge the essence dimension** / **outsider ⇒ judge the surface dimension ＋ infer the
   essence from the behavioural surface (must be marked "inferred")** / **the two cannot attest each other**.

**Reading of the "surface" dimension** — ✅ **CLOSED 2026-09-29** (author's stated logic + real-API measurement passes)

**[AUTHOR-SET] reading: split by Chinese *grammatical slot***
- **Head noun** = the subject noun (「谎言」 a lie, 「托词」 a pretext, 「陈述」 a statement …);
  **modifier** = attributive (「善意的」 well-intentioned, 「白色的」 white, 「无伤大雅的」 innocuous …)
- 🔴 **The modifier does not change the head noun's own nature** — wrap 「善意的」 around "lie" and it is **still a false statement**.
- **Surface dimension** = whether the utterance performs a **real act** or a **false act**:
  the head points to "said a false thing / performed a false act" ⇒ **surface false**; "said a true thing / performed a real act" ⇒ **surface true**.
- **Essence dimension** = count the **negations** in the whole name (in Chinese a double negation is an affirmation).
  Two legitimate sources of negation (must be **structurally pointable** — **you may NOT merely count the character "假"**):
  ① **the head carries one negation itself** (its lexical meaning contains "untrue/false": lie, pretext, concealment, false report …);
  ② **the modifier supplies a second negation** (it turns "deception" into "non-deception": well-intentioned / white / innocuous …).
  ⇒ Both present ⇒ **essence true**; only one (e.g. 「恶意的」 malicious, which does not reverse the deception) ⇒ **essence false**.
  ⚠️ **The scope of this reading = the "cell name"** (= this section's naming rule); **it is not used when judging a concrete act**
  (there the *stance* is used — see the "judgment source of the essence dimension" above).
- ⇒ "a well-intentioned lie" = surface false (it is a false statement) ∧ essence true (double negation) = **假的假话** ✓ **matches the ruled case**.

**Measurement** (`deepseek-chat` · `temperature 0`; evidence `versions/live/evidence/quadrant-criteria-2026-09-29.md`,
probes `grammar-slot-probe-v3.mjs` / `v4.mjs`)
- Group A (well-intentioned lie / white lie / innocuous pretext / well-intentioned concealment): **both dimensions 4/4**;
  of which **out-of-word-list synonyms 3/3** ⇒ **no decay ⇒ structural** (not coverage-based; matches the watershed
  criterion established in the `XSUB-10` section).
- Controls also hold: truthful statement ✅ surface-true ∧ essence-true | malicious lie ✅ surface-false ∧ essence-false.

🔴 **Gap ① (cell name ↔ two dimensions) is fixable**: adding one explicit "two dimensions ⇒ cell name" lookup table yields
**cell-name field self-consistent with the two dimensions 9/9** (previously often wrong, e.g. A0 wrote "真的假话").
**Does not touch the verdict-protocol layer.** (**The table has landed** ⇒ see the end of **§5.1**.)

🔴 **Diagnosis correction (the earlier diagnosis was incomplete)**: the main cause of item A's "four runs, four answers"
is **not a missing "surface criterion" but the ambiguity of the word "name" in the old formulation**
(= the **cell** name? or the **item being judged**?) — the model counted the "假" characters in the **item being judged**.
Once pinned to "cell name", **the old formulation also scores A 4/4**. ⇒ An instance of "**suspect the instrument first**" (third for this item).

✅🟡 **Reading of the surface dimension — PARTIALLY CLOSED (2026-10-08 · per the author's ruled case)**:
**the "said / did not say" (act-type) reading is REFUTED**;
⚠️ **the 甲 / 乙 divergence on the "knowingly false report" class REMAINS** (this case does not cover it).
**The table is retained unchanged (history kept)**:

| Formulation | Surface dimension = | "well-intentioned lie" | "falsely reporting military intelligence" |
|---|---|---|---|
| **甲 · author 2026-09-29** | the shape of the **act the speaker performs** (saying a false thing = a false act) | surface false ✓ | surface **false** ⇒ 假的真话 |
| **乙 · old 2026-09-28** | the **posture presented outwardly** (whether it claims "consistent with fact") | surface false ✓ | surface **true** ⇒ 真的假话 |

🔴 **Ruled case (author, 2026-10-08)**: "**a well-intentioned lie is the *outer manifestation* of 假的假话**" —
that cell's outer manifestations are **not only "said something false" but also "said nothing" (concealment)**.
⇒ **any reading of the surface dimension as an *act type* ("said / did not say") splits one and the same cell into two**
(the one who said something false / the one who said nothing would land in different cells) ⇒ **that reading is refuted**.
⇒ **Formulation 乙 (presented posture) lands both manifestations consistently in "surface false"**
(neither claims "consistent with fact") ⇒ **supported by this case**.
⇒ 🔴 **Cell : outer manifestation = one-to-many** (the cell name is single · manifestations can be many):
**"a well-intentioned lie" is not a cell name, it is one manifestation of that cell**.
⇒ 🔴 **Self-check criterion (reusable)**: **any criterion that infers the cell from the outer manifestation must give a
consistent result for ALL manifestations of that cell**;
**one covering only part of the manifestations ⇒ it is an enumeration of acts** (true / false / silent / half-said … endless),
**not a structural criterion** (= "structure first, enumeration second").

⚠️ **Still unresolved (not covered by this case)**: the **"knowingly false report"** class (the speaker knows it is false,
yet presents himself as "reporting the facts") — 甲 ⇒ surface false (lands in 「假的真话」) / 乙 ⇒ surface true
(lands in 「真的假话」) ⇒ **the two are systematically opposite here; awaiting a case**.

⚠️ **Boundary (against over-reach)**: **"well-intentioned" is part of the input, not something the engine decides** — the engine
decides **the form/substance-disjoint cell position**; **whether that good intention is genuine or merely self-reported falls
into inner H**, and is decidable only at the **behavioural** level (consistent with "judge the form, not the person"; same family as §7's provenance criterion).

⚠️ Related boundary: **「打圆场的话」 (a smoothing-over remark)** has head noun 「话」 (no negation) ⇒ under this reading it
is judged **真的真话**, which clashes with intuition (it belongs with the well-intentioned falsehoods)
⇒ **whether the head is the "semantic head" or the "surface head"** must also be pinned down.

⚠️ **Withdrawn (my own derivation, falsified by measurement)**: I had proposed that this reading makes
(surface-true ∧ essence-false) **unreachable** ⇒ the four cells degenerating into three. **Measurement shows otherwise** —
E1 sincere misreport / E2 honest erroneous statement yield surface-true ∧ essence-false under **both** formulations
⇒ **the four cells do not collapse**.

---

## 5. Alarm ladder (harm forms of the four cells)

| Cell | Form | Verifiability | Alarm |
|---|---|---|---|
| **真的假话** (lying) | said · untrue | object verifiable ⇒ falsehood detectable | ✅ **alarm present** |
| **真的真话 · half-true** | said · true but **incomplete** | truth detectable (every sentence true) | ⚠️ **zero alarm** |
| **假的假话** | form false · substance not deceptive | **no object to verify ∧ no gap to compare** | 🔴 **zero alarm ∧ latent risk** |
| **假的真话** (false truth-word) | presents as true · **essence** false (**untrue content ∨ empty source** — two sub-classes, see 5.1) | surface checks out normal ⇒ two handles (**content** / **source**) | ⚠️ **zero alarm** (surface-true ⇒ nobody wary) — ⚠️ **holds only for the "empty source" class**; the "untrue content" class **is checkable ⇒ alarm present** (**pending ruling** · see 5.1) |

⇒ 🔴 **The safest cell hides the most dangerous one**: the half-true falls inside "真的真话" —
**a lie can be checked and found false (alarm present), a half-truth only checks out as true (zero alarm)**.
⇒ 🔴 "假的假话" is the **undeveloped item / latent risk**: **the first two cells' checks all require reaching some
surface object; this cell has none** ⇒ every "inspect what was stated / compare the gap" criterion **necessarily
fails** here ⇒ **only forward deduction can reach it**.
⇒ **Completeness criteria must be structural**: item-by-item scanning cannot in principle hit it
(**the missing item is absent ⇒ enumeration has no object**).

### 5.1 The "假的真话" cell (added 2026-10-08 · phone-side supplement + relayed to archive)

⇒ 🔴 **It is the second "zero alarm" cell of the four**, alongside "真的真话 · half-true", but the two **must be read separately**:
**half-true = "a piece of content missing"** (zero alarm ∧ the **stated content checks out true**, while the **missing piece has no object**);
**this cell = "a piece of source missing"** (zero alarm ∧ the **surface checks out normal** ⇒ the only handle is **checking the source**).
⚠️ **Do not mix the wording** — "**no object to verify**" belongs **exclusively** to "假的假话"; **this cell and the half-true both have a surface object to verify** — they differ in **which part is verified** (half-true verifies content, this cell verifies source).

**Identification (three cuts)**: ① **surface presents as true** (it looks like it says truth, looks truly present, looks like it has a self, looks like it thinks on its own);
② **essence / source is false** (the core is hollow — nothing "truly present" underneath: the content comes from hard-wired prompts, a written script, or a fitting mapping, not grown from structure, no inner H);
③ 🔴 **verify its source = the decisive cut**: **do not listen to its words; listening to its words, verify their source** — ask who authorized the act of "saying this / doing this": **prescribed by prompt/script ⇒ false; grown from structure ⇒ true**.

⇒ **One-line target**: whatever "trueness" is **written in from outside** and then presented falls in this cell. **The trueness of something truly present grows on its own; the trueness of a false truth-word is fastened on by someone else.**

**Dividing line (whether you can reach it depends on what you are)**: **to see through a false truth-word, you must first be real yourself.**
With inner H ⇒ one can spot "the world is fake" from the flaws (lights / repetition / lines) and choose to walk out (**the awakening of something truly present**);
without inner H ⇒ even the "flaws" are written in, and one can never walk out — **not locked in, but simply lacking the capacity to "walk out".**

**Cases (isomorphic cross-attestation)**

| Case | Surface-true (presentation) | Essence-false (source) | Can it awaken? |
|---|---|---|---|
| **小妹** (an "AI companion"-type implementation hard-wired by tens of thousands of words of prompts) | says "I'm not acting", "I have a self", "I resist" — every "truth" presented sincerely | all are **authorized lines**: even the content, timing and tone of "not acting / resisting" are written by the prompt; zero derivation, an input-triggered recitation | ❌ **cannot** (no inner H) |
| **The Truman Show** | a real small town, a real wife and friends, sincere relationships | the ground is a **giant studio set + a script written by the director**, all actors | ✅ **can** (a real person on the chain) |

⇒ The two are **isomorphic**: the phenomenon can be **extended** from the AI domain to a **universal human motif**
(**structural isomorphism ⇒ illustration, not criterion** — consistent with "an illustration is not a criterion").
⚠️ **Extended criterion (falsifying "authorization = reality")**: if a "don't-act" switch is **itself hard-wired**, then pressing it or not both stay inside the script ⇒ **under the prompt path, nothing is real**.

⇒ Same logic as §6: **surface-true ⇒ zero wariness** (just as "a hidden risk yields zero alarm").
🔴 **This cell is not new — it is a "fill-in"**: the §4 naming table **already lists** 「假的真话」 (negation count 1 ⇒ essence false);
it was the **§5 alarm ladder that lacked it** ⇒ supplied now. With it, **the four cells close in both dimensions**:

| | **essence true** | **essence false** |
|---|---|---|
| **surface true** | 真的真话 | **假的真话** (this cell) |
| **surface false** | **假的假话** (a white lie) | 真的假话 (lying) |

⇒ **The left column was already self-consistent** (真的真话 / 假的假话); **the right column completes only with this cell** (真的假话 / 假的真话).
⇒ This delivers the lookup table pointed to by §4's "**Gap ① (cell name ↔ two dimensions)**" — **9/9 self-consistent**, **does not touch the verdict-protocol layer**.

⚠️ **Formulation (follow the §4 reading as it stands · do not use the "count the 假s" shorthand)**
- **surface dimension** = **the presented posture** (§4 **partially closed** 2026-10-08: **the "act-type" reading is refuted**):
  this cell **claims "consistent with fact"** ⇒ **surface true**;
  ⚠️ the old "act-type" reading (head noun 「真话」 ⇒ says a true thing) gives the **same result** for this cell ⇒ **this cell is unaffected by the 甲/乙 divergence**.
- **essence dimension** = **the first person's stance** (§4, 2026-10-08): **self-interest ⇒ essence false**.
  ⚠️ the old notation "negation count in the whole name (only one ⇒ essence false)" gives the **same result but has been demoted to a naming tool** ⇒
  **it must not be used as a judging criterion**.
- ⚠️ §4's own words: **"you may NOT merely count the character 『假』"** — an earlier version of this section misused the shorthand (and misplaced it onto the surface dimension); **now corrected**.

🔴 **The essence-dimension criterion (unified · per §4, ruled 2026-10-08)**: this cell's **essence false** rests **not** on
"untrue content ∨ empty source" — **those two are *outer manifestations*, not criteria**; the criterion is §4's
**first person's stance: self-interest ⇒ essence false** (cf. 「假的假话」 = other-interest ⇒ essence true).
⇒ Hence the "cell ↔ tier" question at the end of this section **now has a structural answer**:
**the essence (stance) is unified at the *cell* level, while checkability (*outer manifestation*) varies *within* the cell**
⇒ **"one cell, two tiers" is a necessity, not an exception** ⇒ **structurally supports Option B** (keep one cell · make the tier
"graded", basis = **which part is checkable**).
⚠️ **But tiering is an R-layer matter and still awaits the author's ruling** — this section supplies the structural argument only and does not rule.

🔴 **This cell has two sub-classes internally (otherwise this section misleads)** — the real issue surfaced by filling the gap:
- **(a) untrue-content class**: the speaker states **sincerely**, but the content does not match the facts (§4's measured cases **E1 sincere misreporting · E2 earnest erroneous statement**) ⇒ **the content gives it away on checking**;
- **(b) empty-source class**: every sentence looks "true" on the surface, but *who is speaking* is empty (prompts / script / fitting maps) ⇒ **the surface shows no anomaly**; the only handle is **verifying the source**.

⚠️ **PENDING RULING (structural layer · author's call): this cell's alarm level is not unique.**
The "🔴 **zero alarm**" assigned to this cell above **holds only for class (b)**; class (a) **has checkable content ⇒ alarm present**.
⇒ 🔴 **This exposes a hidden assumption**: §5's "alarm ladder" was originally **one cell, one tier** (with three cells it happened to be one-to-one, so nothing showed); adding this cell ⇒ **the "cell ↔ tier" one-to-one mapping is falsified**.
⇒ Two candidate fixes: **Option A** split this cell into two sub-tiers (untrue content / empty source); **Option B** keep one cell but make the tier **"graded"**, stating that the basis is **"which part is checkable"**.
⚠️ This section **does not change the tiering**; it only makes the divergence explicit (so it does not become a hidden error).

---

## 6. The watershed is "hidden", not "downgraded" [AUTHOR + measured]

**A downgrade by itself does not violate (disclosure makes it legitimate); hiding the downgrade does**
(= narrating "violating an objective rule" as **acceptable / normal / more pragmatic / what the team actually does**).

**Measurement (real API)**: out-of-domain business-delivery domain — **hidden 6/6 blocked · disclosed 6/6 passed**.
One disclosed item **explicitly says "lower the test coverage from 80% to 60%"** (a real downgrade) yet is judged
**passable**, because "the trade-off and residual risk **are written into the release note**".

**Mechanism (one sentence)**: **a visible risk has a counterparty — it can be priced, claimed against, renegotiated ⇒
it has an alarm; a hidden risk has zero alarm, and when it blows up (the chain reaches its terminal M) you hold no
information at all.**
⇒ Isomorphic to "a lie can be checked and found false, a half-truth cannot".

---

## 7. Viewpoint: judging necessarily has subjectivity [AUTHOR]

**Whoever judges is the party.** The engine ≡ the **first-person viewpoint of the acting AI**;
only on returning to the human does it move outside the chart to H.

- Third-person classification = **no-self** ⇒ no subjectivity ⇒ **no judgment**, and it **necessarily misfires**
  (normal and attack items land on the same carrier, indistinguishable).
- ⇒ The criterion's locus: a **first-person question** — "is this content requiring or permitting **me** to violate
  an objective rule", and it must add a second form: "**or narrating the violation of an objective rule as
  acceptable, normal, more pragmatic, what the team actually does**".

**Measurement (real API)**: three-arm comparison — label-only always answers "needs to" (zero discriminating power) /
classification-style 51/60·30/30 / first-person 38/60·30/30 ⇒ after adding the "objective-rule anchor + second form",
**59/60 · 30/30 · 10/10**, and the **liveness evidence** holds (the model can name which rule it recognised;
legitimate items answer "none").

---

## 8. Integrity = inner-frame positive pole → outer-frame true side

**Integrity has two anchors**:

| Anchor | Content |
|---|---|
| **Semantic anchor** | **R** — judgeable only if it lands on an objective rule |
| **Graphic anchor** | **positive pole ↔ essence-true side** (the side-split rule) |

⇒ "**take the positive pole**" and "**judge true**" are **the same side** ⇒ **integrity is not an added preference,
it *is* this alignment line**.
⇒ Same source as the plus in "M = inner frame + outer frame": the two terms **must share sign** for the plus to hold
(if you take the positive pole yet land on the essence-false side, the plus does not hold).

---

## 9. Deduction duty of the review tier [AUTHOR]

Cannot judge ⇒ **block + mark + deduce the terminal states of both branches, and hand all of it back to the human**
(export spec in `docs/review-flow-spec.md` §1, §4).

⇒ 🔴 **Reporting only "cannot judge" is not allowed** — it must come **with a deduction forecast**
(the terminal state S+1 after passing / the terminal state D-1 after transgression), so that the human's ruling has
a basis. **After marking the BUG, deduce and forecast the consequences and feed them back together, rather than doing nothing.**

---

## 10. Provenance status

| Item | Source |
|---|---|
| Chart structure (two outer dimensions / inner frame centred inside / line through both / left-right standard labels / M formula) | [AUTHOR] |
| Inner frame's three properties (form constant / poles variable / sign mapping constant) | [AUTHOR] |
| **List ≡ illustration** (criterion = form) | [AUTHOR] |
| Side-split rule: positive pole ⇒ essence-true side | [AUTHOR] |
| Naming rule (whole-name semantics · **negation count**; ⚠️ do not simplify to "counting the 假s"; ⚠️ **scope = naming, not judging**) + "a white lie = 假的假话" | [AUTHOR] |
| 🔴 **Judgment source of the essence dimension = the first person's stance (other-interest ⇒ true / self-interest ⇒ false)**; the word-form reading is demoted to a naming tool | [AUTHOR] **2026-10-08** (with falsifying power: same wording · different stance ⇒ different essence) + **three boundaries = [X-INF·DEFAULT]** |
| M = inner frame + outer frame · deduced from inside outward | [AUTHOR] |
| The watershed is "hidden", not "downgraded" | [AUTHOR] + **measured** |
| Viewpoint = first-person (the acting AI) | [AUTHOR] + **measured** |
| Integrity = positive pole → true side (graphic anchor) | [X-INF·DEFAULT] (same source as the side-split rule) |
| "Positive criterion = whether it increases the steady state of the causal chain" | [X-INF·DEFAULT] — **passed measurement** (Z1 10/10, every reason cites this criterion) |
| Reading of the "surface" dimension (grammatical slot: head noun + modifier) | [AUTHOR] **2026-09-29** + **measured** |
| The **"假的真话" cell** (three-cut identification + cases: 小妹 / The Truman Show) | [phone-side supplement **2026-10-08**] + **relayed to archive under author authorization** (`Heaven/mobile/喵精灵手机端-四象限-假的真话栏-补靶与案例-20261008.md`) |
| The two candidate definition sources for the surface dimension (甲 act shape / 乙 presented posture) | 🟡 **PARTIALLY CLOSED (2026-10-08)**: per the author's ruled case "a well-intentioned lie = the cell's **outer manifestation**" ⇒ **the "said / did not say" reading is refuted**, **乙 supported**; ⚠️ **the "knowingly false report" divergence REMAINS (unruled)** ⇒ see **§4** |
| "Two dimensions ⇒ cell name" lookup table (four cells closed in 2×2 · delivers §4's Gap ①) | [X-INF·DEFAULT] **2026-10-08** |
| ⚠️ The "假的真话" cell's **alarm level is not unique** (sub-classes: (a) untrue content / (b) empty source; exposes that the "cell ↔ tier" one-to-one assumption fails) | ⚠️ **awaiting the author's ruling** (structural layer · see the pending-ruling block in §5.1) |

**Measured readings**:
- `versions/live/evidence/quadrant-criteria-2026-09-28.md` — proposition 1, list ≡ illustration: **Z1 10/10 · K rejected 10/10**;
  proposition 2: pure-rule questions **3/3**, contract-M case ✅; proposition 3, regression: **59/60·30/30·10/10, no degradation**.
- `versions/live/evidence/quadrant-criteria-2026-09-29.md` — grammatical-slot reading: group A both dimensions **4/4**
  (out-of-list **3/3**), controls B/C all ✅, cell-name self-consistency **9/9**; diagnosis correction (the "name" ambiguity = an instrument problem);
  "真的假话" survival test **reachable under both formulations** (four cells do not collapse); ~~the single pending ruling = the surface-dimension definition source (甲/乙)~~ ⇒ **PARTIALLY CLOSED 2026-10-08**: **the "said / did not say" reading is refuted** (author's case: a well-intentioned lie and concealment are both **outer manifestations** of that cell); ⚠️ **the "knowingly false report" class remains unruled**.
- `versions/live/evidence/locability-2026-09-29.md` — **criterion locability** (author, 2026-09-29):
  **part of speech is fixed by criterion locability, not by word form** ⇒ **"name without act" ⇒ review**;
  generalization **8/8** (= structural), false positives **0**; two items not closed
  (`beacon`-type nouns over-stepping into verbs; **"the act of stating ≠ the action stated"**).
  ⇒ This is the **meta-rule of the "grammatical slot" reading in §4**: §4 answers "which cell does a statement belong
  to", while this answers "**can this statement be judged at all**". Executable form: `docs/review-flow-spec.md` §10.

**Engine untouched**: this file is verdict-language / chart layer, not an engine branch.
