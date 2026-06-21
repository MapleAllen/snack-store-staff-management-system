export const BACKUP_TYPE = "store-payroll-backup";
export const LEGACY_BACKUP_TYPES = new Set(["zhaoyiming-payroll-backup"]);
export const STORAGE_KEY = "payroll-workspace-v1";
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateWorkspaceData(data) {
  if (!isRecord(data) || !Array.isArray(data.stores) || !isRecord(data.monthlyRecords)) {
    throw new Error("备份数据结构不完整");
  }
  if (data.employees != null && !Array.isArray(data.employees)) throw new Error("员工数据结构无效");
  if (data.assignments != null && !Array.isArray(data.assignments)) throw new Error("员工归属数据结构无效");
  if (data.adjustments != null && !Array.isArray(data.adjustments)) throw new Error("调薪数据结构无效");
  if (data.ruleHistory != null && !Array.isArray(data.ruleHistory)) throw new Error("规则记录结构无效");
  for (const store of data.stores) {
    if (!isRecord(store) || typeof store.id !== "string" || typeof store.name !== "string" || !isRecord(store.config)) {
      throw new Error("门店数据结构无效");
    }
  }
  return data;
}

export function validateBackupPayload(payload) {
  const supportedType = payload?.type === BACKUP_TYPE || LEGACY_BACKUP_TYPES.has(payload?.type);
  if (!supportedType || payload?.storageKey !== STORAGE_KEY) throw new Error("备份格式无效");
  validateWorkspaceData(payload.data);
  return payload;
}

export function validateBackupFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0 || bytes > MAX_BACKUP_BYTES) {
    throw new Error("备份文件超过 25 MB，已拒绝导入");
  }
  return bytes;
}
