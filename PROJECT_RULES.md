# IV-fitter project rules

This is the top-level rules file for human developers, agent developers, and future assistants.

If any rule here conflicts with scattered notes elsewhere, this file takes priority.

## 1. Handoff-ready state

Every handed-off commit/package must be understandable and runnable by the next human or agent.

Required before handoff:

- version/changelog updated;
- docs updated for the correct audience;
- one-click or clearly numbered entry scripts documented;
- feasible tests run against the exact packaged tree;
- unrun checks explicitly listed with reasons;
- known limitations documented;
- next action clearly stated.

## 2. Do not assume the human understands code or architecture

Explain what a command/package/change does, why it is needed, what it changes, and what success looks like.

Avoid unexplained command dumps.

## 3. Prefer one-click human workflows

For Windows, common actions should have numbered `.bat` entry points:

```text
00_validate_scripts.bat
01_check_environment.bat
02_setup_dev.bat
03_test_backend.bat
04_run_dev.bat
```

Do not create redundant wrapper chains.

## 4. Confirm the human environment first

Before debugging setup or runtime issues, confirm:

```powershell
py -0p
py -3.12 --version
py -3.12 -m pip --version
node --version
npm --version
git --version
```

Preferred Python baseline: Python 3.12.x.

Do not use preview/dev Python as the default baseline.

## 5. Test before handoff

Backend handoff checks:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

Frontend handoff checks when Node/npm is available:

```bash
cd frontend
npm install
npm run build
```

A Vite `ready` message is not proof that the React app renders.

## 6. Keep the project compact

Do not commit `.venv`, `node_modules`, `dist`, caches, temporary logs, or generated junk.

Do not add large dependencies for small utilities.

## 7. Function-extension discipline

New physical/empirical functions must be registry/schema driven and must define:

- topology location;
- function type;
- allowed polarities;
- parameters, units, defaults, bounds;
- equation text;
- help text;
- validation warnings;
- tests.

## 8. Physics transparency

Empirical fitting terms must not be overclaimed as physical mechanisms.

The UI and reports must show equations, parameter roles, warnings, and reproducibility metadata.

## 9. Mistake-learning rule

When an assistant/agent causes friction or finds a mismatch, ask whether the lesson should be written into the next version's rules. If yes, update this file and the relevant docs.

## 10. Documentation audiences

Keep these audiences separate:

- human users;
- human developers;
- agent developers.

Do not dump all guidance into one unstructured README.

## 11. Do not expose human privacy or local paths in commits

Commit messages, changelogs, docs, examples, reports, screenshots, and handoff notes must not expose the human developer's private local paths, usernames, email addresses, account names, or machine-specific secrets.

Bad:

```text
C:\Users\carll\Documents\GitHub\...
```

Good:

```text
<project-root>
```

Local paths may appear in transient console screenshots only when the user shares them for debugging; do not copy them into committed docs or commit messages.

## 12. Setup and run must stay separate

Run scripts must not implicitly perform slow dependency installation. Setup scripts install dependencies; run scripts launch already-installed software.

If dependencies are missing, a run script should stop with a clear message telling the user to run the numbered setup script.

## 13. Choose version bumps by change impact

The assistant/agent must choose the version bump that reflects the change, not blindly increment the last digit.

Use semantic intent:

- patch: bug fixes, script fixes, docs/rules updates, small UX fixes without schema/API change;
- minor: new user-visible capability, layout/workflow improvement, new validated function, new export/import path, or meaningful UI restructuring that remains backward compatible;
- major: breaking schema/API changes, incompatible project layout, removed supported workflow, or changed model semantics.

Document the reason for the chosen bump in the changelog.

## 14. Keep UI features modular and explainable

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

## 15. User-facing transparency tabs must stay consistent

The Web UI left-panel documentation tabs are part of the released product, not developer notes. Before each version handoff, verify that these user-facing tabs still match:

- the current component registry and available functions;
- the actual fitting workflow and quality-gate behavior;
- the current import/export/report behavior;
- the displayed software version;
- the wording in README, changelog, and tested notes.

Avoid a black-box fitting experience. Real users must be able to see what the software does, what the model functions mean, what warnings mean, and what the software does not decide for them.

## UI transparency consistency rule added in 1.1.3

Every release that changes fitting behavior, plotting, model functions, parameter editing, or warnings must check the user-facing tabs for consistency:

- User guide must describe the current workflow.
- Function guide must match the backend registry and Model Builder.
- Fitting logic must match the actual backend fit request/response path.
- Fit & convergence must match current parameter-initialization, bounds, multistart, and warning behavior.
- Version shown in the UI, README, changelog, backend package, and frontend package must match.


## Function/topology architecture rule

A function defines an equation. A component instance defines where that equation is placed in the model topology. The solver, not the function registry, determines how component equations are assembled.

