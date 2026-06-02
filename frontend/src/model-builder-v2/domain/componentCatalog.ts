import type { ComponentBehavior, ComponentParameter, ComponentPreset, SchematicComponent } from "./schematicTypes";

function p(symbol: string, value: number, unit: string | null, lower: number | null, upper: number | null, fit = true, description = ""): ComponentParameter {
  return { id: symbol, symbol, value, lower, upper, fit, unit, description };
}

export const componentCatalog: ComponentPreset[] = [
  {
    id: "ohmic_R",
    label: "Effective resistance R(V)",
    group: "Basic",
    behavior: "R_of_V",
    expression: "R0",
    description: "Two-terminal resistance. Constant R is the simplest preset; edit the expression to make R depend on V.",
    parameters: [p("R0", 10, "Ω", 0, 1e12, true, "Resistance scale")],
  },
  {
    id: "shockley_I",
    label: "Shockley diode I(V)",
    group: "Basic",
    behavior: "I_of_V",
    expression: "I0 * (exp(V / (n * Vt)) - 1)",
    description: "A diode is treated as an I(V) preset, not as a special topology class.",
    parameters: [
      p("I0", 1e-12, "A", 1e-30, 1, true, "Saturation current"),
      p("n", 1.5, null, 0.5, 10, true, "Ideality factor"),
      p("Vt", 0.02585, "V", 0.001, 0.2, false, "Thermal voltage"),
    ],
  },
  {
    id: "current_source",
    label: "Generated current I(V)",
    group: "Basic",
    behavior: "I_of_V",
    expression: "Igen",
    description: "A voltage-dependent generated/extracted current term. Use sign/polarity to reverse contribution.",
    parameters: [p("Igen", 1e-9, "A", -1, 1, true, "Generated current")],
  },
  {
    id: "soft_resistance",
    label: "Soft-limited R(V)",
    group: "Advanced",
    behavior: "R_of_V",
    expression: "Rbase / (1 + A * softplus((V - Vt) / Vs))",
    description: "Voltage-dependent resistance with a smooth threshold.",
    parameters: [
      p("Rbase", 1000, "Ω", 0, 1e15, true, "Base resistance"),
      p("A", 1, null, -1e6, 1e6, true, "Modulation amplitude"),
      p("Vt", 0.2, "V", -100, 100, true, "Threshold voltage"),
      p("Vs", 0.05, "V", 1e-9, 100, true, "Softness scale"),
    ],
  },
  {
    id: "custom_R",
    label: "Custom R(V)",
    group: "Custom",
    behavior: "R_of_V",
    expression: "R0",
    description: "Define a resistance expression using V and custom parameters.",
    parameters: [p("R0", 1000, "Ω", 0, 1e15, true, "Custom resistance parameter")],
  },
  {
    id: "custom_I",
    label: "Custom I(V)",
    group: "Custom",
    behavior: "I_of_V",
    expression: "A * V",
    description: "Define current directly using local voltage V and custom parameters.",
    parameters: [p("A", 1e-9, "A/V", -1e9, 1e9, true, "Current coefficient")],
  },
  {
    id: "custom_dV",
    label: "Custom ΔV(I)",
    group: "Custom",
    behavior: "dV_of_I",
    expression: "I * R0",
    description: "Define voltage drop using local branch current I and custom parameters.",
    parameters: [p("R0", 1000, "Ω", 0, 1e15, true, "Resistance-like scale")],
  },
  {
    id: "custom_residual",
    label: "Custom residual F(I,V)=0",
    group: "Custom",
    behavior: "residual",
    expression: "I - A * V",
    description: "Advanced implicit relation. The expression is interpreted as residual = 0.",
    parameters: [p("A", 1e-9, "A/V", -1e9, 1e9, true, "Residual coefficient")],
  },
];

export function getPreset(presetId: string): ComponentPreset {
  return componentCatalog.find((preset) => preset.id === presetId) ?? componentCatalog[0];
}

export function createComponentFromPreset(presetId: string, index: number, position: { x: number; y: number }): SchematicComponent {
  const preset = getPreset(presetId);
  const prefix = behaviorPrefix(preset.behavior);
  return {
    id: `c_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
    label: `${prefix}${index}`,
    behavior: preset.behavior,
    presetId: preset.id,
    presetLabel: preset.label,
    expression: preset.expression,
    sign: preset.sign ?? 1,
    parameters: preset.parameters.map((parameter) => ({ ...parameter })),
    position,
    size: { width: 150, height: 68 },
  };
}

export function behaviorPrefix(behavior: ComponentBehavior): string {
  if (behavior === "I_of_V") return "I";
  if (behavior === "dV_of_I") return "Vd";
  if (behavior === "residual") return "F";
  return "R";
}

export function behaviorLabel(behavior: ComponentBehavior): string {
  if (behavior === "I_of_V") return "I(V)";
  if (behavior === "dV_of_I") return "ΔV(I)";
  if (behavior === "residual") return "F(I,V)";
  return "R(V)";
}

export function behaviorEquationPrefix(behavior: ComponentBehavior): string {
  if (behavior === "I_of_V") return "I =";
  if (behavior === "dV_of_I") return "ΔV =";
  if (behavior === "residual") return "F(I,V) =";
  return "R =";
}
