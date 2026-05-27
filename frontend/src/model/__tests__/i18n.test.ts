import { describe, expect, it } from "vitest";
import { t, type TranslationKey } from "../i18n";

describe("i18n", () => {
  it("returns expected English and Chinese strings for core keys", () => {
    expect(t("en", "runFit")).toBe("Run fit");
    expect(t("zh", "runFit")).toBe("运行拟合");
  });

  it("returns non-empty strings for representative UI keys in both languages", () => {
    const keys: TranslationKey[] = ["readyNoFit", "fitSetup", "voltageRange", "modelBuilder", "solverModeHelp"];
    for (const key of keys) {
      expect(t("en", key)).toEqual(expect.any(String));
      expect(t("en", key).length).toBeGreaterThan(0);
      expect(t("zh", key)).toEqual(expect.any(String));
      expect(t("zh", key).length).toBeGreaterThan(0);
    }
  });
});
