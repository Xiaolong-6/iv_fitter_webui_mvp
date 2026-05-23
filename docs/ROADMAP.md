# Roadmap

This file replaces older roadmap fragments.

## Current status

The Web UI is an internal alpha/prototype with working local browser workflow:

- Data import and pasted-data import.
- HappyMeasure CSV v2 compatibility.
- Model Builder with Law / Form / Placement functions.
- Photocurrent and light-response terms.
- Fit diagnostics, warnings, residual plots, and formula preview.
- Mobile portrait improvements.
- LAN phone/tablet testing helper.
- User-facing Function Guide.

## Near-term priorities

1. Fit-quality verdicts with clearer user actions.
2. Parameter identifiability labels: weakly constrained, near-bound, fixed, inherited seed, etc.
3. Structured equation schema from backend instead of mostly string-based summaries.
4. Better real-dataset regression suite, including HappyMeasure and real photodiode traces.
5. Optional light/dark two-trace `ΔI(V)` preview.
6. Optional light-response presets after the manual workflow is stable.

## Release-candidate priorities

- Confirm parity against the mature desktop/Tkinter workflow on representative IV datasets.
- Stabilize JSON export/import schema.
- Decide packaging strategy: browser-local scripts, desktop wrapper, or other local launcher.
- Add a small set of benchmark traces with expected-fit tolerances.
- Run browser manual tests on Windows, mobile portrait, and LAN phone/tablet modes.

## Product guardrail

Do not add features that make the core workflow slower, less reliable, or harder to explain: import I-V data, build a physically interpretable model, fit, inspect diagnostics, and export defensible results.
