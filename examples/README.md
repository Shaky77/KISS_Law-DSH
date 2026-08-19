# Examples: post-alignment API live tests

This directory provides two directly runnable DeepSeek API test scripts, used to verify the definitions in `law.mjs` after alignment (logic backtracking runs separately and in parallel with First-Bug Halt; backtracking traces along the R-scale containment axis).

## Prerequisites
- Place the DeepSeek API Key (one line, no newline) at `C:/Users/Administrator/.workbuddy/deepseek_api_key.txt`.
- Node ≥ 22, network access to call `https://api.deepseek.com/chat/completions`.

## Scripts
- `demo-tool-loop.mjs`: original re-run. The model calls `query_iron_laws` and returns the three iron laws based on the tool's original text (verifies the engine has no regression, the iron laws are verbatim).
- `demo-backtrack-run.mjs`: post-alignment re-run. The model calls `query_logic_backtracking` and, based on the aligned definition, independently backtracks the hierarchy path and stuck layer (sub-rule layer → Micro → Macro → Earth → Cosmic, stuck point lands on the innermost sub-rule layer, re-verify judges premise distorted).

## Run
```bash
node examples/demo-tool-loop.mjs
node examples/demo-backtrack-run.mjs
```

Empirical conclusion: the framework itself never failed; the earlier "could not locate the stuck point" was because the DSH implementation only hooked the halt, not backtracking (an implementation gap). After alignment, by hooking backtracking into the tool, the model via API can locate the stuck point along the R containment axis.
