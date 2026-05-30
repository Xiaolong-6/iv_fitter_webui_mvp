# Schema stability

The following schemas are compatibility-sensitive:

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

API routes follow the same compatibility principle. New breaking endpoint contracts should be introduced under a versioned prefix such as `/api/v2/...`; legacy `/api/...` routes should remain available until the frontend and documented workflows have migrated.

## Reproducibility rule

A JSON fit result should be sufficient to reproduce:

- exact model topology;
- laws, forms, placements, and polarities;
- custom expressions and parameter values;
- fitting configuration;
- warnings and metrics;
- plotted curves.

## User-facing boundary

Schema names are allowed in exported JSON, developer docs, and collapsed Advanced details. They should not dominate default user-facing documentation or normal UI text.
