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
