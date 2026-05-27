export interface ReportArtifacts {
  report: string;
  message: string;
}

export const emptyReportArtifacts: ReportArtifacts = Object.freeze({
  report: "",
  message: "",
});

export function safeFilePart(value: string | null | undefined, fallback = "trace"): string {
  return (value || fallback).replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || fallback;
}

export function buildReportBaseName(args: {
  traceId?: string | null;
  traceName?: string | null;
  suffix: string;
  timestamp?: Date;
}): string {
  const trace = safeFilePart(args.traceId || args.traceName || "trace");
  const stamp = (args.timestamp ?? new Date()).toISOString().replace(/[:.]/g, "-");
  return `ivfit_${trace}_${stamp}_${args.suffix}`;
}
