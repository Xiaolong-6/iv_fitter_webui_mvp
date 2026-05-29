import { describe, expect, it } from "vitest";
import { fmtBounds, fmtEng, formatValueWithUnit, parameterFitStatus } from "../format";

describe("format helpers", () => {
  it("uses compact scientific notation for very small and very large values", () => {
    expect(fmtEng(3.619e-7, 4)).toBe("3.619e-7");
    expect(fmtEng(1.06e13, 4)).toBe("1.060e+13");
    expect(fmtEng(0, 4)).toBe("0");
  });

  it("formats current and resistance values with units using scientific notation", () => {
    expect(formatValueWithUnit(3.62e-7, "A", 4)).toBe("3.620e-7 A");
    expect(formatValueWithUnit(1.06e13, "Ω", 4)).toBe("1.060e+13 Ω");
    expect(formatValueWithUnit(0.512345, "V", 4)).toBe("0.5123 V");
  });

  it("formats open and finite bounds consistently", () => {
    expect(fmtBounds(null, 1e-3)).toBe("−∞ – 0.001");
    expect(fmtBounds(1e-12, null)).toBe("1.00e-12 – +∞");
  });

  it("classifies parameter fit status from fixed, bounds, invalid, and uncertainty", () => {
    expect(parameterFitStatus(1, 0, 2, null, true)).toBe("fixed");
    expect(parameterFitStatus(Number.NaN, 0, 2, null, false)).toBe("invalid");
    expect(parameterFitStatus(1.0000001, 1, 2, null, false)).toBe("near lower");
    expect(parameterFitStatus(9.999999, 0, 10, null, false)).toBe("near upper");
    expect(parameterFitStatus(1, 0, 2, 2, false)).toBe("weakly identified");
    expect(parameterFitStatus(1, 0, 2, 0.1, false)).toBe("free");
  });
});


it("normalizes exponential notation for table display", () => {
  expect(formatValueWithUnit(17290, "Ω", 4)).toBe("1.729e+4 Ω");
  expect(formatValueWithUnit(0.0000001234, "A", 4)).toBe("1.234e-7 A");
});
