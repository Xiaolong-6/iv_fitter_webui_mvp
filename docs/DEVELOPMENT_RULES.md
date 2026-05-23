# Development rules

Top-level rules file: `PROJECT_RULES.md`.


These rules apply to all future IV-fitter Web UI work and agent-assisted development rounds.

## 1. Always confirm the human developer environment first

Before asking the human developer to run setup, install dependencies, debug a failure, or test a release, provide a short environment-confirmation checklist.

For Windows/PowerShell, ask them to run:

```powershell
py -0p
py -3.12 --version
py -3.12 -m pip --version
node --version
npm --version
git --version
```

If a project script exists, prefer:

```powershell
.\scripts\check_python.ps1
```

The assistant/agent must explain what the outputs mean and which version is expected.

Expected baseline for this project:

```text
Python: 3.12.x preferred
Node.js: current LTS
npm: bundled with Node LTS
Git: any recent stable version
```

Do not assume the user's `python` command points to the right interpreter. Prefer `py -3.12` on Windows.

## 2. Python version rule

Do not use preview/dev Python versions as the default development baseline.

Preferred:

```text
Python 3.12.x
```

Allowed if tested:

```text
Python 3.11.x or 3.13.x
```

Avoid as baseline:

```text
Python 3.14+ preview/dev versions, including 3.15
```

Reason: scientific packages and web backend dependencies may not have stable wheels for very new Python versions on Windows.

The backend package should declare a bounded Python range in `pyproject.toml` when possible.

## 3. No manual venv ritual

The repository must provide root-level scripts for setup, testing, and running.

Required scripts:

```text
scripts/setup_dev.ps1
scripts/check_python.ps1
scripts/test_backend.ps1
scripts/smoke_backend.ps1
scripts/run_backend.ps1
scripts/run_frontend.ps1
scripts/run_dev.ps1
```

The Python virtual environment should be created at the repository root:

```text
.venv/
```

Do not require users to manually activate `Activate.ps1`. Scripts should call:

```text
.venv/Scripts/python.exe
```

directly.

This avoids PowerShell execution-policy problems and makes repeated collaboration predictable.

## 4. Human docs, agent docs, and developer docs must be separated

Documentation must clearly distinguish three audiences:

1. **Human user docs**
   - How to use the software.
   - How to import data, build models, fit, inspect warnings, and export results.
   - No internal architecture assumptions.

2. **Human developer docs**
   - How to set up the environment.
   - How to run tests.
   - How to add features.
   - How to release and package.

3. **Agent developer docs**
   - Architecture map.
   - File ownership.
   - Safe extension points.
   - Do-not-break compatibility rules.
   - Required tests and docs per change.

Do not mix these audiences in one long unstructured README.

## 5. Mistake-learning rule

When an assistant/agent makes a mistake, causes user friction, or discovers an inconsistency, it must explicitly ask:

```text
Should this be written into the next version's development rules or handoff notes?
```

If the answer is yes, update the rules/docs in the next patch.

Examples:

- Wrong Python baseline.
- Manual venv activation friction.
- Hidden unsupported model behavior.
- Custom function shown in UI but not evaluated.
- Confusing human vs agent documentation.

## 6. Test what can be tested before handing work back

The assistant/agent should run every feasible test in its environment before handing off.

Minimum expected checks for backend-only changes:

```bash
python -m compileall -q backend/ivfitter backend/tests
python -m pytest backend/tests -q
```

For frontend changes, if Node dependencies are available, also run:

```bash
npm install
npm run build
```

If a test cannot be run due to environment limits, state that clearly and explain exactly what remains for the human developer.

Do not ask the human developer to run tests that the assistant/agent can already run, except as final local-environment verification.

## 7. Keep the program compact

Prefer small, focused modules and minimal dependencies.

Rules:

- Do not add a large dependency for a small utility.
- Keep backend numerical logic in focused Python modules.
- Keep frontend components small and composable.
- Do not ship generated caches, virtual environments, `node_modules`, screenshots, or build artifacts unless intentionally part of a release artifact.
- Keep example datasets small but representative.

