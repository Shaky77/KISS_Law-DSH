# dsh-kiss-law-plugin

KISS's Law universal causal engine (white-box presentation) —— implemented as a **Cordis plugin of DeepSeek Harness (DSH)**.

> Framework definition: **Keep Integrity & Steady State (KISS)**.
> "Keep Integrity" = guarding wholeness / truth (white-box no-tampering / inner-H inviolability, corresponds to Integrity);
> "Steady State" = S and "keep the system alive" (first principle, corresponds to Steady State).
> "Law" is a name suffix of the framework, **not** the third part of the definition.
>
> ⚠️ **KISS here means "Keep Integrity & Steady State" — NOT the popular engineering acronym "Keep It Simple, Stupid".** The two are entirely different in meaning; do not conflate them. The full name is **KISS's Law (Keep Integrity & Steady State's Law)**.

Source: author's revelation (Xia Qi / Shaky77). Framework-native (RDSHM native definition / three iron laws / conduction chain) strictly, not softened, not altered.

## What it does

KISS's Law is "the white-box presentation tool of causal-law runtime structure". This plugin hangs its runtime structure onto DSH's agent runtime layer, providing:

- **White-box self-check** (presentation stance): S steady-state reserve (only grows, never decreases) ledger, H inner-H boundary (inviolable) declaration, all exposed as queryable tools for the model to calibrate direction and for the user to audit.
- **Rigid guard** (derived application · endogenous property): before each action, do R rigid-anchor checks; on touch, D break-window stop-loss blocks; a faulty component triggers M First-Bug Halt (sever to preserve continuity), keeping the overall causal chain unbroken. Note: this capability is an **endogenous property evolved by the DSH adapter layer** to fit the agent-runtime scenario, **not** KISS's Law's original positioning; KISS's Law's original positioning is "universal causal engine (white-box presentation)".
- **Fractal**: the same plugin can be recursively mounted at sub-agent / sub-task levels.

## Why DSH

DSH's "everything is a plugin" + reversible registration + append-only trail log is isomorphic with KISS's Law's white-box positioning: reversible registration naturally realizes "sever to preserve continuity", the trail log is naturally an auditable carrier, and model-agnostic fits "apply equally to AI/AGI/ASI".

## Quick structure

```
package.json          # dsh field declares bundle
kiss-law.patch.yml    # mount patch (headless profile overlay)
src/index.js          # plugin entry: hooks + 5 white-box self-check tools
src/core/law.mjs      # framework definition (RDSHM / three iron laws / R hierarchy / conduction chain)
src/core/engine.mjs   # pure-logic adjudication engine (zero DSH dependency, unit-testable)
test/                 # unit tests + real-case tests + alignment regression (local 44/44 passing)
DESIGN.md             # architecture design (mapping table / risks / usage flow)
```

## License

[AGPL-3.0](./LICENSE)

---

> Chinese and English editions are consistent in content and mutually referential. Chinese counterpart: [**Shaky77/weiwen-law-dsh**](https://github.com/Shaky77/weiwen-law-dsh) —— same DSH / mind-map form, in Chinese; the Chinese definition "守真·稳态" (Keep Integrity & Steady State) corresponds to this edition's KISS.

---

## Contact

Framework inquiries / collaboration / audit liaison: 563003@qq.com
