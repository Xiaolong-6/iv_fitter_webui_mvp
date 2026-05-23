# Tested v1.3.13

Validation performed for the v1.3.13 UI transparency and documentation update.

## Commands run

```text
npx.cmd tsc -p frontend\tsconfig.json
```

`npm.cmd run build` could not be rerun after the final patch because the Codex environment rejected the escalated command at the usage-limit gate. The same build command had passed earlier in this working session before the final Model Builder and documentation edits.

## Manual/browser and source checks

- Parsed pasted data with a simple voltage/current table.
- Renamed the active dataset and confirmed the trace selector updates.
- Changed voltage and current units and confirmed the spreadsheet preview headers and displayed values follow the selected units.
- Confirmed question-mark help renders through the dark portal tooltip and does not use browser-native yellow title bubbles.
- Confirmed legacy title hover text is handled by the shared tooltip layer.
- Source inspection confirmed Model preview no longer renders the circuit schematic.

## Scope notes

- Equivalent circuit now appears in Model Builder.
- Model preview keeps formula, current parameter values, solver, and component meaning sections.
- README is now grouped for human users first, then developer and agent references.
