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
assert.match(componentSource, /Debug: synthetic trace/);
assert.match(componentSource, /Test: sample data/);
assert.match(componentSource, /openImportFileDialog/);
assert.match(componentSource, /importCsvTextMulti/);
assert.match(componentSource, /Voltage column unit/);
assert.match(componentSource, /Current column unit/);
assert.match(componentSource, /Data is immediately converted to V\/A/);
assert.match(componentSource, /unit_mode: "import_unit_to_si_internal"/);
assert.match(componentSource, /<th>V \(V\)<\/th><th>I \(A\)<\/th>/);
assert.doesNotMatch(componentSource, /Display unit only/);
assert.match(componentSource, /Synthetic IV Trace/);
assert.match(componentSource, /Synthetic trace generated from the current Model Builder model/);

const fittingPageSource = fs.readFileSync("frontend/src/pages/FittingPage.tsx", "utf8");
assert.match(fittingPageSource, /Stop fit/);
assert.match(fittingPageSource, /Fitting is in progress/);
assert.match(fittingPageSource, /Available after a completed fit/);
assert.doesNotMatch(fittingPageSource, /ignore this run/i);
assert.doesNotMatch(fittingPageSource, /Fitting… \$\{elapsedSeconds\}s/);

const modelBuilderSource = fs.readFileSync("frontend/src/components/ModelBuilder.tsx", "utf8");
assert.match(modelBuilderSource, /comp\.function_type !== "series_diode_barrier"/);
const modelUtilsSource = fs.readFileSync("frontend/src/model/utils.ts", "utf8");
assert.match(modelUtilsSource, /def\.allowed_polarities\.length \? \(polarity \?\? def\.default_polarity \?\? null\) : null/);

console.log("synthetic trace UI tests passed");
