import { APP_VERSION, isNewerVersion, normalizeVersion } from "../utils/version";

export type ReleaseVersionRelation = "unknown" | "older" | "same" | "newer";

export type ReleaseCheckResult = {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  versionRelation: ReleaseVersionRelation;
  releaseUrl: string | null;
  releaseName: string | null;
  publishedAt: string | null;
  bodyExcerpt: string;
  assetNames: string[];
  checkedAt: string;
  error: string | null;
};

export type GitHubReleasePayload = {
  tag_name?: string;
  html_url?: string;
  name?: string | null;
  published_at?: string | null;
  body?: string | null;
  assets?: Array<{ name?: string }>;
};

export const DEFAULT_RELEASE_ENDPOINT = "https://api.github.com/repos/Xiaolong-6/iv_fitter_webui_mvp/releases/latest";

function excerpt(body: string | null | undefined): string {
  return String(body ?? "").replace(/\s+/g, " ").trim().slice(0, 360);
}

export async function checkLatestRelease({
  endpoint = DEFAULT_RELEASE_ENDPOINT,
  currentVersion = APP_VERSION,
  fetchImpl = fetch,
}: {
  endpoint?: string;
  currentVersion?: string;
  fetchImpl?: typeof fetch;
} = {}): Promise<ReleaseCheckResult> {
  const checkedAt = new Date().toISOString();
  const base: ReleaseCheckResult = {
    currentVersion,
    latestVersion: null,
    updateAvailable: false,
    versionRelation: "unknown",
    releaseUrl: null,
    releaseName: null,
    publishedAt: null,
    bodyExcerpt: "",
    assetNames: [],
    checkedAt,
    error: null,
  };
  try {
    const response = await fetchImpl(endpoint, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) throw new Error(`GitHub release check failed: HTTP ${response.status}`);
    const payload = (await response.json()) as GitHubReleasePayload;
    const latest = payload.tag_name ?? null;
    const comparison = latest ? isNewerVersion(normalizeVersion(latest), normalizeVersion(currentVersion))
      ? 1
      : isNewerVersion(normalizeVersion(currentVersion), normalizeVersion(latest))
        ? -1
        : 0
      : null;
    return {
      ...base,
      latestVersion: latest,
      updateAvailable: comparison === 1,
      versionRelation: comparison === null ? "unknown" : comparison === 1 ? "older" : comparison === -1 ? "newer" : "same",
      releaseUrl: payload.html_url ?? null,
      releaseName: payload.name ?? latest,
      publishedAt: payload.published_at ?? null,
      bodyExcerpt: excerpt(payload.body),
      assetNames: (payload.assets ?? []).map((asset) => asset.name).filter((name): name is string => Boolean(name)),
    };
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message : String(error) };
  }
}


export type ReleasePrivacyFinding = {
  kind: "windows_path" | "unix_home_path" | "email";
  match: string;
};

export function detectSensitiveReleaseText(text: string): ReleasePrivacyFinding[] {
  const findings: ReleasePrivacyFinding[] = [];
  const patterns: Array<[ReleasePrivacyFinding["kind"], RegExp]> = [
    ["windows_path", /[A-Za-z]:\\Users\\[^\s`'"<>]+/g],
    ["unix_home_path", /\/home\/[^\s`'"<>]+/g],
    ["email", /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
  ];
  for (const [kind, pattern] of patterns) {
    for (const match of text.matchAll(pattern)) {
      findings.push({ kind, match: match[0] });
    }
  }
  return findings;
}

export function releaseTextIsPrivacySafe(text: string): boolean {
  return detectSensitiveReleaseText(text).length === 0;
}

export type ReleaseReadinessItem = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  required: boolean;
};

export type ReleaseReadinessResult = {
  ok: boolean;
  blockingCount: number;
  warningCount: number;
  items: ReleaseReadinessItem[];
};

export function evaluateReleaseReadiness({
  appVersion = APP_VERSION,
  declaredVersions = {},
  releaseText = "",
  manualBrowserChecked = false,
  backendTestsPassed = false,
  frontendBuildPassed = false,
  portableSmokePassed = false,
}: {
  appVersion?: string;
  declaredVersions?: Record<string, string | null | undefined>;
  releaseText?: string;
  manualBrowserChecked?: boolean;
  backendTestsPassed?: boolean;
  frontendBuildPassed?: boolean;
  portableSmokePassed?: boolean;
} = {}): ReleaseReadinessResult {
  const versionEntries = Object.entries(declaredVersions).filter(([, value]) => Boolean(value));
  const mismatched = versionEntries.filter(([, value]) => normalizeVersion(String(value)) !== normalizeVersion(appVersion));
  const privacyFindings = detectSensitiveReleaseText(releaseText);
  const items: ReleaseReadinessItem[] = [
    {
      id: "version-consistency",
      label: "Version consistency",
      ok: mismatched.length === 0,
      required: true,
      detail: mismatched.length === 0 ? `All declared versions match ${appVersion}.` : `Mismatched declarations: ${mismatched.map(([name, value]) => `${name}=${value}`).join(", ")}`,
    },
    {
      id: "privacy-scan",
      label: "Privacy scan",
      ok: privacyFindings.length === 0,
      required: true,
      detail: privacyFindings.length === 0 ? "No local paths or email addresses detected in scanned release text." : privacyFindings.map((finding) => `${finding.kind}: ${finding.match}`).join("; "),
    },
    {
      id: "backend-tests",
      label: "Backend tests",
      ok: backendTestsPassed,
      required: true,
      detail: backendTestsPassed ? "Backend pytest has been recorded as passed." : "Backend pytest must be run and recorded before release.",
    },
    {
      id: "frontend-build",
      label: "Frontend tests/build",
      ok: frontendBuildPassed,
      required: true,
      detail: frontendBuildPassed ? "Frontend tests and production build have been recorded as passed." : "Run npm test and npm build locally before release.",
    },
    {
      id: "manual-browser",
      label: "Manual browser checks",
      ok: manualBrowserChecked,
      required: true,
      detail: manualBrowserChecked ? "Manual UI checks recorded." : "Responsive layout, plot interactions, and Data/Fitting workflows still need browser verification.",
    },
    {
      id: "portable-smoke",
      label: "Portable smoke test",
      ok: portableSmokePassed,
      required: false,
      detail: portableSmokePassed ? "Portable smoke test recorded." : "Recommended before public binary release.",
    },
  ];
  const blockingCount = items.filter((item) => item.required && !item.ok).length;
  const warningCount = items.filter((item) => !item.required && !item.ok).length;
  return { ok: blockingCount === 0, blockingCount, warningCount, items };
}
