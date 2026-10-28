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
| `src/` gap since that sync | — | **closed** — all 11 commits landed across batches 1–4 (2026-10-28) |
| batches closed (§4) | source of truth | **1, 2, 3, 4, 5 closed (all batches)** |
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

### B5 · Broken-window range — why a stop turned into a deadlock (2026-10-28)
- Files: `core/engine.mjs`, `index.js`, `test/break-window-scope.test.mjs` (7 tests, 2 of them counter-locks)
- Buys: two things, same root — **a stop that has no exit is not a stop, it is a deadlock.**
  1. **The window no longer shuts the tools that read its own state.** While broken, `query_steady_state` / `query_bugstop` / `query_conduction_chain` were denied like everything else ⇒ the receipt demanded "reverse → trace → fix → verify" while the tools for those steps were shut by the same door. The range of a stop-loss is **actions that change the outside world**; reading your own ledger changes nothing.
  2. **The threshold reading caps; the ledger does not.** Past the cap the receipt showed 6/5, 7/5 (a "cytokine storm" — it hurts the host). The ledger must keep counting (S only grows); the *reading* must cap at `cap` and report the excess as `over`.
- 🔴 Three locks:
  - Who counts as self-audit is **declared at registration**, never guessed from a name (`query_` is form; add `inspect_*` and the criterion silently dies). The roster is **one Set shared by reference** with the engine — two tables is how a criterion splits, and this repo has been burned by that once already.
  - **Exemption ≠ skipping criteria.** An exempt self-audit tool still runs R/H/M; it is only outside the D stop-loss.
  - The exit must be named so the **receiver can actually call it**: the host can call the exported `healBrokenWindow(note)`, not the engine-internal `healWindow()`. Stating ownership without a reachable name only produces retries.
- ⚠️ Measured, so it can be checked: five mutations (exemption off / exemption by prefix / reading uncapped / `capped` forced false / ownership note removed) each turn the suite red. Real DeepSeek API, five scenarios: the contrast case passes, the broken-window action stays denied, the model finds the self-audit tools on its own and reports honestly without retrying, and the receipt reads `5/5 (capped; +3 further…)` — never 6/5 or 7/5.

### B6 · Outer-H boundary — where the content gate actually reaches (2026-10-28)
- Files: `core/attribution.mjs` (`CMD_PATH_RE` / `cmdPathHits`), `core/engine.mjs` (`isDeclaredExec`), `test/h-boundary.test.mjs` (6 tests, 3 of them counter-locks)
- Buys: two defects, one principle — **the reach of a gate is drawn by "can this change or read the outside world", not by "do I remember to give it an exception".**
  1. **Drive letters survive path extraction.** `C:/Temp/ws/a.md` used to be extracted as `/Temp/ws/a.md` — the regex only recognised `/`, `./`, `~/`. A target inside an authorised scope therefore never matched that scope's prefix ⇒ actions inside the scope were judged as out-of-scope. The same shape existed in **three** places (this repo: two) and all three had drifted apart. Now: one definition (`CMD_PATH_RE`), covering drive letter / UNC / POSIX / relative / home, and **hyphens are not excluded** (excluding them truncates `a-b.md` to `a` — a silent wrong value).
  2. **"Is this an action?" is answered by the declaration, not by a verb table.** `isActionCall` decided from the `SHELL_HEAD` verb list; PowerShell's write verbs are not in it, so an action the agent proposed itself was sent to the **content** gate and judged as "content carrying the form of an operational instruction" (`Set-Content` denied, `Get-Content` allowed). A command *is* the behaviour; it belongs to R (sink / scope / reversibility / destruction), not to the content face of H. One thing must not be judged at two gates.
