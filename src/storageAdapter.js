import { STORAGE_KEY, validateBackupPayload, BACKUP_TYPE, BACKUP_REASONS } from "../shared/backup-format.js";
import { createInitialWorkspace, migrateWorkspace } from "./payrollData.js";

function browserLoadWorkspace() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { workspace: null, source: "web-localStorage", recoveryState: "missing" };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.stores) || !parsed?.monthlyRecords) {
      return { workspace: null, source: "web-localStorage", recoveryState: "corrupt-fallback" };
    }
    return { workspace: migrateWorkspace(parsed), source: "web-localStorage", recoveryState: "normal" };
  } catch {
    return { workspace: null, source: "web-localStorage", recoveryState: "corrupt-fallback" };
  }
}

function browserSaveWorkspace(workspace) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    return { status: "saved", savedAt: new Date().toISOString() };
  } catch (err) {
    return {
      status: "error",
      savedAt: null,
      error: { code: "workspace:save-failed", message: "浏览器存储已满或不可用" },
    };
  }
}

function browserGetStatus() {
  return { mode: "web-localStorage", saveState: "idle", lastSavedAt: null, recoveryState: "normal" };
}

export async function loadWorkspace() {
  const api = window.payrollDesktop;
  if (!api) return browserLoadWorkspace();

  const result = await api.loadWorkspace();
  if (result.workspace) {
    return {
      workspace: migrateWorkspace(result.workspace),
      source: result.source ?? "desktop-file",
      recoveryState: result.recoveryState ?? "normal",
    };
  }

  if (result.recoveryState === "missing") {
    const legacy = browserLoadWorkspace();
    if (legacy.workspace && legacy.recoveryState !== "corrupt-fallback") {
      await api.saveWorkspace(legacy.workspace);
      return { workspace: legacy.workspace, source: "desktop-file", recoveryState: "migrated" };
    }
    return legacy;
  }

  return { workspace: null, source: "desktop-file", recoveryState: result.recoveryState ?? "corrupt-fallback" };
}

export async function saveWorkspace(workspace) {
  const api = window.payrollDesktop;
  if (!api) return browserSaveWorkspace(workspace);

  try {
    return await api.saveWorkspace(workspace);
  } catch (err) {
    return {
      status: "error",
      savedAt: null,
      error: { code: err?.code ?? "workspace:save-failed", message: err?.message ?? "保存失败" },
    };
  }
}

export async function getStorageStatus() {
  const api = window.payrollDesktop;
  if (!api) return browserGetStatus();

  try {
    return await api.getWorkspaceStatus();
  } catch {
    return browserGetStatus();
  }
}

export function isDesktopStorage() {
  return Boolean(window.payrollDesktop);
}

export { BACKUP_TYPE, BACKUP_REASONS, STORAGE_KEY };
export { validateBackupPayload } from "../shared/backup-format.js";
