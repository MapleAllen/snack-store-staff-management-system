import {
  ASSIGNMENT_REASONS,
  createOpenMonthlyStoreRecord,
  EMPLOYEE_FIELDS,
  PAYOUT_METHODS,
  PAYOUT_ROW_STATUSES,
  PAYROLL_ADJUSTMENT_REASONS,
  PAYSLIP_DELIVERY_STATUSES,
} from "./payrollData.js";
import { clonePayrollFormulaMetadata, getAssignmentAtMonth, getMonthlyStoreRecord, previousMonth, validateStoreConfig } from "./payrollLogic.js";
import { appendOperationLog } from "./operationAudit.js";

const STORE_CONFIG_LABELS = Object.freeze({
  socialInsuranceBase: "社保补助基数",
  mealAllowanceBase: "饭补基数",
  auditPassedBonus: "稽核达标奖励",
  auditFallbackBonus: "稽核未达标保底",
  nightShiftRate: "夜班每小时补贴",
  leaveDaysDivisor: "请假天数除数",
  leaveHoursDivisor: "请假小时除数",
  monthDays: "每月计薪天数",
});

function assertIsoDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(`${value ?? ""}`)) throw new Error(`${label}格式无效`);
  return value;
}

function assertActiveEmployee(workspace, employeeId) {
  const employee = (workspace?.employees ?? []).find((item) => item.id === employeeId);
  if (!employee) throw new Error("未找到成员记录");
  return employee;
}

function getEmployeeName(workspace, employeeId) {
  return (workspace?.employees ?? []).find((employee) => employee.id === employeeId)?.name ?? "未知员工";
}

export function updateEmployeeProfile(workspace, { employeeId, name, phone, employeeNumber, role, hireDate, id, at }) {
  assertActiveEmployee(workspace, employeeId);
  const trimmedName = `${name ?? ""}`.trim();
  if (!trimmedName) throw new Error("员工姓名不能为空");
  if (trimmedName.length > 40) throw new Error("员工姓名过长");
  const trimmedPhone = `${phone ?? ""}`.trim();
  if (trimmedPhone && !/^1[3-9]\d{9}$/.test(trimmedPhone)) throw new Error("手机号格式无效");
  const trimmedNumber = `${employeeNumber ?? ""}`.trim();
  if (trimmedNumber && workspace.employees.some((item) => item.id !== employeeId && `${item.employeeNumber ?? ""}`.toLowerCase() === trimmedNumber.toLowerCase())) {
    throw new Error("员工工号不能重复");
  }
  const trimmedRole = `${role ?? ""}`.trim();
  if (trimmedRole.length > 20) throw new Error("岗位名称过长");
  const nextHireDate = /^\d{4}-\d{2}-\d{2}$/.test(`${hireDate ?? ""}`) ? hireDate : null;
  return appendOperationLog({
    ...workspace,
    employees: workspace.employees.map((item) => item.id === employeeId ? {
      ...item,
      name: trimmedName,
      phone: trimmedPhone,
      employeeNumber: trimmedNumber,
      role: trimmedRole,
      hireDate: nextHireDate,
    } : item),
  }, { id, type: "employee-profile-updated", employeeId, employeeName: trimmedName, at: at ?? null });
}

export function updateStoreConfig(workspace, { storeId, key, value, id, at }) {
  const store = (workspace?.stores ?? []).find((item) => item.id === storeId && item.status === "active");
  if (!store) throw new Error("当前门店已停用或不存在");
  if (!Object.hasOwn(STORE_CONFIG_LABELS, key)) throw new Error("不支持修改该门店规则");
  const numericValue = Number(value);
  const nextConfig = { ...store.config, [key]: numericValue };
  const [issue] = validateStoreConfig(nextConfig);
  if (issue) throw new Error(issue.message);
  if (Number(store.config[key]) === numericValue) return workspace;
  return appendOperationLog({
    ...workspace,
    stores: workspace.stores.map((item) => item.id === storeId ? { ...item, config: nextConfig } : item),
    ruleHistory: [{ id, storeId, key, label: STORE_CONFIG_LABELS[key], previousValue: store.config[key], newValue: numericValue, at }, ...(workspace.ruleHistory ?? [])],
  }, { id, type: "rule-updated", storeId, key, at });
}

