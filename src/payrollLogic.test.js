import { describe, expect, it } from "vitest";
import { createInitialWorkspace, migrateWorkspace } from "./payrollData.js";
import {
  PAYROLL_FORMULA_METADATA,
  buildExportRows,
  buildPayrollExportMetadata,
  calculatePayroll,
  calculatePayrollDetailed,
  csvEscape,
  getMonthlyStoreRecord,
  getPayrollCloseBlockers,
  getPayrollCloseSummary,
  getPayrollIssueMessage,
  getPayrollMonthCloseReadiness,
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

describe("payroll export metadata", () => {
  it("builds draft metadata for open-month payroll rows", () => {
    const workspace = createInitialWorkspace();
    const store = workspace.stores[0];
    const sourceRows = getStorePayrollRows(workspace, "2026-06", store);
    const rows = [
      sourceRows[0],
      {
        ...sourceRows[1],
        entry: { ...sourceRows[1].entry, isComplete: true, auditPassed: false, completedAt: "2026-06-25T10:00:00Z" },
        validationIssues: [],
      },
      {
        ...sourceRows[2],
        entry: { ...sourceRows[2].entry, isComplete: true, auditPassed: true, completedAt: "2026-06-25T10:00:00Z" },
        breakdown: { ...sourceRows[2].breakdown, leaveDays: 0, leaveHours: 0, specialAdjustment: 0 },
        validationIssues: [],
      },
    ];
    const monthlyStore = getMonthlyStoreRecord(workspace, "2026-06", store.id);

    const metadata = buildPayrollExportMetadata(store, "2026-06", rows, monthlyStore, {
      generatedAt: "2026-06-30T08:00:00.000Z",
    });

    expect(metadata).toMatchObject({
      store: { id: store.id, name: store.name },
      month: "2026-06",
      exportStatus: "draft",
      rowCount: 3,
      confirmedCount: 2,
      blockerCount: 1,
      reviewCount: 1,
      cleanCount: 1,
      generatedAt: "2026-06-30T08:00:00.000Z",
      formulaMetadata: {
        current: PAYROLL_FORMULA_METADATA,
        rowVersionCounts: [],
        missingRowMetadataCount: 3,
      },
    });
    expect(metadata.totals.estimated).toBe(rows.reduce((sum, row) => sum + row.breakdown.netSalary, 0));
    expect(metadata.totals.confirmed).toBe(rows[1].breakdown.netSalary + rows[2].breakdown.netSalary);
    expect(metadata.totals.closed).toBe(0);
  });

  it("builds formal metadata from closed snapshots without recalculating live payroll", () => {
    const workspace = createInitialWorkspace();
    const store = workspace.stores[0];
    const sourceRows = getStorePayrollRows(workspace, "2026-06", store).slice(0, 2).map((row) => ({
      ...row,
      entry: { ...row.entry, isComplete: true, completedAt: "2026-06-30T10:00:00Z" },
      validationIssues: [],
    }));
    const snapshot = [
      { ...sourceRows[0], formulaMetadata: PAYROLL_FORMULA_METADATA },
      { ...sourceRows[1] },
    ];
    const closedWorkspace = {
      ...workspace,
      employees: workspace.employees.map((employee) => employee.id === sourceRows[0].employee.id
        ? { ...employee, baseSalary: employee.baseSalary + 5000 }
        : employee),
      stores: workspace.stores.map((item) => item.id === store.id
        ? { ...item, config: { ...item.config, mealAllowanceBase: item.config.mealAllowanceBase + 5000 } }
        : item),
      monthlyRecords: {
        "2026-06": {
          [store.id]: {
            status: "closed",
            closedAt: "2026-06-30T12:00:00Z",
            snapshot,
          },
        },
      },
    };
    const closedStore = closedWorkspace.stores.find((item) => item.id === store.id);
    const closedRows = getStorePayrollRows(closedWorkspace, "2026-06", closedStore);
    const monthlyStore = getMonthlyStoreRecord(closedWorkspace, "2026-06", store.id);

    const metadata = buildPayrollExportMetadata(closedStore, "2026-06", closedRows, monthlyStore, {
      generatedAt: "2026-07-01T08:00:00.000Z",
    });

    expect(metadata).toMatchObject({
      store: { id: store.id, name: store.name },
      month: "2026-06",
      exportStatus: "formal",
      rowCount: 2,
      confirmedCount: 2,
      blockerCount: 0,
      generatedAt: "2026-07-01T08:00:00.000Z",
      formulaMetadata: {
        current: PAYROLL_FORMULA_METADATA,
        rowVersionCounts: [{ version: PAYROLL_FORMULA_METADATA.version, count: 1 }],
        missingRowMetadataCount: 1,
      },
    });
    expect(metadata.totals.estimated).toBe(snapshot[0].breakdown.netSalary + snapshot[1].breakdown.netSalary);
    expect(metadata.totals.confirmed).toBe(snapshot[0].breakdown.netSalary + snapshot[1].breakdown.netSalary);
    expect(metadata.totals.closed).toBe(snapshot[0].breakdown.netSalary + snapshot[1].breakdown.netSalary);
    expect(metadata.totals.closed).not.toBe(calculatePayroll(closedWorkspace.employees[0], snapshot[0].entry, closedStore.config).netSalary);
  });
});

describe("all-store payroll close readiness", () => {
  function createReadinessWorkspace() {
    const base = createInitialWorkspace();
    const stores = base.stores.slice(0, 4);
    const employeeIds = new Set([
      "demo-1-employee-1",
      "demo-2-employee-1",
      "demo-3-employee-1",
    ]);
    return {
      ...base,
      stores,
      employees: base.employees.filter((employee) => employeeIds.has(employee.id)),
      assignments: base.assignments.filter((assignment) => employeeIds.has(assignment.employeeId)),
    };
  }

  it("classifies ready, blocked, closed, and empty active stores with deduplicated blocker rows", () => {
    const month = "2026-06";
    const workspace = createReadinessWorkspace();
    const [readyStore, blockedStore, closedStore] = workspace.stores;
    const closedSourceRow = getStorePayrollRows(workspace, month, closedStore)[0];
    const frozenSnapshotRow = {
      ...closedSourceRow,
      entry: { ...closedSourceRow.entry, isComplete: true, completedAt: "2026-06-30T10:00:00Z" },
      breakdown: { ...closedSourceRow.breakdown, netSalary: 4321.12 },
    };
    const readinessWorkspace = {
      ...workspace,
      employees: workspace.employees.map((employee) => employee.id === closedSourceRow.employee.id
        ? { ...employee, baseSalary: employee.baseSalary + 5000 }
        : employee),
      stores: workspace.stores.map((store) => store.id === closedStore.id
        ? { ...store, config: { ...store.config, mealAllowanceBase: store.config.mealAllowanceBase + 5000 } }
        : store),
      monthlyRecords: {
        [month]: {
          [readyStore.id]: {
            rows: {
              "demo-1-employee-1": { isComplete: true, auditPassed: true, completedAt: "2026-06-30T10:00:00Z" },
            },
          },
          [blockedStore.id]: {
            rows: {
              "demo-2-employee-1": { overtimeHours: "-1", leaveDays: "not-a-number", isComplete: false },
            },
          },
          [closedStore.id]: {
            status: "closed",
            closedAt: "2026-06-30T12:00:00Z",
            snapshot: [frozenSnapshotRow],
          },
        },
      },
    };

    const readiness = getPayrollMonthCloseReadiness(readinessWorkspace, month);
    const byStore = Object.fromEntries(readiness.stores.map((store) => [store.storeId, store]));

    expect(readiness).toMatchObject({
      month,
      storeCount: 4,
      readyCount: 1,
      blockedCount: 1,
      closedCount: 1,
      emptyCount: 1,
      blockerRowCount: 1,
      allOpenStoresReady: false,
    });
    expect(byStore[readyStore.id]).toMatchObject({ status: "ready", rowCount: 1, blockerCount: 0, reviewCount: 0, cleanCount: 1 });
    expect(byStore[blockedStore.id]).toMatchObject({
      status: "blocked",
      rowCount: 1,
      blockerCount: 1,
      pendingCount: 1,
      invalidCount: 1,
    });
    expect(byStore[blockedStore.id].blockers[0]).toMatchObject({
      employeeId: "demo-2-employee-1",
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "PAYROLL_ENTRY_OVERTIME_HOURS_NON_NEGATIVE" }),
        expect.objectContaining({ code: "PAYROLL_ENTRY_LEAVE_DAYS_NUMBER" }),
      ]),
    });
    expect(byStore[closedStore.id]).toMatchObject({
      status: "closed",
      totals: { estimated: 4321.12, confirmed: 4321.12, closed: 4321.12 },
    });
    expect(byStore["demo-store-4"]).toMatchObject({ status: "empty", rowCount: 0, blockerCount: 0 });
    expect(readiness.totals).toEqual({
      estimated: byStore[readyStore.id].totals.estimated + 4321.12,
      confirmed: byStore[readyStore.id].totals.confirmed + 4321.12,
      closed: 4321.12,
    });
  });

  it("keeps review-only rows ready and excludes archived stores", () => {
    const month = "2026-06";
    const workspace = createReadinessWorkspace();
    const readyStore = workspace.stores[0];
    const archivedStore = workspace.stores[1];
    const readiness = getPayrollMonthCloseReadiness({
      ...workspace,
      stores: workspace.stores.map((store) => store.id === readyStore.id ? store : { ...store, status: "archived" }),
      employees: workspace.employees.filter((employee) => employee.id === "demo-1-employee-1"),
      assignments: workspace.assignments.filter((assignment) => assignment.employeeId === "demo-1-employee-1"),
      monthlyRecords: {
        [month]: {
          [readyStore.id]: {
            rows: {
              "demo-1-employee-1": { isComplete: true, auditPassed: false, completedAt: "2026-06-30T10:00:00Z" },
            },
          },
        },
      },
    }, month);

    expect(readiness).toMatchObject({
      storeCount: 1,
      readyCount: 1,
      emptyCount: 0,
      blockerRowCount: 0,
      reviewCount: 1,
      allOpenStoresReady: true,
    });
    expect(readiness.stores.find((store) => store.storeId === readyStore.id)).toMatchObject({
      status: "ready",
      reviewCount: 1,
      blockers: [],
      reviews: [{ employeeId: "demo-1-employee-1", issueItems: ["稽核未达标"] }],
    });
    expect(readiness.stores.some((store) => store.storeId === archivedStore.id)).toBe(false);
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
      sourceFields: ["entry.specialAdjustment", "entry.payrollAdjustments"],
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
    expect(closedRows[0].validationIssues).toEqual([]);
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
    expect(closedRows[0].validationIssues).toEqual([]);
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
    const entryIssues = validatePayrollEntry({ overtimeHours: "-1", leaveDays: "", leaveHours: "", nightShiftHours: "", specialAdjustment: "" }, createInitialWorkspace().stores[0].config);
    const configIssues = validateStoreConfig({ ...createInitialWorkspace().stores[0].config, leaveDaysDivisor: 0 });

    expect(entryIssues[0]).toMatchObject({
      code: "PAYROLL_ENTRY_OVERTIME_HOURS_NON_NEGATIVE",
      severity: "error",
      field: "entry.overtimeHours",
      message: "加班时长不能小于 0",
    });
    expect(configIssues[0]).toMatchObject({
      code: "STORE_CONFIG_LEAVE_DAYS_DIVISOR_POSITIVE",
      severity: "error",
      field: "config.leaveDaysDivisor",
      message: "请假天数除数必须大于 0",
    });
  });

  it("keeps legacy special adjustments unchanged for negative and large positive amounts", () => {
    const workspace = createInitialWorkspace();
    const store = workspace.stores[0];
    const employee = workspace.employees[0];
    const baseEntry = {
      overtimeHours: "",
      leaveDays: "",
      leaveHours: "",
      nightShiftHours: "",
      auditPassed: false,
      note: "",
      isComplete: false,
      completedAt: null,
    };
    const withoutAdjustment = calculatePayroll(employee, { ...baseEntry, specialAdjustment: "" }, store.config);
    const withNegativeAdjustment = calculatePayroll(employee, { ...baseEntry, specialAdjustment: "-125.5" }, store.config);
    const withLargePositiveAdjustment = calculatePayroll(employee, { ...baseEntry, specialAdjustment: "12000.75" }, store.config);

    expect(withNegativeAdjustment.specialAdjustment).toBe(-125.5);
    expect(withNegativeAdjustment.netSalary).toBe(withoutAdjustment.netSalary - 125.5);
    expect(withLargePositiveAdjustment.specialAdjustment).toBe(12000.75);
    expect(withLargePositiveAdjustment.netSalary).toBe(withoutAdjustment.netSalary + 12000.75);
  });

  it("adds approved structured adjustment categories to the legacy special adjustment total", () => {
    const workspace = createInitialWorkspace();
    const store = workspace.stores[0];
    const employee = workspace.employees[0];
    const entry = {
      overtimeHours: "",
      leaveDays: "",
      leaveHours: "",
      nightShiftHours: "",
      auditPassed: false,
      specialAdjustment: "10",
      note: "",
      isComplete: false,
      completedAt: null,
      payrollAdjustments: [
        { id: "adj-bonus", category: "bonus", amount: "100", reason: "绩效奖励", status: "approved" },
        { id: "adj-deduction", category: "deduction", amount: "25.5", reason: "物品扣款", status: "approved" },
        { id: "adj-reimbursement", category: "reimbursement", amount: 40, reason: "垫付报销", status: "approved" },
        { id: "adj-correction", category: "correction", amount: "-15", reason: "上月修正", status: "approved" },
      ],
    };

    const base = calculatePayroll(employee, { ...entry, specialAdjustment: "", payrollAdjustments: [] }, store.config);
    const detailed = calculatePayrollDetailed(employee, entry, store.config);
    const specialAdjustmentStep = detailed.steps.find((step) => step.id === "special-adjustment");

    expect(detailed.breakdown.specialAdjustment).toBe(109.5);
    expect(detailed.breakdown.netSalary).toBe(base.netSalary + 109.5);
    expect(specialAdjustmentStep).toMatchObject({
      sourceFields: ["entry.specialAdjustment", "entry.payrollAdjustments"],
      inputs: {
        legacySpecialAdjustment: 10,
        structuredAdjustmentTotal: 99.5,
        approvedStructuredAdjustmentCount: 4,
        structuredAdjustmentCount: 4,
        specialAdjustment: 109.5,
      },
      rawValue: 109.5,
      amount: 109.5,
    });
  });

  it("ignores pending and rejected structured adjustments for totals while pending blocks close", () => {
    const workspace = createInitialWorkspace();
    const store = workspace.stores[0];
    const employee = workspace.employees[0];
    const entry = {
      overtimeHours: "",
      leaveDays: "",
      leaveHours: "",
      nightShiftHours: "",
      auditPassed: false,
      specialAdjustment: "",
      note: "",
      isComplete: true,
      completedAt: "2026-06-20T00:00:00Z",
      payrollAdjustments: [
        { id: "pending", category: "bonus", amount: "300", reason: "待审批奖励", status: "pending" },
        { id: "rejected", category: "bonus", amount: "200", reason: "驳回奖励", status: "rejected" },
      ],
    };
    const rows = getStorePayrollRows({
      ...workspace,
      monthlyRecords: {
        "2026-06": {
          [store.id]: {
            rows: {
              [employee.id]: entry,
            },
          },
        },
      },
    }, "2026-06", store);
    const row = rows.find((item) => item.employee.id === employee.id);
    const blockers = getPayrollCloseBlockers(row);

    expect(row.breakdown.specialAdjustment).toBe(0);
    expect(row.validationIssues[0]).toMatchObject({
      code: "PAYROLL_ADJUSTMENT_PENDING_APPROVAL",
      severity: "error",
      field: "entry.payrollAdjustments.0.status",
      message: "工资调整待审批",
    });
    expect(blockers[0]).toEqual(row.validationIssues[0]);
    expect(getPayrollIssueMessage(blockers[0])).toBe("工资调整待审批");
  });

  it("returns stable structured adjustment validation issue codes", () => {
    const issues = validatePayrollEntry({
      overtimeHours: "",
      leaveDays: "",
      leaveHours: "",
      nightShiftHours: "",
      specialAdjustment: "",
      payrollAdjustments: [
        { id: "bad-category", category: "gift", amount: "10", reason: "分类错误", status: "approved" },
        { id: "bad-status", category: "bonus", amount: "10", reason: "状态错误", status: "waiting" },
        { id: "bad-amount", category: "bonus", amount: "abc", reason: "金额错误", status: "approved" },
        { id: "bad-reason", category: "correction", amount: "-5", reason: " ", status: "approved" },
        { id: "bad-positive", category: "deduction", amount: "-1", reason: "扣款金额错误", status: "approved" },
      ],
    }, createInitialWorkspace().stores[0].config);

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "PAYROLL_ADJUSTMENT_CATEGORY_INVALID",
        field: "entry.payrollAdjustments.0.category",
        message: "工资调整分类无效",
      }),
      expect.objectContaining({
        code: "PAYROLL_ADJUSTMENT_STATUS_INVALID",
        field: "entry.payrollAdjustments.1.status",
        message: "工资调整状态无效",
      }),
      expect.objectContaining({
        code: "PAYROLL_ADJUSTMENT_AMOUNT_NUMBER",
        field: "entry.payrollAdjustments.2.amount",
        message: "工资调整金额不是有效数字",
      }),
      expect.objectContaining({
        code: "PAYROLL_ADJUSTMENT_REASON_REQUIRED",
        field: "entry.payrollAdjustments.3.reason",
        message: "工资调整原因不能为空",
      }),
      expect.objectContaining({
        code: "PAYROLL_ADJUSTMENT_AMOUNT_POSITIVE",
        field: "entry.payrollAdjustments.4.amount",
        message: "工资调整金额必须大于 0",
      }),
    ]));
  });

  it("rejects non-array structured payroll adjustment payloads", () => {
    const issues = validatePayrollEntry({
      overtimeHours: "",
      leaveDays: "",
      leaveHours: "",
      nightShiftHours: "",
      specialAdjustment: "",
      payrollAdjustments: { category: "bonus", amount: "10", reason: "格式错误", status: "approved" },
    }, createInitialWorkspace().stores[0].config);

    expect(issues[0]).toMatchObject({
      code: "PAYROLL_ADJUSTMENTS_ARRAY",
      severity: "error",
      field: "entry.payrollAdjustments",
      message: "工资调整记录格式无效",
    });
  });

  it("returns structured close blockers with stable display messages", () => {
    const workspace = createInitialWorkspace();
    const store = workspace.stores[0];
    const rows = getStorePayrollRows(workspace, "2026-06", store);
    const blockers = getPayrollCloseBlockers(rows[0]);

    expect(blockers[0]).toMatchObject({
      code: "CLOSE_ENTRY_UNCONFIRMED",
      severity: "error",
      field: "entry.isComplete",
      message: "还未确认该员工本月数据",
    });
    expect(getPayrollIssueMessage(blockers[0])).toBe("还未确认该员工本月数据");
  });

  it("groups close summary rows into blockers, review reminders, and clean rows", () => {
    const workspace = createInitialWorkspace();
    const store = workspace.stores[0];
    const sourceRows = getStorePayrollRows(workspace, "2026-06", store);
    const completeCleanRow = (row) => ({
      ...row,
      employee: { ...row.employee, salaryConfigured: true },
      entry: { ...row.entry, isComplete: true, auditPassed: true, completedAt: "2026-06-30T10:00:00Z" },
      breakdown: { ...row.breakdown, leaveDays: 0, leaveHours: 0, specialAdjustment: 0 },
      validationIssues: [],
    });
    const salaryPendingRow = {
      ...completeCleanRow(sourceRows[1]),
      employee: { ...sourceRows[1].employee, salaryConfigured: false },
    };
    const invalidRow = {
      ...completeCleanRow(sourceRows[2]),
      validationIssues: [{
        code: "PAYROLL_ENTRY_LEAVE_DAYS_WITHIN_MONTH_DAYS",
        severity: "error",
        field: "entry.leaveDays",
        message: "请假天数不能超过计薪天数",
      }],
    };
    const reviewRow = {
      ...completeCleanRow(sourceRows[3]),
      breakdown: { ...sourceRows[3].breakdown, leaveDays: 1, leaveHours: 0, specialAdjustment: 0 },
    };
    const cleanRow = completeCleanRow(sourceRows[4]);

    const summary = getPayrollCloseSummary([
      sourceRows[0],
      salaryPendingRow,
      invalidRow,
      reviewRow,
      cleanRow,
    ]);

    expect(summary).toMatchObject({
      totalCount: 5,
      blockerCount: 3,
      reviewCount: 1,
      cleanCount: 1,
      canClose: false,
    });
    expect(summary.blockerRows[0].closeBlockers[0]).toMatchObject({
      code: "CLOSE_ENTRY_UNCONFIRMED",
      message: "还未确认该员工本月数据",
    });
    expect(summary.blockerRows[1].closeBlockers[0]).toMatchObject({
      code: "CLOSE_EMPLOYEE_SALARY_PENDING",
      message: "请先设置三项薪资",
    });
    expect(summary.blockerRows[2].closeBlockers[0]).toMatchObject({
      code: "PAYROLL_ENTRY_LEAVE_DAYS_WITHIN_MONTH_DAYS",
      message: "请假天数不能超过计薪天数",
    });
    expect(summary.reviewRows[0].issueItems).toEqual(["请假 1 天"]);
    expect(summary.cleanRows[0].employee.id).toBe(cleanRow.employee.id);
  });

  it("allows close when every row is confirmed and blocker-free", () => {
    const workspace = createInitialWorkspace();
    const store = workspace.stores[0];
    const rows = getStorePayrollRows(workspace, "2026-06", store).slice(0, 2).map((row) => ({
      ...row,
      entry: { ...row.entry, isComplete: true, auditPassed: true, completedAt: "2026-06-30T10:00:00Z" },
      breakdown: { ...row.breakdown, leaveDays: 0, leaveHours: 0, specialAdjustment: 0 },
      validationIssues: [],
    }));

    const summary = getPayrollCloseSummary(rows);

    expect(summary.canClose).toBe(true);
    expect(summary.blockerRows).toHaveLength(0);
    expect(summary.reviewRows).toHaveLength(0);
    expect(summary.cleanRows).toHaveLength(2);
  });

  it("excludes employees with unconfigured salary from payable totals", () => {
    const workspace = createInitialWorkspace();
    workspace.employees[0].salaryConfigured = false;
    const store = workspace.stores[0];
    const rows = getStorePayrollRows(workspace, "2026-06", store);
    const summary = getPayrollStageSummary(rows, getMonthlyStoreRecord(workspace, "2026-06", store.id));
    expect(summary.unconfiguredCount).toBe(1);
    expect(rows[0].validationIssues[0]).toMatchObject({
      code: "EMPLOYEE_SALARY_PENDING",
      severity: "error",
      field: "employee.salaryConfigured",
      message: "薪资尚未设置",
    });
    expect(summary.forecastTotal).toBe(rows.slice(1).reduce((sum, row) => sum + row.breakdown.netSalary, 0));
    const exported = buildExportRows(store, rows, "草稿·未月结");
    expect(exported[0].工资表状态).toBe("草稿·未月结");
    expect(exported[0].实发工资).toBe("");
    expect(exported[0].数据校验).toContain("薪资尚未设置");
  });
});