Every release must check that user-facing Function guide, Fitting logic, topology preview, Model Builder, and backend registry remain consistent.


## Law / Form / Placement architecture rule

A function/law must be defined mathematically before topology is considered. A component instance chooses the law, the evaluation form, the placement in the topology, parameters, and nodes. Rs and Rsh must be treated as the same Ohmic law used with different forms/placements, not as unrelated mathematical functions.

## Ambiguity gate for code changes

When architecture or implementation intent is ambiguous, stop and confirm the intended design with the user before changing code or producing a new package. Discuss options, risks, and expected behavior first.

## HappyMeasure import and multi-trace rule

HappyMeasure CSV compatibility must be treated as a release-facing contract. Import code and UI must handle:

- `single-v2`: one trace from source and measured columns;
- `wide-v2`: one shared source axis with one measured column per trace;
- `long-v2`: one row per trace point grouped by `trace_index`.

Multi-trace imports must not silently collapse traces into one trace. The UI must show the trace count, list imported traces, and make clear which trace is selected for fitting.

## Plot safety rule

Plot rendering must never visually invent connections between unrelated data. Fit lines must be sorted by x for display, invalid/log-invalid points must not be drawn as continuous segments, and different traces must never be connected into a single fit line. SVG/CSS must keep line paths unfilled.

## Numeric input editing rule

Numeric text boxes must allow partial valid typing states such as `-`, `-.`, `1e`, and `1e-` without committing NaN or blocking the user. Only complete finite values should be committed to fitting configuration or parameter state.


## v1.3.5 UI clarity and i18n rules

- User-facing equations and equivalent-circuit explanations must not be dumped as raw plain text paragraphs. Use structured cards, schematic-style layout, and readable formula blocks.
- Multi-trace imports must default to selected-trace-first plotting and fitting. Do not overload the plot workspace with every imported trace unless the user explicitly selects a comparison mode.
- The Data panel should avoid redundant trace controls; one clear selected-trace dropdown is preferred over both dropdown and list.
- New user-facing UI strings must be routed through the English/Chinese i18n dictionary when practical.
- The language selector belongs in the left dock footer near the version label so it is persistent but not disruptive.

## v1.3.5 readable UI and i18n rules

- User-facing formulas must be rendered as structured math/equation UI, not backend/debug plain text such as raw `V_ext`, `V_drop,k`, or solver residual strings.
- If a formula comes from backend equation summaries, the frontend must convert it into a user-readable card or hide it behind a developer/debug view.
- Chinese and English UI labels must be kept in the i18n dictionary for all visible workflow controls, docs, status text, parameter/warning panels, and model-builder labels.
- A release is not handoff-ready if switching language leaves major workflow panels half translated.


## v1.3.6 scroll and layout rule

Desktop workspace columns must have explicit scroll ownership. Long right-side content such as plots, parameters, warnings, equation preview, documentation cards, and generated reports must remain reachable without relying on browser body scrolling. When adding large cards to the main workspace, verify that both the left control column and the right plot/results column can scroll independently.

## v1.3.8 rendered formula, scroll, and numeric-input rules

- User-facing model formulas must be rendered as displayed equation blocks. Do not expose backend/debug equation strings as the primary UI.
- Equation previews must be model-specific: show the equivalent circuit, junction-voltage relation, branch-current terms, combined equation, and solver residual for the currently selected model.
- Desktop UI panes must have explicit scroll ownership. A visible scrollbar must correspond to a scrollable container whose height is actually constrained by the app layout.
- Numeric inputs must support temporary draft states such as `-`, `-.`, `-0.`, `-0.1`, `1e-`, and `1e-9` without committing NaN or rewriting the draft mid-typing.
- Residual floor should be estimated from the selected trace when data is loaded or the selected trace changes, unless a later explicit user-lock setting is implemented.


## v1.3.8 UI semantics rules

- Model Builder must use user-facing topology buckets: Main path and Branches. Avoid exposing internal buckets such as core, node branch, or solver implementation names in the normal workflow.
- Implementation details such as accepted CSV schema variants or numeric draft handling must not be shown as permanent body text. Put them behind compact help icons/tooltips unless they directly affect physical interpretation or reporting transparency.
- The collapsed left dock must remain icon-based, not first-letter based, so Chinese/English labels collapse consistently.


## v1.3.9 model semantics and handoff rules

- Rs and Rsh must be treated as user-facing nicknames for Ohmic law instances, not as separate mathematical laws.
- The normal Model Builder must expose Main path and Branches, not internal core/series/parallel implementation buckets.
- Developer identifiers such as adapter names, wrapper schema names, and serialization details belong in hover/help/details sections, not primary user workflow text.
- Dependency entry points for handoff packages must exist at repository root: `requirements.txt`, `package.json`, and numbered one-click scripts.
- Before each version, inspect the UI against the user-facing documentation and the current model semantics; do not let stale docs describe old internal categories.
