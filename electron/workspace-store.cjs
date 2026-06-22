const fs = require("node:fs/promises");
const path = require("node:path");

const WORKSPACE_FILE = "workspace.json";
const BACKUP_TYPE = "store-payroll-backup";
const STORAGE_KEY = "payroll-workspace-v1";

function createWorkspaceStore({ baseDir, now = () => new Date() }) {
  const workspacePath = path.join(baseDir, WORKSPACE_FILE);
  const tempPath = `${workspacePath}.tmp`;
  let saveQueue = Promise.resolve();

  async function loadShared() {
    return import("../shared/backup-format.js");
  }

  async function load() {
    try {
      const raw = await fs.readFile(workspacePath, "utf8");
      const parsed = JSON.parse(raw);
      const { validateBackupPayload } = await loadShared();
      const validated = validateBackupPayload(parsed);
      return {
        workspace: validated.data,
        source: "desktop-file",
        recoveryState: "normal",
      };
    } catch (err) {
      if (err.code === "ENOENT") {
        return {
          workspace: null,
          source: "desktop-file",
          recoveryState: "missing",
        };
      }
      return {
        workspace: null,
        source: "desktop-file",
        recoveryState: "corrupt-fallback",
      };
    }
  }

  async function save(workspace) {
    try {
      const document = {
        type: BACKUP_TYPE,
        version: "2.0.0",
        storageKey: STORAGE_KEY,
        exportedAt: now().toISOString(),
        reason: "workspace-save",
        protected: false,
        data: workspace,
      };
      await fs.writeFile(tempPath, JSON.stringify(document, null, 2), "utf8");
      await fs.rename(tempPath, workspacePath);
      return { status: "saved", savedAt: new Date().toISOString() };
    } catch (err) {
      try { await fs.rm(tempPath, { force: true }); } catch {}
      const code = err.code === "ENOSPC" ? "workspace:disk-full"
        : err.code === "EACCES" ? "workspace:write-denied"
        : "workspace:save-failed";
      throw Object.assign(new Error("工作区保存失败"), { code });
    }
  }

  function getStatus() {
    return {
      mode: "desktop-file",
      saveState: "idle",
      lastSavedAt: null,
      recoveryState: "normal",
    };
  }

  function write(method) {
    const operation = saveQueue.then(() => method());
    saveQueue = operation.catch(() => undefined);
    return operation;
  }

  return {
    load: () => load(),
    save: (workspace) => write(() => save(workspace)),
    getStatus: () => getStatus(),
  };
}

module.exports = { createWorkspaceStore };
