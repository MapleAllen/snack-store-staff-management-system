import { describe, expect, it } from "vitest";
import { createInitialWorkspace, migrateWorkspace } from "./payrollData.js";
import {
  buildExportRows,
  csvEscape,
  getMonthlyStoreRecord,
  getPayrollStageSummary,
  getStorePayrollRows,
  sanitizeDownloadFileName,
  validatePayrollEntry,
  validateStoreConfig,
} from "./payrollLogic.js";

describe("workspace v3 salary state", () => {
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