export function recordSalaryAdjustment(workspace, { employeeId, storeId, values, date, reason, id }) {
  const employee = assertActiveEmployee(workspace, employeeId);
  const store = (workspace?.stores ?? []).find((item) => item.id === storeId && item.status === "active");
  if (!store) throw new Error("当前门店已停用或不存在");
  assertIsoDate(date, "调整日期");
  if (!PAYROLL_ADJUSTMENT_REASONS.includes(reason)) throw new Error("请选择规范的调薪原因");
  const nextValues = Object.fromEntries(EMPLOYEE_FIELDS.map((field) => [field.key, Number(values?.[field.key]) ]));
  if (EMPLOYEE_FIELDS.some((field) => !Number.isFinite(nextValues[field.key]))) throw new Error("调薪后的数值无效");
  if (nextValues.baseSalary <= 0) throw new Error("基础工资必须大于 0");
  if (nextValues.overtimeRate < 0 || nextValues.attendanceBonus < 0) throw new Error("加班时薪和全勤奖金不能小于 0");
  const changes = EMPLOYEE_FIELDS
    .filter((field) => nextValues[field.key] !== Number(employee[field.key]))
    .map((field) => ({ key: field.key, label: field.label, previousValue: employee[field.key], newValue: nextValues[field.key] }));
  if (changes.length === 0 && employee.salaryConfigured) throw new Error("没有检测到薪资变化");
  const wasConfigured = employee.salaryConfigured;
  return appendOperationLog({
    ...workspace,
    employees: workspace.employees.map((item) => item.id === employeeId ? { ...item, ...nextValues, salaryConfigured: true } : item),
    adjustments: [{
      id,
      employeeId,
      employeeName: employee.name,
      storeId,
      item: "salaryComponents",
      itemLabel: wasConfigured ? "薪资组件" : "初始薪资",
      previousValue: changes.map((change) => `${change.label} ${change.previousValue}`).join(" / "),
      newValue: changes.map((change) => `${change.label} ${change.newValue}`).join(" / "),
      changes,
      date,
      reason,
    }, ...(workspace.adjustments ?? [])],
  }, { id, type: "salary-adjusted", storeId, employeeId, employeeName: employee.name, at: date });
}

export function resignEmployee(workspace, { employeeId, resignationDate, eventId }) {
  const employee = assertActiveEmployee(workspace, employeeId);
  assertIsoDate(resignationDate, "离职日期");
  return appendOperationLog({
    ...workspace,
    employees: workspace.employees.map((item) => item.id === employeeId ? { ...item, isResigned: true, resignationDate } : item),
  }, { id: eventId, type: "employee-resigned", employeeId, employeeName: employee.name, businessDate: resignationDate, at: resignationDate });
}

export function restoreEmployee(workspace, { employeeId, eventId, at }) {
  const employee = assertActiveEmployee(workspace, employeeId);
  return appendOperationLog({
    ...workspace,
    employees: workspace.employees.map((item) => item.id === employeeId ? { ...item, isResigned: false, resignationDate: null } : item),
  }, { id: eventId, type: "employee-restored", employeeId, employeeName: employee.name, at: at ?? null });
}

export function createStore(workspace, { sourceStoreId, name, id, at }) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("门店名称不能为空");
  if (workspace.stores.some((store) => store.name.trim() === trimmedName)) throw new Error("门店名称不能重复");
  const source = workspace.stores.find((store) => store.id === sourceStoreId);
  if (!source) throw new Error("找不到工资规则来源门店");
  return appendOperationLog({
    ...workspace,
    stores: [...workspace.stores, {
      id, name: trimmedName, config: { ...source.config }, status: "active", createdAt: at, archivedAt: null,
    }],
  }, { id: `store-created-${id}`, type: "store-created", storeId: id, at });
}

export function renameStore(workspace, { storeId, name, eventId, at }) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("门店名称不能为空");
  if (workspace.stores.some((store) => store.id !== storeId && store.name.trim() === trimmedName)) throw new Error("门店名称不能重复");
  return appendOperationLog({ ...workspace, stores: workspace.stores.map((store) => store.id === storeId ? { ...store, name: trimmedName } : store) }, {
    id: eventId ?? `store-renamed-${storeId}-${at ?? ""}`,
    type: "store-renamed",
    storeId,
    at: at ?? null,
  });
}

export function archiveStore(workspace, { storeId, month, at }) {
  const activeStores = workspace.stores.filter((store) => store.status === "active");
  if (activeStores.length <= 1) throw new Error("至少需要保留一家营业门店");
  const activeEmployeeIds = new Set(workspace.employees.filter((employee) => !employee.isResigned).map((employee) => employee.id));
  const hasCurrentOrFutureAssignments = workspace.assignments.some((assignment) =>
    assignment.storeId === storeId && activeEmployeeIds.has(assignment.employeeId) && (!assignment.endMonth || assignment.endMonth >= month),
  );
  if (hasCurrentOrFutureAssignments) throw new Error("请先将本店在职员工调往其他门店或办理离职");
  return appendOperationLog({ ...workspace, stores: workspace.stores.map((store) => store.id === storeId ? { ...store, status: "archived", archivedAt: at } : store) }, {
    id: `store-archived-${storeId}-${at}`,
    type: "store-archived",
    storeId,
    at,
  });
}

