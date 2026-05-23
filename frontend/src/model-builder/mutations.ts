import type { ComponentSpec, FunctionDefinition, ModelSpec, ParameterSpec, Polarity } from "../model/types";
import { addComponent, createComponentInLocation } from "../model/utils";
import { allComponents, canAddComponent, defaultLocationForBucket, nickname, type BuilderBucket } from "./rules";

export function nextNickname(model: ModelSpec, base: string) {
  const names = new Set(allComponents(model).map((comp) => nickname(comp)));
  if (!names.has(base)) return base;
  const m = base.match(/^(.*?)(\d+)$/);
  const prefix = m ? m[1] : base;
  let idx = m ? Number(m[2]) + 1 : 2;
  while (names.has(`${prefix}${idx}`)) idx += 1;
  return `${prefix}${idx}`;
}

export function applyNicknameToParams(comp: ComponentSpec, nick: string): ComponentSpec {
  const params = Object.fromEntries(
    Object.entries(comp.params).map(([name, spec]) => [
      name,
      { ...(spec as ParameterSpec), label: comp.law_id === "ohmic" ? nick : (spec.label ?? name) },
    ]),
  );
  return { ...comp, params, metadata: { ...comp.metadata, nickname: nick } };
}

export function buildPendingComponent(model: ModelSpec, bucket: BuilderBucket, definition: FunctionDefinition, polarity?: Polarity) {
  const location = defaultLocationForBucket(bucket, definition, model);
  const component = createComponentInLocation(definition, location, polarity);
  return applyNicknameToParams(component, nextNickname(model, nickname(component)));
}

export function addDefinitionToModel(model: ModelSpec, bucket: BuilderBucket, definition: FunctionDefinition, polarity?: Polarity) {
  const component = buildPendingComponent(model, bucket, definition, polarity);
  const allowed = canAddComponent(model, component);
  if (!allowed.ok) return { model, component, added: false, reason: allowed.reason };
  return { model: addComponent(model, component), component, added: true, reason: null };
}


export function addSecondaryDiodeToModel(model: ModelSpec, definition: FunctionDefinition, polarity: Polarity = "forward") {
  const existingDiodes = allComponents(model).filter((comp) =>
    comp.function_type === "diode"
    && (comp.evaluation_form ?? "current_branch") === "current_branch"
    && (comp.placement === "junction_current_branch" || comp.placement === "parallel_current_branch")
    && (comp.polarity ?? "forward") === polarity
  );
  let nextModel = model;
  if (existingDiodes.length === 1) {
    const existing = existingDiodes[0];
    const location = existing.location as keyof Pick<ModelSpec, "core" | "series" | "parallel">;
    nextModel = {
      ...nextModel,
      [location]: nextModel[location].map((comp) => comp.id === existing.id
        ? { ...comp, polarity, metadata: { ...comp.metadata, role: comp.metadata?.role ?? "primary", nickname: comp.metadata?.nickname ?? "D1" } }
        : comp),
    };
  }
  const location = "parallel";
  const secondary = createComponentInLocation(definition, location, polarity);
  const withRole = applyNicknameToParams({
    ...secondary,
    metadata: { ...secondary.metadata, role: "secondary", nickname: "D2" },
  }, nextNickname(nextModel, "D2"));
  return { model: addComponent(nextModel, withRole), component: withRole };
}
