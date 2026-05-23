# Tested v1.4.3

Scope: HappyMeasure CSV import compatibility.

Commands run during package preparation:

```powershell
PYTHONPATH=backend python -m pytest backend/tests/test_happymeasure_import_multi.py -q
```

Result: passed locally in sandbox.

Manual browser test:
1. Open Data, import a HappyMeasure CSV v2 file.
2. Confirm each trace appears separately in Trace selection.
3. Confirm voltage/current preview values match the export mode, especially current-source files.
