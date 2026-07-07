import { describe, expect, it } from "vitest";
import { createInitialWorkspace, migrateWorkspace } from "./payrollData.js";
import { PAYROLL_FORMULA_METADATA, createPayrollIssue, getAssignmentAtMonth, getMonthlyStoreRecord, getStorePayrollRows } from "./payrollLogic.js";
import {
  archiveStore,
  closeStoreMonth,
  createStore,
  restoreStore,
  transferEmployee,
  unlockStoreMonth,
} from "./workspaceOperations.js";

describe("workspace migration", () => {
  it("migrates legacy nested employees and monthly records", () => {
    const legacy = {
      version: 1,
      stores: [{
        id: "erz",
        name: "旧门店名",
        config: { socialInsuranceBase: 900 },
        employees: [{ id: "legacy-1", name: "测试员工", baseSalary: 2000, overtimeRate: 15, attendanceBonus: 200 }],
        adjustments: [],
      }],
      monthlyRecords: { "2026-06": { erz: { rows: { "legacy-1": { isComplete: true } }, savedAt: null } } },
    };
    const migrated = migrateWorkspace(legacy);
    expect(migrated.version).toBe(3);
    expect(migrated.stores).toHaveLength(1);
    expect(migrated.stores.find((store) => store.id === "erz")?.name).toBe("旧门店名");
    expect(migrated.employees.some((employee) => employee.id === "legacy-1")).toBe(true);
    expect(getAssignmentAtMonth(migrated, "legacy-1", "2026-06")?.storeId).toBe("erz");
    expect(getMonthlyStoreRecord(migrated, "2026-06", "erz").status).toBe("open");
  });
});

describe("store lifecycle", () => {
  it("creates a store from current rules and archives/restores it without deleting data", () => {
    const initial = createInitialWorkspace();
    const sourceStoreId = initial.stores[0].id;
    const created = createStore(initial, { sourceStoreId, name: "  新门店  ", id: "new-store", at: "2026-06-20T00:00:00Z" });
    expect(created.stores.find((store) => store.id === "new-store")?.config).toEqual(initial.stores.find((store) => store.id === sourceStoreId)?.config);
    const archived = archiveStore(created, { storeId: "new-store", month: "2026-06", at: "2026-06-20T01:00:00Z" });
    expect(archived.stores.find((store) => store.id === "new-store")?.status).toBe("archived");
    expect(restoreStore(archived, "new-store").stores.find((store) => store.id === "new-store")?.status).toBe("active");
  });
});

describe("employee transfer", () => {
  it("moves current-month input and preserves prior assignment history", () => {
    const initial = createInitialWorkspace();
    const sourceStoreId = initial.stores[0].id;
    const targetStoreId = initial.stores[1].id;
    const employeeId = initial.employees[0].id;
    initial.monthlyRecords = { "2026-06": { [sourceStoreId]: { rows: { [employeeId]: { overtimeHours: "3", isComplete: true } } } } };
    const transferred = transferEmployee(initial, {
      employeeId, targetStoreId, effectiveMonth: "2026-06", currentMonth: "2026-06",
      at: "2026-06-20T00:00:00Z", assignmentId: "assignment-new", note: "长期调任",
    });
    expect(getAssignmentAtMonth(transferred, employeeId, "2026-05")?.storeId).toBe(sourceStoreId);
    expect(getAssignmentAtMonth(transferred, employeeId, "2026-06")?.storeId).toBe(targetStoreId);
    expect(getMonthlyStoreRecord(transferred, "2026-06", sourceStoreId).rows[employeeId]).toBeUndefined();
    expect(getMonthlyStoreRecord(transferred, "2026-06", targetStoreId).rows[employeeId].overtimeHours).toBe("3");
  });

  it("blocks transfer when affected payroll data is closed", () => {
    const initial = createInitialWorkspace();
    const sourceStoreId = initial.stores[0].id;
    const targetStoreId = initial.stores[1].id;
    const employeeId = initial.employees[0].id;
    initial.monthlyRecords = { "2026-06": { [sourceStoreId]: { status: "closed", rows: { [employeeId]: { isComplete: true } } } } };
    expect(() => transferEmployee(initial, {
      employeeId, targetStoreId, effectiveMonth: "2026-06", currentMonth: "2026-06",
      at: "2026-06-20T00:00:00Z", assignmentId: "assignment-new", note: "",
    })).toThrow("已月结");
  });
});