## 8. Function-extension rule

New physical/empirical functions must be added through the registry and schema layer, not through hard-coded UI-only toggles.

Every new function must define:

```text
location: core | series | parallel
function_type
allowed polarities
parameter names
units
default values
bounds
fit/fixed default
equation text
help text
validation warnings
tests
```

## 9. Physics-transparency rule

The UI and reports must not overclaim physical meaning.

Empirical terms must be labeled as empirical unless validated by data and physics. For example, a reverse soft-breakdown term may describe voltage-dependent reverse leakage and should not automatically be reported as true avalanche or Zener breakdown.

Every fit result should expose:

- model topology
- equations
- parameter roles
- warnings
- ignored/unsupported/custom behavior
- export metadata sufficient for reproduction

## 10. Version-control rule

Each iteration must include:

- version bump
- changelog entry
- handoff note for the next agent/developer
- tests targeted at new behavior
- clear suggested commit title and body

Avoid silent behavior changes.

## 11. Explain actions for non-code readers

Do not assume the human developer understands the codebase, software architecture, Python packaging, frontend tooling, or command-line side effects.

When giving commands or making a package, briefly explain:

- what the command changes;
- why it is needed;
- whether it is safe to rerun;
- what success looks like;
- what failure usually means;
- which files or folders are expected to be created.

Prefer action-oriented explanations, not unexplained command dumps.

Example:

```text
This command creates the root virtual environment once. It is safe to rerun; if `.venv` already exists, the setup script reuses it.
```

## 12. Prefer one-click scripts for human workflows

Human developers should not be required to remember console commands for common actions.

For Windows, provide root-level `.bat` wrappers for setup, environment check, tests, and launch workflows:

```text
check_environment.bat
setup_dev.bat
test_backend.bat
run_backend.bat
run_frontend.bat
run_dev.bat
```