export function restoreStore(workspace, options) {
  const { storeId, eventId, at } = typeof options === "string" ? { storeId: options } : options ?? {};
  const store = (workspace?.stores ?? []).find((item) => item.id === storeId);
  if (!store) throw new Error("未找到门店记录");
  return appendOperationLog({ ...workspace, stores: workspace.stores.map((item) => item.id === storeId ? { ...item, status: "active", archivedAt: null } : item) }, {
    id: eventId ?? `store-restored-${storeId}-${at ?? ""}`,
    type: "store-restored",
    storeId,
    at: at ?? null,
  });
}

export function transferEmployee(workspace, { employeeId, targetStoreId, effectiveMonth, currentMonth, at, assignmentId, reason }) {
  if (effectiveMonth < currentMonth) throw new Error("调店月份不能早于当前月份");
  const targetStore = workspace.stores.find((store) => store.id === targetStoreId && store.status === "active");
  const sourceAssignment = getAssignmentAtMonth(workspace, employeeId, effectiveMonth);
  if (!targetStore || !sourceAssignment || sourceAssignment.storeId === targetStoreId) throw new Error("请选择有效的目标门店");
  if (workspace.assignments.some((assignment) => assignment.employeeId === employeeId && assignment.startMonth > currentMonth)) throw new Error("该员工已有计划调店记录");

  const monthsToMove = Object.keys(workspace.monthlyRecords).filter((month) => month >= effectiveMonth);
  for (const month of monthsToMove) {
    const sourceRecord = getMonthlyStoreRecord(workspace, month, sourceAssignment.storeId);
    const targetRecord = getMonthlyStoreRecord(workspace, month, targetStoreId);
    if (sourceRecord.status === "closed" || targetRecord.status === "closed") throw new Error(`${month} 已月结，不能执行该调店计划`);
    if (sourceRecord.rows[employeeId] && targetRecord.rows[employeeId]) throw new Error(`${month} 目标门店已有该员工数据`);
  }

  const monthlyRecords = { ...workspace.monthlyRecords };
  monthsToMove.forEach((month) => {
    const monthBucket = { ...(monthlyRecords[month] ?? {}) };
    const sourceRecord = createOpenMonthlyStoreRecord(monthBucket[sourceAssignment.storeId]);
    const targetRecord = createOpenMonthlyStoreRecord(monthBucket[targetStoreId]);
    const row = sourceRecord.rows[employeeId];
    if (!row) return;
    const nextSourceRows = { ...sourceRecord.rows };
    delete nextSourceRows[employeeId];
    monthBucket[sourceAssignment.storeId] = { ...sourceRecord, rows: nextSourceRows };
    monthBucket[targetStoreId] = { ...targetRecord, rows: { ...targetRecord.rows, [employeeId]: row } };
    monthlyRecords[month] = monthBucket;
  });

  const assignments = workspace.assignments
    .filter((assignment) => !(assignment.id === sourceAssignment.id && assignment.startMonth === effectiveMonth))
    .map((assignment) => assignment.id === sourceAssignment.id ? { ...assignment, endMonth: previousMonth(effectiveMonth) } : assignment);
  const assignmentReason = ASSIGNMENT_REASONS.includes(reason) ? reason : "排班平衡";
  assignments.push({ id: assignmentId, employeeId, storeId: targetStoreId, startMonth: effectiveMonth, endMonth: null, createdAt: at, reason: assignmentReason });
  return appendOperationLog({ ...workspace, assignments, monthlyRecords }, {
    id: assignmentId, type: "employee-transferred", employeeId, employeeName: getEmployeeName(workspace, employeeId), storeId: targetStoreId, month: effectiveMonth, at,
  });
}

export function closeStoreMonth(workspace, { storeId, month, rows, at, eventId, reason }) {
  if (rows.some((row) => !row.entry.isComplete)) throw new Error("仍有员工未确认录入");
  if (rows.some((row) => !row.employee.salaryConfigured)) throw new Error("仍有员工未设置薪资");
  if (rows.some((row) => (row.validationIssues ?? []).length > 0)) throw new Error("仍有无效工资数据");
  const monthBucket = workspace.monthlyRecords[month] ?? {};
  const storeBucket = createOpenMonthlyStoreRecord(monthBucket[storeId]);
  const snapshot = rows.map((row) => ({
    ...row,
    formulaMetadata: row.formulaMetadata ? clonePayrollFormulaMetadata(row.formulaMetadata) : clonePayrollFormulaMetadata(),
  }));
  return appendOperationLog({
    ...workspace,
    monthlyRecords: {
      ...workspace.monthlyRecords,
      [month]: {
        ...monthBucket,
        [storeId]: {
          ...storeBucket, status: "closed", closedAt: at, savedAt: at,
          snapshot: JSON.parse(JSON.stringify(snapshot)),
          closeHistory: [...storeBucket.closeHistory, { id: eventId, type: "closed", at, reason }],
        },
      },
    },
  }, { id: eventId, type: "payroll-closed", storeId, month, at });
}

