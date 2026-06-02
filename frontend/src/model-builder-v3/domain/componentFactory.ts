import type { Mb3Component } from "./types";
import type { Mb3ComponentTemplate } from "./templates";
import { getMb3BehaviorPrefix } from "./templates";

export function createComponentFromTemplate({
  template,
  existingCount,
  position,
}: {
  template: Mb3ComponentTemplate;
  existingCount: number;
  position?: { x: number; y: number };
}): Mb3Component {
  const isCustomTemplate = template.key === "custom" || template.userDefined;
  const sequenceNumber = template.key === "resistance" ? existingCount : existingCount + 1;
  const spawnColumn = existingCount % 3;
  const spawnRow = Math.floor(existingCount / 3);
  const id =
    isCustomTemplate
      ? `C${existingCount + 1}`
      : `${getMb3BehaviorPrefix(template.behavior)}${sequenceNumber}`;
  return {
    id,
    label: id,
    templateKey: template.key,
    behavior: template.behavior,
    expression: template.expression,
    sign: 1,
    position: position ?? { x: 820 + spawnColumn * 110, y: 260 + spawnRow * 110 },
    parameters: template.parameters.map((parameter) => ({ ...parameter })),
  };
}
