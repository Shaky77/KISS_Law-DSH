# docs/ — what is here

This folder holds one thing: the **browser mirror of the engine**.

| Path | What it is |
|---|---|
| `engine/` | **Build product.** `src/core/*.mjs` compiled to `.js` so a browser can load it. Regenerate with `npm run build:docs`; verify with `npm run check:docs`. |

`test/docs-engine-sync.test.mjs` asserts the product matches the source, so a manual edit turns it red.
That binding is deliberate: a hand-maintained mirror has no mechanical tie to its source and therefore drifts —
this repository once served a page running an engine three weeks stale.

```bash
npm run build:docs     # regenerate from src/core/*.mjs
npm run check:docs     # verify only; exit code 1 on drift
```

## Not here

The framework's internal design notes are not published. The behaviour they justify is in `src/core/`
and is covered by the test suite in this repository — **that is the reference, not a document.**
If a criterion matters to you, read the code that enforces it and the test that pins it.

## Missing by design

There is no `index.html` here. The browser landing page lives in the Chinese edition
([`weiwen-law-dsh/docs/index.html`](https://github.com/Shaky77/weiwen-law-dsh/blob/main/docs/index.html)),
which loads `./engine/engine.js` from the mirror above. This repository currently has no published page.
