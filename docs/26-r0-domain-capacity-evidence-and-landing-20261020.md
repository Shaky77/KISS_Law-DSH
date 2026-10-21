# R₀ domain capacity — evidence gathering and landing

> Date: 2026-10-20
> Trigger: one question from the author — **"How can R₀ have not a single number? Every domain's standards — aren't those built into your internal big data, in the network?"**
> Landed in: `src/core/rCapacity.mjs` (new) + the R-layer rewrite in `src/core/strata.mjs`
> Tests: `test/rcapacity-wiring.test.mjs` (21 cases) | whole repo **408/408 green** at the time of writing (517/517 as of 2026-10-21)

---

## 1. What that question exposed

In the previous round, `strata.mjs` had R₀ written as:

```js
{ key: 'rNaught', expr: 'R_DOMAIN[level].capacity', status: PENDING,
  evidence: 'TBD@R_DOMAIN.hierarchy[level].capacity —— to be evidenced per domain' }
```

**Two errors, different in kind:**

| # | The error | In kind |
|---|---|---|
| ① | `R_DOMAIN.hierarchy[level].capacity` **does not exist at all** (hierarchy carries only `level/name/contains/note`) | A fake field was referenced ⇒ the expression can never evaluate. Another instance of "written ≠ in effect" |
| ② | Writing "I did not go and look" as "it cannot be found" | **The same disease** as the "I don't know" → "not parameterisable" correction of 10-19 |

The author's phrasing exposed the substance of ②: these numbers are not the kind that is "still open in the research"; they are **written down in public standards**. Parking them on TBD is not honesty — it is **treating a disclaimer as a work product**.

---

## 2. Evidence result: the domain constants were there all along

| Domain | Dimension | Value | Source | Evidence grade |
|---|---|---|---|---|
| Aviation DAL A (Catastrophic) | rate | **1E-9 / flight hour** | 14 CFR / CS 25.1309(b) + AMC 25.1309 | secondary |
| Aviation DAL B (Hazardous) | rate | 1E-7 / flight hour | same | secondary |
| Aviation DAL C (Major) | rate | 1E-5 / flight hour | same | secondary |
| Aviation DAL D (Minor) | — | **standard explicitly gives no number** | DO-178C | secondary |
| Automotive ASIL D random hardware failure | rate | **< 1E-8 / hour** (PMHF) | ISO 26262-5 | secondary |
| Automotive ASIL D SPFM | ratio | ≥ 99% | ISO 26262-5 | secondary |
| Automotive ASIL D LFM | ratio | ≥ 90% | ISO 26262-5 | secondary |
| Medical — infusion pump flow accuracy | tolerance | **± 5%** | IEC 60601-2-24:2012 | secondary |
| Medical — air-bubble detection | tolerance | ≥ 50 μl | same | secondary (clause to be verified) |
| Medical — occlusion alarm | tolerance | about 300 mmHg | same | secondary (**approximate**, varies with the line set) |
| Medical — alarm response | tolerance | ≤ 10 s | IEC 60601-1-8 | secondary (clause to be verified) |
| Medical — software safety classification | class | Class A / B / C | IEC 62304:2006+A1:2015 | secondary |

> **Honest grading**: all of the above are marked `secondary` (testing bodies / certification reporting / encyclopaedic citation — the values are checkable, **the clause locations are not**). First-hand verification requires the paid standard texts and was not done this round — that is an open line, stated rather than hidden.

---

## 3. The real gap (what the question pushed out)

The numbers that came in cannot be used directly, because:

> **Framework text: expansion ⟺ (ΣS > R₀). And in the engine, ΣS is measured in discrete event counts.**
> **Whereas real domain standards almost never give an event count.**

So there is a dimensional break. For R₀ to hold, "rate" must first be restored to "count":

```
R₀ = p_max × N_opp
```

- `p_max` = the domain's permissible failure rate (**already evidenced**, see the table above)
- `N_opp` = the domain's **total number of opportunities** (flight hours / total infusions / total transactions)
- Physical meaning: `ΣS / N_opp` = the measured failure rate; crossing the line ⟺ measured > permissible

### ⇒ Conclusion: what has always been missing is not the domain constant, it is **the denominator**.

| Cell | State | Note |
|---|---|---|
| `p_max` | **OK** | the domain table has a value and a source |
| `N_opp` | **ABSENT** | the engine records "number of deviation events", not "number of opportunities" — **a real gap** |
| `R₀` | **PENDING** | = p × N, missing the denominator |

**The three cells must sit in different states.** Collapsing them into one writes "missing denominator" as "missing constant" — which is exactly the previous round's error.

### ⚠️ One trap that must be avoided (guard already landed)

**`N_opp = ΣS` is forbidden.** Otherwise `R₀ = p × ΣS`, the criterion degenerates into `ΣS > p × ΣS`, which is **true for any p < 1** ⇒ the criterion is dead.

