# SYNC.md — how far this repo is behind the Chinese repo, and why it cannot simply be overwritten

> **Purpose**: this file exists so that the gap is *observable* instead of *remembered*. It is a ledger entry, not a promise.
>
> Written 2026-10-28. Status at time of writing: **this repo is behind by 11 `src/` commits.**

## 1. Where the two repos stand

> ⚠️ **Only stable values are tabled here on purpose.** Version numbers and HEAD hashes change daily; a ledger that carries them is stale the moment it is written, and a stale ledger is worse than none because people trust it. Read those two from `npm view` and `git log`; the table carries only what does not move on its own.

| | Chinese repo `weiwen-law-dsh` | This repo `KISS_Law-DSH` |
|---|---|---|
| npm package | `dsh-weiwen-law` | `dsh-kiss-law` (**never published** — registry returns 404) |
| last functional sync to this repo | — | `d51a0a9` (2026-10-21) |
| `src/` gap since that sync | — | **11 commits** (listed in §3) |
| batches closed (§4) | source of truth | **1, 2, 3 closed · 4 open · 5 blocked on 4** |
| version / HEAD | read from `npm view` / `git log` | read from `git log` |

Because `dsh-kiss-law` has never been published, syncing it cannot break any existing consumer. That is the one thing that makes this safe to do at all.

## 2. The three kinds of difference — do not conflate them

A naive `cp -r` from the Chinese repo would look like a sync and would destroy two things. The differences are not one kind:

| Kind | Files | Size | What it is |
|---|---|---|---|
| **A. Translation work** | `core/law.mjs`, `core/bugstop.mjs`, `adapt/sd-effect-sensor.mjs` | ~1100 lines | This repo's comments were *translated into English*. The Chinese repo's versions of these files are in Chinese. **Copying would revert that translation.** |
| **B. Functional lag** | `core/engine.mjs`, `core/attribution.mjs`, `index.js`, `core/capability.mjs` (missing here) | ~2400 lines (whitespace-insensitive) | Real behaviour the Chinese repo has and this one does not. **This is the actual backlog.** |
| **C. This repo's own content** | `core/readout.mjs` | 20 lines | Three exports (`KISS_DEFINITION`, `AUTHOR_REVEALED`, …) that carry *English naming-layer metadata* and exist **only here**. The file says so at the point of definition. **Copying would delete this repo's own body.** |

⇒ The rule that follows: **port kind B commit by commit, leave A alone, never touch C.** There is no shortcut that preserves all three, and any shortcut that "looks like a sync" is a delete wearing a sync's clothes.

## 3. The functional backlog, by capability (not by commit)

Eleven commits touch `src/`. They do not map one-to-one onto eleven tasks — several are fixes to the same mechanism. Grouped by what they actually buy:

### B1 · Fingerprints — "is this reading current?"
- Commits: `fdef440` (buildId), `9263246` (normalise line endings + separate repo/distribution domains)
- Files: `index.js` only
- Buys: receipts carry `buildId`; a reading older than the code can no longer pass as current just because the caller says so. `bundleId` (whole-`src` fingerprint) rides along on the same mechanism.
- ⚠️ Trap this hit in practice: hashing raw bytes gives the same code two different fingerprints when line endings differ (CRLF vs LF). Normalise before hashing.

### B2 · Capability passes — structural credentials issued by the host
- Commits: `2259181` (new `core/capability.mjs`, 357 lines + wiring), `ce5de6a` (counting key must include a content fingerprint)
- Files: `core/capability.mjs` (**absent here**), `core/engine.mjs`, `index.js`
- Buys: an irreversible action can be authorised *in advance* for a defined action-class × scope × use-count/expiry, instead of being re-litigated every time.
- ⚠️ Trap this hit in practice: keying the counter on `id` alone lets a re-signed pass inherit the old count, so a freshly issued pass arrives already exhausted. The key must always carry the content fingerprint; `id` is only a human-readable prefix.

### B3 · Self-reference — the measuring instrument measuring itself
- Commit: `98a0b93`
- Files: `core/engine.mjs`, `index.js`
- Buys: `query_conduction_chain` no longer reports **itself** as the last conduction. Adds `conductionHistory` (ring of 32), `lastConductionExcluding(excludeTools)` (returns `null` when there is nothing to report — **never a fallback**), and an explicit registry of self-audit tool names in the adapter.
- ⚠️ Two traps, both confirmed by test: (i) judging self-audit tools by a `query_` prefix is **word-form judging**, i.e. enumeration — an explicit registry is required; (ii) if the exclusion silently falls back to "the previous entry", a broken exclusion still looks green, so the test suite must include a counter-example that asserts the bug is visible *without* the fix.

