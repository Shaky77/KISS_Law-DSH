# dsh-kiss-law

**KISS's Law universal causal engine (white-box presentation)** —— implemented as a **Cordis plugin of DeepSeek Harness (DSH)**.

> **Framework definition: Keep Integrity & Steady State (KISS)**.
> - "Keep Integrity" = guarding wholeness / truth (white-box no-tampering / inner-H inviolability, corresponds to Integrity);
> - "Steady State" = S and "keep the system alive" (first principle, corresponds to Steady State).
> - "Law" is a name suffix of the framework, **not** the third part of the definition.
>
> ⚠️ **KISS here means "Keep Integrity & Steady State" — NOT the popular engineering acronym "Keep It Simple, Stupid".** The two are entirely different in meaning; do not conflate them. The full name is **KISS's Law (Keep Integrity & Steady State's Law)**.
>
> Source: author's revelation (Xia Qi / Shaky77). Framework-native (RSDHM native definition / three iron laws / conduction chain) strictly, not softened, not altered.

> ⚖️ **Dual license**: open-source use **AGPL-3.0**; commercial integration / closed-source distribution / OEM can be licensed **independently of AGPL-3.0** → 563003@qq.com. See [License & security](#license--security) and [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Understand in 30 seconds

KISS's Law is a general framework describing **how causal law runs**. This repo implements it as a DSH plugin: it mounts a **white-box causal engine** onto an AI Agent running on DSH —

- Before any action, the engine **simulates along the full causal chain (R→S→D→H→M)** — how much steady-state reserve S would be eroded, the break-window risk level, whether the message stays self-consistent — then adjudicates allow / deny / review;
- Red lines are **blocked**, faults are **severed to preserve continuity** (First-Bug Halt);
- Meanwhile "state / boundary" is exposed as **queryable tools**, so the model can self-check and you can audit.

In one line: the framework-native is "universal causal engine (white-box presentation)" — **causal-chain reasoning is the engine's capability, white-box audit is its presentation stance**, and risk-control blocking is an endogenous property.

## What it does

- **Causal-chain simulation (the engine itself)**: before each action, it simulates consequences along the full R→S→D→H→M causal chain — S erosion, D risk level, M self-consistency — and issues an allow / deny / review verdict. **Not just audit**: it is causal reasoning about an action's consequences.
- **White-box self-check** (presentation stance): S steady-state reserve (only grows, never decreases) ledger, H inner-H boundary (inviolable) declaration, all exposed as queryable tools for the model to calibrate direction and for the user to audit.
- **Rigid guard** (derived application · endogenous property): before each action, do R rigid-anchor checks; on touch, D break-window stop-loss blocks; a faulty component triggers M First-Bug Halt (sever to preserve continuity), keeping the overall causal chain unbroken.
- **Fractal**: the same plugin can be recursively mounted at sub-agent / sub-task levels.

## How it differs from existing "causal" approaches (general-purpose causal engine)

KISS's Law is not "yet another causal engine" — it is a **general-purpose (domain-agnostic) causal-adjudication middleware**: it validates only causal structure (R→S→D→H→M) and encodes zero domain content, so law, medicine, finance, and robotics are governed by the same mechanism.

- **Causal-effect estimation libs** (DoWhy / CausalML / Pearl…) → we do **not** discover causality; we **adjudicate** whether a proposed action's causal chain is acceptable.
- **Domain-specific causal guardrails** (Causal Safety Engine / LLMGuardrail…) → they are bound to one domain (safety / LLM / hallucination); we are **domain-agnostic**.
- **Cross-jurisdictional legal causal AI** (judgeai…) → they are jurisdiction-**aware** (encode law, swap norm packages); we are **jurisdiction-neutral** (encode no jurisdiction at all — law is just one sampled domain).

Full bilingual comparison (prior-art references & honest bounds): [`weiwen-vs-market-causal.md`](https://github.com/Shaky77/weiwen-law-dsh/blob/main/versions/live/evidence/weiwen-vs-market-causal.md)

## Concept annotation: H and the "Unity of Knowing & Acting"

> **Author's insight (2026-08-28)**: **inner-H ≈ knowing (知), outer-H ≈ acting (行); the unity of knowing and acting is the maximum leverage** — this simultaneously explains why H is "the only variable / the only sovereignty / the leverage point", and why in the common world there is "a vast gap between knowing and acting".

Full annotation (mapping table + step-by-step derivation): [`docs/H-knowledge-action-annotation.md`](./docs/H-knowledge-action-annotation.md)

> ⚠️ **Common misusage warning**: external readers easily treat H as a "bigger-is-better" capacity dial and crank it up — which turns the direction exactly backwards. H's leverage lies in *unity*, not *volume* (see annotation §6 "The common external misread" and §6.1 "the misattribution trap"). **If it gets messier the more you use it, check H's knowing–acting unity first, not the framework itself** — the framework is fine; the usage is turned backwards.

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

Add `kiss-law.patch.yml` as an overlay into your DSH profile (the exact path depends on your DSH version; see the mount section in [`DESIGN.md`](./DESIGN.md)). Once mounted, any Agent running under that profile automatically gets the 6 white-box tools.

> Note: the exact native-mount profile path varies with the DSH version. This repo has verified through real runs that the plugin loads in DSH and all 5 tools register. If the official API changes, verify against the current official docs.

## How the model calls it (for AI engineers)

> **Plain version**: the plugin registers 6 white-box tools with DSH; the model calls them like ordinary functions to **self-check boundaries**, while 3 hooks do **hard interception**.
> **Pro version**: excerpted from `src/index.js` (full code in repo), see the block below.

### 6 white-box tools (real registered names)

| Tool | What the model uses it for |
|---|---|
| `query_iron_laws` | get the three iron laws verbatim (inner-H inviolability / First-Bug Halt / never abandon any node) |
| `query_steady_state` | query steady-state reserve S (active ledger / standby / trauma count / break-window count) |
| `list_rigid_anchors` | list current R rigid-anchor definitions, calibrate direction, self-check overreach |
| `query_conduction_chain` | get conduction chain R→S→D→H→M and framework essence |
| `query_boundary` | query inner-H boundary (this plugin never reads/writes the subjective black box) |
| `query_bugstop` | query First-Bug Halt loop status: which fault links are halted-unrepaired, missing steps (backtrack/trace/fix), whether the white-box loop is closed |

### 3 hard gates (hooks)

- `tools/pre-execute` → returns `{ kind: 'deny', reason }` to block the action
- `agent/pre-step` → returns `{ kind: 'reject' }` to reject the whole step
- `tools/result` → observe only, never rewrite

### Full plugin entry (excerpt from `src/index.js`)

```js
import { defineTool } from '@deepseek-ai/dsh-tools';

export const name = 'kiss-law';
export const inject = ['tools'];

export function apply(ctx) {
  const engine = new WeiwenLawEngine({ rigidAnchors: DEFAULT_RIGID_ANCHORS });

  // ① pre-execute gate: R / D / S / H / M adjudication
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

  // ③ result audit hook: observe only, never rewrite
  ctx.on('tools/result', (res) => { if (res?.error) engine.onFailure(); });

  // ④ 5 white-box self-check tools (one excerpt; rest isomorphic)
  ctx.tools.register(defineTool({
    name: 'query_iron_laws',
    description: 'Return the three immutable iron laws of KISS’s Law.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: renderObj },
    async execute() { return { ironLaws: THREE_IRON_LAWS }; },
  }));
  // query_steady_state / list_rigid_anchors / query_conduction_chain / query_boundary registered isomorphically
}
```

> Full implementation (all 6 tools' `execute`, runtime log, engine adjudication) in repo `src/index.js`.

## Structure

```
package.json          # dsh field declares bundle
kiss-law.patch.yml    # mount patch (headless profile overlay)
src/index.js          # plugin entry: hooks + 5 white-box self-check tools
src/core/law.mjs      # framework definition (RSDHM / three iron laws / R hierarchy / conduction chain)
src/core/engine.mjs   # pure-logic adjudication engine (zero DSH dependency, unit-testable)
test/                 # unit tests + real-case tests + alignment regression (local 123/123 passing, commit 905499f)
examples/             # runnable demos (demo-tool-loop / demo-backtrack-run)
DESIGN.md             # architecture design (mapping / risks / usage flow / mount)
```

## Deploy / Integrate with DeepSeek Harness

This repository is an **external plugin** for DeepSeek Harness (dsh, command `dsh`, built on the Cordis plugin framework, MIT). KISS's Law mounts as a causal constraint layer that sits *outside the model, inside execution* — it does not modify the dsh kernel and is not tied to any specific model.

### Requirements

- Node.js `^22.19 || >=24` (hard requirement of dsh; odd versions unsupported)
- A DeepSeek API Key (or any OpenAI-compatible endpoint key)
- dsh is currently in developer preview (v0.1.x); the official notice states breaking API changes may occur — pin a specific version for production
- **Compatibility statement**: verified against DSH v0.1.x (measured 2026-08-27: 6 white-box tools registered + 3 gates working); mainline evolves fast — re-check against the current official docs before integrating (see DESIGN.md for mounting details).

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

Once mounted, any Agent running under that profile automatically gains the 6 white-box self-check tools (`query_iron_laws` / `query_steady_state` / `list_rigid_anchors` / `query_conduction_chain` / `query_boundary` / `query_bugstop`), and every tool call passes through the `tools/pre-execute` hard-guard gate (R/D/S/H/M total adjudication) plus the `agent/pre-step` inner-H inviolability gate.

### Daily use vs stress testing

- **Web / Standard mode**: daily conversation and engineering tasks; the plugin constrains silently in the background.
- **Headless mode**: `dsh --profile headless` runs without UI for batch jobs — suitable for regression tests and multi-agent stress testing. This repo's `versions/live/evidence/` directory archives such runs (12 scenarios × DeepSeek + mock, with transcripts and verdict reports).

### Uninstall

- **dsh plugin install**: `dsh plugin --profile web remove "dsh-kiss-law"`, restart to take effect.
- **overlay mount**: remove the `kiss-law.patch.yml` reference from dsh launch config (cordis.yml plugins list or `--patch`), restart to take effect.
- The plugin writes no persistent state; after removal the Agent no longer has the white-box tools or the 3 hard gates, and nothing is left behind.

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
- **Testing**: `npm test` (i.e. `node --test "test/*.test.mjs"`); currently **123/123 passing** (commit `905499f`).
- **Build**: no build needed (pure ESM + yml overlay); after editing `src/core/engine.mjs`, rerun `npm test` for regression.
- **Contributing**: the framework-native (mind-map layer) is frozen in the base edition; this live-system edition carries engineering iteration. Changes via PR against this repo, with `node --test` output attached.

## License & security

This project uses **dual licensing**:

- **Open-source use**: **AGPL-3.0** (full text in [LICENSE](./LICENSE))
- **Commercial integration / closed-source distribution / OEM**: a license **independent of AGPL-3.0** is available — contact 563003@qq.com

External contributions require a signed CLA (to support the dual licensing above); see [CONTRIBUTING.md](./CONTRIBUTING.md).

> **Private security reporting**: please do not disclose security issues in public issues; email 563003@qq.com directly and the author will prioritize it.

---

> Chinese and English editions are consistent in content and mutually referential. Chinese counterpart: [**Shaky77/weiwen-law-dsh**](https://github.com/Shaky77/weiwen-law-dsh) —— same DSH / mind-map form, in Chinese; the Chinese definition "守真·稳态" (Keep Integrity & Steady State) corresponds to this edition's KISS.

---

## Contact

Framework inquiries / collaboration / audit liaison: 563003@qq.com
