# Tested v1.3.11

Validation performed for the v1.3.11 audit-readiness cleanup package:

```text
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
npm install
npm run build
```

Results:

```text
24 passed
backend compileall passed
frontend build passed
```

Manual checks still required after unzipping locally:

- Open Data tab and verify file import, paste import, trace dropdown, and spreadsheet preview.
- Switch English/中文 and inspect the main workflow for half-translated labels.
- Collapse and expand the left dock; verify icons and language/version footer.
- Verify Model Builder displays Main path / Branches and hides developer keys unless advanced/details are opened.
- Verify polarity selectors appear for polarity-capable functions and not for Ohmic components.
- Run a fit and inspect formula cards, parameters, warnings, and right-side scrolling.
