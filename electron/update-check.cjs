"use strict";

function toVersionParts(value) {
  return `${value ?? ""}`
    .trim()
    .replace(/^[vV]/, "")
    .split(".")
    .slice(0, 3)
    .map((part) => {
      const number = Number.parseInt(part, 10);
      return Number.isNaN(number) ? 0 : number;
    });
}

function compareVersions(left, right) {
  const leftParts = toVersionParts(left);
  const rightParts = toVersionParts(right);
  for (let index = 0; index < 3; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue !== rightValue) return leftValue > rightValue ? 1 : -1;
  }
  return 0;
}

function pickInstallerAsset(assets) {
  const candidates = (Array.isArray(assets) ? assets : []).filter((asset) =>
    asset?.name
    && asset?.browser_download_url
    && /Setup.*\.exe$/i.test(asset.name),
  );
  return candidates.sort((left, right) => (right.size ?? 0) - (left.size ?? 0))[0] ?? null;
}

function buildUpdateCheckResult(currentVersion, release) {
  const latestVersion = `${release?.tag_name ?? ""}`.replace(/^[vV]/, "");
  const asset = pickInstallerAsset(release?.assets);
  if (!latestVersion || !asset) {
    return {
      status: "ok",
      updateAvailable: false,
      currentVersion: `${currentVersion ?? ""}`.trim(),
      latestVersion: latestVersion || null,
      reason: "no-installer-asset",
    };
  }
  return {
    status: "ok",
    updateAvailable: compareVersions(latestVersion, currentVersion) > 0,
    currentVersion: `${currentVersion ?? ""}`.trim(),
    latestVersion,
    assetName: asset.name,
    assetUrl: asset.browser_download_url,
    releasePageUrl: release?.html_url ?? null,
    publishedAt: release?.published_at ?? null,
  };
}

module.exports = { buildUpdateCheckResult, compareVersions, pickInstallerAsset, toVersionParts };
