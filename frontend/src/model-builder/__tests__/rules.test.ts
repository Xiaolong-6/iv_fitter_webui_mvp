import { describe, expect, it } from "vitest";
import type { ComponentSpec, FunctionDefinition, ModelSpec } from "../../model/types";
import { bucketForComponent, canAddComponent, defaultLocationForBucket, definitionsForBucket, duplicateKey, userDefinitions } from "../rules";

function component(partial: Partial<ComponentSpec>): ComponentSpec {
  return {
    id: partial.id ?? "C1",
    location: partial.location ?? "parallel",
    function_type: partial.function_type ?? "diode",
    law_id: partial.law_id ?? "shockley",
    evaluation_form: partial.evaluation_form ?? "current_branch",
    placement: partial.placement ?? "junction_current_branch",
    polarity: partial.polarity ?? "forward",
    params: partial.params ?? {},
    metadata: partial.metadata ?? {},
  };
}

function definition(partial: Partial<FunctionDefinition>): FunctionDefinition {
  return {
    function_type: partial.function_type ?? "diode",
    location: partial.location ?? "core",
    display_name: partial.display_name ?? "Diode",
    role: partial.role ?? "branch",
    law_id: partial.law_id ?? "shockley",
    law_name: partial.law_name ?? "Shockley",
    canonical_equation: partial.canonical_equation ?? "I=I0(exp(V/nVt)-1)",
    available_forms: partial.available_forms ?? ["current_branch"],
    default_form: partial.default_form ?? "current_branch",
    allowed_placements: partial.allowed_placements ?? ["junction_current_branch"],
    default_placement: partial.default_placement ?? "junction_current_branch",
    allowed_polarities: partial.allowed_polarities ?? ["forward", "reverse"],
    default_polarity: partial.default_polarity ?? "forward",
    parameters: partial.parameters ?? [],
    equation_template: partial.equation_template ?? "",
    help_text: partial.help_text ?? "",
  };
}

function model(parts: Partial<ModelSpec>): ModelSpec {
  return {
    core: parts.core ?? [],
    series: parts.series ?? [],
    parallel: parts.parallel ?? [],
    temperature_K: parts.temperature_K ?? 300,
    version: parts.version ?? "test",
  };
}

describe("model-builder rules", () => {
  it("assigns components to the main bucket by series location or voltage-drop form", () => {
    expect(bucketForComponent(component({ location: "series", placement: "series_voltage_drop" }))).toBe("main");
    expect(bucketForComponent(component({ location: "parallel", evaluation_form: "voltage_drop" }))).toBe("main");
    expect(bucketForComponent(component({ location: "parallel", evaluation_form: "current_branch" }))).toBe("branches");
  });

  it("deduplicates user-facing ohmic definitions while keeping non-shunt definitions", () => {
    const defs = [
      definition({ function_type: "series_resistor", law_id: "ohmic", allowed_placements: ["series_voltage_drop"], available_forms: ["voltage_drop"] }),
      definition({ function_type: "shunt", law_id: "ohmic", allowed_placements: ["parallel_current_branch"], available_forms: ["current_branch"] }),
      definition({ function_type: "diode", law_id: "shockley" }),
    ];
    expect(userDefinitions(defs).map((d) => d.function_type)).toEqual(["series_resistor", "diode"]);
  });

  it("filters definitions by builder bucket", () => {
    const defs = [
      definition({ function_type: "series_resistor", law_id: "ohmic", allowed_placements: ["series_voltage_drop"], available_forms: ["voltage_drop"] }),
      definition({ function_type: "reverse_leak", law_id: "power", allowed_placements: ["parallel_current_branch"], available_forms: ["current_branch"] }),
    ];
    expect(definitionsForBucket(defs, "main").map((d) => d.function_type)).toEqual(["series_resistor"]);
    expect(definitionsForBucket(defs, "branches").map((d) => d.function_type)).toEqual(["reverse_leak"]);
  });

  it("chooses default locations and blocks duplicate non-role components", () => {
    const diodeDef = definition({ function_type: "diode", available_forms: ["current_branch"] });
    const branchDef = definition({ function_type: "reverse_leak", available_forms: ["current_branch"] });
    expect(defaultLocationForBucket("main", diodeDef, model({}))).toBe("series");
    expect(defaultLocationForBucket("branches", diodeDef, model({}))).toBe("core");
    expect(defaultLocationForBucket("branches", branchDef, model({ core: [component({ id: "D1" })] }))).toBe("parallel");

    const existing = component({ id: "D1", law_id: "shockley", polarity: "forward" });
    const duplicate = component({ id: "D2", law_id: "shockley", polarity: "forward" });
    expect(canAddComponent(model({ core: [existing] }), duplicate)).toEqual({ ok: false, reason: "duplicate" });
  });

  it("uses diode role metadata when building duplicate keys", () => {
    const base = component({ id: "D1", function_type: "diode", metadata: { role: "primary" } });
    const secondary = component({ id: "D2", function_type: "diode", metadata: { role: "secondary" } });
    expect(duplicateKey(base)).not.toBe(duplicateKey(secondary));
    expect(canAddComponent(model({ core: [base] }), secondary)).toEqual({ ok: true, reason: null });
  });
});
