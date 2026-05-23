# Tested v1.3.1

Commands run:

```text
PYTHONPATH=backend python -m pytest backend/tests -q
python -m compileall -q backend/ivfitter backend/tests
cd frontend && npm install && npm run build
```

Expected result:

```text
18 passed
frontend production build succeeds
```

Manual validation focus:

```text
1. Model Builder add menus in main/series/parallel show the same function library.
2. Placement selector, not add-menu category, defines topology.
3. graph_dc mode respects placement.
4. legacy_composite mode is understood as compatibility mode for the classic topology only.
```
