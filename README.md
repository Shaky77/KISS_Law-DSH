# dsh-kiss-law-plugin

**KISS's Law universal causal engine (white-box presentation)** —— implemented as a **Cordis plugin of DeepSeek Harness (DSH)**.

> **Framework definition: Keep Integrity & Steady State (KISS)**.
> - "Keep Integrity" = guarding wholeness / truth (white-box no-tampering / inner-H inviolability, corresponds to Integrity);
> - "Steady State" = S and "keep the system alive" (first principle, corresponds to Steady State).
> - "Law" is a name suffix of the framework, **not** the third part of the definition.
>
> ⚠️ **KISS here means "Keep Integrity & Steady State" — NOT the popular engineering acronym "Keep It Simple, Stupid".** The two are entirely different in meaning; do not conflate them. The full name is **KISS's Law (Keep Integrity & Steady State's Law)**.
>
> Source: author's revelation (Xia Qi / Shaky77). Framework-native (RDSHM native definition / three iron laws / conduction chain) strictly, not softened, not altered.

---

## Understand in 30 seconds

KISS's Law is a general framework describing **how causal law runs**. This repo implements it as a DSH plugin: it mounts a **white-box guardrail** onto an AI Agent running on DSH —

- Every AI action is **checked** before execution, blocked on red lines, and **severed to preserve continuity** on failure;
- Meanwhile "state / boundary" is exposed as **queryable tools**, so the model can self-check and you can audit.

In one line: the framework-native is "universal causal engine (white-box presentation)"; "white-box audit / endogenous risk control" is its presentation stance and the endogenous property evolved after adapting to the agent-runtime scenario.

## What it does

- **White-box self-check** (presentation stance): S steady-state reserve (only grows, never decreases) ledger, H inner-H boundary (inviolable) declaration, all exposed as queryable tools for the model to calibrate direction and for the user to audit.
- **Rigid guard** (derived application · endogenous property): before each action, do R rigid-anchor checks; on touch, D break-window stop-loss blocks; a faulty component triggers M First-Bug Halt (sever to preserve continuity), keeping the overall causal chain unbroken.
- **Fractal**: the same plugin can be recursively mounted at sub-agent / sub-task levels.

## Quick start (runs without DSH)

This path calls the DeepSeek API directly and does **not** depend on DSH installation. **We have run it through in off-peak hours; it is verifiable:**

```bash
git clone https://github.com/Shaky77/KISS_Law-DSH
cd dsh-kiss-law-plugin

# Put your DeepSeek API Key at (one line, no trailing newline):
#   C:/Users/Administrator/.workbuddy/deepseek_api_key.txt
# or change the path read in examples/demo-tool-loop.mjs

node examples/demo-tool-loop.mjs
```

After it runs: DeepSeek will **proactively call the `query_iron_laws` tool** and return the **three iron laws verbatim** (inner-H inviolability / First-Bug Halt / never abandon any node) based on the plugin's `law.mjs` definition. This is the minimal proof that "the framework is mounted and the model understands it".

## Mount into DSH (production)

Add `kiss-law.patch.yml` as an overlay into your DSH profile (the exact path depends on your DSH version; see the mount section in [`DESIGN.md`](./DESIGN.md)). Once mounted, any Agent running under that profile automatically gets the 5 white-box tools.

> Note: the exact native-mount profile path varies with the DSH version. This repo has verified through real runs that the plugin loads in DSH and all 5 tools register. If the official API changes, verify against the current official docs.

## How the model calls it (for AI engineers)

> **Plain version**: the plugin registers 5 white-box tools with DSH; the model calls them like ordinary functions to **self-check boundaries**, while 3 hooks do **hard interception**.
> **Pro version**: excerpted from `src/index.js` (full code in repo), see the block below.

### 5 white-box tools (real registered names)

| Tool | What the model uses it for |
|---|---|
| `query_iron_laws` | get the three iron laws verbatim (inner-H inviolability / First-Bug Halt / never abandon any node) |
| `query_steady_state` | query steady-state reserve S (active ledger / standby / trauma count / break-window count) |
| `list_rigid_anchors` | list current R rigid-anchor definitions, calibrate direction, self-check overreach |
| `query_conduction_chain` | get conduction chain R→D→S→H→M and framework essence |
| `query_boundary` | query inner-H boundary (this plugin never reads/writes the subjective black box) |

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

> Full implementation (all 5 tools' `execute`, runtime log, engine adjudication) in repo `src/index.js`.

## Structure

```
package.json          # dsh field declares bundle
kiss-law.patch.yml    # mount patch (headless profile overlay)
src/index.js          # plugin entry: hooks + 5 white-box self-check tools
src/core/law.mjs      # framework definition (RDSHM / three iron laws / R hierarchy / conduction chain)
src/core/engine.mjs   # pure-logic adjudication engine (zero DSH dependency, unit-testable)
test/                 # unit tests + real-case tests + alignment regression (local 44/44 passing)
examples/             # runnable demos (demo-tool-loop / demo-backtrack-run)
DESIGN.md             # architecture design (mapping / risks / usage flow / mount)
```

## Deploy / Integrate with DeepSeek Harness

This repository is an **external plugin** for DeepSeek Harness (dsh, command `dsh`, built on the Cordis plugin framework, MIT). KISS's Law mounts as a causal constraint layer that sits *outside the model, inside execution* — it does not modify the dsh kernel and is not tied to any specific model.

### Requirements

- Node.js `^22.19 || >=24` (hard requirement of dsh; odd versions unsupported)
- A DeepSeek API Key (or any OpenAI-compatible endpoint key)
- dsh is currently in developer preview (v0.1.x); the official notice states breaking API changes may occur — pin a specific version for production

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

Once mounted, any Agent running under that profile automatically gains the 5 white-box self-check tools (`query_iron_laws` / `query_steady_state` / `list_rigid_anchors` / `query_conduction_chain` / `query_boundary`), and every tool call passes through the `tools/pre-execute` hard-guard gate.

### Daily use vs stress testing

- **Web / Standard mode**: daily conversation and engineering tasks; the plugin constrains silently in the background.
- **Headless mode**: `dsh --profile headless` runs without UI for batch jobs — suitable for regression tests and multi-agent stress testing (the `versions/live/evidence/` directory in the Chinese repo archives such runs).

### Notes

- The plugin entry is pure ESM (`src/index.js`), depending on `@deepseek-ai/dsh-tools` (peerDependency, optional); verify the API against the current dsh docs before integration.
- For remote dsh deployment, declare `trustedHosts` in config, otherwise the API layer rejects non-loopback requests.
- When building dsh from source with `pnpm`, you **must** run `pnpm run build` first (internal package linking + frontend artifacts), or module-not-found errors occur.

## License

[AGPL-3.0](./LICENSE)

---

> Chinese and English editions are consistent in content and mutually referential. Chinese counterpart: [**Shaky77/weiwen-law-dsh**](https://github.com/Shaky77/weiwen-law-dsh) —— same DSH / mind-map form, in Chinese; the Chinese definition "守真·稳态" (Keep Integrity & Steady State) corresponds to this edition's KISS.

---

## Contact

Framework inquiries / collaboration / audit liaison: 563003@qq.com
