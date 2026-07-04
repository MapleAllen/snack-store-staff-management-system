import { describe, expect, it } from "vitest";
import { createInitialWorkspace, migrateWorkspace } from "./payrollData.js";
import {
  PAYROLL_FORMULA_METADATA,
  buildExportRows,
  calculatePayroll,
  calculatePayrollDetailed,
  csvEscape,
  getMonthlyStoreRecord,
  getPayrollStageSummary,
  getStorePayrollRows,
  sanitizeDownloadFileName,
  validatePayrollEntry,
  validateStoreConfig,
} from "./payrollLogic.js";

describe("workspace v3 salary state", () => {
  it("builds a generic demo workspace by default", () => {
    const workspace = createInitialWorkspace();
    expect(workspace.stores.map((store) => store.name)).toEqual(["示例一店", "示例二店", "示例三店", "示例四店"]);
    expect(workspace.employees.every((employee) => employee.name.startsWith("示例员工"))).toBe(true);
  });

  it("migrates v2 employees as salary configured without losing assignments", () => {
    const v2 = createInitialWorkspace();
    v2.version = 2;
    v2.employees = v2.employees.map(({ salaryConfigured, ...employee }) => employee);
    const migrated = migrateWorkspace(v2);
    expect(migrated.version).toBe(3);
    expect(migrated.assignments).toHaveLength(v2.assignments.length);
    expect(migrated.employees.every((employee) => employee.salaryConfigured)).toBe(true);
  });
});

describe("safe exports", () => {
  it("neutralizes spreadsheet formulas without changing numeric negatives", () => {
    expect(csvEscape("=HYPERLINK(\"https://example.invalid\")")).toBe("\"'=HYPERLINK(\"\"https://example.invalid\"\")\"");
    expect(csvEscape("+SUM(1,2)")).toBe("\"'+SUM(1,2)\"");
    expect(csvEscape(-50)).toBe("-50");
  });

  it("removes unsafe filename characters", () => {
    expect(sanitizeDownloadFileName('示例/门店:*?"<>|')).toBe("示例_门店_______");
    expect(sanitizeDownloadFileName("...   ")).toBe("门店");
  });
});

