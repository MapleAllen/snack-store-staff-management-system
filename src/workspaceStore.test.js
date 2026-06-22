import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createWorkspaceStore } from "../electron/workspace-store.cjs";

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("workspace store", () => {
  it("loads missing workspace and returns missing state", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "payroll-workspace-test-"));
    temporaryDirectories.push(dir);
    const store = createWorkspaceStore({ baseDir: dir });
    const result = await store.load();
    expect(result.workspace).toBeNull();
    expect(result.recoveryState).toBe("missing");
  });

  it("saves and loads workspace round-trip", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "payroll-workspace-test-"));
    temporaryDirectories.push(dir);
    const store = createWorkspaceStore({ baseDir: dir });
    const ws = {
      version: 3,
      stores: [{ id: "s1", name: "测试店", config: {}, status: "active", createdAt: null, archivedAt: null }],
      employees: [{ id: "e1", name: "测试员工", baseSalary: 3000, salaryConfigured: true }],
      assignments: [{ id: "a1", employeeId: "e1", storeId: "s1", startMonth: "2026-01", endMonth: null }],
      adjustments: [],
      ruleHistory: [],
      monthlyRecords: {},
    };
    const saveResult = await store.save(ws);
    expect(saveResult.status).toBe("saved");
    const loadResult = await store.load();
    expect(loadResult.recoveryState).toBe("normal");
    expect(loadResult.workspace.stores[0].name).toBe("测试店");
  }, 15000);

  it("returns corrupt state for malformed workspace file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "payroll-workspace-test-"));
    temporaryDirectories.push(dir);
    await fs.writeFile(path.join(dir, "workspace.json"), "not-valid-json", "utf8");
    const store = createWorkspaceStore({ baseDir: dir });
    const result = await store.load();
    expect(result.recoveryState).toBe("corrupt-fallback");
  });
});
