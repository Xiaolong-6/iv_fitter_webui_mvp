import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const helperSource = fs.readFileSync("frontend/src/model/syntheticTrace.ts", "utf8");
const transpiled = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const module = { exports: {} };
vm.runInNewContext(transpiled, { module, exports: module.exports }, { filename: "syntheticTrace.js" });

const {
  appendSyntheticTrace,
  syntheticPointCount,
  validateSyntheticTraceForm,
} = module.exports;

const baseForm = {
  traceName: "synthetic",
  voltageStart: "-1",
  voltageStop: "1",
  voltageStep: "0.5",
  noiseMode: "none",
  noiseLevelA: "1e-12",
  relativeNoiseFraction: "0.01",
  seed: "1",
  complianceEnabled: false,
  complianceCurrentA: "1e-3",
};

assert.equal(syntheticPointCount(-1, 1, 0.5), 5);
assert.equal(syntheticPointCount(1, -1, 0.5), 5);
assert.equal(validateSyntheticTraceForm(baseForm).ok, true);
assert.equal(validateSyntheticTraceForm({ ...baseForm, voltageStep: "0" }).ok, false);
assert.match(validateSyntheticTraceForm({ ...baseForm, voltageStep: "0" }).error, /step/i);

const response = {
  trace_name: "synthetic",
  voltage_V: [0, 1],
  current_A: [0, 1e-9],
  metadata: { synthetic: true, ground_truth_parameters: { "R.Rsh_ohm": 1000 } },
};
const appended = appendSyntheticTrace([{ trace_id: "real", voltage_V: [0], current_A: [0], metadata: {} }], response);
assert.equal(appended.traces.length, 2);
assert.equal(appended.selectedTraceId, "synthetic");
assert.equal(appended.traces[1].metadata.synthetic, true);

const componentSource = fs.readFileSync("frontend/src/components/DataImportWorkspace.tsx", "utf8");
assert.match(componentSource, /Generate synthetic trace/);
assert.match(componentSource, /Synthetic IV Trace/);
assert.match(componentSource, /Synthetic trace generated from the current Model Builder model/);

console.log("synthetic trace UI tests passed");
