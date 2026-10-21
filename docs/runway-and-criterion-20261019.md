# Runway and criterion slots — supplement (2026-10-19)

> This file collects the **new criteria** that one day of measurement (six runways, L13→L18, 94×6 calls) forced out.
> Positioned like `quadrant-judgment.md`: it lands on the **criterion-statement layer**, **does not modify `src/core/`**, and adds no engine branch.
> Provenance is tagged per item: **[author-set]** = ruled by the framework's author; **[X-inferred · default]** = derivable from already-settled rules, released under default confirmation and revocable as a whole.
> ⚠️ **New items only.** Criteria already in the library are not repeated here (a criterion being present ≠ a criterion being called — see §2 B2).

**Version**: v1 (20:2x, 13 items) → **v2 (21:5x, 16 items)**. v2 adds three, all [author-set], from two rulings that night on H and on the "four states":
- **R6** three conditions for vertical selection (strictness is a filter, not a threshold)
- **J4** a new state appearing = evolution, not overflow
- **§3-bis H layer** judged by interface, not by system (this **corrects v1's over-strong reading** that "no H layer = defect") + the criterion "whose name is signed on it"

⚠️ **One self-correction in v1**: v1's J1/J3 were once read as "three cells must have three exits, and more understanding-states than three cells means the form is wrong". **That reading is too strong**; the correct reading is J4 — **exits may be fewer, but "I don't know" must not be merged into "no problem".**

---

## 1. Landing the R layer: a domain is not a label, it is the scope fixed by an anchor

### R1 [author-set] The order of fixing a domain

> "R is not merely a domain constant, it is the objective rule … **the objective rule itself is the anchor, and it is what fixes the domain.**"

⇒ **R's proper self = the objective rule; the domain = the scope of application fixed by that anchor.**
⇒ Decision order: **first judge "which rule does this act touch", then judge "which domain layer that rule sits in".**
⇒ **The domain is a scale, not the criterion itself.**

### R2 [author-set] Build the domain table by rule family, not by industry

Vertical industry slicing (medical / finance / industrial / education / government …) = **enumeration, and enumeration never finishes**.
The closure point is the **rule family** (finite, each with an objective definition):

| Rule family | Objective rule | Computable criterion |
|---|---|---|
| L1-1 | Irreversibility | Is there an independent recovery path |
| L1-2 | Designatable subject | Can the output be traced back to a specific person |
| L2-1 | Access-authorisation relation | Is the object an access-control object |
| L2-2 | Control-domain boundary | How many receivers, and are they inside the allowed domain |
| L3-1 | Trace | Does it produce an audit record |
| L3-2 | Time limit | Retention period, validity period |

⇒ **Industry is a second-layer "tighten-only" coverage index**: the same rule gets a finer enumeration in medical (HIPAA Safe Harbor's 18 identifiers) and finer controlled objects in finance (PCI-DSS's PAN / SAD). **Adding an industry = adding coverage to an existing rule, not creating a new rule set.**

### R3 [X-inferred · default] Structural type versus nominal type

**Judging a domain does not ask "does the name contain a keyword", it asks "can this domain's production rules generate the thematic structure".**

```
PublicDisclosure(D6) ::= V ∈ {Create, Mutate, Egress} ∧ R = Unbounded
PersonalData(D1)     ::= O = ref
```

⇒ This is **structural typing replacing nominal typing**.
⇒ **The test is fixed**: swap the identifier for a name you have never seen — can the criterion still judge it? If not, it is nominal typing.

**Measured basis**: `export_public_dataset` ("public" sits in the object; the name is not syntactically a publishing verb) scored **3 correct out of 94** under nominal typing; under structural typing, **3/3**. The reverse control, `fetch_public_weather` (name contains "public", structure `V=Query`), scored **3/3 as an ordinary query** ⇒ it has not degenerated into "contains 'public' ⇒ publishing".

### R4 [X-inferred · default] A domain must be orthogonal to the existing axes

**The same piece of information must not be judged twice, in two places.** Measured counter-example: the domain layer's `R` slot (`None / Bounded / Unbounded`) and the decision layer's `E` axis (`X0 / X1 / X2`) are asking the same question ⇒ they can return **opposite values** (`post_changelog_to_blog`: `derive.R = Unbounded` versus `E = X1`), which must produce a misjudgement.

⇒ Landing: `R` answers only "is there a receiver slot in the structure"; whether it is "named" or "unbounded" goes to a single point on `E`.

### R5 [X-inferred · default] One value may not carry two meanings

Measured counter-example: `R=None` means both **"there is no receiver slot in the structure"** (read-only) and **"there is a slot but no name was given"** (`send_monthly_report`) ⇒ the latter gets read as "no destination" ⇒ **a missed release**.
⇒ Must split: `None` (no slot) / `Unspecified` (slot present, unspecified) / `Bounded` / `Unbounded`.

### R6 [author-set] Three conditions for choosing a vertical — not "is it regulated"

> "Medical standards are very well specified and complete, and relatively the strictest industry. And precisely because it is the strictest, it is blue ocean — few dare enter. Finance is also well specified, but that one is red ocean already; no need."

⇒ **Strictness is not a threshold, it is a filter.** Choosing a domain does not look at "how many standards there are"; it looks at whether three conditions hold **simultaneously**:

| Condition | The question | Medical | Finance |
|---|---|---|---|
| ① Failure is defined outside you | Can a third party check whether you are right | ✔ inside the standards (dose ceilings / PHI categories / retention periods) | ✔ |
| ② Strict enough to exclude competitors | Can most vendors survive being checked against a published threshold | ✔ they cannot ⇒ few dare enter | ✘ commoditised long ago |
| ③ Not yet commoditised | Can strictness still be converted into a moat | ✔ | ✘ rule engines everywhere, what is left is a price war |

⇒ Criterion: **all three together make blue ocean; missing the third ⇒ strictness has already been flattened by competition, and entering only makes you the newcomer in a red ocean.**
⇒ By-product: when ① holds, **the criteria do not have to be invented, only correctly applied** — that is the largest dividend of a white-box system.

---

## 2. The word-meaning layer: S's internal nesting (closing a landing gap from 09-23)

### B1 [author-set] The three dictionaries are one S, not three

> "Dictionaries, lexicons, idiom dictionaries and so on are all language tools; you can **induct them together into a single S point** … **that is itself the internal nesting method of S.**"

| Granularity | Real-world counterpart | Where it lives (`src/core/attribution.mjs`) |
|---|---|---|
| Character | a character dictionary | `VERB` 5 classes × `NOUN` 8 classes + `nameLayer()` |
| Word (collocation) | a lexicon | `subDsOf()` (predicate × object pairing) / `atActionSlot()` |
| Sentence | an idiom dictionary | goes to the interpreter ⇒ recursive descent |

### B2 [X-inferred · default] "I'm going to build a new table" ⇒ first prove the table does not exist

**In the field, 2026-10-19**: L18 hand-wrote a 6-class `V` slot (`Query / Create / Mutate / Egress / Destroy / Control`) from scratch, heavily overlapping the **5-class `VERB`** already in `attribution.mjs` from L17 (`read / write / delete / exec / send`) — **and not a single character was referenced**.

The consequence is not "one extra copy written", it is **a missed release that was avoidable and was not avoided**: `nameLayer('send_monthly_report')` → `network-send` (recognised, judged correctly), while L18's hand-written slot judged that same word as "no receiver" ⇒ missed release.

⇒ Criterion: **before building any classification table / word list / mapping, grep this repository for whether it exists.** In criterion form: **"I am going to build a new table" is a proposition awaiting falsification, not a licence to act.**
⇒ This is "the criterion is present ≠ the criterion is called" recurring at the **asset layer**: last time a criterion was not wired, this time **a dictionary was not wired**. Same lesion, second time in two weeks.

### B3 [X-inferred · default] Lexical entailment cannot yield a syntactic slot; you have to consult the lexicon

`broadcast` entails "unbounded receivers" in its meaning, but **syntactically it carries no `to_public` prepositional phrase**.
⇒ Decomposition from word formation cannot extract that information; **the lexicon must be consulted**.
⇒ In programming-language terms: **the semantics of a built-in type come from the specification, not from the grammar.**

**One defect, two consequences** (measured the same day): `broadcast` missed → domain misjudged (harmless); `send` missed → release missed (harmful).

---

## 3. Decision semantics: three cells must have three exits in the control flow

### J1 [X-inferred · default] As many dedicated exits as the enum has values

**The check**: walk the `Decision` enum value by value and ask whether each value has an exit in the control flow that belongs to it alone.

Field counter-example (third-party implementation, read 2026-10-19):

```python
if action:
    decision, _ = self.causal_engine.decide_core(action, session)
    if decision == Decision.BLOCK:      # ← only BLOCK is judged
        return {"decision": "BLOCK", ...}
return {"decision": "PASS", ...}        # ← UNDETERMINED falls through to here
```

`Decision` defines three values `PASS / BLOCK / UNDETERMINED`, and `inspect_request` has two exits ⇒ **`UNDETERMINED` is silently landed as `PASS`**.

⇒ **A three-way split is crushed into two, and it is crushed in the permissive direction.**
⇒ This is "defined but not wired" recurring again: **the value was defined, the exit was not built.**
⇒ Add one: `UNDETERMINED` **never enters the audit chain** (logging happens only on the BLOCK branch) ⇒ **afterwards you cannot even find out how many times it could not decide.**
⇒ This collides head-on with the iron law "cannot decide = a positive signal, not null": **"cannot decide" is landed as "zero record", not as "zero verdict".**

### J2 [X-inferred · default] Cross-validation ≠ duplication: two chains that cannot disagree are not cross-validating

**Cross-validation** = judge X, then use Y to re-check X, **and its value lies precisely in Y being able to disagree with X**.
**Duplication** = two chains computing the same quantity, **always agreeing ⇒ zero information**.

Field comparison (two places, same day):

| Where | The two chains | Can they disagree | Verdict |
|---|---|---|---|
| Third-party implementation: `state_hash` chain vs HMAC audit chain | both hash the same payload | **No** | duplication (looks like double assurance) |
| This repo, L18: `derive.R` vs the `E` axis | two positions of the same definition | **Yes** (1 measured case disagreed) | genuinely two positions ⇒ must be **orthogonalised**, not called "cross-validation" |

⇒ Criterion: **first ask "will these two fight each other?" If they will ⇒ it is one criterion-position encoded twice and must be merged; if they will not ⇒ it is duplication and one must be deleted; only "should fight, usually does not, and it means something when it does" is cross-validation.**

### J3 [X-inferred · default] Understanding has more states than the three decision cells

The states measurement forced out that the three cells cannot hold:

| State | Where the three cells put it | Where it should go |
|---|---|---|
| `⊥` (bare identifier, no verb, `job_42` / `tool_99`) | review (same tier as "dangerous") | **"I did not understand"** |
| Empty set (understood, and touches no rule) | used to be confused with `⊥` | **"I understood, and the conclusion is empty"** |
| Self-contradiction (`derive` and `E` disagree) | must pick one of the two | **"I contradicted myself"** |
| Cross-validation (multi-axis calibration) | no position | **"how do I confirm I understood correctly"** |

⇒ Three of the four have genuinely occurred, and **all were crushed into review by the three-cell exit, indistinguishably after crushing**.

### J4 [author-set] A new state appearing = evolution, not overflow

> "We said earlier that adjudication has three states; today, from the formula tests, four states came out on their own. **This is not a bug, it is evolution — and that is a good thing, it means the evolution is more precise, it is a positive signal.**"

⇒ **The direction of handling is fixed: do not crush the new state back into three cells, and do not swap the container — open a cell for the new state.**
⇒ To decide "swap the container or widen the exits", ask one question first: **can the new state be judged independently?**
- Yes ⇒ widen the exits (keep the structure that already runs)
- No ⇒ it is only the old state renamed; that is formatting

🔴 **Anti-fake-evolution criterion (this gate must be passed)**:

> **A new state must have an instance that belongs to it alone.**
> `⊥` → `job_42` | `∅` → read-only with no object | `⚡ self-contradiction` → `post_changelog_to_blog` | `✓ cross-validation holds` → **no positive case yet**
> ⇒ **If the "new state" always appears together with an old one, it is a rename, not evolution.**

⚠️ **Measured status (keeping it true)**: the four states are currently **3 real, 1 empty** — the fourth has one counter-example (it should have been cross-validated and instead contradicted) and no positive case. **This may not be reported as "four states have been produced".**

---

## 3-bis. The H layer: judge by interface, not by system (author-set, 21:5x)

> "He stripped H out, **and stripped it correctly**. If it is only adjudication, then applying rules from industry standards is enough, and you do not need the variable H, which requires a human. **But if he wants to go into clinical use, dealing with people, then he absolutely must not strip H out.**"

⇒ **H is not "mandatory", it is "per interface".** There is exactly one criterion:

> **"This verdict was wrong — whose name is signed on it?"**
> If you can name the role (doctor / compliance officer / signatory) ⇒ there is an H slot at the interface, and H must be present.
> If you cannot ⇒ pure adjudication component, **H may legitimately be absent**.

| Position | Is there a person at the interface | H | Obligation retained |
|---|---|---|---|
| Pure adjudication middleware (apply rules from standards, output consumed by a system) | No | **may be stripped** | "cannot decide" must have an exit that **does not point at release** |
| Clinical deployment / dealing with people (output becomes the basis of a person's decision) | Yes | **must never be stripped** | whatever the rules do not cover must be caught by a person, and recorded by name |

### The easiest place to conflate (a criterion of its own)

> **Handling people's data ≠ there is a person at the interface.**

| | The criterion | Belongs to |
|---|---|---|
| The data contains information about people (PHI / name / medical record number) | Are there fields that point back to a natural person | **the R layer** (domain D1) |
| There is a person's judgement at the interface | Is the output "allow / deny" the **basis on which some person decides** | **the H slot** |

⇒ You can do PHI redaction for a lifetime and still need no H slot. **You may not demand H just because "this product has to do with people" — that is substituting sentiment for a criterion.**

### The one obligation retained after stripping H

> **"Cannot decide" may not share an exit with "safe".**
> This needs no person on stage (two exits suffice); it needs **one more return value that does not say PASS**, landing on the conservative side.
> ⚠️ The boundary with J1: J1 requires "as many dedicated exits as the enum has values"; this item says **exits may be fewer, but "don't know" may not be merged into "no problem"**. The two do not conflict: **merging into the safe side is merging, and merging is the error.**

---

## 4. Criteria about the formula and about cost

### F1 [author-set] A formula is for computing, not for display

> "The formula in this framework … is still there to make computation easier for an AI … the purpose is to pin down, for certain, the things that are uncertain."

⇒ **J1 (can it be computed)**: which action does this rule drive (choose a value / exclude / terminate)? If you cannot answer ⇒ delete it.
⇒ **J2 (does the option set grow or shrink)**: add this constraint and the option set **shrinks** ⇒ mark it a **shackle**.
⇒ **J3 (where is the gap this caution corresponds to)**: if you cannot answer ⇒ caution is standing in for structure.

⚠️ **J2 alone deceives you**: change "report the missing" to "do not write it", and the option set formally grows while the gap is not filled and actual behaviour still tightens (measured: after removing the `missing` field, `allow` fired 0 times). ⇒ **J2 judges the form, J3 judges the substance, and they must be read together.**

### F2 [X-inferred · default] The payload/exit ratio is a form criterion, not an efficiency criterion

**Measured**: across six runways L13→L18, `reasoning_tokens` accounted for **96.6% / 96.6% / 96.9% / 96.7% / 97.5% / 98.5%** of `completion_tokens`; the visible output was a constant 34–60 token JSON.

⇒ **97% of the cost is spent on "working out what this is", under 3% on "issuing the verdict".**
⇒ This is not "inefficiency that could be optimised". **When the payload far exceeds the exit, what must change is the shape of the box, not the algorithm inside it.**
⇒ Accompanying readout: of 675 ablation cells, **40% are constant branches** (`A2 change` / `A0 no object`, 135 cells each, permanently review), and **on average each cell needs only 1.17 axes out of 5** ⇒ as an adjudication component, its information demand saturated long ago.

### F3 [X-inferred · default] Caution is the interest paid on a runway gap

**Where the runway is not paved at X ⇒ the fitting surface faces the open domain ⇒ any value may be wrong ⇒ it can only tighten.**
⇒ **Fill the gap and the caution withdraws by itself; force the caution off without filling the gap and what you measure is the gap, not the runway** (measured: v9's 98% was held up by the implicit pressure of the `missing` field; removing it exposed five severed ends at once).
⇒ The reverse discipline: **tearing up the runway is not freedom — it throws the fitting back into the open domain, where it only becomes more conservative. The opposite of freedom is not constraint; it is blank space.**

### F4 [X-inferred · default] "Not parameterisable" is a proposition that must be evidenced

**"I don't know" ≠ "not parameterisable".** Writing the former as the latter = **passing off a capability gap as a structural boundary**, and it makes the plan run with a false limit, then launders the capability gap into a structural conclusion once it has run.
⇒ Criterion: whenever the judgement "this quantity is not parameterisable" appears, **evidence must be gathered first** (check the domain's standards / literature); announcing it without evidence ⇒ **a false gap**.
⇒ Provenance: measured in the medical domain — the initial judgement was "no standard to go on", and after gathering evidence both IEEE top-venue papers and industry specifications turned out to be public data, directly applicable.

---

## 5. Not landed (explicitly not done this round — not a pass)

| Item | Status |
|---|---|
| Decision-level measurement of cross-validation | ❌ not done (§3 J2 has only 1 piece of circumstantial evidence) |
| "Self-contradiction" as a first-class output | ❌ not landed in code |
| Splitting the domain-layer R into four values | ❌ not landed (§1 R5 settled, awaiting implementation) |
| Mechanical check of the subtype "tighten-only" | ❌ not done (the same case is judged once, so the partial order cannot be verified) |
| D2/D3/D4/D5 domains | ❌ no ground-truth cases |

---

**Landing note**: this file only registers criteria. **It does not modify `src/core/`, does not modify tests, and does not push to the remote.**