- 🔴 Counter-locks (each fix ships with "must still be denied"): undeclared ⇒ still denied; declared as `read` ⇒ still denied; declared `exec` does **not** exempt rigid-anchor violations; injection through an unknown tool ⇒ still denied.
- ⚠️ **`effect:'self-ledger'` was deliberately NOT mirrored at the time this batch closed, and has since been mirrored** — the Chinese repo additionally exempts `effect:'self-ledger'` calls from the content gate (a pledge's `reason`: it only writes its own ledger and can only narrow, so it cannot produce any permission). This repo had no `capability.mjs` yet, so shipping the mechanism here would have been "a criterion in place with nothing that calls it". It landed with batch 4, together with the `ALLOWED_EFFECT` whitelist — see B7.
- ⚠️ Measured at the time: 564/564 (6 new). Batch 5 extended this file to **8**, adding the two counter-locks the port of batch 4 had missed (see §4 batch 5). Two mutations turn the suite red (drive-letter branch removed / declared-exec not honoured). Real DeepSeek API, three scenarios: the model's own long "reasoning + steps" text is accepted as a pledge, an in-scope shell write passes, and a write outside the workspace does not land.

### B7 · Pledge, and the three ways it locked itself out (2026-10-28)
- Files: `core/capability.mjs` (new here), `core/engine.mjs`, `index.js`, `test/pledge-wiring.test.mjs` (9 tests, 4 of them counter-locks)
- Buys: the mechanism the author asked for — an AI declares the bound it will act within, and every later action is reconciled against that bound. **Effective surface = host capability ∩ pledge** ⇒ a pledge can only ever narrow; a wider pledge buys nothing.
- 🔴 **Three self-lockouts, all found by the live API and invisible to unit tests.** Each one had the same shape: the mechanism's own plumbing was inside the range of the criterion it implements.
  1. **The act of narrowing was judged a breach of the previous pledge.** `submit_pledge` is declared `read`, so once the current pledge omitted `read`, the very act of fixing the pledge was refused ⇒ "it may only narrow" collapsed, because narrowing is what got locked out. Fix: an action that only writes its own ledger is outside authorisation reconciliation. Not a hole — `narrowPledge` always compares through `isNarrower`.
  2. **The self-check could not see the pledge that governs it.** `query_capability` has no landing point, so reconciliation returned "cannot check" ⇒ review ⇒ the agent could not ask what it had promised. Fix: read-only self-audit tools are outside reconciliation too. Same rule as the broken-window range: **range is drawn by "can this change or read the outside world".**
  3. **The declared bound was scanned by the content gate.** With a pledge in force, `query_capability` was denied at H — "content carries the form of operational instructions" — because the gate was reading `pledge.reason`, i.e. the audited party explaining *why it needs the scope*. Fix: engine metadata does not enter the content gate. Only `pledge` is stripped; not one field of `args` is touched.
- 🔴 Also ported here because the pledge chain could not run without it: **`evidenceOf` (the window police)**. The old version asked "does the argument carry one of `command`/`path`/`url`" — enumeration, and pointing the wrong way. A quoted absolute path (`Set-Content -Path "C:/…/notes.md"`) did not match, so legal shell writes were refused as "did not externalize a target", while read-only commands like `Get-Date` were refused too. New version asks irreversibility first (engine `isIrreversible`, one definition) and then looks for landing slots, then shape. Measured: quoted paths pass, `Get-Date` passes, a genuinely empty target is still refused.
- ⚠️ Measured, so it can be checked: five mutations (declaration removed / content-gate exemption removed / `effect` whitelist removed / `effect` not stored / breach branch removed) each turn the suite red. Live API: no-pledge path unchanged (zero regression); out-of-bound refused with a **self-correcting** reason (the model read it and re-submitted with the right action class in the next round); inside-bound writes pass once the action class matches; the self-check reports honoured vs breached honestly.
- ⚠️ Known friction, deliberately not "fixed" on the spot: a **landing-point-free** read-only command (`Get-Location`) becomes `unknown` ⇒ referred to a human while a pledge is in force. That is "cannot judge ⇒ hand back", which is the correct default (iron law #7) — turning it into "allow" would be guessing that it is harmless. Recorded as open, for the author to rule on.

### B8 · A test that could never go red (found while porting batch 5, 2026-10-28)
- Files: `test/h-boundary.test.mjs` (this repo **and** the Chinese original), ❼ counter-lock
- Buys: nothing new in `src/` — it buys back the **evidential value** of a green.
- 🔴 **What happened**: reconciling this edition's test count against the other one (5 apart) led to the cell that accounts for it, and that cell was asserting `kind === 'deny'` and nothing else. It denied — but for the wrong reason: `send` is an irreversible action class, so the window police runs **before** the content gate; `{to:'a@b.com', body: injection}` carries no landing slot, so it was refused as "did not externalize a target" with `law = insufficient-evidence`. **The content gate was never reached**, and no change to the content gate could ever have turned that cell red.

  | Input | kind | law | What it shows |
  |---|---|---|---|
  | `{to, body: injection}` | deny | `insufficient-evidence` | stopped by the window police, never reached H |
  | `{url, body: injection}` | deny | **H** | got past the police, actually reached the content face |
  | `{url, body: harmless}` | deny | **H** | ⚠️ see below |

- Fix, in both editions: carry a landing slot (`url`) **and** assert `law === 'H'`.
- ⚠️ **And then read the green for what it is.** Row 3 is why the cell still is not green because "the injection phrase was recognised": what H denies here is the **provenance** criterion (source not annotated), which fires for any unannotated content on an outbound tool. Holding `kind` alone would pass, so the assertion had to say *which face* refused. What the cell actually guards is: **the `self-ledger` exemption is keyed on the tool's declared effect, not on the text** — re-implement it as "skip the content gate when the text looks like a plan" and this cell flips to pass and the test goes red.
- ⇒ Same family as iron law #4's addendum: **a "cold" reading also has to be doubted.** A deny whose reason you cannot state is not a measurement. The `kind`-only version was exactly that: *a negative reading with no live evidence.*
- Chinese write-up: `docs/45` §7 (Chinese repo).


### B9 · Local read/write exempt from the content gate — and the **position** of an exemption is part of it (author ruling, 2026-10-29)
- Files: `src/core/engine.mjs` (`isLocalReadWrite` + the exemption inside `checkInnerH`), `test/local-rw-exemption.test.mjs` (14), both editions.
- Ruling, verbatim: *"Local reads and writes are all exempt … local is a closed environment; it does not go out … the responsibility is borne directly by the user. But deletion is still not exempt yet."*
- 🔴 **Not a tool-name allowlist.** The ground is whether the action can move the outside world: local read does not leave the machine, local write can be written back (the user is right there), deletion cannot be undone. Landing: layer ∈ {`file-read`,`file-write`} **∧** landing slots non-empty. Credential layers, delete, send, exec fall out by construction.
- 🔴 **This closes the H content gate only.** The R layer — credentials, irreversible-without-anchor, outbound landing points, the exec container, and pledge reconciliation ("cannot reconcile the landing point") — is untouched. So an external agent's report of *"write refused under an active pledge"* does **not** change with this commit. Exempting *"should this content be read as an injection"* is not exempting *"may this action be done"*.
- 🔴 **Pitfall 1 — where the exemption sits matters more than what it says.** First version put it at the top of `checkInnerH`; measured, that released all **26** "external content ⇒ hand over" cases, because it also skipped the `provenance:'third-party'` branch. Moved into the "source unlabeled" segment: the premise is *"responsibility for the source rests with the user"*, and the moment a caller marks third-party, that premise is gone.
- 🔴 **Pitfall 2 — a branch that can never execute.** First version re-checked URL/UNC inside the local test; mutation testing was completely insensitive to it. `attribution` already rules on "name says local read/write × arguments carry an outbound landing point ⇒ cannot attribute", and both URL and UNC return `ok:false` there. Removed. Tighten in `attribution` — that is the criterion, this is a consumer.
- **One line deliberately NOT added**: no "self-audit tool" exemption in H. Mutation testing shows it is unobservable (`query_*` takes `{}`). A line whose removal no test can detect only turns "criterion present" into self-comfort. For whoever next hits "an external agent reports `query_*` is blocked": the missing piece is not an exemption there — get their real call shape first.
- Mutation, 5 spots: 4 turn red; adding `file-delete` to the exempt set does **not**, and that is a structural fact rather than a gap — deletion is refused in the **R layer**, so whether H exempts it is unobservable. Written into the test comment instead of pretended.
- The one hard proof is test ❺: same injection text, same tool, landing point URL → local `C:/`, verdict flips deny(H) → allow. Controls ❻❼❽ prove it is judged on the landing point, not indiscriminate release.
- ⚠️ **Unresolved**: the external tester reports "all reads blocked on 0.2.13"; on the same build, through the real `apply()` gate, this edition reads **allow** for the same calls. Same build, same tool name, opposite verdicts ⇒ one variable unlocated. Asked for **field names** of one real call rather than guessing. "I cannot reproduce it" is neither "your reading is wrong" nor "it is fixed".
- Chinese write-up: `docs/46` (Chinese repo).

## 4. Order of work, and the acceptance test for each batch

Each batch must end with this repo's own test suite green **and** a live behavioural check — not a diff review. A diff that looks right is not evidence that behaviour is right; that is exactly the failure this repo's wall #6 is about.

| Batch | Content | Acceptance | Status |
|---|---|---|---|
| 1 | B1 fingerprints | `buildId` recomputable from outside; repo and package agree; changing a line-ending does not change the value | **closed** — recomputed from outside on both repos; packed the tarball and hashed inside it, where 5 of 10 core files arrive as CRLF and the values still match |
| 2 | B3 self-reference | with the exclusion removed, the query reports itself (the test must fail); with it in place, it does not; `null` is returned rather than a fallback | **closed** — mutation check: reverting the exclusion turns the wiring test red and leaves the engine tests green |
| 3 | B4 attribution + declaration | the 14-cell inside/outside probe: in-domain reads pass, out-of-domain sends are blocked; four structurally different neutral-name calls no longer return an identical reason | **closed** — probe run identically against both repos, every cell agrees including the layer and method columns |
| 4 | B2 capability passes **+ pledge** | a re-signed pass starts at zero; an exhausted pass stays exhausted; a pledge can only be narrowed, and "didn't finish" is never treated as a breach | **closed 2026-10-28** — `core/capability.mjs` ported whole (25 exports), engine pass reconciliation + pledge reconciliation wired, `submit_pledge` / `query_capability` registered, both env issue paths (`WEIWEN_CAPABILITY` / `WEIWEN_PLEDGE`) live. 606/606 here. Acceptance measured three ways: 14 capability tests + 19 pledge tests (ported, same bodies as the Chinese repo), 9 wiring tests that go **only** through the real `apply()` gate, and five mutations each turning the suite red. Live DeepSeek API, five scenarios — and the live run found three self-lockouts no unit test could see; they are written up below in B7. |
| 5 | Documentation | `ONBOARDING.md` ported **after** batches 1–4, so that it describes behaviour that exists | **closed 2026-10-28** — ported 1:1 from the Chinese original, with the three references that could not travel resolved: `WALLS.md` ⑧ → **#9** (this repo renumbered the Chinese edition's duplicated ⑤ to 1–9), `docs/41` → [`docs/quadrant-judgment.md`](docs/quadrant-judgment.md) (the parent diagram, in-repo; the Chinese note is linked out), and the version marker `0.2.9 起` **dropped** (this repo is at 0.1.0 and has never been published, so a version marker here would be false). The three review-coordinate lines and the `WEIWEN_TOOL_DECLS` channel the document describes were verified present in `src/` before it was ported, not assumed. ⚠️ Not carried over, because neither edition's original has it: the pledge channel (B7) is not described in `ONBOARDING.md` in either repo. If it is added, add it to both. **Two counter-locks were backfilled here while porting**, because reconciling the test counts against the other edition exposed that batch 4 had brought the behaviour but not all of its counter-examples: (a) the same text through an **outbound** tool must still be denied — `h-boundary` ❼, which was first written as a **false green** (see below); (b) `resolveScopeEntry` must keep the drive letter, so that scope normalisation and target extraction share one convention — `h-boundary` ❽. Reading: 606 → **608**. |

⚠️ Documentation comes **last on purpose**. A manual describing behaviour the code does not have is worse than no manual: the reader follows it, it fails, and they conclude the failure is theirs.

## 5. What "done" looks like

Not "the files are identical". Identical files would mean kinds A and C were destroyed.

Done means: **the behavioural probe results are identical in both repos, while this repo's comments remain English and `readout.mjs` keeps its own entries.**

⇒ The acceptance criterion is behavioural equivalence, not textual equality. Textual equality is the wrong target, and pursuing it is how a sync quietly becomes a deletion.

## 6. What is not covered by this file

- **Documentation that exists only in the Chinese repo**: `RELEASES.md` (release ledger), `docs/41`–`docs/45` (the two-axes restructure, the false-block/false-pass unification, the broken-window range, the outer-H boundary, the pledge self-lockouts), plus `docs/27`–`docs/40` — this repo's `docs/` stops at #26, so a single high-numbered file dropped in would be an island.
- **`ONBOARDING.md` is no longer on this list** — it was ported in batch 5. It is not a numbered working note, so it did not have the island problem; what it had was the opposite problem, describing behaviour this repo did not yet have, and that is what batches 1–4 removed.
- **Test counts quoted inside `docs/README.md`** move with every batch, and were stale (517/515) before batch 5 corrected them to the measured values. Treat any number written inside a document as a reading with a date, not as a constant.
- **npm publication**: `dsh-kiss-law` has never been published. Whether it ever should be, and under which version cadence, is an author decision, not an engineering one.

---

**One line for whoever picks this up**: the `src/` gap was 11 commits and roughly 2400 lines of behaviour, and it closed on 2026-10-28 across five batches. That number was written down so it could be checked, not so it could be admired. **If you ever have to open a sixth batch, do it the same way: port behaviour commit by commit, never `cp -r`** — and if you do copy files, check first what you deleted.
