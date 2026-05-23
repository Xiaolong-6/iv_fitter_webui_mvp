# Tested v1.3.10

Validation performed for the handoff package:

```text
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
npm install
npm run build
```

Expected manual checks:

- Data tab imports CSV/TXT/DAT files and keeps multiple traces selectable.
- Data tab parses pasted V/I data and shows a spreadsheet preview.
- Workspace no longer contains the import card; it uses the selected trace.
- Model Builder exposes polarity where supported.
- Inputs/selectors expose hover hints without filling the main UI with developer text.