These wrappers must work even when PowerShell blocks `.ps1` execution by using process-local execution-policy bypass:

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ...
```

This does not permanently change the user's execution policy.

When possible, the human should be able to double-click a script and read a short explanation of what it is doing.

## 13. Validate helper scripts before handoff

Every Windows helper script patch must include a syntax validation step. In particular, PowerShell strings must avoid parser hazards such as:

```powershell
"$PythonVersion:"
```

Use braces when a variable is followed immediately by punctuation that PowerShell may parse as a scope/drive separator:

```powershell
"${PythonVersion}:"
```

Before handoff, run or provide:

```text
validate_scripts.bat
```

This catches script syntax errors before asking the human developer to run the workflow.

## 14. Number human-facing scripts by workflow order

When several one-click scripts are intended to be run in a sequence, prefix human-facing filenames with numbers.

Required Windows sequence:

```text
00_validate_scripts.bat
01_check_environment.bat
02_setup_dev.bat
03_test_backend.bat
04_run_dev.bat
```

Optional split launchers may use suffixes:

```text
04a_run_backend_only.bat
04b_run_frontend_only.bat
```

Keep older unnumbered wrappers only as compatibility aliases when helpful, but documentation should point humans to the numbered files.

## 15. Do not create redundant wrapper chains

When renaming scripts for usability, rename the human-facing scripts or create direct implementations. Do not add numbered files that only call unnumbered files while leaving both as user-facing entry points.

Bad:

```text
01_check_environment.bat -> calls check_environment.bat -> calls scripts/check_python.ps1
```

Good:

```text
01_check_environment.bat -> directly launches scripts/check_python.ps1
```

Compatibility aliases are allowed only when there is a strong reason, but they must not be the primary workflow and must not clutter the root directory. Prefer one clear numbered script per human action.

## 16. Every commit/package must be handoff-ready

Every commit or package handed to the human developer must be in a coherent handoff state.

A handoff-ready state means:

- the repository can be understood by the next human or agent from the included docs;
- the intended entry scripts are present and documented;
- version/changelog/handoff notes are updated;
- new behavior has targeted tests where practical;
- feasible tests were run before handoff, or unrun tests are explicitly listed with the reason;
- known limitations are documented, not hidden;
- the next recommended action is clear;
- there are no accidental half-renamed files, duplicate wrapper chains, stale aliases, or unexplained generated artifacts.

Do not hand off a package that requires the next person to infer what is finished, what is temporary, or what command should be run first.

## 17. Optional external tools must have guided install paths

If a workflow depends on an external tool such as Node.js/npm, the project must not stop at a vague warning.

Required behavior:

- explain which part still works without the tool;
- explain which part needs the tool;
- provide a one-click or clearly numbered helper when possible;
- tell the user what to rerun after installing the tool.

Example: if npm is missing, backend setup can complete, but frontend setup is skipped. The user should be directed to `01a_install_node_lts.bat`, then `02_setup_dev.bat`.

## 18. Tests in handoff packages must actually run

When a package contains tests, the assistant/agent must run those tests against the exact packaged tree before handoff whenever the execution environment allows it.

Do not claim a version is handoff-ready if tests import missing helpers, reference stale function names, or assert stale output formats.

Minimum backend handoff check:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

If tests cannot be run, the handoff message must say exactly which tests were not run and why.

## 19. Frontend blank-page fixes require build validation

If the frontend dev server starts but the browser page is blank, treat it as a frontend runtime/build issue until proven otherwise.

Required checks before handoff of frontend changes:

```bash
cd frontend
npm install
npm run build
```

Also verify that:

- React type packages are declared;
- Vite type references are present;
- `import.meta.env` is typed;
- frontend `FitConfig`/API types match backend schema fields;
- CSS side-effect imports are supported.

Do not call a Web UI package handoff-ready if Vite starts but `npm run build` fails.

## 20. React runtime errors require browser-console validation

A successful `npm run build` is necessary but not sufficient for React runtime handoff.

If the browser page is blank or a component fails at runtime, inspect the browser console and fix the actual runtime error. Typical examples:

- importing a module object as if it were a React component;
- incorrect default/named imports;
- stale type declarations hiding runtime export shape problems.

For Plotly, prefer a small local wrapper that calls `Plotly.react()` on a `div` over handing React an ambiguous module object.


## 21. Do not expose human privacy or local paths

Commit messages, changelogs, docs, screenshots, and handoff notes must not include private local paths, usernames, emails, account names, tokens, or machine-specific secrets.

Use placeholders:

```text
<project-root>
<user-home>
<repo>
```

Do not copy user-shared debug paths into committed files.

## 22. Setup and run scripts must stay separate

Run scripts must not silently perform dependency installation.

Correct behavior:

- setup scripts install dependencies;
- run scripts launch services;
- if dependencies are missing, run scripts stop and tell the user which setup script to run.

This prevents long unexplained spinners and partial installs during app launch.


## 23. Choose version bumps by change impact

The assistant/agent must choose the version bump that reflects the change, not blindly increment the last digit.

Use semantic intent:

- patch: bug fixes, script fixes, docs/rules updates, small UX fixes without schema/API change;
- minor: new user-visible capability, layout/workflow improvement, new validated function, new export/import path, or meaningful UI restructuring that remains backward compatible;
- major: breaking schema/API changes, incompatible project layout, removed supported workflow, or changed model semantics.

Document the reason for the chosen bump in the changelog.


## 24. Keep UI features modular and explainable

Interactive UI features such as charts, hover text, scaling, tooltips, and panels should be implemented as small reusable components.

Do not bury chart math, tooltip logic, model editing, and API calls in one large page component.

Preferred examples:

```text
SimpleChart.tsx
FitStatusBar.tsx
ModelBuilder.tsx
ParameterTable.tsx
format.ts
```

Each component should have one clear responsibility.

## 25. Fit-completed status requires quality gates

A numerical optimizer returning without an exception is not enough to show a green "Fit completed" state.

The backend must run quality gates for non-finite values, implausible current magnitudes, residual explosion, and non-finite/implausible RMSE. The frontend must show a failed/error state when any quality-gate error is present.
