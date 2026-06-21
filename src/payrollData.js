export const WORKSPACE_VERSION = 3;
export const INITIAL_ASSIGNMENT_MONTH = "2000-01";

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
      { id: "demo-1-employee-1", name: "示例员工 A1", baseSalary: 3200, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-1-employee-2", name: "示例员工 A2", baseSalary: 2800, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-1-employee-3", name: "示例员工 A3", baseSalary: 2400, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-1-employee-4", name: "示例员工 A4", baseSalary: 2200, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-1-employee-5", name: "示例员工 A5", baseSalary: 2000, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-1-employee-6", name: "示例员工 A6", baseSalary: 2600, overtimeRate: 15, attendanceBonus: 200 },
    ],
  },
  {
    id: "demo-store-2",
    legacyIds: ["gcb"],
    name: "示例二店",
    config: { ...DEFAULT_STORE_CONFIG, nightShiftRate: 10 },
    employees: [
      { id: "demo-2-employee-1", name: "示例员工 B1", baseSalary: 3000, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-2-employee-2", name: "示例员工 B2", baseSalary: 2800, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-2-employee-3", name: "示例员工 B3", baseSalary: 2600, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-2-employee-4", name: "示例员工 B4", baseSalary: 2400, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-2-employee-5", name: "示例员工 B5", baseSalary: 2200, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-2-employee-6", name: "示例员工 B6", baseSalary: 2000, overtimeRate: 15, attendanceBonus: 200 },
    ],
  },
  {
    id: "demo-store-3",
    legacyIds: ["hns"],
    name: "示例三店",
    config: { ...DEFAULT_STORE_CONFIG },
    employees: [
      { id: "demo-3-employee-1", name: "示例员工 C1", baseSalary: 3200, overtimeRate: 16, attendanceBonus: 200 },
      { id: "demo-3-employee-2", name: "示例员工 C2", baseSalary: 2800, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-3-employee-3", name: "示例员工 C3", baseSalary: 2400, overtimeRate: 15, attendanceBonus: 200 },
      { id: "demo-3-employee-4", name: "示例员工 C4", baseSalary: 2000, overtimeRate: 15, attendanceBonus: 200 },
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
    note: "",
    isComplete: false,
    completedAt: null,
  };
}

export function createOpenMonthlyStoreRecord(record = {}) {
  return {
    rows: record.rows ?? {},
    savedAt: record.savedAt ?? null,
    status: record.status === "closed" ? "closed" : "open",
    closedAt: record.closedAt ?? null,
    snapshot: Array.isArray(record.snapshot) ? record.snapshot : null,
    closeHistory: Array.isArray(record.closeHistory) ? record.closeHistory : [],
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
    note: "初始门店",
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
    monthlyRecords: {},
  };
}

function normalizeEmployee(employee) {
  return {
    ...employee,
    salaryConfigured: employee.salaryConfigured !== false,
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

function normalizeMonthlyRecords(monthlyRecords = {}) {
  return Object.fromEntries(
    Object.entries(monthlyRecords).map(([month, stores]) => [
      month,
      Object.fromEntries(
        Object.entries(stores ?? {}).map(([storeId, record]) => [storeId, createOpenMonthlyStoreRecord(record)]),
      ),
    ]),
  );
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

  return {
    version: WORKSPACE_VERSION,
    stores: legacyStores.map(normalizeStore),
    employees: legacyStores.flatMap((store) =>
      (Array.isArray(store.employees) ? store.employees : []).map(normalizeEmployee),
    ),
    assignments: legacyStores.flatMap((store) =>
      (Array.isArray(store.employees) ? store.employees : []).map((employee) =>
        makeInitialAssignment(employee.id, store.id),
      ),
    ),
    adjustments: legacyStores.flatMap((store) =>
      (Array.isArray(store.adjustments) ? store.adjustments : []).map((record) => ({ ...record, storeId: store.id })),
    ),
    ruleHistory: [],
    monthlyRecords: normalizeMonthlyRecords(workspace?.monthlyRecords),
  };
}

export function migrateWorkspace(workspace) {
  if (!workspace || !Array.isArray(workspace.assignments)) {
    return migrateLegacyWorkspace(workspace ?? createInitialWorkspace());
  }

  return {
    ...workspace,
    version: WORKSPACE_VERSION,
    stores: (workspace.stores ?? []).map(normalizeStore),
    employees: Array.isArray(workspace.employees) ? workspace.employees.map(normalizeEmployee) : [],
    assignments: Array.isArray(workspace.assignments)
      ? workspace.assignments.map((assignment) => ({ ...assignment }))
      : [],
    adjustments: Array.isArray(workspace.adjustments)
      ? workspace.adjustments.map((adjustment) => ({ ...adjustment }))
      : [],
    ruleHistory: Array.isArray(workspace.ruleHistory)
      ? workspace.ruleHistory.map((record) => ({ ...record }))
      : [],
    monthlyRecords: normalizeMonthlyRecords(workspace.monthlyRecords),
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
  { id: "employees", label: "员工档案" },
  { id: "adjustments", label: "调薪记录" },
];

export const EMPLOYEE_FIELDS = [
  { key: "baseSalary", label: "基础工资", step: "100" },
  { key: "overtimeRate", label: "加班时薪", step: "0.5" },
  { key: "attendanceBonus", label: "全勤奖金", step: "50" },
];
