import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("frontend/src/model/parameterGrouping.ts", "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const module = { exports: {} };
vm.runInNewContext(transpiled, { module, exports: module.exports, structuredClone }, { filename: "parameterGrouping.js" });

const {
  buildParameterRows,
  filterParameterRows,
  groupParameterRows,
  parameterKey,
  seedComponentFromFittedValues,
  setComponentFitState,
} = module.exports;

function assertJsonEqual(actual, expected) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}

const p = (value, fit = true, lower = null, upper = null) => ({ value, fit, lower, upper, unit: null, label: null, description: null });
const model = {
  core: [
    { id: "D1", location: "core", function_type: "diode", law_id: "shockley_diode", evaluation_form: "current_branch", placement: "junction_current_branch", polarity: "forward", params: { I0_A: p(1e-12), n: p(1.5, false, 0.5, 10) }, metadata: { nickname: "D1" } },
  ],
  series: [
    { id: "Rs", location: "series", function_type: "constant_rs", law_id: "ohmic", evaluation_form: "voltage_drop", placement: "series_voltage_drop", polarity: null, params: { Rs_ohm: p(10, true, 0, 1e9) }, metadata: { nickname: "Rs" } },
  ],
  parallel: [
    { id: "Rsh", location: "parallel", function_type: "constant_rs", law_id: "ohmic", evaluation_form: "current_branch", placement: "parallel_current_branch", polarity: null, params: { Rs_ohm: p(1e9, false, 1e3, 1e18) }, metadata: { nickname: "Rsh" } },
  ],
  graph: null,
  temperature_K: 300,
  version: "test",
};

const result = {
  parameters: {
    [parameterKey("D1", "I0_A")]: { value: 2e-12, fixed: false, lower: 1e-30, upper: 1 },
    [parameterKey("D1", "n")]: { value: 1.5, fixed: true, lower: 0.5, upper: 10 },
    [parameterKey("Rs", "Rs_ohm")]: { value: 0, fixed: false, lower: 0, upper: 1e9 },
    [parameterKey("Rsh", "Rs_ohm")]: { value: 1e9, fixed: true, lower: 1e3, upper: 1e18 },
  },
};

const rows = buildParameterRows(model, result);
assertJsonEqual(rows.map((row) => row.key), ["Rs.Rs_ohm", "D1.I0_A", "D1.n", "Rsh.Rs_ohm"]);

const grouped = groupParameterRows(rows);
assert.equal(grouped[0].id, "main");
assertJsonEqual(grouped[0].groups.map((group) => group.component.id), ["Rs"]);
assert.equal(grouped[1].id, "branches");
assertJsonEqual(grouped[1].groups.map((group) => group.component.id), ["D1", "Rsh"]);
assert.equal(grouped[1].groups[0].fittedCount, 1);
assert.equal(grouped[1].groups[0].totalCount, 2);

assertJsonEqual(filterParameterRows(rows, "main").map((row) => row.key), ["Rs.Rs_ohm"]);
assertJsonEqual(filterParameterRows(rows, "branches").map((row) => row.key), ["D1.I0_A", "D1.n", "Rsh.Rs_ohm"]);
assertJsonEqual(filterParameterRows(rows, "fixed").map((row) => row.key), ["D1.n", "Rsh.Rs_ohm"]);
assertJsonEqual(filterParameterRows(rows, "fitted").map((row) => row.key), ["Rs.Rs_ohm", "D1.I0_A"]);
assertJsonEqual(filterParameterRows(rows, "at_bounds").map((row) => row.key), ["Rs.Rs_ohm"]);
assertJsonEqual(filterParameterRows(rows, "changed").map((row) => row.key), ["Rs.Rs_ohm", "D1.I0_A"]);

const fixedD1 = setComponentFitState(model, "core", "D1", false);
assert.equal(fixedD1.core[0].params.I0_A.fit, false);
assert.equal(fixedD1.core[0].params.n.fit, false);

const seededD1 = seedComponentFromFittedValues(model, result, "core", "D1");
assert.equal(seededD1.core[0].params.I0_A.value, 2e-12);
assert.equal(seededD1.core[0].params.n.value, 1.5);

const beforeKeys = JSON.stringify(Object.keys(model.core[0].params));
const afterKeys = JSON.stringify(Object.keys(seededD1.core[0].params));
assert.equal(afterKeys, beforeKeys);
assert.equal(parameterKey("D1", "I0_A"), "D1.I0_A");

console.log("parameter grouping tests passed");
