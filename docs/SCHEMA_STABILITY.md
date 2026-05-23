# Schema stability for 1.0 candidate

The following schemas are considered stable for the 1.0 candidate branch:

- `ParameterSpec`
- `ComponentSpec`
- `ModelSpec`
- `TraceData`
- `FitConfig`
- `FitRequest`
- `ParameterResult`
- `FitWarning`
- `FitCurves`
- `EquationSummary`
- `FitResult`

## Compatibility rule

Future versions may add optional fields, but should not rename or remove existing fields without a migration adapter.

## Reproducibility rule

A 1.0 exported JSON result must be sufficient to reproduce:

- exact model topology;
- function types and polarities;
- custom expressions and parameter values;
- fitting configuration;
- warnings and metrics;
- plotted curves.
