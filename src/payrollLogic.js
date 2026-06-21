import { createOpenMonthlyStoreRecord, defaultMonthlyEntry } from "./payrollData.js";

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

export function validateStoreConfig(config) {
  const issues = [];
  const nonNegativeFields = [
    ["socialInsuranceBase", "社保补助基数"],
    ["mealAllowanceBase", "饭补基数"],
    ["auditPassedBonus", "稽核达标奖励"],
    ["auditFallbackBonus", "稽核未达标保底"],
    ["nightShiftRate", "夜班每小时补贴"],
  ];
  const positiveFields = [
    ["leaveDaysDivisor", "请假天数除数"],
    ["leaveHoursDivisor", "请假小时除数"],
    ["monthDays", "每月计薪天数"],
  ];
  for (const [key, label] of nonNegativeFields) {
    if (!Number.isFinite(Number(config?.[key])) || Number(config[key]) < 0) issues.push(`${label}不能小于 0`);
  }
  for (const [key, label] of positiveFields) {
    if (!Number.isFinite(Number(config?.[key])) || Number(config[key]) <= 0) issues.push(`${label}必须大于 0`);
  }
  return issues;
}

export function validateEmployeeSalary(employee) {
  if (!employee?.salaryConfigured) return ["薪资尚未设置"];
  const issues = [];
  if (!Number.isFinite(Number(employee.baseSalary)) || Number(employee.baseSalary) <= 0) issues.push("基础工资必须大于 0");
  if (!Number.isFinite(Number(employee.overtimeRate)) || Number(employee.overtimeRate) < 0) issues.push("加班时薪不能小于 0");
  if (!Number.isFinite(Number(employee.attendanceBonus)) || Number(employee.attendanceBonus) < 0) issues.push("全勤奖金不能小于 0");
  return issues;
}

export function validatePayrollEntry(entry, config) {
  const issues = validateStoreConfig(config);
  const fields = [
    ["overtimeHours", "加班时长"],
    ["leaveDays", "请假天数"],
    ["leaveHours", "请假小时"],
    ["nightShiftHours", "夜班时长"],
  ];
  for (const [key, label] of fields) {
    if (entry?.[key] === "" || entry?.[key] == null) continue;
    if (!isFiniteNumber(entry[key])) issues.push(`${label}不是有效数字`);
    else if (Number(entry[key]) < 0) issues.push(`${label}不能小于 0`);
  }
  if (entry?.specialAdjustment !== "" && entry?.specialAdjustment != null && !isFiniteNumber(entry.specialAdjustment)) {
    issues.push("特殊加减项不是有效数字");
  }
  if (Number(entry?.leaveDays || 0) > Number(config?.monthDays || 0)) issues.push("请假天数不能超过计薪天数");
  if (Number(entry?.leaveHours || 0) > Number(config?.leaveHoursDivisor || 0)) issues.push("请假小时不能超过月计薪小时");
  return [...new Set(issues)];
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

export function calculatePayroll(employee, entry, config) {
  if (!employee) return null;
  const overtimeHours = toNumber(entry.overtimeHours);
  const leaveDays = toNumber(entry.leaveDays);
  const leaveHours = toNumber(entry.leaveHours);
  const nightShiftHours = toNumber(entry.nightShiftHours);
  const specialAdjustment = toNumber(entry.specialAdjustment);
  const attendanceEligible = leaveDays + leaveHours === 0;
  const leaveDaysDivisor = Number(config.leaveDaysDivisor) > 0 ? Number(config.leaveDaysDivisor) : 1;
  const leaveHoursDivisor = Number(config.leaveHoursDivisor) > 0 ? Number(config.leaveHoursDivisor) : 1;
  const monthDays = Number(config.monthDays) > 0 ? Number(config.monthDays) : 1;
  const leaveDaysDeduction = round2((employee.baseSalary / leaveDaysDivisor) * leaveDays);
  const leaveHoursDeduction = round2((employee.baseSalary / leaveHoursDivisor) * leaveHours);
  const overtimePay = round2(overtimeHours * employee.overtimeRate);
  const nightShiftPay = round2(nightShiftHours * config.nightShiftRate);
  const attendancePay = attendanceEligible ? employee.attendanceBonus : 0;
  const auditPay = entry.auditPassed ? config.auditPassedBonus : config.auditFallbackBonus;
  const socialInsurance = round2(config.socialInsuranceBase);
  const mealAllowance = round2((config.mealAllowanceBase / monthDays) * Math.max(0, monthDays - leaveDays));
  const netSalary = round2(
    employee.baseSalary - leaveDaysDeduction - leaveHoursDeduction + overtimePay + nightShiftPay +
      attendancePay + auditPay + socialInsurance + mealAllowance + specialAdjustment,
  );
  return {
    overtimeHours, leaveDays, leaveHours, nightShiftHours, specialAdjustment, attendanceEligible,
    leaveDaysDeduction, leaveHoursDeduction, overtimePay, nightShiftPay, attendancePay, auditPay,
    socialInsurance, mealAllowance, netSalary,
  };
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
    数据校验: validationIssues.length ? validationIssues.join("；") : "通过",
    社保补助: breakdown.socialInsurance,
    饭补: breakdown.mealAllowance,
    特殊加减项: breakdown.specialAdjustment,
    备注: entry.note ?? "",
    实发工资: validationIssues.length ? "" : breakdown.netSalary,
  }));
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
  if ((entry.note ?? "").trim()) return true;
  if (entry.auditPassed) return true;
  return false;
}

export function getPayrollIssueItems(row) {
  if (!row?.breakdown || !row?.entry) return [];
  const issues = [...(row.validationIssues ?? [])];
  if (row.breakdown.leaveDays > 0) issues.push(`请假 ${row.breakdown.leaveDays} 天`);
  if (row.breakdown.leaveHours > 0) issues.push(`请假 ${row.breakdown.leaveHours} 小时`);
  if (row.breakdown.specialAdjustment !== 0) issues.push(`特殊调整 ${formatCurrency(row.breakdown.specialAdjustment)}`);
  if (entryHasInput(row.entry) && !row.entry.auditPassed) issues.push("稽核未达标");
  return issues;
}

export function getPayrollCloseBlockers(row) {
  if (!row) return [];
  if (!row.employee?.salaryConfigured) return ["请先设置三项薪资"];
  if ((row.validationIssues ?? []).length > 0) return [...row.validationIssues];
  if (row.recordStatus === "closed") return [];
  if (!entryHasInput(row.entry)) {
    return [entryHasDraftChanges(row.entry) ? "已录入但还未确认完成" : "还未确认该员工本月数据"];
  }
  return [];
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
  if ((row.validationIssues ?? []).length > 0) return { tone: "danger", label: "输入有误", summary: row.validationIssues[0] };
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
      validationIssues: [],
      recordStatus: "closed",
    }));
  }
  const employees = getEmployeesForStore(workspace, store.id, month, options);
  return employees.map((employee) => {
    const entry = cloneDefaultEntry(monthlyStore.rows[employee.id]);
    const validationIssues = [
      ...validateEmployeeSalary(employee),
      ...validatePayrollEntry(entry, store.config),
    ];
    return {
      employee,
      entry,
      breakdown: calculatePayroll(employee, entry, store.config),
      validationIssues: [...new Set(validationIssues)],
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
