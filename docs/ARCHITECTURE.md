# Architecture

## Runtime split

```text
React/Vite frontend -> FastAPI API -> Python fitting core
```

The fitting engine owns scientific behavior. FastAPI is an adapter. React is the user-facing client.

## Model architecture

The current model architecture is **Law / Form / Placement**.

- **Law**: the mathematical relation, such as Shockley diode, Ohmic resistance, soft-threshold power-law current, reverse leakage / soft-breakdown current, or a custom expression.
- **Form**: how the relation participates numerically, such as `current_branch` or `voltage_drop`.
- **Placement**: where the relation appears in the user model, primarily **Main path** or **Branches**.

User-facing UI should say **Main path** and **Branches**. Internal schema terms belong in developer docs or collapsed Advanced details.

## Data flow

```text
CSV/TXT/Data paste -> backend import parser -> TraceData -> FitRequest -> FitResult -> UI plots/warnings/report
```

Import parsing happens in the backend so column decisions, dropped rows, unit handling, and HappyMeasure compatibility are consistent between browser and API tests.

## Fitting flow

1. The frontend sends the selected trace, fit range, model spec, and fit config.
2. The backend validates the model and data.
3. The fitting engine evaluates current branches and main-path voltage-drop terms.
4. The API returns parameters, warnings, metrics, curves, and equation summaries.
5. The frontend renders plots, diagnostics, equation preview, and report/export panels.

## Solver boundary

The legacy implicit solver is the report-grade default path for normal composite fitting. The graph DC solver remains experimental and must be labeled as such.

## Frontend boundary

The frontend may render model summaries, formula cards, circuit previews, and user documentation. It must not invent scientific behavior that is not represented in the backend model spec and registry.

## Documentation boundary

User-facing documentation explains physical use, I-V curve effects, parameter meaning, and fitting strategy first. Schema IDs, internal parameter keys, adapter names, and serialization details belong only in developer docs or collapsed Advanced details.
