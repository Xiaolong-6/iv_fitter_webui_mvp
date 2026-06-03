# Tester demo-data workflows

Use this file to organize demo traces for external testing. Keep copyrighted publication data out of this folder unless redistribution rights are explicit.

Recommended demo trace categories:

1. Ideal diode-like IV.
2. Series-resistance-dominated forward IV.
3. Shunt/leakage-dominated IV.
4. Photodetector-like forward-bias response.
5. Bad-fit example with deliberate model mismatch.
6. Near-bound example where at least one parameter hits a bound.

Each dataset should include:

- CSV trace.
- Metadata JSON.
- Expected model choice.
- Reasonable initial values.
- Expected diagnostics.
- Known limitations.
