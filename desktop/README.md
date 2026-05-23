# Desktop packaging assessment

Version 1.0.0 does not wrap the app yet. It records the decision point for local-first desktop delivery.

Recommended path:

1. Keep FastAPI + React browser workflow as the primary development mode.
2. Add a small Python launcher first:
   - start the FastAPI backend;
   - open the frontend URL in the default browser;
   - shut down cleanly when the process exits.
3. Evaluate Tauri only after the Web workflow and API schema are stable.
4. Avoid Electron unless Tauri packaging blocks critical Windows workflows.

Acceptance for a future desktop wrapper:

- one-click Windows launch;
- no manual terminal required;
- local-only backend;
- no cloud account;
- user data remains in local files;
- export paths are explicit.