export function unlockStoreMonth(workspace, { storeId, month, at, eventId, reason }) {
  if (!reason.trim()) throw new Error("请填写解锁原因");
  const monthBucket = workspace.monthlyRecords[month] ?? {};
  const storeBucket = createOpenMonthlyStoreRecord(monthBucket[storeId]);
  if (Object.values(storeBucket.payout?.rows ?? {}).some((row) => row.paymentStatus === "paid")) {
    throw new Error("已有员工记录为已支付，不能直接解锁；请先完成线下冲正并保留审计凭证");
  }
  return appendOperationLog({
    ...workspace,
    monthlyRecords: {
      ...workspace.monthlyRecords,
      [month]: {
        ...monthBucket,
        [storeId]: {
          ...storeBucket, status: "open", closedAt: null, snapshot: null, payout: null,
          closeHistory: [...storeBucket.closeHistory, { id: eventId, type: "unlocked", at, reason: reason.trim() }],
        },
      },
    },
  }, { id: eventId, type: "payroll-unlocked", storeId, month, at });
}

export function createPayoutBatch(workspace, { storeId, month, plannedPayDate, method, reference, at, eventId }) {
  assertIsoDate(plannedPayDate, "计划发薪日期");
  if (!PAYOUT_METHODS.includes(method)) throw new Error("发薪方式无效");
  const monthBucket = workspace.monthlyRecords[month] ?? {};
  const storeBucket = createOpenMonthlyStoreRecord(monthBucket[storeId]);
  if (storeBucket.status !== "closed" || !Array.isArray(storeBucket.snapshot) || storeBucket.snapshot.length === 0) {
    throw new Error("请先完成门店月结再创建发薪批次");
  }
  if (storeBucket.payout) throw new Error("本月发薪批次已存在");
  const rows = Object.fromEntries(storeBucket.snapshot.map((row) => [row.employee.id, {
    paymentStatus: "pending",
    paymentUpdatedAt: null,
    payslipStatus: "not-delivered",
    payslipUpdatedAt: null,
  }]));
  const payout = {
    id: eventId,
    status: "pending",
    plannedPayDate,
    method,
    reference: `${reference ?? ""}`.trim().slice(0, 80),
    createdAt: at,
    completedAt: null,
    rows,
  };
  return appendOperationLog({
    ...workspace,
    monthlyRecords: {
      ...workspace.monthlyRecords,
      [month]: { ...monthBucket, [storeId]: { ...storeBucket, payout, savedAt: at } },
    },
  }, { id: eventId, type: "payout-created", storeId, month, at });
}

export function updatePayoutRow(workspace, { storeId, month, employeeId, paymentStatus, payslipStatus, at, eventId }) {
  if (!PAYOUT_ROW_STATUSES.includes(paymentStatus)) throw new Error("支付状态无效");
  if (!PAYSLIP_DELIVERY_STATUSES.includes(payslipStatus)) throw new Error("工资单交付状态无效");
  const monthBucket = workspace.monthlyRecords[month] ?? {};
  const storeBucket = createOpenMonthlyStoreRecord(monthBucket[storeId]);
  if (storeBucket.status !== "closed" || !storeBucket.payout) throw new Error("未找到可更新的发薪批次");
  if (!storeBucket.payout.rows[employeeId]) throw new Error("员工不在本次冻结工资名单中");
  const previous = storeBucket.payout.rows[employeeId];
  const nextRows = {
    ...storeBucket.payout.rows,
    [employeeId]: {
      paymentStatus,
      paymentUpdatedAt: paymentStatus === previous.paymentStatus ? previous.paymentUpdatedAt : at,
      payslipStatus,
      payslipUpdatedAt: payslipStatus === previous.payslipStatus ? previous.payslipUpdatedAt : at,
    },
  };
  const rowValues = Object.values(nextRows);
  const allPaid = rowValues.length > 0 && rowValues.every((row) => row.paymentStatus === "paid");
  const hasProgress = rowValues.some((row) => row.paymentStatus !== "pending" || row.payslipStatus !== "not-delivered");
  const payout = {
    ...storeBucket.payout,
    rows: nextRows,
    status: allPaid ? "paid" : hasProgress ? "in-progress" : "pending",
    completedAt: allPaid ? at : null,
  };
  return appendOperationLog({
    ...workspace,
    monthlyRecords: {
      ...workspace.monthlyRecords,
      [month]: { ...monthBucket, [storeId]: { ...storeBucket, payout, savedAt: at } },
    },
  }, { id: eventId, type: "payout-row-updated", storeId, employeeId, month, at });
}
