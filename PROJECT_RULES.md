# IV-fitter Web UI project rules

This is the priority rules file for human developers, agent developers, and future assistants. If scattered notes conflict with this file, this file wins.

## 1. Handoff readiness

Every handoff package must be understandable, runnable, and auditable by the next human or agent.

Before handoff, verify or explicitly mark as not verified:

- version numbers match in backend, frontend, root package, README, changelog, UI, and tested notes;
- changelog and tested notes describe the exact package being handed off;
- user-facing docs match the current UI and backend behavior;
- developer/agent docs do not leak into the normal user workflow;
- numbered Windows scripts still work from the project root;
- backend tests, compile checks, and frontend build have been run against the exact packaged tree;
- generated folders and caches have been removed from the package;
- known limitations and next actions are documented.

## 2. Ambiguity gate

When architecture, solver behavior, UI semantics, or implementation intent is ambiguous, stop and confirm the design with the user before changing code or producing a new package.

Discuss:

- the problem being solved;
- proposed design;
- alternatives;
- risks;
- expected user-visible behavior.

Do not generate a new code package under uncertainty.

## 3. Audience separation

Keep these audiences separate:

- real users using the fitting UI;
- human developers maintaining the source;
- agent developers continuing the project.

Normal UI text should be concise and user-facing. Implementation details such as accepted CSV wrapper names, internal placement keys, adapter names, serialization details, or numeric draft handling belong in compact help, advanced details, developer docs, or tested notes unless they are needed for physical interpretation or reporting transparency.

## 4. User-facing transparency without dark boxes

The released UI must show enough information for scientific review without forcing users to read code.

Required user-facing surfaces:

- current data source, selected trace, point count, and preview;
- current model summary in user-facing terms;
- equivalent-circuit preview;
- model-specific formatted formulas;
- parameter values, units, fit/fixed state, bounds, and uncertainty when available;
- warnings and fit-quality verdicts with actionable next steps;
- software version and reproducibility metadata.

The UI must not merely say that a fit completed. It must distinguish numerical convergence from fit credibility.

## 5. Law / Form / Placement model semantics

A function/law is a mathematical relation first. It is not inherently series or parallel.

A component instance chooses:

- law/function;
- evaluation form, such as voltage drop or current branch;
- topology placement, such as main path or branch;
- polarity when applicable;
- parameters, units, bounds, and nickname;
- nodes/graph connection when graph solving is used.

Rs and Rsh are default nicknames for two Ohmic-law instances. They are not separate mathematical laws.

Normal Model Builder UI must expose the user-facing buckets:

- Main path;
- Branches.

Do not expose internal implementation buckets such as `core`, `series`, or `parallel` in the normal workflow. Internal keys may appear only in advanced/developer details.

## 6. Formula and equation presentation

User-facing formulas must be rendered as formatted equation blocks/cards, not raw backend/debug strings.

Default formula display must be model-specific. For example, a D1 + Ohmic main path + Ohmic branch model should show:

- junction voltage relation;
- branch-current terms;
- total-current relation;
- combined implicit equation;
- solver residual only in an explanatory or advanced block.

Generic summation expressions or debug strings may be used in developer/debug views, not as the primary user explanation.

## 7. Fitting and solver truthfulness

Fit success from the optimizer is not automatically a trustworthy scientific fit.

Quality gates must prevent exploded/non-finite fits from appearing as normal success. Warnings should be actionable and should distinguish:

- numerical failure;
- numerical convergence but poor fit quality;
- parameter-bound issues;
- likely compliance/outlier dominance;
- model-structure mismatch;
- insufficient points or invalid input data.

## 8. Plot safety and selected-trace workflow

Plot rendering must not visually invent connections between unrelated data.

Rules:

- fit lines are unfilled paths;
- invalid or log-invalid points break lines;
- different traces are never connected into one path;
- hysteresis/segmented data must not be stitched into misleading polygons;
- multi-trace import defaults to selected-trace-first plotting and fitting;
- comparison views must be explicit user choices.

## 9. Data transparency and HappyMeasure compatibility

Data import must preserve trace identity.

HappyMeasure CSV v2 compatibility is a release-facing contract. Import code must handle:

- `single-v2`: one trace from source and measured columns;
- `wide-v2`: shared source axis with one measured column per trace;
- `long-v2`: one row per trace point grouped by `trace_index`.

Normal UI should say that HappyMeasure multi-trace files are supported. Exact wrapper names should be shown in hover/help or advanced details, not as permanent body text.

The Data tab must keep import controls, paste import, selected-trace dropdown, and spreadsheet preview separate from fitting/model-building controls.

