import { createOpenMonthlyStoreRecord, defaultMonthlyEntry } from "./payrollData.js";

export const PAYROLL_FORMULA_METADATA = Object.freeze({
  version: "core-payroll-v1",
  engine: "flat-store-month-payroll",
  rounding: "round2",
  socialInsurance: "fixed-contribution",
});

export function clonePayrollFormulaMetadata(metadata = PAYROLL_FORMULA_METADATA) {
  return JSON.parse(JSON.stringify(metadata));
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isFiniteNumber(value) {
  return value !== "" && Number.isFinite(Number(value));
}

const PAYROLL_ADJUSTMENT_CATEGORIES = new Set(["bonus", "deduction", "reimbursement", "correction"]);
const PAYROLL_ADJUSTMENT_STATUSES = new Set(["approved", "pending", "rejected"]);
const POSITIVE_PAYROLL_ADJUSTMENT_CATEGORIES = new Set(["bonus", "deduction", "reimbursement"]);

export function createPayrollIssue(code, severity, field, message) {
  return { code, severity, field, message };
}

export function getPayrollIssueMessage(issue) {
  return typeof issue === "string" ? issue : issue?.message ?? "";
}

function dedupePayrollIssues(issues) {
  const seen = new Set();
  return issues.filter((issue) => {
    const key = typeof issue === "string" ? issue : `${issue.code}:${issue.field}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getStructuredPayrollAdjustments(entry) {
  return Array.isArray(entry?.payrollAdjustments) ? entry.payrollAdjustments : [];
}

function getStructuredPayrollAdjustmentImpact(adjustment) {
  const amount = Number(adjustment?.amount);
  if (adjustment?.status !== "approved" || !Number.isFinite(amount)) return 0;
  if (!PAYROLL_ADJUSTMENT_CATEGORIES.has(adjustment?.category)) return 0;
  if (POSITIVE_PAYROLL_ADJUSTMENT_CATEGORIES.has(adjustment.category) && amount <= 0) return 0;
  if (adjustment.category === "deduction") return -amount;
  return amount;
}

function summarizeStructuredPayrollAdjustments(entry) {
  const adjustments = getStructuredPayrollAdjustments(entry);
  const approved = adjustments.filter((adjustment) => adjustment?.status === "approved");
  const approvedTotal = approved.reduce((sum, adjustment) => sum + getStructuredPayrollAdjustmentImpact(adjustment), 0);
  return {
    approvedCount: approved.length,
    approvedTotal,
    totalCount: adjustments.length,
  };
}

export function validateStoreConfig(config) {
  const issues = [];
  const nonNegativeFields = [
    ["socialInsuranceBase", "社保补助基数", "STORE_CONFIG_SOCIAL_INSURANCE_BASE_NON_NEGATIVE"],
    ["mealAllowanceBase", "饭补基数", "STORE_CONFIG_MEAL_ALLOWANCE_BASE_NON_NEGATIVE"],
    ["auditPassedBonus", "稽核达标奖励", "STORE_CONFIG_AUDIT_PASSED_BONUS_NON_NEGATIVE"],
    ["auditFallbackBonus", "稽核未达标保底", "STORE_CONFIG_AUDIT_FALLBACK_BONUS_NON_NEGATIVE"],
    ["nightShiftRate", "夜班每小时补贴", "STORE_CONFIG_NIGHT_SHIFT_RATE_NON_NEGATIVE"],
  ];
  const positiveFields = [
    ["leaveDaysDivisor", "请假天数除数", "STORE_CONFIG_LEAVE_DAYS_DIVISOR_POSITIVE"],
    ["leaveHoursDivisor", "请假小时除数", "STORE_CONFIG_LEAVE_HOURS_DIVISOR_POSITIVE"],
    ["monthDays", "每月计薪天数", "STORE_CONFIG_MONTH_DAYS_POSITIVE"],
  ];
  for (const [key, label, code] of nonNegativeFields) {
    if (!Number.isFinite(Number(config?.[key])) || Number(config?.[key]) < 0) {
      issues.push(createPayrollIssue(code, "error", `config.${key}`, `${label}不能小于 0`));
    }
  }
  for (const [key, label, code] of positiveFields) {
    if (!Number.isFinite(Number(config?.[key])) || Number(config?.[key]) <= 0) {
      issues.push(createPayrollIssue(code, "error", `config.${key}`, `${label}必须大于 0`));
    }
  }
  return issues;
}

export function validateEmployeeSalary(employee) {
  if (!employee?.salaryConfigured) return [createPayrollIssue("EMPLOYEE_SALARY_PENDING", "error", "employee.salaryConfigured", "薪资尚未设置")];
  const issues = [];
  if (!Number.isFinite(Number(employee.baseSalary)) || Number(employee.baseSalary) <= 0) {
    issues.push(createPayrollIssue("EMPLOYEE_BASE_SALARY_POSITIVE", "error", "employee.baseSalary", "基础工资必须大于 0"));
  }
  if (!Number.isFinite(Number(employee.overtimeRate)) || Number(employee.overtimeRate) < 0) {
    issues.push(createPayrollIssue("EMPLOYEE_OVERTIME_RATE_NON_NEGATIVE", "error", "employee.overtimeRate", "加班时薪不能小于 0"));
  }
  if (!Number.isFinite(Number(employee.attendanceBonus)) || Number(employee.attendanceBonus) < 0) {
    issues.push(createPayrollIssue("EMPLOYEE_ATTENDANCE_BONUS_NON_NEGATIVE", "error", "employee.attendanceBonus", "全勤奖金不能小于 0"));
  }
  return issues;
}

export function validatePayrollEntry(entry, config) {
  const issues = validateStoreConfig(config);
  const fields = [
    ["overtimeHours", "加班时长", "PAYROLL_ENTRY_OVERTIME_HOURS"],
    ["leaveDays", "请假天数", "PAYROLL_ENTRY_LEAVE_DAYS"],
    ["leaveHours", "请假小时", "PAYROLL_ENTRY_LEAVE_HOURS"],
    ["nightShiftHours", "夜班时长", "PAYROLL_ENTRY_NIGHT_SHIFT_HOURS"],
  ];
  for (const [key, label, codePrefix] of fields) {
    if (entry?.[key] === "" || entry?.[key] == null) continue;
    if (!isFiniteNumber(entry[key])) issues.push(createPayrollIssue(`${codePrefix}_NUMBER`, "error", `entry.${key}`, `${label}不是有效数字`));
    else if (Number(entry[key]) < 0) issues.push(createPayrollIssue(`${codePrefix}_NON_NEGATIVE`, "error", `entry.${key}`, `${label}不能小于 0`));
  }
  if (entry?.specialAdjustment !== "" && entry?.specialAdjustment != null && !isFiniteNumber(entry.specialAdjustment)) {
    issues.push(createPayrollIssue("PAYROLL_ENTRY_SPECIAL_ADJUSTMENT_NUMBER", "error", "entry.specialAdjustment", "特殊加减项不是有效数字"));
  }
  if (entry?.payrollAdjustments != null && !Array.isArray(entry.payrollAdjustments)) {
    issues.push(createPayrollIssue("PAYROLL_ADJUSTMENTS_ARRAY", "error", "entry.payrollAdjustments", "工资调整记录格式无效"));
  }
  getStructuredPayrollAdjustments(entry).forEach((adjustment, index) => {
    const field = `entry.payrollAdjustments.${index}`;
    if (!PAYROLL_ADJUSTMENT_CATEGORIES.has(adjustment?.category)) {
      issues.push(createPayrollIssue("PAYROLL_ADJUSTMENT_CATEGORY_INVALID", "error", `${field}.category`, "工资调整分类无效"));
    }
    if (!PAYROLL_ADJUSTMENT_STATUSES.has(adjustment?.status)) {
      issues.push(createPayrollIssue("PAYROLL_ADJUSTMENT_STATUS_INVALID", "error", `${field}.status`, "工资调整状态无效"));
    } else if (adjustment.status === "pending") {
      issues.push(createPayrollIssue("PAYROLL_ADJUSTMENT_PENDING_APPROVAL", "error", `${field}.status`, "工资调整待审批"));
    }
    if (!isFiniteNumber(adjustment?.amount)) {
      issues.push(createPayrollIssue("PAYROLL_ADJUSTMENT_AMOUNT_NUMBER", "error", `${field}.amount`, "工资调整金额不是有效数字"));
    } else if (POSITIVE_PAYROLL_ADJUSTMENT_CATEGORIES.has(adjustment?.category) && Number(adjustment.amount) <= 0) {
      issues.push(createPayrollIssue("PAYROLL_ADJUSTMENT_AMOUNT_POSITIVE", "error", `${field}.amount`, "工资调整金额必须大于 0"));
    }
    if (typeof adjustment?.reason !== "string" || !adjustment.reason.trim()) {
      issues.push(createPayrollIssue("PAYROLL_ADJUSTMENT_REASON_REQUIRED", "error", `${field}.reason`, "工资调整原因不能为空"));
    }
  });
  if (Number(entry?.leaveDays || 0) > Number(config?.monthDays || 0)) {
    issues.push(createPayrollIssue("PAYROLL_ENTRY_LEAVE_DAYS_WITHIN_MONTH_DAYS", "error", "entry.leaveDays", "请假天数不能超过计薪天数"));
  }
  if (Number(entry?.leaveHours || 0) > Number(config?.leaveHoursDivisor || 0)) {
    issues.push(createPayrollIssue("PAYROLL_ENTRY_LEAVE_HOURS_WITHIN_MONTH_HOURS", "error", "entry.leaveHours", "请假小时不能超过月计薪小时"));
  }
  return dedupePayrollIssues(issues);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatTimestamp(value) {
  if (!value) return "未保存";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function previousMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 2, 1);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

export function isAssignmentActive(assignment, month) {
  return assignment.startMonth <= month && (!assignment.endMonth || assignment.endMonth >= month);
}

export function getAssignmentAtMonth(workspace, employeeId, month) {
  return (workspace.assignments ?? []).find(
    (assignment) => assignment.employeeId === employeeId && isAssignmentActive(assignment, month),
  );
}

export function getEmployeeAssignments(workspace, employeeId) {
  return (workspace.assignments ?? [])
    .filter((assignment) => assignment.employeeId === employeeId)
    .sort((a, b) => a.startMonth.localeCompare(b.startMonth));
}

export function getEmployeesForStore(workspace, storeId, month, options = {}) {
  const ids = new Set(
    (workspace.assignments ?? [])
      .filter((assignment) => assignment.storeId === storeId && isAssignmentActive(assignment, month))
      .map((assignment) => assignment.employeeId),
  );
  return (workspace.employees ?? []).filter(
    (employee) => ids.has(employee.id) && (options.includeResigned || !employee.isResigned),
  );
}

export function getEmployeesWithStoreHistory(workspace, storeId) {
  const ids = new Set(
    (workspace.assignments ?? [])
      .filter((assignment) => assignment.storeId === storeId)
      .map((assignment) => assignment.employeeId),
  );
  return (workspace.employees ?? []).filter((employee) => ids.has(employee.id));
}

export function getMonthlyStoreRecord(workspace, month, storeId) {
  return createOpenMonthlyStoreRecord(workspace.monthlyRecords?.[month]?.[storeId]);
}

function traceStep({ id, label, group, sourceFields, formula, inputs, rawValue, amount, rounding }) {
  return {
    id,
    label,
    group,
    sourceFields,
    formula,
    inputs,
    rawValue,
    amount,
    rounding,
  };
}

function noRounding() {
  return { method: "none", precision: null, applied: false };
}

function round2Trace() {
  return { method: "round2", precision: 2, applied: true };
}

export function calculatePayrollDetailed(employee, entry, config) {
  if (!employee) return null;
  const overtimeHours = toNumber(entry.overtimeHours);
  const leaveDays = toNumber(entry.leaveDays);
  const leaveHours = toNumber(entry.leaveHours);
  const nightShiftHours = toNumber(entry.nightShiftHours);
  const legacySpecialAdjustment = toNumber(entry.specialAdjustment);
  const structuredAdjustmentSummary = summarizeStructuredPayrollAdjustments(entry);
  const specialAdjustment = legacySpecialAdjustment + structuredAdjustmentSummary.approvedTotal;
  const attendanceEligible = leaveDays + leaveHours === 0;
  const leaveDaysDivisor = Number(config.leaveDaysDivisor) > 0 ? Number(config.leaveDaysDivisor) : 1;
  const leaveHoursDivisor = Number(config.leaveHoursDivisor) > 0 ? Number(config.leaveHoursDivisor) : 1;
  const monthDays = Number(config.monthDays) > 0 ? Number(config.monthDays) : 1;
  const workedMealDays = Math.max(0, monthDays - leaveDays);
  const leaveDaysDeductionRaw = (employee.baseSalary / leaveDaysDivisor) * leaveDays;
  const leaveHoursDeductionRaw = (employee.baseSalary / leaveHoursDivisor) * leaveHours;
  const overtimePayRaw = overtimeHours * employee.overtimeRate;
  const nightShiftPayRaw = nightShiftHours * config.nightShiftRate;
  const socialInsuranceRaw = config.socialInsuranceBase;
  const mealAllowanceRaw = (config.mealAllowanceBase / monthDays) * workedMealDays;
  const leaveDaysDeduction = round2(leaveDaysDeductionRaw);
  const leaveHoursDeduction = round2(leaveHoursDeductionRaw);
  const overtimePay = round2(overtimePayRaw);
  const nightShiftPay = round2(nightShiftPayRaw);
  const attendancePay = attendanceEligible ? employee.attendanceBonus : 0;
  const auditPay = entry.auditPassed ? config.auditPassedBonus : config.auditFallbackBonus;
  const socialInsurance = round2(socialInsuranceRaw);
  const mealAllowance = round2(mealAllowanceRaw);
  const netSalaryRaw = employee.baseSalary - leaveDaysDeduction - leaveHoursDeduction + overtimePay + nightShiftPay +
    attendancePay + auditPay + socialInsurance + mealAllowance + specialAdjustment;
  const netSalary = round2(netSalaryRaw);
  const breakdown = {
    overtimeHours, leaveDays, leaveHours, nightShiftHours, specialAdjustment, attendanceEligible,
    leaveDaysDeduction, leaveHoursDeduction, overtimePay, nightShiftPay, attendancePay, auditPay,
    socialInsurance, mealAllowance, netSalary,
  };
  return {
    breakdown,
    steps: [
      traceStep({
        id: "base-salary",
        label: "基础工资",
        group: "base",
        sourceFields: ["employee.baseSalary"],
        formula: "基础工资",
        inputs: { baseSalary: employee.baseSalary },
        rawValue: employee.baseSalary,
        amount: employee.baseSalary,
        rounding: noRounding(),
      }),
      traceStep({
        id: "leave-days-deduction",
        label: "请假天数扣减",
        group: "deduction",
        sourceFields: ["employee.baseSalary", "config.leaveDaysDivisor", "entry.leaveDays"],
        formula: "基础工资 / 请假天数除数 * 请假天数",
        inputs: { baseSalary: employee.baseSalary, leaveDaysDivisor, leaveDays },
        rawValue: leaveDaysDeductionRaw,
        amount: leaveDaysDeduction,
        rounding: round2Trace(),
      }),
      traceStep({
        id: "leave-hours-deduction",
        label: "请假小时扣减",
        group: "deduction",
        sourceFields: ["employee.baseSalary", "config.leaveHoursDivisor", "entry.leaveHours"],
        formula: "基础工资 / 请假小时除数 * 请假小时",
        inputs: { baseSalary: employee.baseSalary, leaveHoursDivisor, leaveHours },
        rawValue: leaveHoursDeductionRaw,
        amount: leaveHoursDeduction,
        rounding: round2Trace(),
      }),
      traceStep({
        id: "overtime-pay",
        label: "加班工资",
        group: "addition",
        sourceFields: ["entry.overtimeHours", "employee.overtimeRate"],
        formula: "加班时长 * 加班时薪",
        inputs: { overtimeHours, overtimeRate: employee.overtimeRate },
        rawValue: overtimePayRaw,
        amount: overtimePay,
        rounding: round2Trace(),
      }),
      traceStep({
        id: "night-shift-pay",
        label: "夜班补贴",
        group: "addition",
        sourceFields: ["entry.nightShiftHours", "config.nightShiftRate"],
        formula: "夜班时长 * 夜班每小时补贴",
        inputs: { nightShiftHours, nightShiftRate: config.nightShiftRate },
        rawValue: nightShiftPayRaw,
        amount: nightShiftPay,
        rounding: round2Trace(),
      }),
      traceStep({
        id: "attendance-pay",
        label: "全勤奖金",
        group: "addition",
        sourceFields: ["entry.leaveDays", "entry.leaveHours", "employee.attendanceBonus"],
        formula: "请假天数与请假小时均为 0 时发放全勤奖金",
        inputs: { leaveDays, leaveHours, attendanceBonus: employee.attendanceBonus, attendanceEligible },
        rawValue: attendancePay,
        amount: attendancePay,
        rounding: noRounding(),
      }),
      traceStep({
        id: "audit-pay",
        label: "稽核奖金",
        group: "addition",
        sourceFields: ["entry.auditPassed", "config.auditPassedBonus", "config.auditFallbackBonus"],
        formula: "稽核达标取达标奖励，否则取未达标保底",
        inputs: {
          auditPassed: Boolean(entry.auditPassed),
          auditPassedBonus: config.auditPassedBonus,
          auditFallbackBonus: config.auditFallbackBonus,
        },
        rawValue: auditPay,
        amount: auditPay,
        rounding: noRounding(),
      }),
      traceStep({
        id: "social-insurance",
        label: "社保补助",
        group: "addition",
        sourceFields: ["config.socialInsuranceBase"],
        formula: "社保补助基数固定发放",
        inputs: { socialInsuranceBase: config.socialInsuranceBase },
        rawValue: socialInsuranceRaw,
        amount: socialInsurance,
        rounding: round2Trace(),
      }),
      traceStep({
        id: "meal-allowance",
        label: "饭补",
        group: "addition",
        sourceFields: ["config.mealAllowanceBase", "config.monthDays", "entry.leaveDays"],
        formula: "饭补基数 / 每月计薪天数 * max(0, 每月计薪天数 - 请假天数)",
        inputs: { mealAllowanceBase: config.mealAllowanceBase, monthDays, leaveDays, workedMealDays },
        rawValue: mealAllowanceRaw,
        amount: mealAllowance,
        rounding: round2Trace(),
      }),
      traceStep({
        id: "special-adjustment",
        label: "特殊加减项",
        group: "addition",
        sourceFields: ["entry.specialAdjustment", "entry.payrollAdjustments"],
        formula: "本月特殊加减项 + 已批准结构化工资调整",
        inputs: {
          legacySpecialAdjustment,
          structuredAdjustmentTotal: structuredAdjustmentSummary.approvedTotal,
          approvedStructuredAdjustmentCount: structuredAdjustmentSummary.approvedCount,
          structuredAdjustmentCount: structuredAdjustmentSummary.totalCount,
          specialAdjustment,
        },
        rawValue: specialAdjustment,
        amount: specialAdjustment,
        rounding: noRounding(),
      }),
      traceStep({
        id: "net-salary",
        label: "实发工资",
        group: "total",
        sourceFields: [
          "employee.baseSalary",
          "breakdown.leaveDaysDeduction",
          "breakdown.leaveHoursDeduction",
          "breakdown.overtimePay",
          "breakdown.nightShiftPay",
          "breakdown.attendancePay",
          "breakdown.auditPay",
          "breakdown.socialInsurance",
          "breakdown.mealAllowance",
          "breakdown.specialAdjustment",
        ],
        formula: "基础工资 - 请假天数扣减 - 请假小时扣减 + 加班工资 + 夜班补贴 + 全勤奖金 + 稽核奖金 + 社保补助 + 饭补 + 特殊加减项",
        inputs: {
          baseSalary: employee.baseSalary,
          leaveDaysDeduction,
          leaveHoursDeduction,
          overtimePay,
          nightShiftPay,
          attendancePay,
          auditPay,
          socialInsurance,
          mealAllowance,
          specialAdjustment,
        },
        rawValue: netSalaryRaw,
        amount: netSalary,
        rounding: round2Trace(),
      }),
    ],
  };
}

export function calculatePayroll(employee, entry, config) {
  return calculatePayrollDetailed(employee, entry, config)?.breakdown ?? null;
}

export function buildExportRows(store, rows, exportStatus = "草稿") {
  return rows.map(({ employee, entry, breakdown, validationIssues = [] }) => ({
    工资表状态: exportStatus,
    门店: store.name,
    姓名: employee.name,
    基础工资: employee.baseSalary,
    加班时薪: employee.overtimeRate,
    加班时长: breakdown.overtimeHours,
    请假天数: breakdown.leaveDays,
    请假小时: breakdown.leaveHours,
    夜班时长: store.config.nightShiftRate > 0 ? breakdown.nightShiftHours : "",
    稽核达标: entry.auditPassed ? "是" : "否",
    录入完成: entry.isComplete ? "是" : "否",
    薪资已设置: employee.salaryConfigured ? "是" : "否",
    数据校验: validationIssues.length ? validationIssues.map(getPayrollIssueMessage).join("；") : "通过",
    社保补助: breakdown.socialInsurance,
    饭补: breakdown.mealAllowance,
    特殊加减项: breakdown.specialAdjustment,
    备注: entry.note ?? "",
    实发工资: validationIssues.length ? "" : breakdown.netSalary,
  }));
}

function getPayrollExportStatus(rows, monthlyStore) {
  if (monthlyStore?.status === "closed") return "formal";
  if ((rows ?? []).length > 0 && rows.every((row) => row.recordStatus === "closed")) return "formal";
  return "draft";
}

function summarizePayrollFormulaVersions(rows) {
  const counts = new Map();
  let missingCount = 0;
  for (const row of rows ?? []) {
    const version = row?.formulaMetadata?.version;
    if (!version) {
      missingCount += 1;
      continue;
    }
    counts.set(version, (counts.get(version) ?? 0) + 1);
  }
  return {
    rowVersionCounts: Array.from(counts, ([version, count]) => ({ version, count }))
      .sort((a, b) => a.version.localeCompare(b.version)),
    missingRowMetadataCount: missingCount,
  };
}

export function buildPayrollExportMetadata(store, month, rows, monthlyStore, options = {}) {
  const stageSummary = getPayrollStageSummary(rows ?? [], monthlyStore);
  const closeSummary = getPayrollCloseSummary(rows ?? []);
  const formulaSummary = summarizePayrollFormulaVersions(rows);

  return {
    store: {
      id: store?.id ?? "",
      name: store?.name ?? "",
    },
    month,
    exportStatus: getPayrollExportStatus(rows, monthlyStore),
    rowCount: (rows ?? []).length,
    confirmedCount: stageSummary.confirmedCount,
    blockerCount: closeSummary.blockerCount,
    reviewCount: closeSummary.reviewCount,
    cleanCount: closeSummary.cleanCount,
    totals: {
      estimated: stageSummary.forecastTotal,
      confirmed: stageSummary.confirmedTotal,
      closed: stageSummary.closedTotal,
    },
    generatedAt: options.generatedAt ?? null,
    formulaMetadata: {
      current: clonePayrollFormulaMetadata(options.formulaMetadata ?? PAYROLL_FORMULA_METADATA),
      ...formulaSummary,
    },
  };
}

export function csvEscape(value) {
  let text = `${value ?? ""}`;
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

export function sanitizeDownloadFileName(value, fallback = "门店") {
  const sanitized = `${value ?? ""}`
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 80);
  return sanitized || fallback;
}

export function cloneDefaultEntry(currentEntry) {
  return { ...defaultMonthlyEntry(), ...(currentEntry ?? {}) };
}

export function entryHasInput(entry) {
  return Boolean(entry?.isComplete);
}

export function entryHasDraftChanges(entry) {
  if (!entry) return false;
  const draftFields = ["overtimeHours", "leaveDays", "leaveHours", "nightShiftHours", "specialAdjustment"];
  if (draftFields.some((field) => entry[field] !== "" && entry[field] != null)) return true;
  if (Array.isArray(entry.payrollAdjustments) && entry.payrollAdjustments.length > 0) return true;
  if ((entry.note ?? "").trim()) return true;
  if (entry.auditPassed) return true;
  return false;
}

export function getPayrollIssueItems(row) {
  if (!row?.breakdown || !row?.entry) return [];
  const issues = (row.validationIssues ?? []).map(getPayrollIssueMessage);
  if (row.breakdown.leaveDays > 0) issues.push(`请假 ${row.breakdown.leaveDays} 天`);
  if (row.breakdown.leaveHours > 0) issues.push(`请假 ${row.breakdown.leaveHours} 小时`);
  if (row.breakdown.specialAdjustment !== 0) issues.push(`特殊调整 ${formatCurrency(row.breakdown.specialAdjustment)}`);
  if (entryHasInput(row.entry) && !row.entry.auditPassed) issues.push("稽核未达标");
  return issues;
}

export function getPayrollCloseBlockers(row) {
  if (!row) return [];
  if (!row.employee?.salaryConfigured) {
    return [createPayrollIssue("CLOSE_EMPLOYEE_SALARY_PENDING", "error", "employee.salaryConfigured", "请先设置三项薪资")];
  }
  if ((row.validationIssues ?? []).length > 0) return [...row.validationIssues];
  if (row.recordStatus === "closed") return [];
  if (!entryHasInput(row.entry)) {
    return [entryHasDraftChanges(row.entry)
      ? createPayrollIssue("CLOSE_ENTRY_DRAFT_UNCONFIRMED", "error", "entry.isComplete", "已录入但还未确认完成")
      : createPayrollIssue("CLOSE_ENTRY_UNCONFIRMED", "error", "entry.isComplete", "还未确认该员工本月数据")];
  }
  return [];
}

export function getPayrollCloseSummary(rows) {
  const blockerRows = [];
  const reviewRows = [];
  const cleanRows = [];

  for (const row of rows ?? []) {
    const closeBlockers = getPayrollCloseBlockers(row);
    if (closeBlockers.length > 0) {
      blockerRows.push({ ...row, closeBlockers });
      continue;
    }

    const issueItems = getPayrollIssueItems(row);
    if (issueItems.length > 0) {
      reviewRows.push({ ...row, issueItems });
      continue;
    }

    cleanRows.push({ ...row });
  }

  return {
    totalCount: (rows ?? []).length,
    blockerCount: blockerRows.length,
    reviewCount: reviewRows.length,
    cleanCount: cleanRows.length,
    canClose: (rows ?? []).length > 0 && blockerRows.length === 0,
    blockerRows,
    reviewRows,
    cleanRows,
  };
}

export function getPayrollChangeItems(row, storeConfig) {
  if (!row?.breakdown) return [];
  const changes = [];
  if (row.breakdown.overtimeHours > 0) changes.push(`加班 ${row.breakdown.overtimeHours} 小时`);
  if (row.breakdown.leaveDays > 0) changes.push(`请假 ${row.breakdown.leaveDays} 天`);
  if (row.breakdown.leaveHours > 0) changes.push(`请假 ${row.breakdown.leaveHours} 小时`);
  if (storeConfig?.nightShiftRate > 0 && row.breakdown.nightShiftHours > 0) changes.push(`夜班 ${row.breakdown.nightShiftHours} 小时`);
  if (row.breakdown.specialAdjustment !== 0) changes.push(`特殊调整 ${formatCurrency(row.breakdown.specialAdjustment)}`);
  if (row.entry?.auditPassed) changes.push("稽核达标");
  return changes;
}

export function getPayrollReviewStatus(row) {
  const issueItems = getPayrollIssueItems(row);
  if (!row.employee?.salaryConfigured) return { tone: "warning", label: "待设置", summary: "请先设置初始薪资" };
  if ((row.validationIssues ?? []).length > 0) return { tone: "danger", label: "输入有误", summary: getPayrollIssueMessage(row.validationIssues[0]) };
  if (row.recordStatus === "closed") return { tone: "success", label: "已月结", summary: "工资结果已冻结" };
  if (!entryHasInput(row.entry)) {
    return entryHasDraftChanges(row.entry)
      ? { tone: "idle", label: "待确认", summary: "已录入变更，点确认后才算该员工完成" }
      : { tone: "idle", label: "待确认", summary: "即使本月没有变更，也要点确认完成该员工核对" };
  }
  if (issueItems.length > 0) return { tone: "warning", label: "已确认待复核", summary: `已确认完成，仍需关注：${issueItems.join("、")}` };
  return { tone: "success", label: "已确认待月结", summary: "该员工已确认完成，等待本店月结" };
}

export function getStorePayrollRows(workspace, month, store, options = {}) {
  const monthlyStore = getMonthlyStoreRecord(workspace, month, store.id);
  if (monthlyStore.status === "closed" && Array.isArray(monthlyStore.snapshot)) {
    return monthlyStore.snapshot.map((row) => ({
      employee: { ...row.employee, salaryConfigured: row.employee?.salaryConfigured !== false },
      entry: { ...row.entry },
      breakdown: { ...row.breakdown },
      calculationTrace: Array.isArray(row.calculationTrace) ? JSON.parse(JSON.stringify(row.calculationTrace)) : undefined,
      formulaMetadata: row.formulaMetadata ? clonePayrollFormulaMetadata(row.formulaMetadata) : undefined,
      validationIssues: [],
      recordStatus: "closed",
    }));
  }
  const employees = getEmployeesForStore(workspace, store.id, month, options);
  return employees.map((employee) => {
    const entry = cloneDefaultEntry(monthlyStore.rows[employee.id]);
    const calculation = calculatePayrollDetailed(employee, entry, store.config);
    const validationIssues = [
      ...validateEmployeeSalary(employee),
      ...validatePayrollEntry(entry, store.config),
    ];
    return {
      employee,
      entry,
      breakdown: calculation.breakdown,
      calculationTrace: calculation.steps,
      validationIssues: dedupePayrollIssues(validationIssues),
      recordStatus: monthlyStore.status,
    };
  });
}

export function getPayrollStageSummary(rows, monthlyStore) {
  const validRows = rows.filter((row) => (row.validationIssues ?? []).length === 0);
  const confirmedRows = validRows.filter((row) => row.entry.isComplete);
  const reviewRows = rows.filter((row) => row.employee.salaryConfigured && getPayrollIssueItems(row).length > 0);
  const draftRows = rows.filter((row) => row.employee.salaryConfigured && !row.entry.isComplete && entryHasDraftChanges(row.entry));
  const notStartedRows = rows.filter((row) => row.employee.salaryConfigured && !row.entry.isComplete && !entryHasDraftChanges(row.entry));
  const forecastTotal = validRows.reduce((sum, row) => sum + row.breakdown.netSalary, 0);
  const confirmedTotal = confirmedRows.reduce((sum, row) => sum + row.breakdown.netSalary, 0);
  const closed = monthlyStore?.status === "closed";
  return {
    forecastTotal,
    confirmedTotal,
    closedTotal: closed ? forecastTotal : 0,
    employeeCount: rows.length,
    confirmedCount: confirmedRows.length,
    pendingCount: rows.filter((row) => row.employee.salaryConfigured && !row.entry.isComplete).length,
    unconfiguredCount: rows.filter((row) => !row.employee.salaryConfigured).length,
    invalidCount: rows.filter((row) => (row.validationIssues ?? []).length > 0 && row.employee.salaryConfigured).length,
    reviewCount: reviewRows.length,
    draftCount: draftRows.length,
    notStartedCount: notStartedRows.length,
    isClosed: closed,
    closedAt: monthlyStore?.closedAt ?? null,
  };
}

export function getPayrollMonthCloseReadiness(workspace, month) {
  const stores = (workspace?.stores ?? [])
    .filter((store) => store.status === "active")
    .map((store) => {
      const rows = getStorePayrollRows(workspace, month, store);
      const monthlyStore = getMonthlyStoreRecord(workspace, month, store.id);
      const stage = getPayrollStageSummary(rows, monthlyStore);
      const closeSummary = getPayrollCloseSummary(rows);
      const status = stage.isClosed
        ? "closed"
        : rows.length === 0
          ? "empty"
          : closeSummary.canClose
            ? "ready"
            : "blocked";

      return {
        storeId: store.id,
        storeName: store.name,
        status,
        rowCount: rows.length,
        blockerCount: closeSummary.blockerCount,
        reviewCount: closeSummary.reviewCount,
        cleanCount: closeSummary.cleanCount,
        confirmedCount: stage.confirmedCount,
        pendingCount: stage.pendingCount,
        unconfiguredCount: stage.unconfiguredCount,
        invalidCount: stage.invalidCount,
        blockers: closeSummary.blockerRows.map((row) => ({
          employeeId: row.employee.id,
          employeeName: row.employee.name,
          issues: row.closeBlockers.map((issue) => ({ ...issue })),
        })),
        reviews: closeSummary.reviewRows.map((row) => ({
          employeeId: row.employee.id,
          employeeName: row.employee.name,
          issueItems: [...row.issueItems],
        })),
        totals: {
          estimated: stage.forecastTotal,
          confirmed: stage.confirmedTotal,
          closed: stage.closedTotal,
        },
      };
    });

  const sum = (key) => stores.reduce((total, store) => total + store[key], 0);
  const totals = stores.reduce((summary, store) => ({
    estimated: summary.estimated + store.totals.estimated,
    confirmed: summary.confirmed + store.totals.confirmed,
    closed: summary.closed + store.totals.closed,
  }), { estimated: 0, confirmed: 0, closed: 0 });

  return {
    month,
    storeCount: stores.length,
    readyCount: stores.filter((store) => store.status === "ready").length,
    blockedCount: stores.filter((store) => store.status === "blocked").length,
    closedCount: stores.filter((store) => store.status === "closed").length,
    emptyCount: stores.filter((store) => store.status === "empty").length,
    blockerRowCount: sum("blockerCount"),
    employeeCount: sum("rowCount"),
    pendingCount: sum("pendingCount"),
    unconfiguredCount: sum("unconfiguredCount"),
    invalidCount: sum("invalidCount"),
    reviewCount: sum("reviewCount"),
    totals,
    allOpenStoresReady: stores.length > 0 && stores.every((store) => store.status === "ready" || store.status === "closed"),
    stores,
  };
}

export function createEmployeeDraft(employee) {
  return {
    name: employee?.name ?? "",
    baseSalary: `${employee?.baseSalary ?? 2000}`,
    overtimeRate: `${employee?.overtimeRate ?? 15}`,
    attendanceBonus: `${employee?.attendanceBonus ?? 200}`,
  };
}

export function createAdjustmentDraft(employee) {
  const source = typeof employee === "object" && employee ? employee : null;
  return {
    employeeId: source?.id ?? employee ?? "",
    date: new Date().toISOString().slice(0, 10),
    values: {
      baseSalary: source ? `${source.baseSalary}` : "",
      overtimeRate: source ? `${source.overtimeRate}` : "",
      attendanceBonus: source ? `${source.attendanceBonus}` : "",
    },
    notes: "",
  };
}