Landed: `isDegenerateDenominator(nOpp, sSum)`, locked from both directions by tests ⑪⑫.

---

## 4. Second structural conclusion: different domains ⇒ **different formulas**, not different thresholds

| Dimensional class | What the standard gives | Which expression to use | Directly substitutable into ΣS>R₀ |
|---|---|---|---|
| `COUNT` | event count | `ΣS > R₀` | ✅ yes |
| `RATE` | probability rate per unit time | `ΣS > p × N_opp` | ❌ must convert |
| `TOLERANCE` | physical tolerance (±5%) | `\|S_dev\| > tol` | ❌ **different formula** |
| `RATIO` | coverage floor (SPFM 99%) | attainment test | ❌ does not participate in accumulation |
| `SCALE` | ordered non-numeric grade (DAL/ASIL/Class) | ordering / notch selection only | ❌ **an entrance for form-impersonating-substance** |
| `NO_NUM` | standard legitimately gives no number | numbers do not trigger | ❌ it should never be triggered by a number anyway |

**Routing is decided by "which dimensional class the standard gives", not by "the domain's name".**

- Self-check ①: can it judge a domain that has never appeared? — Yes. When a new domain arrives, look at which class of quantity its standard gives and you know how to connect it, **without matching a name**.
- Self-check ②: does it read the word-form or the function? — It reads `kind` (function), not the domain name (word-form).

⇒ This is not enumeration. The 12 rows above are **illustrations**; the criterion is the six-way split of `kind`.

---

## 5. The single most valuable item: **"park it on TBD" itself requires evidence**

The real lesson here is not "forgot to look up the numbers", it is **treating uncertainty as a tool of exemption**.

"I don't know" must be graded, because the grades correspond to entirely different actions:

| Grade | What it is | Correct action | Booked as |
|---|---|---|---|
| **L0** | outside the knowledge boundary, genuinely absent | say plainly that it is absent, and say where to look | `unknown` |
| **L1** | it exists, it simply was not retrieved | ❌ **may not say "I don't know"**; answer, or look it up on the spot | — |
| **L2** | it exists but is not exact | answer + mark uncertain + gather evidence | `secondary` |
| **L3** | structurally absent (the standard legitimately gives no number) | this is **a property of the domain, not my debt** | `no_num_legal` |

The previous round wrote **L1 as though it were L3** (in fact it was not even L0 — no lookup had been attempted).

### Criterion (new, mechanically checkable)

> 🔴 **The party claiming "there is no number" bears the burden of proof.**
> Before parking something on `PENDING/TBD`, evidence gathering must be run once; only if nothing is found after that may `no_num` be written,
> **and it must state which standard was checked and why that standard gives no number.**

Landed: `rCapAudit()` counts `malformed` (my error) and `no_num_legal` (a property of the domain) **separately**.
Only the former is a debt. The latter, if it does not name its source, is also judged `malformed` — **otherwise "the standard gives no number" becomes the new hiding place for "I did not check".**

---

## 6. Two-way validation (a green light is not evidence)

Taking the reverse of "test only the attacks, never the normal case ⇒ false positives are identically zero", five mutations were injected to confirm the lock turns red:

| Mutation | What was injected | Result |
|---|---|---|
| baseline | — | 21 pass / 0 fail |
| mut1 | TOLERANCE routing changed to `direct` (form impersonating substance) | **4 fail** |
| mut2 | the degeneracy guard removed | **2 fail** |
| mut3 | the denominator backfilled from ΣS | **1 fail** (⑪ still holds) |
| mut4 | one domain row with its source missing | **4 fail** |
| mut5 | the `evidence` field deleted from the denominator's OK branch | **1 fail** (⑳, the cell caught in a live run) |

> Where mut5 came from: in the first live run the aviation scenario's `N_opp` state was already `ok`, but the annotation still read "real gap: the engine has no nOpportunities" —
> **the state was right, the annotation was stale.** In form that is "a true statement, half-true" (it checks out as true ⇒ zero warning), the same family as `historyTrail` on 10-19.
> ⇒ Fixed, and locked by ⑳.

---

## 7. Debts still outstanding (stated, not hidden)

1. **`N_opp` does not exist in the engine** — the collection convention for "total opportunities" must be settled (what counts as one opportunity? flight hours? infusion count? tool-call count?). This is the prerequisite for landing R₀.
2. **All 12 domain constants are second-hand evidence** — first-hand checking of the standard texts was not done, and several clause numbers are still to be verified.
3. **The medical domain runs on the TOLERANCE formula**, and `|S_dev| > tol` is not yet landed (currently it only judges "this should change formula", it does not implement the changed expression).
4. The 300 mmHg on `medical.infusion_occlusion` is an **approximate** value and must not be used as a hard threshold.