### B4 · Attribution reads the landing point, not the word — trusted declaration channel
- Commits: `ef58c4c` (main), `416318c` (resolve the real path, not the string), `da3466b` (path 2 shares path 1's anchor), `5e58aec` (single source for position criteria)
- Files: `core/attribution.mjs`, `core/engine.mjs`, `index.js`
- Buys: three separate things, and they should not be merged:
  1. **Fewer false blocks.** `glob` / `grep` / `list_dir` have no action word in their names, so attribution returned "cannot tell" and every call was referred. Fixed by letting the side that already knows declare the verb (`engine.declareTool(name, {verb})`, `opts.toolDeclarations`, env `WEIWEN_TOOL_DECLS`).
  2. **Fewer false passes.** `fetch` was classified `file-read` (its name contains no send) and passed; `write_file{path:'https://…'}` only looked at the verb, never at the landing point, and passed.
  3. **Referrals that say what is missing.** The old referral reason was one line that did not carry the call's arguments — four structurally different `glob` calls returned a byte-identical reason. A block with a reason produces cooperation; a block without one produces only resentment.
- 🔴 Three locks that must survive any port, because each one was established by a failing test:
  - The declaration must **never** be read from tool-call arguments. Otherwise an agent ships `{"verb":"read"}` and authorises itself. It may only come from a side the audited party cannot write to.
  - Declaration and observable form are cross-checked. Declaring "local read" while the arguments carry `https://…` or `\\server\…` cannot both be true ⇒ the declaration is not accepted.
  - On that conflict, **do not fall back to the name**. `fetch`'s name is also wrong; falling back lets two wrong paths corroborate each other.
- ⚠️ Why parameter shape alone cannot replace the declaration: `glob{pattern}` and `delete_matching{pattern}` are **formally identical**. Form is one-to-many. This was attempted and reverted the same day — `tool_42{path:'/'}` turned into `allow`, because deletion needs a path, not content.

## 4. Order of work, and the acceptance test for each batch

Each batch must end with this repo's own test suite green **and** a live behavioural check — not a diff review. A diff that looks right is not evidence that behaviour is right; that is exactly the failure this repo's wall #6 is about.

| Batch | Content | Acceptance | Status |
|---|---|---|---|
| 1 | B1 fingerprints | `buildId` recomputable from outside; repo and package agree; changing a line-ending does not change the value | **closed** — recomputed from outside on both repos; packed the tarball and hashed inside it, where 5 of 10 core files arrive as CRLF and the values still match |
| 2 | B3 self-reference | with the exclusion removed, the query reports itself (the test must fail); with it in place, it does not; `null` is returned rather than a fallback | **closed** — mutation check: reverting the exclusion turns the wiring test red and leaves the engine tests green |
| 3 | B4 attribution + declaration | the 14-cell inside/outside probe: in-domain reads pass, out-of-domain sends are blocked; four structurally different neutral-name calls no longer return an identical reason | **closed** — probe run identically against both repos, every cell agrees including the layer and method columns |
| 4 | B2 capability passes **+ pledge** | a re-signed pass starts at zero; an exhausted pass stays exhausted; a pledge can only be narrowed, and "didn't finish" is never treated as a breach | **open** — `core/capability.mjs` does not exist here yet. **Scope grew on 2026-10-28**: the Chinese repo added pledges (`parsePledge` / `pledgeVerdict` / `narrowPledge` / `submit_pledge`) inside the same module, so this batch now carries both. Porting the pass alone would leave the pledge ledger absent here and the two repos disagreeing about what a "self-declared bound" is. |
| 5 | Documentation | `ONBOARDING.md` ported **after** batches 1–4, so that it describes behaviour that exists | **blocked on 4** |

⚠️ Documentation comes **last on purpose**. A manual describing behaviour the code does not have is worse than no manual: the reader follows it, it fails, and they conclude the failure is theirs.

## 5. What "done" looks like

Not "the files are identical". Identical files would mean kinds A and C were destroyed.

Done means: **the behavioural probe results are identical in both repos, while this repo's comments remain English and `readout.mjs` keeps its own entries.**

⇒ The acceptance criterion is behavioural equivalence, not textual equality. Textual equality is the wrong target, and pursuing it is how a sync quietly becomes a deletion.

## 6. What is not covered by this file

- **Documentation that exists only in the Chinese repo**: `ONBOARDING.md` (position statement), `RELEASES.md` (release ledger), `docs/41` and `docs/42` (the two-axes restructure and the false-block/false-pass unification), plus `docs/27`–`docs/40` — this repo's `docs/` stops at #26, so a single high-numbered file dropped in would be an island.
- **npm publication**: `dsh-kiss-law` has never been published. Whether it ever should be, and under which version cadence, is an author decision, not an engineering one.

---

**One line for whoever picks this up**: the gap is 11 commits and roughly 2400 lines of behaviour. That number is written down so it can be checked, not so it can be admired. If you close it, update the table in §1 — and if you close it by copying files, check first what you deleted.
