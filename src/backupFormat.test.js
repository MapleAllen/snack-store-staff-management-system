import { describe, expect, it } from "vitest";
import {
  BACKUP_TYPE,
  LEGACY_BACKUP_TYPES,
  MAX_BACKUP_BYTES,
  STORAGE_KEY,
  validateBackupFileSize,
  validateBackupPayload,
} from "../shared/backup-format.js";
import { createInitialWorkspace } from "./payrollData.js";

const [LEGACY_BACKUP_TYPE] = LEGACY_BACKUP_TYPES;

function payload(type = BACKUP_TYPE) {
  return { type, storageKey: STORAGE_KEY, version: "2.0.0", data: createInitialWorkspace() };
}

describe("backup format", () => {
  it("accepts current and legacy identifiers", () => {
    expect(validateBackupPayload(payload()).type).toBe(BACKUP_TYPE);
    expect(validateBackupPayload(payload(LEGACY_BACKUP_TYPE)).type).toBe(LEGACY_BACKUP_TYPE);
  });

  it("rejects malformed payloads", () => {
    expect(() => validateBackupPayload({ ...payload(), data: { stores: [], monthlyRecords: [] } })).toThrow("备份数据结构不完整");
    expect(() => validateBackupPayload({ ...payload(), data: { ...payload().data, employees: {} } })).toThrow("员工数据结构无效");
  });

  it("rejects oversized files", () => {
    expect(validateBackupFileSize(MAX_BACKUP_BYTES)).toBe(MAX_BACKUP_BYTES);
    expect(() => validateBackupFileSize(MAX_BACKUP_BYTES + 1)).toThrow("超过 25 MB");
  });
});
