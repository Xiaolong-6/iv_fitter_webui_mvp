import { describe, expect, it } from "vitest";
import { createComponentFromTemplate } from "../domain/componentFactory";
import { MB3_COMPONENT_TEMPLATES } from "../domain/templates";

function template(key: string) {
  const found = MB3_COMPONENT_TEMPLATES.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`Missing template ${key}`);
  return found;
}

describe("model-builder component factory", () => {
  it("uses template-specific ids so diode and current components do not collide", () => {
    const diode = createComponentFromTemplate({
      template: template("shockley_diode"),
      existingCount: 0,
    });
    const current = createComponentFromTemplate({
      template: template("constant_current"),
      existingCount: 0,
    });

    expect(diode.id).toBe("D1");
    expect(current.id).toBe("I1");
    expect(new Set([diode.id, current.id]).size).toBe(2);
  });

  it("keeps resistance numbering starting at R0", () => {
    const resistance = createComponentFromTemplate({
      template: template("resistance"),
      existingCount: 0,
    });

    expect(resistance.id).toBe("R0");
  });
});
