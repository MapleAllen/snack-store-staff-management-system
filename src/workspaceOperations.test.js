import { describe, expect, it } from "vitest";
import { createInitialWorkspace, migrateWorkspace, WORKSPACE_VERSION } from "./payrollData.js";
import { PAYROLL_FORMULA_METADATA, createPayrollIssue, getAssignmentAtMonth, getMonthlyStoreRecord, getStorePayrollRows } from "./payrollLogic.js";
import {
  archiveStore,
  closeStoreMonth,
  createPayoutBatch,
  createStore,
  restoreStore,
  transferEmployee,
  updateEmployeeProfile,
  updatePayoutRow,
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
    expect(migrated.version).toBe(WORKSPACE_VERSION);
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

describe("employee profile", () => {
  it("updates name, phone, number, role and hire date with audit trail", () => {
    const initial = createInitialWorkspace();
    const employeeId = initial.employees[0].id;
    const updated = updateEmployeeProfile(initial, {
      employeeId,
      name: " 张三 ",
      phone: "13912345678",
      employeeNumber: "EMP-001",
      role: "店长",
      hireDate: "2024-01-01",
      id: "profile-1",
      at: "2026-06-20T00:00:00Z",
    });
    const employee = updated.employees.find((item) => item.id === employeeId);
    expect(employee.name).toBe("张三");
    expect(employee.phone).toBe("13912345678");
    expect(employee.employeeNumber).toBe("EMP-001");
    expect(employee.role).toBe("店长");
    expect(employee.hireDate).toBe("2024-01-01");
    expect(updated.operationLog[0]).toMatchObject({ type: "employee-profile-updated", employeeId, employeeName: "张三" });
  });

  it("rejects empty names, invalid phones and duplicate employee numbers", () => {
    const initial = createInitialWorkspace();
    const employeeId = initial.employees[0].id;
    const base = { employeeId, name: "张三", id: "profile-1", at: "2026-06-20T00:00:00Z" };
    expect(() => updateEmployeeProfile(initial, { ...base, name: "   " })).toThrow("姓名不能为空");
    expect(() => updateEmployeeProfile(initial, { ...base, phone: "123" })).toThrow("手机号格式无效");
    expect(() => updateEmployeeProfile(initial, { ...base, employeeNumber: initial.employees[1].employeeNumber })).toThrow("工号不能重复");
    expect(() => updateEmployeeProfile(initial, { ...base, employeeNumber: initial.employees[1].employeeNumber.toLowerCase() })).toThrow("工号不能重复");
  });

  it("keeps identity fields when clearing optional profile fields", () => {
    const initial = createInitialWorkspace();
    const employeeId = initial.employees[0].id;
    const updated = updateEmployeeProfile(initial, {
      employeeId,
      name: initial.employees[0].name,
      phone: "",
      employeeNumber: "",
      role: "",
      hireDate: "",
      id: "profile-2",
      at: "2026-06-20T00:00:00Z",
    });
    const employee = updated.employees.find((item) => item.id === employeeId);
    expect(employee.phone).toBe("");
    expect(employee.employeeNumber).toBe("");
    expect(employee.role).toBe("");
    expect(employee.hireDate).toBeNull();
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

describe("payroll payout handoff", () => {
  it("creates a payout batch from the frozen snapshot and tracks each employee", () => {
    const initial = createInitialWorkspace();
    const store = initial.stores[0];
    const rows = getStorePayrollRows(initial, "2026-06", store).map((row) => ({ ...row, entry: { ...row.entry, isComplete: true } }));
    const closed = closeStoreMonth(initial, { storeId: store.id, month: "2026-06", rows, at: "2026-06-20T00:00:00Z", eventId: "close-1", reason: "工资核对完成" });
    const batched = createPayoutBatch(closed, {
      storeId: store.id,
      month: "2026-06",
      plannedPayDate: "2026-06-28",
      method: "银行转账",
      reference: "demo-batch-001",
      at: "2026-06-21T00:00:00Z",
      eventId: "payout-1",
    });
    const payout = getMonthlyStoreRecord(batched, "2026-06", store.id).payout;
    expect(payout.status).toBe("pending");
    expect(Object.keys(payout.rows)).toHaveLength(rows.length);

    const updated = updatePayoutRow(batched, {
      storeId: store.id,
      month: "2026-06",
      employeeId: rows[0].employee.id,
      paymentStatus: "paid",
      payslipStatus: "acknowledged",
      at: "2026-06-28T08:00:00Z",
      eventId: "payout-row-1",
    });
    const updatedPayout = getMonthlyStoreRecord(updated, "2026-06", store.id).payout;
    expect(updatedPayout.status).toBe("in-progress");
    expect(updatedPayout.rows[rows[0].employee.id]).toMatchObject({ paymentStatus: "paid", payslipStatus: "acknowledged" });
    expect(() => unlockStoreMonth(updated, { storeId: store.id, month: "2026-06", at: "2026-06-29T00:00:00Z", eventId: "unlock-after-pay", reason: "月结核对差异" })).toThrow("不能直接解锁");
  });

  it("normalizes payout fields when migrating an existing workspace", () => {
    const initial = createInitialWorkspace();
    const storeId = initial.stores[0].id;
    const employeeId = initial.employees[0].id;
    initial.monthlyRecords = { "2026-06": { [storeId]: { status: "closed", rows: {}, snapshot: [], payout: {
      id: "payout-old",
      plannedPayDate: "2026-06-28",
      method: "unsupported",
      rows: { [employeeId]: { paymentStatus: "unknown", payslipStatus: "acknowledged" } },
    } } } };
    const migrated = migrateWorkspace(initial);
    const payout = getMonthlyStoreRecord(migrated, "2026-06", storeId).payout;
    expect(migrated.version).toBe(WORKSPACE_VERSION);
    expect(payout.method).toBe("银行转账");
    expect(payout.rows[employeeId]).toMatchObject({ paymentStatus: "pending", payslipStatus: "acknowledged" });
  });
});
