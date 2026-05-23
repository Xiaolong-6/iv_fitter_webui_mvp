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
