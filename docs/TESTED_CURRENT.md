# Tested current

Version: v1.8.17

- Backend pytest: 125 passed.
- Backend compileall: passed.
- Frontend build/test: not re-run in this container because frontend node_modules is incomplete in the local sandbox; run `npm.cmd --prefix frontend ci --no-audit --no-fund --progress=true --registry=https://registry.npmjs.org/ && npm.cmd --prefix frontend run build && npm.cmd --prefix frontend run test -- --run --reporter=dot` locally.
- v1.8.17 scope: Model Builder full-canvas workspace, in-canvas component editor, stable add menus, long-chain spacing, and scrollable preview drawer.
- v1.8.17 scope: Model Builder full-canvas workspace cleanup, inline component editing, stable edge-add selection, Fitting empty-state cleanup, and Fit/Fix all alignment polish.
