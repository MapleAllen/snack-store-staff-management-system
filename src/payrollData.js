import { OPERATION_TYPES } from "./operationAudit.js";

export const WORKSPACE_VERSION = 28;
export const INITIAL_ASSIGNMENT_MONTH = "2000-01";

export const ATTENDANCE_REASONS = ["排班调整", "门店经营安排", "系统更正", "其他标准原因"];
export const ASSIGNMENT_REASONS = ["初始门店分配", "新增岗位成员", "门店经营调配", "新店筹备支援", "排班平衡", "常规门店分配"];
export const PAYROLL_ADJUSTMENT_REASONS = ["初始薪资设置", "薪资结构调整", "岗位职责调整", "门店经营安排", "其他标准调整"];
export const PAYROLL_UNLOCK_REASONS = ["考勤录入更正", "薪资调整记录更正", "月结核对差异", "其他标准核对"];
export const MONTHLY_PAYROLL_ADJUSTMENT_REASONS = ["门店经营奖励", "门店经营扣款", "费用报销", "系统核对修正"];
export const PAYOUT_METHODS = ["银行转账", "现金发放", "其他线下方式"];
export const PAYOUT_ROW_STATUSES = ["pending", "paid", "failed"];
export const PAYSLIP_DELIVERY_STATUSES = ["not-delivered", "delivered", "acknowledged"];

export const DEFAULT_STORE_CONFIG = {
  socialInsuranceBase: 800,
  mealAllowanceBase: 200,
  auditPassedBonus: 200,
  auditFallbackBonus: 100,
  nightShiftRate: 0,
  leaveDaysDivisor: 30,
  leaveHoursDivisor: 270,
  monthDays: 30,
};

