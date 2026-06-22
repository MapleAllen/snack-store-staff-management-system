const fs = require("node:fs/promises");
const path = require("node:path");

let sharedModule;

async function loadShared() {
  if (!sharedModule) sharedModule = await import("../shared/backup-format.js");
  return sharedModule;
}

async function getReasonLabelMap() {
  const { BACKUP_REASON_LABELS } = await loadShared();
  return BACKUP_REASON_LABELS;
}

async function isValidReason(reason) {
  const { BACKUP_REASONS } = await loadShared();
  return Object.values(BACKUP_REASONS).includes(reason);
}

async function validatePayload(payload) {
  const { validateBackupPayload } = await loadShared();
  return validateBackupPayload(payload);
}

function createBackupStore({ baseDir, maxBackups = 10, now = () => new Date() }) {
  const backupDir = path.join(baseDir, "backups");
  let createQueue = Promise.resolve();

  async function list() {
    await fs.mkdir(backupDir, { recursive: true });
    const entries = await fs.readdir(backupDir, { withFileTypes: true });
    const backups = [];
    const reasonLabels = await getReasonLabelMap();
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      try {
        const payload = await validatePayload(JSON.parse(await fs.readFile(path.join(backupDir, entry.name), "utf8")));
        const stat = await fs.stat(path.join(backupDir, entry.name));
        backups.push({
          id: entry.name,
          createdAt: payload.exportedAt,
          reason: payload.reason ?? "manual",
          reasonLabel: reasonLabels[payload.reason] ?? "自动恢复点",
          size: stat.size,
        });
      } catch {
        // Damaged files are ignored in the list and will fail explicitly if selected by id.
      }
    }
    return backups.sort((a, b) => `${b.createdAt}`.localeCompare(`${a.createdAt}`));
  }

  async function createInternal(payload, reason = "manual") {
    await validatePayload(payload);
    if (!(await isValidReason(reason))) throw new Error("备份原因无效");
    await fs.mkdir(backupDir, { recursive: true });
    const date = now();
    const dayPrefix = date.toISOString().slice(0, 10);
    const existing = await list();
    const { BACKUP_REASONS: reasons } = await loadShared();
    if (reason === reasons.DAILY_STARTUP) {
      const today = existing.find((item) => item.reason === reason && item.createdAt?.startsWith(dayPrefix));
      if (today) return today;
    }
    const timestamp = date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const id = `${timestamp}-${reason}.json`;
    const filePath = path.join(backupDir, id);
    const tempPath = `${filePath}.tmp`;
    const document = { ...payload, exportedAt: date.toISOString(), reason };
    await fs.writeFile(tempPath, JSON.stringify(document, null, 2), "utf8");
    await fs.rename(tempPath, filePath);
    const afterCreate = await list();
    await Promise.all(afterCreate.slice(maxBackups).map((item) => fs.rm(path.join(backupDir, item.id), { force: true })));
    return (await list()).find((item) => item.id === id);
  }

  function create(payload, reason = "manual") {
    const operation = createQueue.then(() => createInternal(payload, reason));
    createQueue = operation.catch(() => undefined);
    return operation;
  }

  async function read(id) {
    if (!/^[a-zA-Z0-9._-]+\.json$/.test(id)) throw new Error("恢复点编号无效");
    const payload = JSON.parse(await fs.readFile(path.join(backupDir, id), "utf8"));
    return validatePayload(payload);
  }

  return { create, list, read };
}

module.exports = { createBackupStore, validatePayload };
