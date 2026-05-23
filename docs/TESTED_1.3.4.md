# TESTED 1.3.4

Validation run for v1.3.4 handoff package.

Commands to run before release/commit:

```text
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend
npm install
npm run build
```

Manual checks:

```text
1. Import a HappyMeasure combined CSV and confirm only the selected trace is shown in plots.
2. Confirm the Data panel has a single trace dropdown, not a duplicated trace list.
3. Confirm model equation preview uses structured cards, not raw plain text.
4. Switch language in the left dock footer and confirm main workflow labels switch between English and Chinese.
5. Confirm version footer shows v1.3.4.
```
