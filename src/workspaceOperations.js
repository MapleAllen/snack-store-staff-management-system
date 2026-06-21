import { createOpenMonthlyStoreRecord } from "./payrollData.js";
import { getAssignmentAtMonth, getMonthlyStoreRecord, previousMonth } from "./payrollLogic.js";

export function createStore(workspace, { sourceStoreId, name, id, at }) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("门店名称不能为空");
  if (workspace.stores.some((store) => store.name.trim() === trimmedName)) throw new Error("门店名称不能重复");
  const source = workspace.stores.find((store) => store.id === sourceStoreId);
  if (!source) throw new Error("找不到工资规则来源门店");
  return {
    ...workspace,
    stores: [...workspace.stores, {
      id, name: trimmedName, config: { ...source.config }, status: "active", createdAt: at, archivedAt: null,
    }],
  };
}

export function renameStore(workspace, { storeId, name }) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("门店名称不能为空");
  if (workspace.stores.some((store) => store.id !== storeId && store.name.trim() === trimmedName)) throw new Error("门店名称不能重复");
  return { ...workspace, stores: workspace.stores.map((store) => store.id === storeId ? { ...store, name: trimmedName } : store) };
}

export function archiveStore(workspace, { storeId, month, at }) {
  const activeStores = workspace.stores.filter((store) => store.status === "active");
  if (activeStores.length <= 1) throw new Error("至少需要保留一家营业门店");
  const activeEmployeeIds = new Set(workspace.employees.filter((employee) => !employee.isResigned).map((employee) => employee.id));
  const hasCurrentOrFutureAssignments = workspace.assignments.some((assignment) =>
    assignment.storeId === storeId && activeEmployeeIds.has(assignment.employeeId) && (!assignment.endMonth || assignment.endMonth >= month),
  );
  if (hasCurrentOrFutureAssignments) throw new Error("请先将本店在职员工调往其他门店或办理离职");
  return { ...workspace, stores: workspace.stores.map((store) => store.id === storeId ? { ...store, status: "archived", archivedAt: at } : store) };
}

export function restoreStore(workspace, storeId) {
  return { ...workspace, stores: workspace.stores.map((store) => store.id === storeId ? { ...store, status: "active", archivedAt: null } : store) };
}

export function transferEmployee(workspace, { employeeId, targetStoreId, effectiveMonth, currentMonth, at, assignmentId, note }) {
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
  assignments.push({ id: assignmentId, employeeId, storeId: targetStoreId, startMonth: effectiveMonth, endMonth: null, createdAt: at, note: note.trim() || "员工调店" });
  return { ...workspace, assignments, monthlyRecords };
}

export function closeStoreMonth(workspace, { storeId, month, rows, at, eventId, reason }) {
  if (rows.some((row) => !row.entry.isComplete)) throw new Error("仍有员工未确认录入");
  if (rows.some((row) => !row.employee.salaryConfigured)) throw new Error("仍有员工未设置薪资");
  if (rows.some((row) => (row.validationIssues ?? []).length > 0)) throw new Error("仍有无效工资数据");
  const monthBucket = workspace.monthlyRecords[month] ?? {};
  const storeBucket = createOpenMonthlyStoreRecord(monthBucket[storeId]);
  return {
    ...workspace,
    monthlyRecords: {
      ...workspace.monthlyRecords,
      [month]: {
        ...monthBucket,
        [storeId]: {
          ...storeBucket, status: "closed", closedAt: at, savedAt: at,
          snapshot: JSON.parse(JSON.stringify(rows)),
          closeHistory: [...storeBucket.closeHistory, { id: eventId, type: "closed", at, reason }],
        },
      },
    },
  };
}

export function unlockStoreMonth(workspace, { storeId, month, at, eventId, reason }) {
  if (!reason.trim()) throw new Error("请填写解锁原因");
  const monthBucket = workspace.monthlyRecords[month] ?? {};
  const storeBucket = createOpenMonthlyStoreRecord(monthBucket[storeId]);
  return {
    ...workspace,
    monthlyRecords: {
      ...workspace.monthlyRecords,
      [month]: {
        ...monthBucket,
        [storeId]: {
          ...storeBucket, status: "open", closedAt: null, snapshot: null,
          closeHistory: [...storeBucket.closeHistory, { id: eventId, type: "unlocked", at, reason: reason.trim() }],
        },
      },
    },
  };
}
