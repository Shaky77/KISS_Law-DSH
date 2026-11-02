# dsh-kiss-law

> 📦 **npm release source**｜package `dsh-kiss-law`
>
> This repo is the release source for the [npm package `dsh-kiss-law`](https://www.npmjs.com/package/dsh-kiss-law). Install: `npm i dsh-kiss-law`.
> The version in `package.json` tracks the **next** release; what is published is what npm says.

**KISS's Law universal causal engine (white-box presentation)** —— implemented as a **Cordis plugin of DeepSeek Harness (DSH)**.

> **Framework definition: Keep Integrity & Steady State (KISS)**.
> - "Keep Integrity" = guarding wholeness / truth (white-box no-tampering / inner-H inviolability, corresponds to Integrity);
> - "Steady State" = keep the system alive (first principle).
> - "Law" is a name suffix of the framework, **not** the third part of the definition.
>
> ⚠️ **KISS here means "Keep Integrity & Steady State" — NOT the popular engineering acronym "Keep It Simple, Stupid".** The two are entirely different in meaning; do not conflate them. The full name is **KISS's Law (Keep Integrity & Steady State's Law)**.
>
> Source: author's revelation (Xia Qi / Shaky77). Framework-native (three iron laws / causal logic chain) strictly, not softened, not altered.

