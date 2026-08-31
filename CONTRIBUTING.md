# Contributing

Thanks for your interest in the KISS's Law DSH plugin (`dsh-kiss-law`).

## Licensing

This project uses **dual licensing**:

- **Open-source use**: AGPL-3.0
- **Commercial integration / closed-source distribution / OEM**: a separate license agreement — contact 563003@qq.com

Full statement: [License & security](./README.md#license--security) in the README.

## About the CLA

To support the dual licensing above, external contributions require a signed
**CLA (Contributor License Agreement)**, granting the project the rights to
distribute your contribution under both licenses.

- You will be prompted to sign the CLA automatically on your first pull request
- Until it is signed, the CLA status check on the PR will not pass

> Note: automated CLA signing is being set up. Until it is active the check will
> not fire automatically, but **submitting a PR means you accept the licensing
> terms in this guide**, authorizing the project to distribute your contribution
> under the dual licenses described above.

## Before you submit

- [ ] The change does not touch the judgment layer (`src/core/engine.mjs` / `src/core/law.mjs` / `src/core/bugstop.mjs`); if a judgment change is genuinely needed, open an issue to discuss it first
- [ ] Tests are green: run `npm test` (i.e. `node --test "test/*.test.mjs"`); current baseline is **123/123 passing**
- [ ] New scenarios come with new cases, and existing tests are neither modified nor deleted
- [ ] No new runtime dependencies (the only runtime dependency is `@deepseek-ai/dsh-tools`, an optional peerDependency)

## Other conventions

- The canonical conduction chain is **R→S→D→H→M** (codename `RSDHM`, matching alphabetical order). **Do not use the legacy spelling `RDSHM`.**
- The framework body (mind layer) is frozen in the base repos (`Shaky77/Weiwen-s_Law`, `Shaky77/KISS-s_Law`); this live-system repo carries engineering iteration only.
- Please attach the `npm test` output (tests / pass / fail) to your PR.
