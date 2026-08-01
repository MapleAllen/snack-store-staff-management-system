import { describe, expect, it } from "vitest";
import { buildUpdateCheckResult, compareVersions, pickInstallerAsset, toVersionParts } from "../electron/update-check.cjs";

describe("update version comparison", () => {
  it("parses version parts and ignores a leading v", () => {
    expect(toVersionParts("v2.0.1")).toEqual([2, 0, 1]);
    expect(toVersionParts("2.10.0")).toEqual([2, 10, 0]);
  });

  it("compares major, minor and patch numerically", () => {
    expect(compareVersions("2.0.0", "2.0.0")).toBe(0);
    expect(compareVersions("2.0.0", "v2.0.1")).toBe(-1);
    expect(compareVersions("2.1.0", "2.0.9")).toBe(1);
    expect(compareVersions("2.9.9", "3.0.0")).toBe(-1);
  });

  it("treats missing parts as zero", () => {
    expect(compareVersions("2", "2.0.1")).toBe(-1);
    expect(compareVersions("2.0.1", "2")).toBe(1);
  });
});

describe("installer asset picking", () => {
  it("prefers the NSIS setup exe among release assets", () => {
    const assets = [
      { name: "门店工资助手-2.0.0-unpacked.zip", browser_download_url: "https://example/a.zip", size: 9000 },
      { name: "门店工资助手 Setup 2.0.0.exe", browser_download_url: "https://example/setup.exe", size: 5000 },
    ];
    expect(pickInstallerAsset(assets)?.name).toBe("门店工资助手 Setup 2.0.0.exe");
  });

  it("returns null when no setup exe is present", () => {
    expect(pickInstallerAsset([{ name: "a.zip", browser_download_url: "https://example/a.zip" }])).toBeNull();
    expect(pickInstallerAsset([])).toBeNull();
  });
});

describe("update check result", () => {
  const installer = { name: "门店工资助手 Setup 2.1.0.exe", browser_download_url: "https://example/setup.exe", size: 5000 };

  it("flags an update when the release tag is newer", () => {
    const result = buildUpdateCheckResult("2.0.0", {
      tag_name: "v2.1.0",
      html_url: "https://github.com/example/releases/tag/v2.1.0",
      published_at: "2026-08-01T00:00:00Z",
      assets: [installer],
    });
    expect(result.updateAvailable).toBe(true);
    expect(result.latestVersion).toBe("2.1.0");
    expect(result.assetUrl).toBe("https://example/setup.exe");
    expect(result.releasePageUrl).toContain("v2.1.0");
  });

  it("reports no update for the same or older release", () => {
    expect(buildUpdateCheckResult("2.0.0", { tag_name: "v2.0.0", assets: [installer] }).updateAvailable).toBe(false);
    expect(buildUpdateCheckResult("2.1.0", { tag_name: "v2.0.0", assets: [installer] }).updateAvailable).toBe(false);
  });

  it("reports no update when the release has no installer asset", () => {
    const result = buildUpdateCheckResult("2.0.0", { tag_name: "v2.1.0", assets: [] });
    expect(result.updateAvailable).toBe(false);
    expect(result.reason).toBe("no-installer-asset");
  });
});
