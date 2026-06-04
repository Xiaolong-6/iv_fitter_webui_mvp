# Canonical IVfitter demo set

These files are for release-candidate smoke testing, not for publication claims.

## 01 — Clean diode

File: `canonical_01_clean_diode.csv`

Recommended path:
1. Import CSV.
2. Select the clean diode trace.
3. Load Model Builder V3 → Single diode preset.
4. Keep graph_dc selected.
5. Fit D1.I0, D1.n, Rs.Rs, and Rsh.Rsh.

Expected qualitative result: smooth forward exponential, low reverse current, no compliance warning.

## 02 — Photodiode / light IV

File: `canonical_02_photodiode_light.csv`

Recommended path:
1. Import CSV.
2. Start from Single diode preset.
3. Add a constant current branch or use the custom I(V) current law with a fixed negative current offset if available.
4. Fit diode and shunt/series terms.

Expected qualitative result: negative current offset around zero bias and diode turn-on under forward bias. A simple diode-only preset should leave structured residuals; that is expected.

## 03 — Noisy non-ideal IV

File: `canonical_03_noisy_nonideal.csv`

Recommended path:
1. Import CSV.
2. Fit with Single diode preset.
3. Inspect warnings, residual plot, and report quality metrics.

Expected qualitative result: fit may converge but should be treated as a diagnostic case; residuals and warnings matter more than a single R² number.
