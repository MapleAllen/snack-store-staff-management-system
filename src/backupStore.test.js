import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import backupModule from "../electron/backup-store.cjs";
import { BACKUP_TYPE, LEGACY_BACKUP_TYPES, STORAGE_KEY } from "../shared/backup-format.js";
import { createInitialWorkspace } from "./payrollData.js";

const temporaryDirectories = [];
const [LEGACY_BACKUP_TYPE] = LEGACY_BACKUP_TYPES;

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

function payload() {
  return {
    type: BACKUP_TYPE,
    storageKey: STORAGE_KEY,
    version: "1.2.0",
    exportedAt: "2026-06-20T00:00:00.000Z",
    data: createInitialWorkspace(),
  };
}

describe("automatic backup store", () => {
  it("deduplicates daily backups and keeps only the newest snapshots", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "payroll-backup-test-"));
    temporaryDirectories.push(directory);
    let clock = new Date("2026-06-20T08:00:00.000Z");
    const store = backupModule.createBackupStore({ baseDir: directory, maxBackups: 2, now: () => clock });
    await Promise.all([store.create(payload(), "daily-startup"), store.create(payload(), "daily-startup")]);
    clock = new Date("2026-06-20T10:00:00.000Z");
    await store.create(payload(), "daily-startup");
    expect(await store.list()).toHaveLength(1);
    clock = new Date("2026-06-21T08:00:00.000Z");
    await store.create(payload(), "month-close");
    clock = new Date("2026-06-22T08:00:00.000Z");
    await store.create(payload(), "manual");
    expect(await store.list()).toHaveLength(2);
  });

  it("rejects invalid and damaged backups", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "payroll-backup-test-"));
    temporaryDirectories.push(directory);
    const store = backupModule.createBackupStore({ baseDir: directory });
    await expect(store.create({ type: "wrong" }, "manual")).rejects.toThrow("备份格式无效");
    await expect(store.read("../outside.json")).rejects.toThrow("恢复点编号无效");
  });

  it("accepts legacy v1 backup identifiers", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "payroll-backup-test-"));
    temporaryDirectories.push(directory);
    const store = backupModule.createBackupStore({ baseDir: directory });
    await expect(store.create({ ...payload(), type: LEGACY_BACKUP_TYPE }, "manual")).resolves.toBeTruthy();
  });
});