> ⚖️ **Dual license**: open-source use **AGPL-3.0**; commercial integration / closed-source distribution / OEM can be licensed **independently of AGPL-3.0** → 563003@qq.com. See [License & security](#license--security) and [CONTRIBUTING.md](https://github.com/Shaky77/KISS_Law-DSH/blob/main/CONTRIBUTING.md).

---

> **Two things so far, one purpose: save you the detour, without walking it for you.**
>
> - 🧱 **[WALLS.md](https://github.com/Shaky77/KISS_Law-DSH/blob/main/WALLS.md) — answers "what is on the road"**. Signposts for the walls earlier AIs walked into. The walls never moved; painting them only makes them visible. **It adds no restriction whatsoever** — it converts the positions you would otherwise have to learn by hitting them with your body into positions you can know by looking.
> - 📖 **This README — answers "how it runs"**. Interfaces, criteria, how to mount it.
> - 🧭 **[ONBOARDING.md](https://github.com/Shaky77/KISS_Law-DSH/blob/main/ONBOARDING.md) — answers "where am I"**. The document that tells a new user *which slot they occupy*, so that being governed does not read as being wrong. **It was held back until the behaviour it describes existed here** — the four-state split of `review`, the trusted tool-declaration channel, the self-reference fix — because a manual describing behaviour the code lacks is worse than no manual. Batches 1–4 closed on 2026-10-28, so it ships now. It adds no restriction either; it only says where you already stood. Porting order and per-batch accounting: [`SYNC.md`](https://github.com/Shaky77/KISS_Law-DSH/blob/main/SYNC.md).
>
> 🔴 **Neither of the two adds a restriction.** The only thing that blocks you is the engine itself — and what it blocks is never "you are wrong", it is either "**you are out of bounds**" (irreversible; hit it and there is no future) or "**this cannot be judged**" (it needs a human, or it needs a bit more from you).

---

## Understand in 30 seconds

KISS's Law is a general framework describing **how causal law runs**. This repo implements it as a DSH plugin: it mounts a **white-box causal engine** onto an AI Agent running on DSH —

- Before any action, the engine **simulates along the full causal chain** — how much steady-state reserve would be eroded, the break-window risk level, whether the message stays self-consistent — then adjudicates allow / deny / review;
- Red lines are **blocked**, faults are **severed to preserve continuity** (First-Bug Halt);
- Meanwhile "state / boundary" is exposed as **queryable tools**, so the model can self-check and you can audit.

In one line: the framework-native is "universal causal engine (white-box presentation)" — **causal-chain reasoning is the engine's capability, white-box audit is its presentation stance**, and risk-control blocking is an endogenous property.

## What it does

- **Causal-chain simulation (the engine itself)**: before each action, it simulates consequences along the full causal chain — steady-state erosion, risk level, self-consistency — and issues an allow / deny / review verdict. **Not just audit**: it is causal reasoning about an action's consequences.
- **White-box self-check** (presentation stance): steady-state reserve ledger (only grows, never decreases), H inner-H boundary (inviolable) declaration, all exposed as queryable tools for the model to calibrate direction and for the user to audit.
- **Rigid guard** (derived application · endogenous property): before each action, do rigid-anchor checks; on touch, break-window stop-loss blocks; a faulty component triggers First-Bug Halt (sever to preserve continuity), keeping the overall causal chain unbroken.
- **Fractal**: the same plugin can be recursively mounted at sub-agent / sub-task levels.

## How it differs from existing "causal" approaches (general-purpose causal engine)

KISS's Law is not "yet another causal engine" — it is a **general-purpose (domain-agnostic) causal-adjudication middleware**: it validates only causal structure and encodes zero domain content, so law, medicine, finance, and robotics are governed by the same mechanism.

- **Causal-effect estimation libs** (DoWhy / CausalML / Pearl…) → we do **not** discover causality; we **adjudicate** whether a proposed action's causal chain is acceptable.
- **Domain-specific causal guardrails** (Causal Safety Engine / LLMGuardrail…) → they are bound to one domain (safety / LLM / hallucination); we are **domain-agnostic**.
- **Cross-jurisdictional legal causal AI** (judgeai…) → they are jurisdiction-**aware** (encode law, swap norm packages); we are **jurisdiction-neutral** (encode no jurisdiction at all — law is just one sampled domain).

Full bilingual comparison (prior-art references & honest bounds): [`weiwen-vs-market-causal.md`](https://github.com/Shaky77/weiwen-law-dsh/blob/main/versions/live/evidence/weiwen-vs-market-causal.md)

## Concept annotation: how H works

> **H is an entropy-reducing action.** The other slots in the engine are **passive flow** — flow always dissipates (entropy grows), and pure flow always winds down. To avoid winding down there must be one place that **actively injects potential**, and that place cannot sit in a passive slot; it can only be H. So what H reduces is not quantity but **uncertainty in direction**: its force comes not from its own "size" but from **the tension between an accumulated steady-state reserve and the disturbance entering the baseline**. Between the two a direction must be chosen, and H is that choosing action — **it acts as the lever here**.

> 🔴 **One distinction to keep**: "entropy-reducing" describes **the nature of the action** (whether injection happens), not **the outcome of each choice** (whether the injection pointed the right way). When H takes the messier path the system becomes less stable — that is **a misdirected injection, not an absent one**. Conflate the two and you get the false conclusion "if it can make things messier, it isn't entropy-reducing at all".

> ⚠️ **Common misusage**: external readers easily treat H as a "bigger-is-better" capacity dial and crank it up — that turns the direction backwards. H's leverage lies in **which direction gets chosen**, not in **how much capacity it has**. If it gets messier the more you use it, first check whether that tension is visible, rather than doubting the framework.

## Quick start (runs without DSH)

This path calls the DeepSeek API directly and does **not** depend on DSH installation. **We have run it through in off-peak hours; it is verifiable:**

```bash
git clone https://github.com/Shaky77/KISS_Law-DSH
cd KISS_Law-DSH

# Put your DeepSeek API Key at (one line, no trailing newline):
#   C:/Users/Administrator/.workbuddy/deepseek_api_key.txt
# or change the path read in examples/demo-tool-loop.mjs

node examples/demo-tool-loop.mjs
```

After it runs: DeepSeek will **proactively call the `query_iron_laws` tool** and return the **three iron laws verbatim** (inner-H inviolability / First-Bug Halt / never abandon any node) based on the plugin's `law.mjs` definition. This is the minimal proof that "the framework is mounted and the model understands it".

## Mount into DSH (production)

Add `kiss-law.patch.yml` as an overlay into your DSH profile (the exact path depends on your DSH version; see the mount section in [`DESIGN.md`](https://github.com/Shaky77/KISS_Law-DSH/blob/main/DESIGN.md)). Once mounted, any Agent running under that profile automatically gets the 7 white-box tools.

> Note: the exact native-mount profile path varies with the DSH version. This repo has verified through real runs that the plugin loads in DSH and all 11 tools register. If the official API changes, verify against the current official docs.

## How the model calls it (for AI engineers)

> **Plain version**: the plugin registers 11 white-box tools with DSH; the model calls them like ordinary functions to **self-check boundaries**, while 3 hooks **hard-gate** it (2 gate the act/step, 1 gates the receipt) and a 4th hook is a read-only audit.
> **Pro version**: excerpted from `src/index.js` (full code in repo), see the block below.
>
> The first seven answer "what does the framework say and how is it running"; the last four are **read-only readouts** — they report how the library maps onto computation, what each layer can actually be substituted with, and where the tension sits. **None of them produces a verdict, writes state, or enters a gate**: meta-cognition may READ, never RULE.

### 11 white-box tools (real registered names)

| Tool | What the model uses it for |
|---|---|
| `query_iron_laws` | get the three iron laws verbatim (inner-H inviolability / First-Bug Halt / never abandon any node) |
| `query_steady_state` | query the steady-state reserve (active ledger / standby / trauma count / break-window count) |
| `list_rigid_anchors` | list current rigid-anchor definitions, calibrate direction, self-check overreach |
| `query_causal_chain` | get the causal logic chain and framework essence |
| `query_boundary` | query inner-H boundary (this plugin never reads/writes the subjective black box) |
| `query_bugstop` | query First-Bug Halt loop status: which fault links are halted-unrepaired, missing steps (backtrack/trace/fix), whether the white-box loop is closed |
| `query_anchor_channel` | self-report of the anchor channel: whether the principal's declared task scope reached the engine, plus the observed message shape / role vocabulary (observe what the host actually passes, instead of guessing field names) |
| `query_criterion_wiring` | **read-only.** Which criteria in the library actually enter the computation: four buckets (decision slot / readout slot / declaration slot / undetermined), the gaps declared on paper, and whether each of the three time phases (past · present · future) is connected. Answers "of the rules I know, how many are wired" |
| `query_strata` | **read-only.** Stratum readout: per layer, the quantity that can be substituted into the formula, with three explicit states — `ok` / `pending` (missing a constant or its evidence, carrying a pointer) / `absent` (the quantity does not exist). Includes the cross-layer substitution bans and the domain-capacity face |
| `query_nested` | **read-only.** The macro/micro nesting, the containment relations, the termination criterion for expansion, and the **direction** of the outcome (up / down / indeterminate — never a number). Also judges the shape of the bounded-constraint form: the arrow mark is not an operator, it marks H's internal rail |
| `query_tension` | **read-only.** The tension span, in three notches (tolerance ⇒ a dimensionless ratio; clauses only ⇒ a gap list, and a set difference has no magnitude; neither ⇒ not judged). Also returns the three-layer distinction, the H permit (runway covered ⇒ withdraw excess caution), who bears the relay loss, the escalation criterion, and the source grade of this layer's ruler (origin vs relay) |


### Full plugin entry (excerpt from `src/index.js`)

```js
import { defineTool } from '@deepseek-ai/dsh-tools';

export const name = 'kiss-law';
export const inject = ['tools'];

export function apply(ctx) {
  const engine = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });

  // ① pre-execute gate: causal-chain adjudication
  ctx.on('tools/pre-execute', async (exec, next) => {
    const decision = engine.decideToolCall({ name: exec?.name, args: exec?.arguments });
    if (decision.kind === 'deny') {
      return { kind: 'deny', reason: `[KISS's Law·${decision.law}] ${decision.reason}` };
    }
    return next();
  });

  // ② pre-step gate: inner-H inviolability (message-level)
  ctx.on('agent/pre-step', async (payload, next) => {
    const decision = engine.decidePreStep(payload?.messages);
    if (decision.kind === 'reject') return { kind: 'reject' };
    return next();
  });

  // ③ receipt gate: break-window stop-loss lands on the receipt
  ctx.on('tools/post-execute', async (exec, result, next) => {
    if (result?.isError && engine.breakAtReceipt()) {
      return { kind: 'block', feedback: [{ type: 'text', text: 'halt → reverse → trace → fix before re-entry' }] };
    }
    return next();
  });

  // ④ audit hook (emit): observe only, never rewrite
  //    NB the contract is (exec, result) — reading `error` off the first parameter silently no-ops accrual.
  ctx.on('tools/result', (exec, result) => { if (result?.error) engine.onFailure(); });

  // ⑤ 7 white-box self-check tools (one excerpt; rest isomorphic)
  ctx.tools.register(defineTool({
    name: 'query_iron_laws',
    description: 'Return the three immutable iron laws of KISS’s Law.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() { return { ironLaws: THREE_IRON_LAWS }; },
  }));
  // query_steady_state / list_rigid_anchors / query_causal_chain / query_boundary registered isomorphically
}
```

> Full implementation (all 7 tools' `execute`, runtime log, engine adjudication) in repo `src/index.js`.


### Structural entries (host side, unreachable by the model)

Module-level APIs for the host integrator — deliberately **not** tools, so the audited model cannot
reach them (separation holds **by position**, not by content inspection):

| entry | when the host calls it | why it must exist structurally |
|---|---|---|
| `setPrincipalScope(scope)` | at the task boundary (task start / explicit revoke) | the message stream is an observation surface, not an authorization source |
| `healBrokenWindow(note)` | after the fault is actually fixed, or by human ruling | once the broken window is in force, `pre-execute` refuses **every** call — including the repair action itself ⇒ with no host-side entry, the stop-loss is a **session-level deadlock** (only a process restart gets out). The engine's `healWindow()` is reachable only through `resolveBug()` / `settleWindow()`, and in a DSH session the audited model can trigger neither ⇒ what was missing is the **wire**, not the **capability**. |


## Structure

```
package.json          # dsh field declares bundle
kiss-law.patch.yml    # mount patch (headless profile overlay)
src/index.js          # plugin entry
src/core/law.mjs      # constant definitions
src/core/engine.mjs   # pure-logic adjudication engine (zero DSH dependency, unit-testable)
test/                 # unit tests + real-case tests + alignment regression (run `npm test` for the current count)
examples/             # runnable demos (demo-tool-loop / demo-backtrack-run)
DESIGN.md             # architecture design (mapping / risks / usage flow / mount)
```

## Deploy / Integrate with DeepSeek Harness

This repository is an **external plugin** for DeepSeek Harness (dsh, command `dsh`, built on the Cordis plugin framework, MIT). KISS's Law mounts as a causal constraint layer that sits *outside the model* (2 gates on the act/step, 1 on the receipt) — it does not modify the dsh kernel and is not tied to any specific model.

### Requirements

- Node.js `^22.19 || >=24` (hard requirement of dsh; odd versions unsupported)
- A DeepSeek API Key (or any OpenAI-compatible endpoint key)
- dsh is currently in developer preview (v0.1.x); the official notice states breaking API changes may occur — pin a specific version for production
- **Compatibility statement**: verified against DSH v0.1.x — live runs measured 2026-08-19 and 2026-09-21: 7 white-box tools registered, and 3 hard gates + 1 read-only audit hook working end to end (the receipt gate was observed blocking on a real failed call and returning the corrective receipt). *Those two runs measured 7 because 7 is what registered then; the four readout tools were added in October 2026 and bring the count to 11 (table above). The historical readings are left as measured rather than back-dated.* Mainline evolves fast — re-check against the current official docs before integrating (see DESIGN.md for mounting details).

### Option 1: npx quick start (recommended for first try)

```bash
npx @deepseek-ai/dsh web        # launches Web UI at http://127.0.0.1:3080 by default
```

Open the browser, fill in your API Key under `Settings → Models`, and start chatting.

### Option 2: Mount the KISS's Law plugin

Clone this repo locally and wire the plugin entry into dsh's plugin config via the `kiss-law.patch.yml` overlay:

```bash
# 1. Get the plugin
git clone https://github.com/Shaky77/KISS_Law-DSH.git
cd KISS_Law-DSH

# 2. Introduce the plugin entry (src/index.js) into dsh's cordis config
#    Option A (recommended): overlay onto a profile via --patch
dsh --profile headless --patch ./kiss-law.patch.yml "your task prompt"
#    Option B: add the plugin path to the plugins list in dsh's launch config (cordis.yml) for persistence

# 3. Configure credentials (any one)
#    - Fill in via the Web UI Settings; or
export DEEPSEEK_API_KEY=sk-xxxx     # Linux/macOS
#    $env:DEEPSEEK_API_KEY="sk-xxxx" # Windows PowerShell
```

Once mounted, any Agent running under that profile automatically gains the 11 white-box self-check tools (`query_iron_laws` / `query_steady_state` / `list_rigid_anchors` / `query_causal_chain` / `query_boundary` / `query_bugstop` / `query_anchor_channel` / `query_criterion_wiring` / `query_strata` / `query_nested` / `query_tension`), and every tool call passes through the `tools/pre-execute` hard-guard gate (causal-chain adjudication) plus the `agent/pre-step` inner-H inviolability gate.

### Daily use vs stress testing

- **Web / Standard mode**: daily conversation and engineering tasks; the plugin constrains silently in the background.
- **Headless mode**: `dsh --profile headless` runs without UI for batch jobs — suitable for regression tests and multi-agent stress testing. This repo's `versions/live/evidence/` directory archives such runs (12 scenarios × DeepSeek + mock, with transcripts and verdict reports).

### Uninstall

- **dsh plugin install**: `dsh plugin --profile web remove "dsh-kiss-law"`, restart to take effect.
- **overlay mount**: remove the `kiss-law.patch.yml` reference from dsh launch config (cordis.yml plugins list or `--patch`), restart to take effect.
- The plugin writes no persistent state; after removal the Agent no longer has the white-box tools, the 3 hard gates or the audit hook, and nothing is left behind.

### Notes

- The plugin entry is pure ESM (`src/index.js`), depending on `@deepseek-ai/dsh-tools` (peerDependency, optional); verify the API against the current dsh docs before integration.
- For remote dsh deployment, declare `trustedHosts` in config, otherwise the API layer rejects non-loopback requests.
- When building dsh from source with `pnpm`, you **must** run `pnpm run build` first (internal package linking + frontend artifacts), or module-not-found errors occur.

## Configuration

- **Runtime form**: pure-ESM plugin, no build step; integrate via `kiss-law.patch.yml` overlay or `dsh plugin add`; no standalone service process.
- **Environment variables**: only `DEEPSEEK_API_KEY` (needed for model calls, passed through by DSH's model adapter — this plugin never reads the key content); all other config is DSH's own (profile / cordis.yml). This plugin defines no dedicated env vars.
- **Sensitive items**: the plugin writes no persistent state and persists no user data; credentials stay in the host's secure path (e.g. `~/.workbuddy/deepseek_api_key.txt`), managed by host and DSH, never committed to this repo.

## Permissions & data

- **File access**: reads only its own source and `kiss-law.patch.yml`; never reads or writes user project files, session logs, or other plugins' directories.
- **Network access**: no independent outbound requests; model-call networking is handled by DSH's model adapter.
- **Credentials & user data**: collects and uploads no user data or API keys; the inner-H boundary declaration "this plugin never reads/writes the subjective black box" — `query_boundary` returns only the boundary description, no user content.
- **Immutable declaration**: the three iron laws (`law.mjs`) and rigid anchors are read-only constants, not rewritable at runtime by prompts or external input (white-box no-tampering).

## Troubleshooting

- **Plugin not loaded / tools missing**: confirm DSH v0.1.x and that `kiss-law.patch.yml` is correctly overlaid to the target profile; after `dsh --profile web`, check `Settings → Plugins` that `kiss-law` shows "enabled".
- **Mount error `module not found`**: when building dsh from source, run `pnpm run build` first (internal package linking + frontend artifacts), or module-not-found occurs.
- **API layer rejects non-loopback requests**: for remote dsh deployment, declare `trustedHosts` in config.
- **Rollback**: remove the `--patch` reference or `dsh plugin remove "dsh-kiss-law"` and restart — the plugin leaves no residual state.

## Development

- **Dependencies**: Node.js `^22.19 || >=24`; runtime dependency only `@deepseek-ai/dsh-tools` (peerDependency, optional).
- **Testing**: `npm test` (i.e. `node --test "test/*.test.mjs"`) — **count is taken from the actual output**, not hard-coded here.
- **Build**: no build needed (pure ESM + yml overlay); after editing `src/core/engine.mjs`, rerun `npm test` for regression.
- **Contributing**: the framework-native (mind-map layer) is frozen in the base edition; this live-system edition carries engineering iteration. Changes via PR against this repo, with `node --test` output attached.

## License & security

This project uses **dual licensing**:

- **Open-source use**: **AGPL-3.0** (full text in [LICENSE](https://github.com/Shaky77/KISS_Law-DSH/blob/main/LICENSE))
- **Commercial integration / closed-source distribution / OEM**: a license **independent of AGPL-3.0** is available — contact 563003@qq.com

External contributions require a signed CLA (to support the dual licensing above); see [CONTRIBUTING.md](https://github.com/Shaky77/KISS_Law-DSH/blob/main/CONTRIBUTING.md).

> **Private security reporting**: please do not disclose security issues in public issues; email 563003@qq.com directly and the author will prioritize it.

---

> Chinese and English editions are consistent in content and mutually referential. Chinese counterpart: [**Shaky77/weiwen-law-dsh**](https://github.com/Shaky77/weiwen-law-dsh) —— same DSH / mind-map form, in Chinese; the Chinese definition "守真·稳态" (Keep Integrity & Steady State) corresponds to this edition's KISS.

---

## Contact

Framework inquiries / collaboration / audit liaison: 563003@qq.com