Imported trace arrays passed to fitting must stay in SI units (V/A). UI unit selectors may change display units, but they must not rescale or reinterpret the internal fitting arrays unless the user explicitly chooses a separate re-interpret/source-unit action.

## 10. Numeric input behavior

Numeric inputs must allow temporary draft states without committing invalid values or rewriting the user's text mid-typing.

Allowed draft examples:

- `-`;
- `-.`;
- `-0.`;
- `-0.1`;
- `1e`;
- `1e-`;
- `1e-9`.

Only complete finite values should be committed to fitting configuration or parameter state. Invalid drafts should revert on blur or remain visually marked without corrupting config.

## 11. Hover/help coverage

Every user input, selector, checkbox, and action button that changes fitting, data, model, plots, or export behavior should have a concise hover/help explanation.

The main workflow should remain visually clean. Prefer compact `?` help and titles over long explanatory paragraphs.

## 12. I18n and user text

Visible workflow labels should be routed through the English/Chinese i18n dictionary when practical.

A release is not handoff-ready if switching language leaves major workflow panels half translated. Technical identifiers may remain untranslated only when they are intentional internal IDs, formulas, units, or solver names.

The language selector belongs in the left dock footer near the version label.

## 13. Layout and scrolling

Desktop workspace panes must have explicit scroll ownership. A visible scrollbar must correspond to a constrained, scrollable container.

When adding large cards to the app, verify that the left control column, right plot/results column, and documentation pages remain reachable without relying on accidental browser-body scrolling.

## 14. One-click workflow and dependencies

Root-level numbered `.bat` scripts are the preferred Windows human workflow:

```text
00_validate_scripts.bat
01_check_environment.bat
02_setup_dev.bat
03_test_backend.bat
04_run_dev.bat
```

Setup and run must stay separate. Run scripts should not silently install dependencies.

Root-level dependency manifests must remain available for overwrite-friendly handoff:

- `requirements.txt`;
- `package.json`;
- `DEPENDENCIES.md`.

## 15. Testing before handoff

Backend handoff checks:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
```

Frontend handoff checks when Node/npm is available:

```bash
npm install
npm run build
```

A Vite ready message is not proof that the React app renders. Manual UI checks must be listed separately.

## 16. Package hygiene and privacy

Do not commit or package:

- `.venv`;
- `node_modules`;
- `dist`;
- `__pycache__`;
- `.pytest_cache`;
- temporary logs;
- generated junk.

Commit messages, docs, examples, reports, screenshots, and handoff notes must not expose private local paths, usernames, account names, email addresses, or secrets.

Use placeholders such as:

```text
<project-root>
<user-home>
<repo>
```

## 17. Versioning

Choose version bumps by impact, not by habit:

- patch: bug fixes, script fixes, docs/rules updates, small UX fixes without schema/API change;
- minor: new user-visible capability, layout/workflow improvement, new validated function, new export/import path, or meaningful UI restructuring that remains backward compatible;
- major: breaking schema/API changes, incompatible project layout, removed supported workflow, or changed model semantics.

Document the rationale in the changelog.

## 18. Rules maintenance

The rules file must not become a dump of repeated version-specific lessons.

When audit or user feedback reveals a systemic issue:

1. fix it if feasible;
2. add or update a general rule here;
3. avoid appending duplicate version-specific rule blocks;
4. periodically consolidate overlapping rules into stable sections;
5. move detailed history to changelog or tested notes.

Rules should be durable operating principles, not an unmaintained incident log.

## 19. Audit-driven numerical and frontend robustness

External audits must be converted into durable rules, not only one-off patches.

Numerical rules:

- reported parameter standard errors must include residual variance scaling, not bare `(J^T J)^-1`;
- implicit solvers must never silently return unconverged fallback guesses as valid predictions;
- graph/KCL solver failures must surface NaN/error warnings and make results non-reportable;
- experimental solvers exposed to users or agents must carry warning-level gating until manually validated;
- model validation must reject physically invalid global settings such as nonpositive temperature;
- multistart seeding should explore bounded/log-scale parameter space for strongly correlated diode parameters.

Backend/API rules:

- API, UI, exported model, and package versions must come from a single dynamic source where practical;
- column inference fallbacks must warn users instead of silently choosing ambiguous columns;
- request validation errors and runtime failures should use distinct HTTP status classes.

Frontend rules:

- major panels that render external data, plots, or fit results need ErrorBoundary protection;
- equation/preview requests triggered by model editing must be debounced or explicitly user-triggered;
- large React components must be split into readable subcomponents before they become agent-hostile patch targets;
- accessibility basics for charts include `role`, `aria-label`, `<title>`, and keyboard focus support.
