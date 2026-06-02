import type {
  ComponentSpec,
  EvaluationForm,
  GraphComponent,
  GraphNode,
  GraphSpec,
  Location,
  ModelSpec,
  ParameterSpec,
  Placement,
} from "../../model/types";
import type {
  Mb3Behavior,
  Mb3CompileResult,
  Mb3Component,
  Mb3Graph,
  Mb3Parameter,
  Mb3PortRef,
} from "./types";

class DisjointSet {
  private parent = new Map<string, string>();

  add(id: string) {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    this.add(id);
    const parent = this.parent.get(id)!;
    if (parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }
}

function portKey(ref: Mb3PortRef): string {
  return ref.kind === "component"
    ? `component:${ref.id}:${ref.port ?? "p"}`
    : `node:${ref.id}`;
}

function paramToSpec(parameter: Mb3Parameter): ParameterSpec {
  return {
    value: parameter.value,
    lower: parameter.lower ?? null,
    upper: parameter.upper ?? null,
    fit: parameter.fit,
    unit: parameter.unit ?? null,
    label: parameter.symbol,
  };
}

function paramsBySymbol(parameters: Mb3Parameter[]): Record<string, ParameterSpec> {
  return Object.fromEntries(parameters.map((parameter) => [parameter.symbol, paramToSpec(parameter)]));
}

function parameterBySymbol(component: Mb3Component, symbol: string): Mb3Parameter | undefined {
  return component.parameters.find((parameter) => parameter.symbol === symbol);
}

function parameterSpecFor(
  component: Mb3Component,
  sourceSymbol: string,
  fallback: Mb3Parameter,
): ParameterSpec {
  return paramToSpec(parameterBySymbol(component, sourceSymbol) ?? fallback);
}

function graphFunctionType(component: Mb3Component): string {
  if (component.templateKey === "shockley_diode") return "custom";
  if (component.templateKey === "resistance") return "custom";
  if (component.templateKey === "constant_current") return "custom";
  return "custom";
}

function graphPlacement(behavior: Mb3Behavior): Placement {
  if (behavior === "dV_of_I") return "series_voltage_drop";
  if (behavior === "residual") return "constraint";
  return "parallel_current_branch";
}

function graphEvaluationForm(behavior: Mb3Behavior): EvaluationForm {
  if (behavior === "dV_of_I") return "voltage_drop";
  if (behavior === "residual") return "implicit_relation";
  return "current_branch";
}

function addUndirected(adjacency: Map<string, Set<string>>, a: string, b: string) {
  if (!adjacency.has(a)) adjacency.set(a, new Set());
  if (!adjacency.has(b)) adjacency.set(b, new Set());
  adjacency.get(a)?.add(b);
  adjacency.get(b)?.add(a);
}

function reachableFrom(adjacency: Map<string, Set<string>>, start: string): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  seen.add(start);
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function hasPathWithoutComponent(
  components: Mb3Component[],
  rootForPort: (ref: Mb3PortRef) => string,
  start: string,
  target: string,
  skippedComponentId: string,
): boolean {
  const adjacency = new Map<string, Set<string>>();
  for (const component of components) {
    if (component.id === skippedComponentId) continue;
    addUndirected(
      adjacency,
      rootForPort({ kind: "component", id: component.id, port: "p" }),
      rootForPort({ kind: "component", id: component.id, port: "n" }),
    );
  }
  return reachableFrom(adjacency, start).has(target);
}

function rootLabel(
  root: string,
  rootLabels: Map<string, string>,
  positiveRoot: string,
  groundRoot: string,
): string {
  if (rootLabels.has(root)) return rootLabels.get(root)!;
  const label =
    root === positiveRoot
      ? "V"
      : root === groundRoot
        ? "GND"
        : `N${rootLabels.size + 1}`;
  rootLabels.set(root, label);
  return label;
}

function legacyComponent(component: Mb3Component, isSeriesBridge: boolean): ComponentSpec {
  const nickname = component.label || component.id;
  const commonMetadata = {
    nickname,
    behavior: component.behavior,
    expression: component.expression,
    templateKey: component.templateKey,
    source: "schematic_v3",
  };

  if (component.templateKey === "shockley_diode") {
    return {
      id: component.id,
      location: "core",
      function_type: "diode",
      law_id: "shockley_diode",
      evaluation_form: "current_branch",
      placement: "junction_current_branch",
      polarity: component.sign === 1 ? "forward" : "reverse",
      params: {
        I0_A: parameterSpecFor(component, "I0", {
          symbol: "I0",
          value: 1e-12,
          lower: 1e-30,
          upper: 1,
          fit: true,
          unit: "A",
        }),
        n: parameterSpecFor(component, "n", {
          symbol: "n",
          value: 1.5,
          lower: 0.5,
          upper: 10,
          fit: true,
          unit: "1",
        }),
      },
      metadata: commonMetadata,
    };
  }

  if (component.templateKey === "resistance" && isSeriesBridge) {
    return {
      id: component.id,
      location: "series",
      function_type: "constant_rs",
      law_id: "ohmic",
      evaluation_form: "voltage_drop",
      placement: "series_voltage_drop",
      polarity: "forward",
      params: {
        Rs_ohm: parameterSpecFor(component, component.parameters[0]?.symbol ?? "R0", {
          symbol: "R0",
          value: 10,
          lower: 0,
          upper: 1e9,
          fit: true,
          unit: "ohm",
        }),
      },
      metadata: commonMetadata,
    };
  }

  if (component.templateKey === "resistance") {
    return {
      id: component.id,
      location: "parallel",
      function_type: "shunt",
      law_id: "ohmic",
      evaluation_form: "current_branch",
      placement: "parallel_current_branch",
      polarity: "forward",
      params: {
        Rsh_ohm: parameterSpecFor(component, component.parameters[0]?.symbol ?? "R0", {
          symbol: "R0",
          value: 1e9,
          lower: 1e3,
          upper: 1e18,
          fit: true,
          unit: "ohm",
        }),
      },
      metadata: commonMetadata,
    };
  }

  const location: Location = component.behavior === "dV_of_I" ? "series" : "parallel";
  const evaluation_form = graphEvaluationForm(component.behavior);
  const placement = location === "series" ? "series_voltage_drop" : graphPlacement(component.behavior);
  return {
    id: component.id,
    location,
    function_type: "custom",
    law_id: "custom_expression",
    evaluation_form,
    placement,
    polarity: component.sign === 1 ? "forward" : "reverse",
    params: paramsBySymbol(component.parameters),
    metadata: commonMetadata,
  };
}

function temperatureFromGraph(graph: Mb3Graph, fallback: number): number {
  for (const component of graph.components) {
    const temp = parameterBySymbol(component, "T")?.value;
    if (typeof temp === "number" && Number.isFinite(temp) && temp > 0) return temp;
  }
  return fallback;
}

export function compileMb3Graph(graph: Mb3Graph, baseModel?: ModelSpec): Mb3CompileResult {
  const dsu = new DisjointSet();
  graph.nodes.forEach((node) => dsu.add(`node:${node.id}`));
  graph.components.forEach((component) => {
    dsu.add(`component:${component.id}:p`);
    dsu.add(`component:${component.id}:n`);
  });
  graph.wires.forEach((wire) => dsu.union(portKey(wire.from), portKey(wire.to)));

  const rootForPort = (ref: Mb3PortRef) => dsu.find(portKey(ref));
  const positiveRoot = dsu.find(`node:${graph.terminals.positive}`);
  const groundRoot = dsu.find(`node:${graph.terminals.ground}`);
  const warnings: string[] = [];
  const componentAdjacency = new Map<string, Set<string>>();

  for (const component of graph.components) {
    addUndirected(
      componentAdjacency,
      rootForPort({ kind: "component", id: component.id, port: "p" }),
      rootForPort({ kind: "component", id: component.id, port: "n" }),
    );
  }

  const fromPositive = reachableFrom(componentAdjacency, positiveRoot);
  const fromGround = reachableFrom(componentAdjacency, groundRoot);
  const hasTerminalPath = fromPositive.has(groundRoot);
  if (!hasTerminalPath && graph.components.length > 0) {
    warnings.push("No complete V-to-GND path; fitting model contains no active components.");
  }

  const activeComponents = hasTerminalPath
    ? graph.components.filter((component) => {
        const pRoot = rootForPort({ kind: "component", id: component.id, port: "p" });
        const nRoot = rootForPort({ kind: "component", id: component.id, port: "n" });
        return (
          (fromPositive.has(pRoot) && fromGround.has(nRoot)) ||
          (fromPositive.has(nRoot) && fromGround.has(pRoot))
        );
      })
    : [];

  const rootLabels = new Map<string, string>();
  rootLabel(positiveRoot, rootLabels, positiveRoot, groundRoot);
  rootLabel(groundRoot, rootLabels, positiveRoot, groundRoot);
  for (const component of activeComponents) {
    rootLabel(
      rootForPort({ kind: "component", id: component.id, port: "p" }),
      rootLabels,
      positiveRoot,
      groundRoot,
    );
    rootLabel(
      rootForPort({ kind: "component", id: component.id, port: "n" }),
      rootLabels,
      positiveRoot,
      groundRoot,
    );
  }

  const nodes: GraphNode[] = Array.from(rootLabels.values()).map((id) => ({
    id,
    label: id,
    role: id === "V" ? "terminal" : id === "GND" ? "reference" : "internal",
  }));

  const graphComponents: GraphComponent[] = activeComponents.map((component) => ({
    id: component.id,
    function_type: graphFunctionType(component),
    law_id: component.templateKey === "shockley_diode" ? "shockley_diode" : "custom_expression",
    evaluation_form: graphEvaluationForm(component.behavior),
    placement: graphPlacement(component.behavior),
    node_pos: rootLabel(
      rootForPort({ kind: "component", id: component.id, port: "p" }),
      rootLabels,
      positiveRoot,
      groundRoot,
    ),
    node_neg: rootLabel(
      rootForPort({ kind: "component", id: component.id, port: "n" }),
      rootLabels,
      positiveRoot,
      groundRoot,
    ),
    polarity: component.sign === 1 ? "forward" : "reverse",
    params: paramsBySymbol(component.parameters),
    metadata: {
      nickname: component.label,
      behavior: component.behavior === "residual" ? "custom_residual" : component.behavior,
      expression: component.expression,
      templateKey: component.templateKey,
      source: "schematic_v3",
    },
  }));

  const graphSpec: GraphSpec = {
    terminals: ["V"],
    reference_node: "GND",
    nodes,
    components: graphComponents,
    assembly_notes: [
      "Generated from Model Builder V3 Mb3Graph.",
      "Only components on an active V-to-GND connected subgraph are included.",
      "Canvas positions are visual metadata; graph ports and wires define fitting topology.",
    ],
    schema_version: "schematic_v3",
  };

  const legacy = activeComponents
    .filter((component) => component.behavior !== "residual")
    .map((component) => {
      const isBridge = hasTerminalPath
        ? !hasPathWithoutComponent(activeComponents, rootForPort, positiveRoot, groundRoot, component.id)
        : false;
      return legacyComponent(component, isBridge);
    });
  const core = legacy.filter((component) => component.location === "core");
  const series = legacy.filter((component) => component.location === "series");
  const parallel = legacy.filter((component) => component.location === "parallel");

  const model: ModelSpec = {
    core,
    series,
    parallel,
    graph: graphSpec,
    temperature_K: temperatureFromGraph(graph, baseModel?.temperature_K ?? 300),
    version: baseModel?.version ?? "1.0.0",
  };

  return {
    graphSchemaVersion: "schematic_v3",
    componentIds: graph.components.map((component) => component.id),
    wireIds: graph.wires.map((wire) => wire.id),
    activeComponentIds: activeComponents.map((component) => component.id),
    model,
    warnings,
  };
}
