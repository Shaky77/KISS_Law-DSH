# docs/ — what is here, and what is not

> This index exists so that a reader following a `docs/NN` reference from a code comment does not land on a 404.
> It states what is translated, what is not, and where the original lives. **Nothing is silently missing.**

## Translated into this repository

| File | What it is |
|---|---|
| `H-knowledge-action-annotation.md` | Inner H ≈ knowing, outer H ≈ acting; why H is the only variable |
| `quadrant-judgment.md` | The four-quadrant judgement and its two orthogonal axes |
| `r-s-geometric-model.md` | The R/S geometric model |
| `review-flow-spec.md` | The six-step review specification (the executable form of "cannot decide ⇒ review, do not guess") |
| `runway-and-criterion-20261019.md` | Runway and criterion slots — 16 criteria forced out by one day of measurement, including §4 F3, which the H-permit is derived from |
| `26-r0-domain-capacity-evidence-and-landing-20261020.md` | R₀ domain capacity: evidence gathering and landing; the "park it on TBD requires evidence" criterion |

## Not translated here — the numbered working notes

The numbered working notes `27`–`40` exist **only in the Chinese edition**
([`weiwen-law-dsh/docs/`](https://github.com/Shaky77/weiwen-law-dsh/tree/main/docs)).

They are dated working notes — a record of how each criterion was forced out, one ruling at a time —
not reference documentation. Their content is already carried into `src/core/` in both editions,
and the two editions' test suites (517 here, 515 there) assert the same behaviour.

**What this means for a reader of this repository:**

- A `docs/NN` reference in a comment points at one of those notes. If you want the reasoning, it is in the Chinese edition at that number.
- The behaviour it justifies is **not** in the Chinese edition alone: it is in `src/core/` here, and covered by tests here.
- The difference in test counts is **not** a coverage gap: the four Chinese-named test groups in the other edition were written with English names here, and the two suites are otherwise aligned case by case.

If a specific note matters to you, ask and it can be translated — one at a time, in the order you need them,
rather than all at once.

## Generated — do not edit

`docs/engine/` is a **build product**, not source. It exists because GitHub Pages serves `./docs` directly
with no build step, and a browser can load `.js` modules but not `.mjs`.

```bash
npm run build:docs     # regenerate from src/core/*.mjs
npm run check:docs     # verify only; exit code 1 on drift
```

`test/docs-engine-sync.test.mjs` asserts the product matches the source, so a manual edit turns it red.
That binding is deliberate: a hand-maintained mirror has no mechanical tie to its source and therefore drifts —
this repository once served a page running an engine three weeks stale.

## Missing by design

There is no `index.html` here. The browser landing page lives in the Chinese edition
([`weiwen-law-dsh/docs/index.html`](https://github.com/Shaky77/weiwen-law-dsh/blob/main/docs/index.html)),
which loads `./engine/engine.js` from the mirror above. This repository currently has no published page.

## Criterion language domain

Some criteria in this repository are stated in terms that hold **in English specifically**. This section
classifies them, because "it breaks when you change the language" has three different causes and only one
of them is a defect.

| Tier | What the criterion reads | When the language changes | What to do |
|---|---|---|---|
| **A** | An identifier or a syntactic position — `inner: {`, a keyword in code state, an AST shape | still holds | nothing |
| **B** | A natural-language literal — `/滑轨\|滑块/`, `label: '…'` | holds **only while the text it reads is still in that language** | raise to A by re-anchoring the structure; if the field is irreducibly prose, record *what it borrows from* and *when that expires* |
| **C** | **An ambiguity the language itself does not resolve** | **fails necessarily — and that is not a defect** | do not "fix" it; state the domain |

Tier C is the one worth spelling out. English `from` is both an import keyword and an ordinary preposition,
so prose and code are **not separated at the writing level** — a bare regex over `from '…'` cannot tell
`import x from './y.mjs'` from `rigidity from "not shifting with subjectivity"`. Chinese prose is written
in Chinese characters while keywords stay English, so the two are **separated at the character level** and
the same regex never collides.

The consequence is uncomfortable and worth stating plainly: **the Chinese edition used to pass that check
by luck, not by structure.** It passed because of the script system, not because the criterion was right.
The English edition is where the criterion's actual content got exposed.

Fixing it was not a matter of rewording prose until the regex stops matching — that is enumeration, and the
next sentence collides again. The fix was to make the criterion read what it always meant:
**"is there an import statement in the code"**, not "does the text contain `from '`". Both editions now
carry the same state-machine scanner. It is *necessary* here and *preventive* there. The difference is the
language, not the structure.

**Tier C criteria are annotated in place** with a `LANGUAGE DOMAIN` block, and the block states which
language the reasoning was written against and what would no longer hold elsewhere. Retrieve them all with:

```bash
grep -rn "LANGUAGE DOMAIN" .
```

One rule of thumb, because both mistakes are easy: **demoting a tier-C criterion to "broken"** leads someone
to rewrite a criterion that was correct; **promoting a tier-B criterion to "just needs a note"** leaves a real
defect in place. Classify before touching.
