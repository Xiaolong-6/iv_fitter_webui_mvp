# Physics modeling policy

This project treats empirical fitting terms as compact-model components, not as automatic proof of microscopic mechanisms.

## Core rigor rules

1. A law/function must state its mathematical relation, available evaluation forms, allowed placements, allowed polarities, parameters, units, defaults, and bounds.
2. Rs and Rsh are user-facing nicknames for Ohmic-law instances in different placements/forms. They must not be documented as unrelated mathematical functions.
3. Polarity transforms must be explicit: forward, reverse, symmetric, or not applicable.
4. A fitted parameter should be interpreted physically only when it is identifiable, stable under reasonable fit ranges, not pinned to bounds, and not dominated by excluded/outlier regions.
5. Empirical high-bias, leakage, or breakdown-like terms must be described cautiously. UI and reports must not force an avalanche/Zener or microscopic interpretation unless the data and independent evidence support it.
6. Custom expressions must be included in exported results and warnings so the fit can be reproduced and reviewed.
7. Unsupported law/form/placement/polarity combinations must fail validation or be disabled. They must never silently become a different model.

## Reporting language

Prefer cautious, reviewable language:

- `reverse leakage / soft breakdown` rather than only `breakdown`;
- `main-path voltage drop` rather than unexplained `series function`;
- `Ohmic branch leakage` rather than treating Rsh as a separate law;
- `empirical high-bias branch` when a term is curve-shape motivated;
- `conductance modifier` only when the function modifies an existing main-path relation.

## Function extension checklist

Before adding a new law/function, define:

- mathematical law and user-facing name;
- supported forms, such as voltage drop or current branch;
- supported placements, such as main path or branch;
- supported polarity handling;
- parameter names, units, defaults, and bounds;
- expected physical role and limits of interpretation;
- validation rules;
- formula-card rendering behavior;
- tests for numerical behavior and invalid configurations.
