import { describe, expect, it } from "vitest";
import { buildReportBaseName, emptyReportArtifacts, safeFilePart } from "../reportArtifacts";

describe("report artifact helpers", () => {
  it("normalizes unsafe trace names for downloads", () => {
    expect(safeFilePart("1.Dark/J A")).toBe("1.Dark_J_A");
    expect(safeFilePart("***", "trace")).toBe("trace");
  });

  it("uses deterministic report filenames when timestamp is supplied", () => {
    const filename = buildReportBaseName({ traceId: "Trace 1", suffix: "report.csv", timestamp: new Date("2026-05-27T12:34:56.789Z") });
    expect(filename).toBe("ivfit_Trace_1_2026-05-27T12-34-56-789Z_report.csv");
  });

  it("exposes an immutable empty report artifact", () => {
    expect(emptyReportArtifacts).toEqual({ report: "", message: "" });
    expect(Object.isFrozen(emptyReportArtifacts)).toBe(true);
  });
});