describe("payroll validation and stage totals", () => {
  it("returns detailed calculation trace without changing payroll totals", () => {
    const employee = {
      id: "employee-trace",
      name: "示例员工 Trace",
      salaryConfigured: true,
      baseSalary: 3200,
      overtimeRate: 18.5,
      attendanceBonus: 200,
    };
    const entry = {
      overtimeHours: "3.5",
      leaveDays: "1.5",
      leaveHours: "2",
      nightShiftHours: "4",
      auditPassed: true,
      specialAdjustment: "-33.335",
      note: "",
      isComplete: false,
      completedAt: null,
    };
    const config = {
      socialInsuranceBase: 800,
      mealAllowanceBase: 200,
      auditPassedBonus: 260,
      auditFallbackBonus: 100,
      nightShiftRate: 10,
      leaveDaysDivisor: 30,
      leaveHoursDivisor: 270,
      monthDays: 30,
    };

    const detailed = calculatePayrollDetailed(employee, entry, config);
    expect(detailed.breakdown).toEqual(calculatePayroll(employee, entry, config));

    const byId = Object.fromEntries(detailed.steps.map((step) => [step.id, step]));
    expect(byId["leave-days-deduction"]).toMatchObject({
      group: "deduction",
      sourceFields: ["employee.baseSalary", "config.leaveDaysDivisor", "entry.leaveDays"],
      formula: "基础工资 / 请假天数除数 * 请假天数",
      amount: detailed.breakdown.leaveDaysDeduction,
      rounding: { method: "round2", precision: 2, applied: true },
    });
    expect(byId["overtime-pay"]).toMatchObject({
      group: "addition",
      sourceFields: ["entry.overtimeHours", "employee.overtimeRate"],
      amount: detailed.breakdown.overtimePay,
    });
    expect(byId["social-insurance"]).toMatchObject({
      formula: "社保补助基数固定发放",
      amount: detailed.breakdown.socialInsurance,
    });
    expect(byId["meal-allowance"]).toMatchObject({
      sourceFields: ["config.mealAllowanceBase", "config.monthDays", "entry.leaveDays"],
      amount: detailed.breakdown.mealAllowance,
    });
    expect(byId["special-adjustment"]).toMatchObject({
      sourceFields: ["entry.specialAdjustment"],
      rawValue: -33.335,
      amount: -33.335,
      rounding: { method: "none", precision: null, applied: false },
    });
    expect(byId["net-salary"]).toMatchObject({
      group: "total",
      amount: detailed.breakdown.netSalary,
      rounding: { method: "round2", precision: 2, applied: true },
    });
  });

  it("preserves stored calculation trace for closed snapshots", () => {
    const workspace = createInitialWorkspace();
    const store = workspace.stores[0];
    const rows = getStorePayrollRows(workspace, "2026-06", store);
    const storedTrace = [{ id: "stored-trace", label: "已冻结追踪", group: "total", sourceFields: [], formula: "snapshot", inputs: {}, rawValue: 1, amount: 1, rounding: { method: "none", precision: null, applied: false } }];
    const snapshotRow = { ...rows[0], calculationTrace: storedTrace, formulaMetadata: PAYROLL_FORMULA_METADATA };
    const closedWorkspace = {
      ...workspace,
      stores: workspace.stores.map((item) => item.id === store.id ? { ...item, config: { ...item.config, auditPassedBonus: 9999 } } : item),
      monthlyRecords: {
        "2026-06": {
          [store.id]: {
            status: "closed",
            snapshot: [snapshotRow],
          },
        },
      },
    };

    const closedRows = getStorePayrollRows(closedWorkspace, "2026-06", closedWorkspace.stores[0]);
    expect(closedRows).toHaveLength(1);
    expect(closedRows[0].breakdown).toEqual(snapshotRow.breakdown);
    expect(closedRows[0].calculationTrace).toEqual(storedTrace);
    expect(closedRows[0].calculationTrace).not.toBe(storedTrace);
    expect(closedRows[0].calculationTrace[0].rounding).not.toBe(storedTrace[0].rounding);
    expect(closedRows[0].formulaMetadata).toEqual(PAYROLL_FORMULA_METADATA);
    expect(closedRows[0].formulaMetadata).not.toBe(snapshotRow.formulaMetadata);
  });

  it("does not recalculate trace for old closed snapshots without stored trace", () => {
    const workspace = createInitialWorkspace();
    const store = workspace.stores[0];
    const rows = getStorePayrollRows(workspace, "2026-06", store);
    const { calculationTrace, ...oldSnapshotRow } = rows[0];
    const closedWorkspace = {
      ...workspace,
      employees: workspace.employees.map((employee) => employee.id === rows[0].employee.id ? { ...employee, baseSalary: 9999 } : employee),
      stores: workspace.stores.map((item) => item.id === store.id ? { ...item, config: { ...item.config, mealAllowanceBase: 9999 } } : item),
      monthlyRecords: {
        "2026-06": {
          [store.id]: {
            status: "closed",
            snapshot: [oldSnapshotRow],
          },
        },
      },
    };

    const closedRows = getStorePayrollRows(closedWorkspace, "2026-06", closedWorkspace.stores[0]);
    expect(closedRows).toHaveLength(1);
    expect(closedRows[0].breakdown).toEqual(oldSnapshotRow.breakdown);
    expect(closedRows[0].calculationTrace).toBeUndefined();
    expect(closedRows[0].formulaMetadata).toBeUndefined();
    expect(calculationTrace).toHaveLength(11);
  });

  it("separates forecast, confirmed and closed totals", () => {
    const workspace = createInitialWorkspace();
    const store = workspace.stores[0];
    let rows = getStorePayrollRows(workspace, "2026-06", store);
    let summary = getPayrollStageSummary(rows, getMonthlyStoreRecord(workspace, "2026-06", store.id));
    expect(summary.forecastTotal).toBeGreaterThan(0);
    expect(summary.confirmedTotal).toBe(0);

    workspace.monthlyRecords = { "2026-06": { [store.id]: { rows: { [rows[0].employee.id]: { isComplete: true } } } } };
    rows = getStorePayrollRows(workspace, "2026-06", store);
    summary = getPayrollStageSummary(rows, getMonthlyStoreRecord(workspace, "2026-06", store.id));
    expect(summary.confirmedCount).toBe(1);
    expect(summary.confirmedTotal).toBe(rows[0].breakdown.netSalary);
  });

  it("rejects negative entry values and zero divisors", () => {
    expect(validatePayrollEntry({ overtimeHours: "-1", leaveDays: "", leaveHours: "", nightShiftHours: "", specialAdjustment: "" }, createInitialWorkspace().stores[0].config)).toContain("加班时长不能小于 0");
    expect(validateStoreConfig({ ...createInitialWorkspace().stores[0].config, leaveDaysDivisor: 0 })).toContain("请假天数除数必须大于 0");
  });

  it("excludes employees with unconfigured salary from payable totals", () => {
    const workspace = createInitialWorkspace();
    workspace.employees[0].salaryConfigured = false;
    const store = workspace.stores[0];
    const rows = getStorePayrollRows(workspace, "2026-06", store);
    const summary = getPayrollStageSummary(rows, getMonthlyStoreRecord(workspace, "2026-06", store.id));
    expect(summary.unconfiguredCount).toBe(1);
    expect(rows[0].validationIssues).toContain("薪资尚未设置");
    expect(summary.forecastTotal).toBe(rows.slice(1).reduce((sum, row) => sum + row.breakdown.netSalary, 0));
    const exported = buildExportRows(store, rows, "草稿·未月结");
    expect(exported[0].工资表状态).toBe("草稿·未月结");
    expect(exported[0].实发工资).toBe("");
    expect(exported[0].数据校验).toContain("薪资尚未设置");
  });
});
