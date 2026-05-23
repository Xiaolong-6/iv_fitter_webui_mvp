# Agent developer rules

Top-level rules file: `PROJECT_RULES.md`.


This document is for automated or human-assisted coding agents.

## Start every round with environment assumptions

Before giving local commands to the human developer, state the expected baseline:

```text
Windows PowerShell
Python 3.12.x through py -3.12
Node.js LTS
root .venv managed by scripts
```

Tell the human how to verify it:

```powershell
.\scripts\check_python.ps1
node --version
npm --version
```

## Do not make users repeat manual setup

Do not ask the user to repeatedly create or activate virtual environments.

Correct workflow:

```powershell
.\scripts\setup_dev.ps1
.\scripts\test_backend.ps1
.\scripts\run_backend.ps1
.\scripts\run_frontend.ps1
```

## Test before handoff

Run all feasible checks in the agent environment.

Always report:

- what was tested
- what passed
- what could not be tested
- why it could not be tested

## Learn from mistakes

If the agent caused friction or made an incorrect assumption, ask whether to codify the lesson:

```text
Should I add this as a rule in the next version?
```

If yes, update `docs/DEVELOPMENT_RULES.md` and relevant handoff docs.

## Keep audiences separate

When updating docs, place content in the correct document:

- `README.md`: concise product overview and first commands.
- `docs/HUMAN_DEVELOPER_SETUP.md`: local setup and daily development.
- `docs/DEVELOPMENT_RULES.md`: durable project rules.
- `docs/AGENT_DEVELOPER_RULES.md`: agent-specific collaboration rules.
- user-facing guides: no internal agent language.

## Keep the package small

Do not commit `.venv`, `node_modules`, cache folders, generated temporary plots, or oversized example files.

## Explain what you are doing

Do not assume the human understands the implementation details.

When asking the human to run a command, include one short sentence explaining what it does and what success looks like. For multi-step workflows, explain the purpose of each phase before the command block.

Avoid unexplained command dumps unless the user explicitly asks for commands only.

## Prefer one-click handoff scripts

When adding or changing setup/test/run workflows, provide `.bat` wrappers on Windows so the human developer can double-click instead of typing PowerShell commands.

Do not rely only on `.ps1` scripts, because many Windows machines block script execution by default.

## Validate scripts after changing them

After changing `.ps1` or `.bat` files, add/run script syntax validation before handoff.

PowerShell variable interpolation can fail when a variable is followed by `:`. Use `${Variable}:` instead of `$Variable:`.

## Number workflow scripts for humans

If scripts have a recommended order, number the root-level human-facing wrappers. Do not expect the human developer to infer startup order from documentation alone.

Preferred sequence:

```text
00_validate_scripts.bat
01_check_environment.bat
02_setup_dev.bat
03_test_backend.bat
04_run_dev.bat
```

## Do not add pointless wrapper layers

If the user asks for renamed or numbered scripts, create clean scripts with the final names. Do not add thin wrapper aliases that call old wrapper aliases. That increases clutter and makes debugging harder.

## Handoff-ready commit rule

Do not hand off a commit/package unless it is coherent for the next human or agent.

Before handoff, check:

- docs updated for the correct audience;
- changelog updated;
- tests run or limitations stated;
- scripts are not redundant or stale;
- next action is explicit;
- any missing external tools have a guided install path.

If the state is intentionally partial, label it clearly as partial and explain the next step.

## Package tests must be self-contained

Before handoff, run tests against the exact packaged tree, not an earlier working directory. Test modules must not depend on missing helpers or stale names.

If helper functions such as `sample_trace()` are shared across tests, keep them in a stable helper module or ensure they are exported by the test module that imports them.

## Frontend handoff must include build status

For frontend changes, run `npm run build` when Node/npm is available. A Vite dev server message is not enough; the browser can still be blank if TypeScript or runtime imports are broken.

If `npm run build` cannot be run, state that explicitly.

## Privacy-safe handoff

Never put the human developer's local paths, usernames, account details, or private identifiers into commit messages, docs, or changelogs. Use `<project-root>` and other placeholders.

## Do not hide setup inside run

Do not make launch scripts run slow dependency installation. If dependencies are missing, fail with a clear instruction to run the setup script.


## Choose the version bump deliberately

Do not blindly increment the patch number. Decide patch/minor/major from the impact of the change and state the reason in the changelog or handoff summary.
