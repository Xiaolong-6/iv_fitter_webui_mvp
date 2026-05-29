import { describe, expect, it, vi } from "vitest";
import { compareVersions, isNewerVersion, normalizeVersion } from "../../utils/version";
import { checkLatestRelease, detectSensitiveReleaseText, evaluateReleaseReadiness, releaseTextIsPrivacySafe } from "../../services/releaseCheck";

describe("semantic version helpers", () => {
  it("normalizes leading v and compares stable versions", () => {
    expect(normalizeVersion("v1.5.36")).toBe("1.5.36");
    expect(compareVersions("v1.6.0", "1.5.36")).toBe(1);
    expect(compareVersions("1.5.36", "v1.5.36")).toBe(0);
    expect(isNewerVersion("v1.5.37", "1.5.36")).toBe(true);
  });

  it("orders prereleases below the stable release", () => {
    expect(compareVersions("v1.5.36-alpha.1", "v1.5.36")).toBe(-1);
    expect(compareVersions("v1.5.36-alpha.2", "v1.5.36-alpha.1")).toBe(1);
  });
});

describe("release checker", () => {
  function response(payload: unknown, ok = true, status = 200) {
    return Promise.resolve({ ok, status, json: () => Promise.resolve(payload) } as Response);
  }

  it("reports update available", async () => {
    const fetchImpl = vi.fn(() => response({ tag_name: "v1.5.37", html_url: "https://example.test/r", name: "Release", published_at: "2026-01-01T00:00:00Z", body: "Notes", assets: [{ name: "pkg_v1.5.37.zip" }] })) as unknown as typeof fetch;
    const result = await checkLatestRelease({ currentVersion: "1.5.36", fetchImpl });
    expect(result.updateAvailable).toBe(true);
    expect(result.latestVersion).toBe("v1.5.37");
    expect(result.releaseUrl).toBe("https://example.test/r");
    expect(result.assetNames).toEqual(["pkg_v1.5.37.zip"]);
  });

  it("reports already up to date", async () => {
    const fetchImpl = vi.fn(() => response({ tag_name: "v1.5.36", assets: [] })) as unknown as typeof fetch;
    const result = await checkLatestRelease({ currentVersion: "1.5.36", fetchImpl });
    expect(result.updateAvailable).toBe(false);
    expect(result.versionRelation).toBe("same");
    expect(result.error).toBeNull();
  });

  it("reports local builds newer than the public release without calling it an update", async () => {
    const fetchImpl = vi.fn(() => response({ tag_name: "v1.5.0", assets: [] })) as unknown as typeof fetch;
    const result = await checkLatestRelease({ currentVersion: "1.5.38", fetchImpl });
    expect(result.updateAvailable).toBe(false);
    expect(result.versionRelation).toBe("newer");
    expect(result.latestVersion).toBe("v1.5.0");
  });

  it("returns structured network failures without throwing", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error("offline"))) as unknown as typeof fetch;
    const result = await checkLatestRelease({ currentVersion: "1.5.36", fetchImpl });
    expect(result.error).toContain("offline");
    expect(result.updateAvailable).toBe(false);
    expect(result.latestVersion).toBeNull();
    expect(result.versionRelation).toBe("unknown");
  });
});


describe("release privacy scanner", () => {
  it("detects local paths and email addresses in release text", () => {
    const findings = detectSensitiveReleaseText("Built from C:\\Users\\name\\repo and /home/name/repo; contact test@example.com");
    expect(findings.map((item) => item.kind)).toEqual(["windows_path", "unix_home_path", "email"]);
    expect(releaseTextIsPrivacySafe("Release notes without local paths")).toBe(true);
  });
});


describe("release readiness gate", () => {
  it("blocks release when required checks are missing", () => {
    const result = evaluateReleaseReadiness({ appVersion: "1.7.1", declaredVersions: { frontend: "1.7.1", backend: "1.7.0" }, releaseText: "Built at C:\Users\name\repo" });
    expect(result.ok).toBe(false);
    expect(result.blockingCount).toBeGreaterThanOrEqual(4);
    expect(result.items.find((item) => item.id === "version-consistency")?.ok).toBe(false);
    expect(result.items.find((item) => item.id === "privacy-scan")?.ok).toBe(false);
  });

  it("passes only when all required gates are true", () => {
    const result = evaluateReleaseReadiness({ appVersion: "1.7.1", declaredVersions: { frontend: "v1.7.1", backend: "1.7.1" }, releaseText: "Public release notes", backendTestsPassed: true, frontendBuildPassed: true, manualBrowserChecked: true });
    expect(result.ok).toBe(true);
    expect(result.blockingCount).toBe(0);
  });
});
