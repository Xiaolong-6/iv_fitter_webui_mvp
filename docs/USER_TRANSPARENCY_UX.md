# User transparency and friendliness policy

The Web UI should expose enough information for scientific review without forcing users to read source code or developer notes.

## Required transparency surfaces

1. **Data tab:** imported source, selected trace, trace count, point count, and spreadsheet preview.
2. **Model summary:** user-facing Main path and Branches, with nicknames such as Rs and Rsh where useful.
3. **Function guide:** law purpose, typical use region, parameters, polarity, and advanced/internal details only behind disclosure controls.
4. **Equation preview:** model-specific equivalent circuit and formatted formulas generated from the same model sent to the backend.
5. **Fit setup:** all inputs/selectors have concise hover help without crowding the main UI. Blank voltage-range inputs show the concrete selected-trace range that will be used.
6. **Parameter table:** values, units, bounds, fit/fixed state, and uncertainty when available.
7. **Diagnostics disclosure:** numerical warnings, residual cautions, possible physical/modeling causes, and actionable next steps without permanent large warning panels.
8. **Export metadata:** exact model, config, version, warnings, and import quality.

## UI wording rules

- Prefer user-facing topology words: `Main path` and `Branches`.
- Keep internal terms such as `core`, `series`, `parallel`, adapter names, and wrapper schema names out of the primary workflow.
- Prefer `reverse leakage / soft breakdown` over just `breakdown`.
- Prefer `main-path voltage drop` over vague `series function`.
- Label empirical functions as empirical unless a physical mechanism has been independently established.
- Display units beside parameter names.
- Unsupported combinations should be disabled or warned, never silently converted.
- Duplicate model selections may disable Add, but the model dropdown itself must remain usable so the user can recover by choosing another term.
- If a sentence mainly helps developers/agents, move it to hover help, details, or documentation rather than putting it in the main UI.


## Data-aware bounds transparency

The Parameter table may show bounds from four sources: registry default, data-suggested from the selected trace, user-edited, or fitted-as-initial for the initial value. Bounds suggestions are conservative optimizer search-window estimates. They are not physical proof that a parameter has that value or even that the component is identifiable.

The backend recommendation layer uses only the selected trace, the active fit voltage range, the current model, and registry defaults. It does not change parameter keys, equations, JSON result shape, or report table structure.

Recommended status/hover text must state the rule used. For example: Rs upper is estimated from the high-current dV/dI scale, with a fallback based on max(|V|)/high-percentile(|I|), then multiplied by a safety factor. Rsh is estimated from the low-voltage dV/dI scale with a deliberately wide range. I0/current amplitudes are limited by observed current scale. Softplus voltage thresholds/softness are bounded from the selected voltage span, and current thresholds/softness from the selected current magnitude. Ideality/exponent parameters remain registry-controlled unless the user edits them.

Application policy: automatic or button-driven data bounds may overwrite only registry-default or previous data-suggested bounds. User-edited bounds must be preserved. Completed fitted values may be written back as the next initial value only when the fit passes reportability and quality gating. Poor, bound-stuck, or non-reportable fits must leave the fitted values visible without silently overwriting trusted initials. Applying data bounds must not erase the fitted-as-initial workflow.

## Fit-process disclosure

Fit setup should show a compact disclosure after each fit with iterations/evaluations, elapsed time, points used, R²/log-R², weighted reduced chi-square, active bounds, optimizer status, and session totals. Keep the summary short; put full details behind the disclosure. Explain that weighted reduced chi-square is a weighting-dependent residual-scale diagnostic unless weights are calibrated measurement uncertainties.

## Synthetic fit-back transparency

For synthetic traces, the UI should expose when exact ground-truth parameters are available in trace metadata and provide an explicit `Seed from synthetic ground truth` action. Noiseless synthetic data is expected to fit back cleanly only when the same model structure, parameter snapshot, voltage range, and artifact settings are used. Numerical convergence alone is not enough; poor quality or bound-stuck fits must not be silently promoted as next-run initials.
