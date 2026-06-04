import type { Mb3Component } from "./types";
import type { Mb3ComponentTemplate } from "./templates";

function templateInstancePrefix(template: Mb3ComponentTemplate): string {
  if (template.key === "resistance") return "R";
  if (template.key === "shockley_diode") return "D";
  if (template.key === "constant_current") return "I";
  if (template.key === "custom" || template.userDefined) return "C";
  return "X";
}

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
  const id = `${templateInstancePrefix(template)}${isCustomTemplate ? existingCount + 1 : sequenceNumber}`;
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
