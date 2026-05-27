# Frontend testing

IVfitter uses Vitest for fast frontend unit tests. The first test layer intentionally focuses on pure TypeScript logic before broad DOM integration tests.

## Run tests

```bash
cd frontend
npm install
npm run test
npm run build
```

`npm run test:watch` starts Vitest in watch mode for local UI/model iteration.

## Current coverage focus

The v1.5.16 frontend test foundation covers:

- parameter and metric formatting helpers,
- compact parameter status classification,
- fit diagnostics/verdict helpers,
- data-driven bounds suggestion application and source metadata,
- Model Builder bucket/filter/duplicate rules,
- representative i18n key availability.

The v1.5.19 workflow shell also has source-level regression checks for the new Start here / Data / Model / Fitting / Report / Help navigation and page structure. When adding or moving major page content, update those checks and add focused Vitest coverage once local frontend dependencies are available.

## Test policy

Prefer small, deterministic unit tests for model logic and UI state helpers. Add component smoke tests only when the component has stable props and behavior. Avoid large snapshots of the whole app because the fitting workspace changes frequently and broad snapshots tend to hide meaningful regressions.

When adding new model-builder rules, report/export formatting, diagnostic status text, or translation keys, add or update a focused Vitest test in the same area.
