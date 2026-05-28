import frontendPackage from "../../package.json";

export const APP_VERSION = frontendPackage.version;

export type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

export function normalizeVersion(input: string): string {
  return input.trim().replace(/^v/i, "");
}

export function parseVersion(input: string): ParsedVersion | null {
  const normalized = normalizeVersion(input);
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function comparePrerelease(left: string[], right: string[]): number {
  if (!left.length && !right.length) return 0;
  if (!left.length) return 1;
  if (!right.length) return -1;
  const count = Math.max(left.length, right.length);
  for (let i = 0; i < count; i += 1) {
    const a = left[i];
    const b = right[i];
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    const an = /^\d+$/.test(a) ? Number(a) : null;
    const bn = /^\d+$/.test(b) ? Number(b) : null;
    if (an !== null && bn !== null && an !== bn) return an > bn ? 1 : -1;
    if (an !== null && bn === null) return -1;
    if (an === null && bn !== null) return 1;
    if (a !== b) return a > b ? 1 : -1;
  }
  return 0;
}

export function compareVersions(leftInput: string, rightInput: string): number {
  const left = parseVersion(leftInput);
  const right = parseVersion(rightInput);
  if (!left || !right) {
    return normalizeVersion(leftInput).localeCompare(normalizeVersion(rightInput));
  }
  for (const key of ["major", "minor", "patch"] as const) {
    if (left[key] !== right[key]) return left[key] > right[key] ? 1 : -1;
  }
  return comparePrerelease(left.prerelease, right.prerelease);
}

export function isNewerVersion(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0;
}