describe("payroll close and unlock", () => {
  it("freezes a snapshot and records unlock reasons", () => {
    const initial = createInitialWorkspace();
    const store = initial.stores[3];
    const rows = getStorePayrollRows(initial, "2026-06", store);
    const closed = closeStoreMonth(initial, { storeId: store.id, month: "2026-06", rows, at: "2026-06-20T00:00:00Z", eventId: "close-1", reason: "工资核对完成" });
    const changed = { ...closed, stores: closed.stores.map((item) => item.id === store.id ? { ...item, config: { ...item.config, auditPassedBonus: 9999 } } : item) };
    expect(getStorePayrollRows(changed, "2026-06", changed.stores.find((item) => item.id === store.id))).toEqual(rows);
    const unlocked = unlockStoreMonth(changed, { storeId: store.id, month: "2026-06", at: "2026-06-21T00:00:00Z", eventId: "unlock-1", reason: "发现考勤遗漏" });
    const record = getMonthlyStoreRecord(unlocked, "2026-06", store.id);
    expect(record.status).toBe("open");
    expect(record.closeHistory.at(-1).reason).toBe("发现考勤遗漏");
  });

  it("stamps closed snapshot rows with formula version metadata", () => {
    const initial = createInitialWorkspace();
    const store = initial.stores[0];
    const rows = getStorePayrollRows(initial, "2026-06", store)
      .map((row) => ({ ...row, entry: { ...row.entry, isComplete: true } }));
    const closed = closeStoreMonth(initial, { storeId: store.id, month: "2026-06", rows, at: "2026-06-20T00:00:00Z", eventId: "close-1", reason: "工资核对完成" });
    const snapshot = getMonthlyStoreRecord(closed, "2026-06", store.id).snapshot;

    expect(snapshot).toHaveLength(rows.length);
    expect(snapshot.every((row) => row.formulaMetadata?.version === PAYROLL_FORMULA_METADATA.version)).toBe(true);

    const closedRows = getStorePayrollRows(closed, "2026-06", store);
    expect(closedRows[0].formulaMetadata).toEqual(PAYROLL_FORMULA_METADATA);
    expect(closedRows[0].formulaMetadata).not.toBe(snapshot[0].formulaMetadata);
  });

  it("refuses to close when an employee has not confirmed input", () => {
    const initial = createInitialWorkspace();
    const store = initial.stores[0];
    const rows = getStorePayrollRows(initial, "2026-06", store);
    expect(() => closeStoreMonth(initial, { storeId: store.id, month: "2026-06", rows, at: "now", eventId: "close", reason: "" })).toThrow("未确认");
  });

  it("refuses to close when confirmed data is invalid", () => {
    const initial = createInitialWorkspace();
    const store = initial.stores[0];
    const rows = getStorePayrollRows(initial, "2026-06", store).map((row) => ({ ...row, entry: { ...row.entry, isComplete: true } }));
    rows[0] = { ...rows[0], validationIssues: [createPayrollIssue("PAYROLL_ENTRY_OVERTIME_HOURS_NON_NEGATIVE", "error", "entry.overtimeHours", "加班时长不能小于 0")] };
    expect(() => closeStoreMonth(initial, { storeId: store.id, month: "2026-06", rows, at: "now", eventId: "close", reason: "" })).toThrow("无效工资数据");
  });
});