export const STORE_TEMPLATES = [
  {
    id: "demo-store-1",
    legacyIds: ["erz"],
    name: "示例一店",
    config: { ...DEFAULT_STORE_CONFIG, auditPassedBonus: 260 },
    employees: [
      { id: "demo-1-employee-1", name: "成员代号 A1", baseSalary: 3200, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-1-employee-2", name: "成员代号 A2", baseSalary: 2800, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-1-employee-3", name: "成员代号 A3", baseSalary: 2400, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-1-employee-4", name: "成员代号 A4", baseSalary: 2200, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-1-employee-5", name: "成员代号 A5", baseSalary: 2000, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-1-employee-6", name: "成员代号 A6", baseSalary: 2600, overtimeRate: 15, attendanceBonus: 200 },
    ],
  },
  {
    id: "demo-store-2",
    legacyIds: ["gcb"],
    name: "示例二店",
    config: { ...DEFAULT_STORE_CONFIG, nightShiftRate: 10 },
    employees: [
      { id: "demo-2-employee-1", name: "成员代号 B1", baseSalary: 3000, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-2-employee-2", name: "成员代号 B2", baseSalary: 2800, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-2-employee-3", name: "成员代号 B3", baseSalary: 2600, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-2-employee-4", name: "成员代号 B4", baseSalary: 2400, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-2-employee-5", name: "成员代号 B5", baseSalary: 2200, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-2-employee-6", name: "成员代号 B6", baseSalary: 2000, overtimeRate: 15, attendanceBonus: 200 },
    ],
  },
  {
    id: "demo-store-3",
    legacyIds: ["hns"],
    name: "示例三店",
    config: { ...DEFAULT_STORE_CONFIG },
    employees: [
      { id: "demo-3-employee-1", name: "成员代号 C1", baseSalary: 3200, overtimeRate: 16, attendanceBonus: 200 },
      { id: "demo-3-employee-2", name: "成员代号 C2", baseSalary: 2800, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-3-employee-3", name: "成员代号 C3", baseSalary: 2400, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-3-employee-4", name: "成员代号 C4", baseSalary: 2000, overtimeRate: 15, attendanceBonus: 200 },
    ],
  },
  {
    id: "demo-store-4",
    legacyIds: ["jdz-ch"],
    name: "示例四店",
    config: { ...DEFAULT_STORE_CONFIG },
    employees: [],
  },
];

export function defaultMonthlyEntry() {
  return {
    overtimeHours: "",
    leaveDays: "",
    leaveHours: "",
    nightShiftHours: "",
    auditPassed: false,
    specialAdjustment: "",
    attendanceReason: "",
    isComplete: false,
    completedAt: null,
  };
}

export function createOpenMonthlyStoreRecord(record = {}) {
  return {
    rows: Object.fromEntries(Object.entries(record.rows ?? {}).map(([employeeId, entry]) => [employeeId, normalizeMonthlyEntry(entry)])),
    savedAt: record.savedAt ?? null,
    status: record.status === "closed" ? "closed" : "open",
    closedAt: record.closedAt ?? null,
    snapshot: Array.isArray(record.snapshot) ? record.snapshot : null,
    closeHistory: Array.isArray(record.closeHistory) ? record.closeHistory : [],
    payout: normalizePayoutRecord(record.payout),
  };
}

function normalizePayoutRecord(payout) {
  if (!payout || typeof payout !== "object") return null;
  const rows = Object.fromEntries(Object.entries(payout.rows ?? {}).map(([employeeId, row]) => [employeeId, {
    paymentStatus: PAYOUT_ROW_STATUSES.includes(row?.paymentStatus) ? row.paymentStatus : "pending",
    paymentUpdatedAt: row?.paymentUpdatedAt ?? null,
    payslipStatus: PAYSLIP_DELIVERY_STATUSES.includes(row?.payslipStatus) ? row.payslipStatus : "not-delivered",
    payslipUpdatedAt: row?.payslipUpdatedAt ?? null,
  }]));
  const rowValues = Object.values(rows);
  const allPaid = rowValues.length > 0 && rowValues.every((row) => row.paymentStatus === "paid");
  const hasProgress = rowValues.some((row) => row.paymentStatus !== "pending" || row.payslipStatus !== "not-delivered");
  return {
    id: `${payout.id ?? ""}`.trim() || null,
    status: allPaid ? "paid" : hasProgress ? "in-progress" : "pending",
    plannedPayDate: /^\d{4}-\d{2}-\d{2}$/.test(`${payout.plannedPayDate ?? ""}`) ? payout.plannedPayDate : null,
    method: PAYOUT_METHODS.includes(payout.method) ? payout.method : PAYOUT_METHODS[0],
    reference: `${payout.reference ?? ""}`.trim().slice(0, 80),
    createdAt: payout.createdAt ?? null,
    completedAt: allPaid ? payout.completedAt ?? null : null,
    rows,
  };
}

function makeInitialStore(template) {
  return {
    id: template.id,
    name: template.name,
    config: { ...DEFAULT_STORE_CONFIG, ...template.config },
    status: "active",
    createdAt: null,
    archivedAt: null,
  };
}

function makeInitialAssignment(employeeId, storeId) {
  return {
    id: `assignment-${employeeId}-initial`,
    employeeId,
    storeId,
    startMonth: INITIAL_ASSIGNMENT_MONTH,
    endMonth: null,
    createdAt: null,
    reason: "初始门店分配",
  };
}

export function createInitialWorkspace() {
  const stores = STORE_TEMPLATES.map(makeInitialStore);
  const employees = STORE_TEMPLATES.flatMap((store) =>
    store.employees.map((employee) => ({ ...employee, salaryConfigured: true })),
  );
  const assignments = STORE_TEMPLATES.flatMap((store) =>
    store.employees.map((employee) => makeInitialAssignment(employee.id, store.id)),
  );

  return {
    version: WORKSPACE_VERSION,
    stores,
    employees,
    assignments,
    adjustments: [],
    ruleHistory: [],
    operationLog: [],
    monthlyRecords: {},
  };
}

export function createAnonymousMemberCode(sequence) {
  return `成员代号-${String(sequence).padStart(3, "0")}`;
}

function normalizeEmployee(employee, index) {
  return {
    id: employee?.id,
    name: createAnonymousMemberCode(index + 1),
    baseSalary: Number(employee?.baseSalary) || 0,
    overtimeRate: Number(employee?.overtimeRate) || 0,
    attendanceBonus: Number(employee?.attendanceBonus) || 0,
    salaryConfigured: employee.salaryConfigured !== false,
    isResigned: Boolean(employee?.isResigned),
    resignationDate: employee?.resignationDate ?? null,
  };
}

function normalizeStore(store) {
  return {
    id: store.id,
    name: store.name,
    config: { ...DEFAULT_STORE_CONFIG, ...(store.config ?? {}) },
    status: store.status === "archived" ? "archived" : "active",
    createdAt: store.createdAt ?? null,
    archivedAt: store.archivedAt ?? null,
  };
}

function normalizeMonthlyEntry(entry) {
  const { note: _legacyNote, ...safeEntry } = entry ?? {};
  return {
    ...defaultMonthlyEntry(),
    ...safeEntry,
    attendanceReason: ATTENDANCE_REASONS.includes(safeEntry.attendanceReason) ? safeEntry.attendanceReason : "",
    payrollAdjustments: Array.isArray(safeEntry.payrollAdjustments)
      ? safeEntry.payrollAdjustments.map((adjustment) => ({
          ...adjustment,
          reason: MONTHLY_PAYROLL_ADJUSTMENT_REASONS.includes(adjustment?.reason) ? adjustment.reason : "系统核对修正",
        }))
      : [],
  };
}

function normalizeAssignment(assignment) {
  const { note: _legacyNote, ...safeAssignment } = assignment ?? {};
  return {
    ...safeAssignment,
    reason: ASSIGNMENT_REASONS.includes(safeAssignment.reason) ? safeAssignment.reason : "常规门店分配",
  };
}

function normalizeAdjustment(adjustment, memberCodes) {
  const { notes: _legacyNotes, ...safeAdjustment } = adjustment ?? {};
  return {
    ...safeAdjustment,
    employeeName: memberCodes.get(safeAdjustment.employeeId) ?? "成员代号",
    reason: PAYROLL_ADJUSTMENT_REASONS.includes(safeAdjustment.reason) ? safeAdjustment.reason : "薪资结构调整",
  };
}

function normalizeOperationLog(log, memberCodes = new Map()) {
  return (Array.isArray(log) ? log : []).flatMap((event) => {
    if (!OPERATION_TYPES.has(event?.type)) return [];
    return [{
      id: `${event?.id ?? ""}`.trim() || null,
      type: event.type,
      storeId: `${event?.storeId ?? ""}`.trim() || null,
      employeeId: `${event?.employeeId ?? ""}`.trim() || null,
      memberCode: event?.employeeId ? (memberCodes.get(event.employeeId) ?? "成员代号") : null,
      month: /^\d{4}-\d{2}$/.test(`${event?.month ?? ""}`) ? event.month : null,
      businessDate: /^\d{4}-\d{2}-\d{2}$/.test(`${event?.businessDate ?? ""}`) ? event.businessDate : null,
      key: `${event?.key ?? ""}`.trim() || null,
      at: event?.at ?? null,
    }];
  }).sort((left, right) => `${right.at ?? ""}`.localeCompare(`${left.at ?? ""}`));
}

function normalizeCloseHistory(history) {
  return (Array.isArray(history) ? history : []).map((event) => {
    const allowedReasons = event?.type === "unlocked" ? PAYROLL_UNLOCK_REASONS : ["工资核对完成", "异常确认后月结"];
    return {
      id: event?.id,
      type: event?.type === "unlocked" ? "unlocked" : "closed",
      at: event?.at ?? null,
      reason: allowedReasons.includes(event?.reason) ? event.reason : allowedReasons[0],
    };
  });
}

function normalizeMonthlyRecords(monthlyRecords = {}, memberCodes = new Map()) {
  return Object.fromEntries(
    Object.entries(monthlyRecords).map(([month, stores]) => [
      month,
      Object.fromEntries(
        Object.entries(stores ?? {}).map(([storeId, record]) => {
          const normalized = createOpenMonthlyStoreRecord(record);
          const snapshot = Array.isArray(normalized.snapshot) ? normalized.snapshot.map((row) => ({
            ...row,
            entry: normalizeMonthlyEntry(row.entry),
            employee: {
              id: row.employee?.id,
              name: memberCodes.get(row.employee?.id) ?? "成员代号",
              baseSalary: Number(row.employee?.baseSalary) || 0,
              overtimeRate: Number(row.employee?.overtimeRate) || 0,
              attendanceBonus: Number(row.employee?.attendanceBonus) || 0,
              salaryConfigured: row.employee?.salaryConfigured !== false,
              isResigned: Boolean(row.employee?.isResigned),
              resignationDate: row.employee?.resignationDate ?? null,
            },
          })) : null;
          return [storeId, { ...normalized, snapshot, closeHistory: normalizeCloseHistory(normalized.closeHistory) }];
        }),
      ),
    ]),
  );
}

function normalizeInventoryItem(item) {
  const stockQty = Number(item?.stockQty);
  const minStock = Number(item?.minStock);
  const purchasePrice = Number(item?.purchasePrice);
  const retailPrice = Number(item?.retailPrice);
  return {
    id: item?.id,
    storeId: item?.storeId,
    sku: `${item?.sku ?? ""}`.trim(),
    name: `${item?.name ?? ""}`.trim(),
    category: `${item?.category ?? "其他"}`.trim() || "其他",
    unit: `${item?.unit ?? "件"}`.trim() || "件",
    stockQty: Number.isFinite(stockQty) && stockQty >= 0 ? stockQty : 0,
    minStock: Number.isFinite(minStock) && minStock >= 0 ? minStock : 0,
    purchasePrice: Number.isFinite(purchasePrice) && purchasePrice >= 0 ? purchasePrice : 0,
    retailPrice: Number.isFinite(retailPrice) && retailPrice >= 0 ? retailPrice : 0,
    expiresOn: item?.expiresOn || null,
    status: item?.status === "archived" ? "archived" : "active",
    createdAt: item?.createdAt ?? null,
    updatedAt: item?.updatedAt ?? null,
  };
}

function normalizeInventoryMovement(movement) {
  const quantity = Number(movement?.quantity);
  const beforeQty = Number(movement?.beforeQty);
  const afterQty = Number(movement?.afterQty);
  const amount = Number(movement?.amount);
  const type = ["inbound", "sale", "return", "supplierReturn", "transferOut", "transferIn", "waste", "count"].includes(movement?.type) ? movement.type : "count";
  const stocktakeId = movement?.stocktakeId ?? null;
  const rawNote = `${movement?.note ?? ""}`.trim();
  const inboundReasons = ["期初补录", "盘点外增补", "供应商赠品入库", "其他经营入库"];
  const wasteReasons = ["临期报损", "过期报损", "包装破损", "其他经营损耗"];
  const note = type === "inbound"
    ? (inboundReasons.includes(rawNote) ? rawNote : "历史手工入库")
    : type === "waste"
      ? (wasteReasons.includes(rawNote) ? rawNote : "历史报损")
      : type === "count" && !stocktakeId ? "历史盘点校正" : rawNote;
  return {
    id: movement?.id,
    storeId: movement?.storeId,
    itemId: movement?.itemId,
    type,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    beforeQty: Number.isFinite(beforeQty) ? beforeQty : 0,
    afterQty: Number.isFinite(afterQty) ? afterQty : 0,
    amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
    businessDate: /^\d{4}-\d{2}-\d{2}$/.test(`${movement?.businessDate ?? ""}`) ? movement.businessDate : null,
    receiptId: movement?.receiptId ?? null,
    purchaseReceiptId: movement?.purchaseReceiptId ?? null,
    stocktakeId,
    batchAllocations: Array.isArray(movement?.batchAllocations) ? movement.batchAllocations.map((allocation) => ({
      batchId: allocation?.batchId,
      quantity: Number.isFinite(Number(allocation?.quantity)) && Number(allocation.quantity) > 0 ? Number(allocation.quantity) : 0,
    })).filter((allocation) => allocation.batchId && allocation.quantity > 0) : [],
    note,
    at: movement?.at ?? null,
  };
}

function normalizeInventoryBatch(batch) {
  const initialQty = Number(batch?.initialQty);
  const remainingQty = Number(batch?.remainingQty);
  const unitCost = Number(batch?.unitCost);
  return {
    id: batch?.id,
    storeId: batch?.storeId,
    itemId: batch?.itemId,
    batchCode: `${batch?.batchCode ?? ""}`.trim(),
    expiresOn: batch?.expiresOn || null,
    receivedAt: batch?.receivedAt ?? null,
    initialQty: Number.isFinite(initialQty) && initialQty >= 0 ? initialQty : 0,
    remainingQty: Number.isFinite(remainingQty) && remainingQty >= 0 ? remainingQty : 0,
    unitCost: Number.isFinite(unitCost) && unitCost >= 0 ? unitCost : 0,
    source: ["opening", "purchase", "manual", "transfer"].includes(batch?.source) ? batch.source : "manual",
    purchaseReceiptId: batch?.purchaseReceiptId ?? null,
    createdAt: batch?.createdAt ?? null,
    updatedAt: batch?.updatedAt ?? null,
  };
}

function normalizeInventoryTransfer(transfer) {
  const quantity = Number(transfer?.quantity);
  return {
    id: transfer?.id,
    sourceStoreId: transfer?.sourceStoreId,
    targetStoreId: transfer?.targetStoreId,
    itemId: transfer?.itemId,
    targetItemId: transfer?.targetItemId,
    sku: `${transfer?.sku ?? ""}`.trim(),
    productName: `${transfer?.productName ?? "商品"}`.trim() || "商品",
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 0,
    unit: `${transfer?.unit ?? "件"}`.trim() || "件",
    allocations: Array.isArray(transfer?.allocations) ? transfer.allocations.map((allocation) => ({
      sourceBatchId: allocation?.sourceBatchId,
      targetBatchId: allocation?.targetBatchId,
      quantity: Number.isFinite(Number(allocation?.quantity)) && Number(allocation.quantity) > 0 ? Number(allocation.quantity) : 0,
      batchCode: `${allocation?.batchCode ?? ""}`.trim(),
      expiresOn: allocation?.expiresOn || null,
    })).filter((allocation) => allocation.sourceBatchId && allocation.targetBatchId && allocation.quantity > 0) : [],
    businessDate: /^\d{4}-\d{2}-\d{2}$/.test(`${transfer?.businessDate ?? ""}`) ? transfer.businessDate : null,
    transferredAt: transfer?.transferredAt ?? null,
  };
}

function createLegacyInventoryBatches(items) {
  return items.filter((item) => item.stockQty > 0).map((item) => ({
    id: `legacy-batch-${item.id}`,
    storeId: item.storeId,
    itemId: item.id,
    batchCode: "期初库存",
    expiresOn: item.expiresOn || null,
    receivedAt: item.createdAt ?? null,
    initialQty: item.stockQty,
    remainingQty: item.stockQty,
    unitCost: item.purchasePrice,
    source: "opening",
    purchaseReceiptId: null,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
  }));
}

function normalizeSalesReceipt(receipt) {
  const totalAmount = Number(receipt?.totalAmount);
  return {
    id: receipt?.id,
    storeId: receipt?.storeId,
    businessDate: receipt?.businessDate ?? null,
    paymentMethod: ["cash", "mobile", "other"].includes(receipt?.paymentMethod) ? receipt.paymentMethod : "other",
    lines: Array.isArray(receipt?.lines) ? receipt.lines.map((line) => ({
      itemId: line?.itemId,
      batchId: line?.batchId ?? null,
      batchCode: `${line?.batchCode ?? ""}`.trim(),
      expiresOn: line?.expiresOn || null,
      batchAllocations: Array.isArray(line?.batchAllocations) ? line.batchAllocations.map((allocation) => ({
        batchId: allocation?.batchId,
        quantity: Number.isFinite(Number(allocation?.quantity)) && Number(allocation.quantity) > 0 ? Number(allocation.quantity) : 0,
      })).filter((allocation) => allocation.batchId && allocation.quantity > 0) : [],
      sku: `${line?.sku ?? ""}`.trim(),
      productName: `${line?.productName ?? "商品"}`.trim() || "商品",
      quantity: Number.isFinite(Number(line?.quantity)) && Number(line.quantity) > 0 ? Number(line.quantity) : 0,
      unitPrice: Number.isFinite(Number(line?.unitPrice)) && Number(line.unitPrice) >= 0 ? Number(line.unitPrice) : 0,
      amount: Number.isFinite(Number(line?.amount)) && Number(line.amount) >= 0 ? Number(line.amount) : 0,
      unit: `${line?.unit ?? "件"}`.trim() || "件",
    })) : [],
    totalAmount: Number.isFinite(totalAmount) && totalAmount >= 0 ? totalAmount : 0,
    status: ["refunded", "partialRefunded"].includes(receipt?.status) ? receipt.status : "active",
    refundedAt: receipt?.refundedAt ?? null,
    refundReason: `${receipt?.refundReason ?? ""}`.trim(),
    createdAt: receipt?.createdAt ?? null,
  };
}

function normalizeSalesRefund(record) {
  const totalAmount = Number(record?.totalAmount);
  return {
    id: record?.id,
    storeId: record?.storeId,
    receiptId: record?.receiptId ?? null,
    businessDate: record?.businessDate ?? null,
    reason: `${record?.reason ?? ""}`.trim(),
    lines: Array.isArray(record?.lines) ? record.lines.map((line) => ({
      itemId: line?.itemId,
      sku: `${line?.sku ?? ""}`.trim(),
      productName: `${line?.productName ?? "商品"}`.trim() || "商品",
      quantity: Number.isFinite(Number(line?.quantity)) && Number(line.quantity) > 0 ? Number(line.quantity) : 0,
      unitPrice: Number.isFinite(Number(line?.unitPrice)) && Number(line.unitPrice) >= 0 ? Number(line.unitPrice) : 0,
      amount: Number.isFinite(Number(line?.amount)) && Number(line.amount) >= 0 ? Number(line.amount) : 0,
      unit: `${line?.unit ?? "件"}`.trim() || "件",
      batchAllocations: Array.isArray(line?.batchAllocations) ? line.batchAllocations.map((allocation) => ({
        batchId: allocation?.batchId,
        quantity: Number.isFinite(Number(allocation?.quantity)) && Number(allocation.quantity) > 0 ? Number(allocation.quantity) : 0,
      })).filter((allocation) => allocation.batchId && allocation.quantity > 0) : [],
    })) : [],
    totalAmount: Number.isFinite(totalAmount) && totalAmount >= 0 ? totalAmount : 0,
    // Earlier versions only supported paid purchases, so their returns are cash refunds.
    cashRefunded: record?.cashRefunded !== false,
    createdAt: record?.createdAt ?? null,
  };
}

function normalizeCashMovement(movement) {
  const amount = Number(movement?.amount);
  const direction = movement?.direction === "out" ? "out" : "in";
  const reasons = direction === "in"
    ? ["补充开店备用金", "门店资金调入", "其他资金转入"]
    : ["存入银行", "门店资金调出", "其他资金转出"];
  return {
    id: movement?.id,
    storeId: movement?.storeId,
    businessDate: /^\d{4}-\d{2}-\d{2}$/.test(`${movement?.businessDate ?? ""}`) ? movement.businessDate : null,
    direction,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    reason: reasons.includes(movement?.reason) ? movement.reason : direction === "in" ? "其他资金转入" : "其他资金转出",
    transferId: `${movement?.transferId ?? ""}`.trim() || null,
    counterpartyStoreId: `${movement?.counterpartyStoreId ?? ""}`.trim() || null,
    createdAt: movement?.createdAt ?? null,
  };
}

function normalizeProductPriceHistory(record) {
  const asAmount = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
  return {
    id: record?.id,
    storeId: record?.storeId,
    itemId: record?.itemId,
    previousPurchasePrice: asAmount(record?.previousPurchasePrice),
    nextPurchasePrice: asAmount(record?.nextPurchasePrice),
    previousRetailPrice: asAmount(record?.previousRetailPrice),
    nextRetailPrice: asAmount(record?.nextRetailPrice),
    changedAt: record?.changedAt ?? null,
    source: "商品目录价格更新",
  };
}

function normalizeInventoryStocktake(record) {
  const asQuantity = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
  const reasons = ["月度例行盘点", "库存异常核对", "交接前盘点", "经营复盘盘点"];
  const lines = Array.isArray(record?.lines) ? record.lines.map((line) => {
    const expectedQty = asQuantity(line?.expectedQty);
    const actualQty = asQuantity(line?.actualQty);
    return {
      itemId: line?.itemId,
      sku: `${line?.sku ?? ""}`.trim(),
      productName: `${line?.productName ?? "商品"}`.trim() || "商品",
      unit: `${line?.unit ?? "件"}`.trim() || "件",
      expectedQty,
      actualQty,
      difference: Number.isFinite(Number(line?.difference)) ? Number(line.difference) : actualQty - expectedQty,
      movementId: line?.movementId ?? null,
      differenceValue: Number.isFinite(Number(line?.differenceValue)) ? Number(line.differenceValue) : 0,
    };
  }) : [];
  return {
    id: record?.id,
    storeId: record?.storeId,
    countedOn: /^\d{4}-\d{2}-\d{2}$/.test(`${record?.countedOn ?? ""}`) ? record.countedOn : null,
    reason: reasons.includes(record?.reason) ? record.reason : "历史盘点",
    lines,
    changedItemCount: Number.isFinite(Number(record?.changedItemCount)) ? Number(record.changedItemCount) : lines.filter((line) => line.difference !== 0).length,
    differenceValue: Number.isFinite(Number(record?.differenceValue)) ? Number(record.differenceValue) : lines.reduce((sum, line) => sum + line.differenceValue, 0),
    createdAt: record?.createdAt ?? null,
  };
}

function normalizeDailyClosure(closure) {
  const expected = closure?.expectedByPayment ?? {};
  const actual = closure?.actualByPayment ?? {};
  const asAmount = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
  const difference = Number.isFinite(Number(closure?.difference)) ? Number(closure.difference) : 0;
  const expectedByPayment = { cash: asAmount(expected.cash), mobile: asAmount(expected.mobile), other: asAmount(expected.other) };
  const actualByPayment = { cash: asAmount(actual.cash), mobile: asAmount(actual.mobile), other: asAmount(actual.other) };
  const differenceByPayment = Object.fromEntries(
    Object.keys(expectedByPayment).map((method) => {
      const stored = Number(closure?.differenceByPayment?.[method]);
      const value = Number.isFinite(stored) ? stored : actualByPayment[method] - expectedByPayment[method];
      return [method, Math.round(value * 100) / 100];
    }),
  );
  const hasPaymentDifference = Object.values(differenceByPayment).some((value) => value !== 0) || difference !== 0;
  const closeReasons = ["现金找零差异", "移动支付对账差异", "退款核对差异", "其他经营差异"];
  const cashCount = Array.isArray(closure?.cashCount) ? closure.cashCount.map((line) => ({
    denomination: Number(line?.denomination),
    count: Number(line?.count),
  })).filter((line) => [100, 50, 20, 10, 5, 1, 0.5, 0.1].includes(line.denomination) && Number.isInteger(line.count) && line.count >= 0) : null;
  const cashReconciliation = closure?.cashReconciliation ?? {};
  return {
    id: closure?.id,
    storeId: closure?.storeId,
    businessDate: closure?.businessDate ?? null,
    status: closure?.status === "reopened" ? "reopened" : "closed",
    expectedByPayment,
    salesExpectedByPayment: {
      cash: asAmount(closure?.salesExpectedByPayment?.cash ?? expected.cash),
      mobile: asAmount(closure?.salesExpectedByPayment?.mobile ?? expected.mobile),
      other: asAmount(closure?.salesExpectedByPayment?.other ?? expected.other),
    },
    actualByPayment,
    cashCount,
    cashReconciliation: {
      openingCash: asAmount(cashReconciliation.openingCash),
      salesCash: asAmount(cashReconciliation.salesCash ?? closure?.salesExpectedByPayment?.cash ?? expected.cash),
      cashExpensePayments: asAmount(cashReconciliation.cashExpensePayments),
      cashPurchasePayments: asAmount(cashReconciliation.cashPurchasePayments),
      cashPurchaseRefunds: asAmount(cashReconciliation.cashPurchaseRefunds),
      cashMovementIn: asAmount(cashReconciliation.cashMovementIn ?? cashReconciliation.cashTransferIn),
      cashMovementOut: asAmount(cashReconciliation.cashMovementOut ?? cashReconciliation.cashTransferOut),
      cashTransferIn: asAmount(cashReconciliation.cashTransferIn),
      cashTransferOut: asAmount(cashReconciliation.cashTransferOut),
      expectedCashOnHand: asAmount(cashReconciliation.expectedCashOnHand ?? expected.cash),
    },
    difference,
    differenceByPayment,
    hasPaymentDifference,
    closeReason: hasPaymentDifference ? (closeReasons.includes(closure?.closeReason) ? closure.closeReason : "历史差异记录") : "平账核对完成",
    closedAt: closure?.closedAt ?? null,
    reopenedAt: closure?.reopenedAt ?? null,
    reopenReason: `${closure?.reopenReason ?? ""}`.trim(),
  };
}

function normalizeSupplier(supplier) {
  return {
    id: supplier?.id,
    storeId: supplier?.storeId,
    code: `${supplier?.code ?? ""}`.trim(),
    name: `${supplier?.name ?? ""}`.trim(),
    category: `${supplier?.category ?? "其他"}`.trim() || "其他",
    status: supplier?.status === "archived" ? "archived" : "active",
    createdAt: supplier?.createdAt ?? null,
    updatedAt: supplier?.updatedAt ?? null,
  };
}

function normalizePurchaseReceipt(receipt) {
  const totalAmount = Number(receipt?.totalAmount);
  const normalizedTotal = Number.isFinite(totalAmount) && totalAmount >= 0 ? totalAmount : 0;
  const paymentStatus = receipt?.paymentStatus === "pending" ? "pending" : "paid";
  const paidAmount = Number(receipt?.paidAmount);
  return {
    id: receipt?.id,
    storeId: receipt?.storeId,
    supplierId: receipt?.supplierId ?? null,
    supplierName: `${receipt?.supplierName ?? "供应商"}`.trim() || "供应商",
    purchasedAt: receipt?.purchasedAt ?? null,
    lines: Array.isArray(receipt?.lines) ? receipt.lines.map((line) => ({
      itemId: line?.itemId,
      batchId: line?.batchId ?? null,
      batchCode: `${line?.batchCode ?? ""}`.trim(),
      expiresOn: line?.expiresOn || null,
      sku: `${line?.sku ?? ""}`.trim(),
      productName: `${line?.productName ?? "商品"}`.trim() || "商品",
      quantity: Number.isFinite(Number(line?.quantity)) && Number(line.quantity) > 0 ? Number(line.quantity) : 0,
      unitCost: Number.isFinite(Number(line?.unitCost)) && Number(line.unitCost) >= 0 ? Number(line.unitCost) : 0,
      amount: Number.isFinite(Number(line?.amount)) && Number(line.amount) >= 0 ? Number(line.amount) : 0,
      unit: `${line?.unit ?? "件"}`.trim() || "件",
    })) : [],
    totalAmount: normalizedTotal,
    status: ["returned", "partialReturned"].includes(receipt?.status) ? receipt.status : "active",
    paymentStatus,
    paymentMethod: paymentStatus === "paid" && ["cash", "mobile", "other"].includes(receipt?.paymentMethod) ? receipt.paymentMethod : paymentStatus === "paid" ? "other" : null,
    paymentDueOn: paymentStatus === "pending" && /^\d{4}-\d{2}-\d{2}$/.test(`${receipt?.paymentDueOn ?? ""}`) ? receipt.paymentDueOn : null,
    paidOn: paymentStatus === "paid" ? (/^\d{4}-\d{2}-\d{2}$/.test(`${receipt?.paidOn ?? receipt?.purchasedAt ?? ""}`) ? (receipt?.paidOn ?? receipt?.purchasedAt) : null) : null,
    paidAmount: paymentStatus === "paid" ? (Number.isFinite(paidAmount) && paidAmount >= 0 ? paidAmount : normalizedTotal) : 0,
    settledAt: paymentStatus === "paid" ? receipt?.settledAt ?? receipt?.createdAt ?? null : null,
    returnedAt: receipt?.returnedAt ?? null,
    returnReason: `${receipt?.returnReason ?? ""}`.trim(),
    createdAt: receipt?.createdAt ?? null,
  };
}

function normalizePurchaseReturn(record) {
  const totalAmount = Number(record?.totalAmount);
  return {
    id: record?.id,
    storeId: record?.storeId,
    purchaseReceiptId: record?.purchaseReceiptId ?? null,
    supplierId: record?.supplierId ?? null,
    supplierName: `${record?.supplierName ?? "供应商"}`.trim() || "供应商",
    returnedOn: record?.returnedOn ?? null,
    reason: `${record?.reason ?? ""}`.trim(),
    lines: Array.isArray(record?.lines) ? record.lines.map((line) => ({
      itemId: line?.itemId,
      batchId: line?.batchId ?? null,
      sku: `${line?.sku ?? ""}`.trim(),
      productName: `${line?.productName ?? "商品"}`.trim() || "商品",
      quantity: Number.isFinite(Number(line?.quantity)) && Number(line.quantity) > 0 ? Number(line.quantity) : 0,
      unitCost: Number.isFinite(Number(line?.unitCost)) && Number(line.unitCost) >= 0 ? Number(line.unitCost) : 0,
      amount: Number.isFinite(Number(line?.amount)) && Number(line.amount) >= 0 ? Number(line.amount) : 0,
      unit: `${line?.unit ?? "件"}`.trim() || "件",
    })) : [],
    totalAmount: Number.isFinite(totalAmount) && totalAmount >= 0 ? totalAmount : 0,
    cashRefunded: record?.cashRefunded !== false,
    refundPaymentMethod: ["cash", "mobile", "other"].includes(record?.refundPaymentMethod) ? record.refundPaymentMethod : null,
    createdAt: record?.createdAt ?? null,
  };
}

function normalizeOperatingExpense(expense) {
  const amount = Number(expense?.amount);
  return {
    id: expense?.id,
    storeId: expense?.storeId,
    expenseDate: expense?.expenseDate ?? null,
    category: `${expense?.category ?? "其他经营费用"}`.trim() || "其他经营费用",
    paymentMethod: ["cash", "mobile", "other"].includes(expense?.paymentMethod) ? expense.paymentMethod : "other",
    amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
    status: expense?.status === "voided" ? "voided" : "active",
    createdAt: expense?.createdAt ?? null,
    voidedAt: expense?.voidedAt ?? null,
    voidReason: `${expense?.voidReason ?? ""}`.trim(),
  };
}

function migrateLegacyWorkspace(workspace) {
  const existingStores = Array.isArray(workspace?.stores) ? workspace.stores : [];
  const legacyStores = existingStores.length > 0
    ? existingStores.map((existing) => {
        const template = STORE_TEMPLATES.find(
          (candidate) => candidate.id === existing.id || candidate.legacyIds.includes(existing.id),
        );
        return template
          ? { ...template, ...existing, config: { ...template.config, ...(existing.config ?? {}) } }
          : existing;
      })
    : STORE_TEMPLATES;

  const rawEmployees = legacyStores.flatMap((store) => Array.isArray(store.employees) ? store.employees : []);
  const employees = rawEmployees.map(normalizeEmployee);
  const memberCodes = new Map(employees.map((employee) => [employee.id, employee.name]));

  return {
    version: WORKSPACE_VERSION,
    stores: legacyStores.map(normalizeStore),
    employees,
    assignments: legacyStores.flatMap((store) =>
      (Array.isArray(store.employees) ? store.employees : []).map((employee) =>
        makeInitialAssignment(employee.id, store.id),
      ),
    ),
    adjustments: legacyStores.flatMap((store) =>
      (Array.isArray(store.adjustments) ? store.adjustments : []).map((record) => normalizeAdjustment({ ...record, storeId: store.id }, memberCodes)),
    ),
    ruleHistory: [],
    operationLog: [],
    monthlyRecords: normalizeMonthlyRecords(workspace?.monthlyRecords, memberCodes),
    inventoryItems: Array.isArray(workspace?.inventoryItems) ? workspace.inventoryItems.map(normalizeInventoryItem) : [],
    inventoryMovements: Array.isArray(workspace?.inventoryMovements) ? workspace.inventoryMovements.map(normalizeInventoryMovement) : [],
    inventoryBatches: Array.isArray(workspace?.inventoryBatches) ? workspace.inventoryBatches.map(normalizeInventoryBatch) : createLegacyInventoryBatches(Array.isArray(workspace?.inventoryItems) ? workspace.inventoryItems.map(normalizeInventoryItem) : []),
    inventoryTransfers: Array.isArray(workspace?.inventoryTransfers) ? workspace.inventoryTransfers.map(normalizeInventoryTransfer) : [],
    inventoryStocktakes: Array.isArray(workspace?.inventoryStocktakes) ? workspace.inventoryStocktakes.map(normalizeInventoryStocktake) : [],
    productPriceHistory: Array.isArray(workspace?.productPriceHistory) ? workspace.productPriceHistory.map(normalizeProductPriceHistory) : [],
    salesReceipts: Array.isArray(workspace?.salesReceipts) ? workspace.salesReceipts.map(normalizeSalesReceipt) : [],
    salesRefunds: Array.isArray(workspace?.salesRefunds) ? workspace.salesRefunds.map(normalizeSalesRefund) : [],
    cashMovements: Array.isArray(workspace?.cashMovements) ? workspace.cashMovements.map(normalizeCashMovement) : [],
    dailyClosures: Array.isArray(workspace?.dailyClosures) ? workspace.dailyClosures.map(normalizeDailyClosure) : [],
    suppliers: Array.isArray(workspace?.suppliers) ? workspace.suppliers.map(normalizeSupplier) : [],
    purchaseReceipts: Array.isArray(workspace?.purchaseReceipts) ? workspace.purchaseReceipts.map(normalizePurchaseReceipt) : [],
    purchaseReturns: Array.isArray(workspace?.purchaseReturns) ? workspace.purchaseReturns.map(normalizePurchaseReturn) : [],
    operatingExpenses: Array.isArray(workspace?.operatingExpenses) ? workspace.operatingExpenses.map(normalizeOperatingExpense) : [],
  };
}

export function migrateWorkspace(workspace) {
  if (!workspace || !Array.isArray(workspace.assignments)) {
    return migrateLegacyWorkspace(workspace ?? createInitialWorkspace());
  }

  const employees = Array.isArray(workspace.employees) ? workspace.employees.map(normalizeEmployee) : [];
  const memberCodes = new Map(employees.map((employee) => [employee.id, employee.name]));
  const inventoryItems = Array.isArray(workspace.inventoryItems) ? workspace.inventoryItems.map(normalizeInventoryItem) : [];
  return {
    ...workspace,
    version: WORKSPACE_VERSION,
    stores: (workspace.stores ?? []).map(normalizeStore),
    employees,
    assignments: Array.isArray(workspace.assignments)
      ? workspace.assignments.map(normalizeAssignment)
      : [],
    adjustments: Array.isArray(workspace.adjustments)
      ? workspace.adjustments.map((adjustment) => normalizeAdjustment(adjustment, memberCodes))
      : [],
    ruleHistory: Array.isArray(workspace.ruleHistory)
      ? workspace.ruleHistory.map((record) => ({ ...record }))
      : [],
    operationLog: normalizeOperationLog(workspace.operationLog, memberCodes),
    monthlyRecords: normalizeMonthlyRecords(workspace.monthlyRecords, memberCodes),
    inventoryItems,
    inventoryMovements: Array.isArray(workspace.inventoryMovements) ? workspace.inventoryMovements.map(normalizeInventoryMovement) : [],
    inventoryBatches: Array.isArray(workspace.inventoryBatches) ? workspace.inventoryBatches.map(normalizeInventoryBatch) : createLegacyInventoryBatches(inventoryItems),
    inventoryTransfers: Array.isArray(workspace.inventoryTransfers) ? workspace.inventoryTransfers.map(normalizeInventoryTransfer) : [],
    inventoryStocktakes: Array.isArray(workspace.inventoryStocktakes) ? workspace.inventoryStocktakes.map(normalizeInventoryStocktake) : [],
    productPriceHistory: Array.isArray(workspace.productPriceHistory) ? workspace.productPriceHistory.map(normalizeProductPriceHistory) : [],
    salesReceipts: Array.isArray(workspace.salesReceipts) ? workspace.salesReceipts.map(normalizeSalesReceipt) : [],
    salesRefunds: Array.isArray(workspace.salesRefunds) ? workspace.salesRefunds.map(normalizeSalesRefund) : [],
    cashMovements: Array.isArray(workspace.cashMovements) ? workspace.cashMovements.map(normalizeCashMovement) : [],
    dailyClosures: Array.isArray(workspace.dailyClosures) ? workspace.dailyClosures.map(normalizeDailyClosure) : [],
    suppliers: Array.isArray(workspace.suppliers) ? workspace.suppliers.map(normalizeSupplier) : [],
    purchaseReceipts: Array.isArray(workspace.purchaseReceipts) ? workspace.purchaseReceipts.map(normalizePurchaseReceipt) : [],
    purchaseReturns: Array.isArray(workspace.purchaseReturns) ? workspace.purchaseReturns.map(normalizePurchaseReturn) : [],
    operatingExpenses: Array.isArray(workspace.operatingExpenses) ? workspace.operatingExpenses.map(normalizeOperatingExpense) : [],
  };
}

export const mergeWorkspaceWithTemplates = migrateWorkspace;

export function createDefaultMonthValue(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export const VIEW_OPTIONS = [
  { id: "payroll", label: "本月工资" },
  { id: "employees", label: "薪资档案" },
  { id: "adjustments", label: "调薪记录" },
];

export const EMPLOYEE_FIELDS = [
  { key: "baseSalary", label: "基础工资", step: "100" },
  { key: "overtimeRate", label: "加班时薪", step: "0.5" },
  { key: "attendanceBonus", label: "全勤奖金", step: "50" },
];
