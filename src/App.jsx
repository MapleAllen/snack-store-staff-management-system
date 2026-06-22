import { useEffect, useMemo, useState } from "react";
import {
  createDefaultMonthValue,
  createInitialWorkspace,
  createOpenMonthlyStoreRecord,
  defaultMonthlyEntry,
  EMPLOYEE_FIELDS,
  migrateWorkspace,
} from "./payrollData.js";
import {
  buildExportRows,
  createAdjustmentDraft,
  createEmployeeDraft,
  csvEscape,
  formatCurrency,
  formatTimestamp,
  getEmployeeAssignments,
  getEmployeesForStore,
  getMonthlyStoreRecord,
  getPayrollIssueItems,
  getPayrollStageSummary,
  getStorePayrollRows,
  entryHasInput,
  sanitizeDownloadFileName,
  validateStoreConfig,
} from "./payrollLogic.js";
import {
  archiveStore,
  closeStoreMonth,
  createStore,
  renameStore,
  restoreStore as restoreStoreOperation,
  transferEmployee,
  unlockStoreMonth,
} from "./workspaceOperations.js";
import { Modal } from "./components/Modal.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { EmployeesPage } from "./pages/EmployeesPage.jsx";
import { AttendancePage } from "./pages/AttendancePage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";
import { PayrollPage } from "./pages/PayrollPage.jsx";
import {
  BACKUP_TYPE,
  STORAGE_KEY,
  validateBackupFileSize,
  validateBackupPayload,
} from "../shared/backup-format.js";

const APP_VERSION = __APP_VERSION__;
const NAV_ITEMS = [
  { id: "home", label: "首页" },
  { id: "employees", label: "员工管理" },
  { id: "attendance", label: "考勤管理" },
  { id: "payroll", label: "工资管理" },
  { id: "reports", label: "报表中心" },
  { id: "settings", label: "系统设置" },
];

function makeId(prefix) {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${value}`;
}

function loadWorkspace() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialWorkspace();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.stores) || !parsed?.monthlyRecords) return createInitialWorkspace();
    return migrateWorkspace(parsed);
  } catch {
    return createInitialWorkspace();
  }
}

function makeBackupPayload(workspace) {
  return {
    type: BACKUP_TYPE,
    version: APP_VERSION,
    storageKey: STORAGE_KEY,
    exportedAt: new Date().toISOString(),
    data: workspace,
  };
}

export function App() {
  const initialWorkspace = useMemo(loadWorkspace, []);
  const currentMonth = createDefaultMonthValue();
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [activeStoreId, setActiveStoreId] = useState(
    initialWorkspace.stores.find((store) => store.status === "active")?.id ?? "",
  );
  const [activeMonth, setActiveMonth] = useState(currentMonth);
  const [activePage, setActivePage] = useState("home");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [notice, setNotice] = useState("");
  const [employeeModal, setEmployeeModal] = useState(null);
  const [adjustmentModal, setAdjustmentModal] = useState(null);
  const [resignationModal, setResignationModal] = useState(null);
  const [restoreModal, setRestoreModal] = useState(null);
  const [storeModal, setStoreModal] = useState(null);
  const [archiveStoreModal, setArchiveStoreModal] = useState(null);
  const [transferModal, setTransferModal] = useState(null);
  const [closeModal, setCloseModal] = useState(null);
  const [unlockModal, setUnlockModal] = useState(null);
  const [demoResetModal, setDemoResetModal] = useState(false);
  const [saveState, setSaveState] = useState({ status: "saved", savedAt: null });
  const [autoBackups, setAutoBackups] = useState([]);
  const [autoBackupBusy, setAutoBackupBusy] = useState(false);
  const desktopApi = window.payrollDesktop;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
      setSaveState({ status: "saved", savedAt: new Date().toISOString() });
    } catch {
      setSaveState({ status: "error", savedAt: null });
      setNotice("自动保存失败，请立即导出数据备份");
    }
  }, [workspace]);

  useEffect(() => {
    if (!desktopApi) return;
    let cancelled = false;
    desktopApi.createBackup(makeBackupPayload(initialWorkspace), "daily-startup")
      .then(() => desktopApi.listBackups())
      .then((backups) => { if (!cancelled) setAutoBackups(backups); })
      .catch(() => { if (!cancelled) setNotice("自动恢复点创建失败，请导出手动备份"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activeStores = workspace.stores.filter((store) => store.status === "active");
  const activeStore = activeStores.find((store) => store.id === activeStoreId) ?? activeStores[0];
  const currentFeature = NAV_ITEMS.find((item) => item.id === activePage) ?? NAV_ITEMS[0];
  const activeEmployees = activeStore ? getEmployeesForStore(workspace, activeStore.id, activeMonth) : [];
  const activeAdjustments = activeStore
    ? workspace.adjustments.filter((record) => record.storeId === activeStore.id)
    : [];
  const activeStoreView = activeStore
    ? { ...activeStore, employees: activeEmployees, adjustments: activeAdjustments }
    : null;
  const monthlyStore = activeStore
    ? getMonthlyStoreRecord(workspace, activeMonth, activeStore.id)
    : createOpenMonthlyStoreRecord();
  const payrollRows = activeStore ? getStorePayrollRows(workspace, activeMonth, activeStore) : [];
  const selectedRow = payrollRows.find((row) => row.employee.id === selectedEmployeeId) ?? payrollRows[0] ?? null;
  const isLocked = monthlyStore.status === "closed";

  useEffect(() => {
    if (selectedRow?.employee.id && selectedRow.employee.id !== selectedEmployeeId) {
      setSelectedEmployeeId(selectedRow.employee.id);
    }
  }, [selectedEmployeeId, selectedRow]);

  const stageSummary = getPayrollStageSummary(payrollRows, monthlyStore);
  const touchedRows = stageSummary.confirmedCount;
  const totalNetSalary = stageSummary.confirmedTotal;
  const forecastNetSalary = stageSummary.forecastTotal;
  const exceptionCount = payrollRows.filter((row) => getPayrollIssueItems(row).length > 0).length;
  const completionRate = payrollRows.length === 0 ? 0 : Math.round((touchedRows / payrollRows.length) * 100);

  async function refreshAutoBackups() {
    if (!desktopApi) return;
    setAutoBackups(await desktopApi.listBackups());
  }

  async function createAutomaticBackup(reason, data = workspace) {
    if (!desktopApi) return null;
    setAutoBackupBusy(true);
    try {
      const result = await desktopApi.createBackup(makeBackupPayload(data), reason);
      await refreshAutoBackups();
      return result;
    } catch {
      setNotice("自动恢复点创建失败，请导出手动备份");
      return null;
    } finally {
      setAutoBackupBusy(false);
    }
  }

  function updateMonthlyStore(month, storeId, updater) {
    setWorkspace((current) => {
      const monthBucket = current.monthlyRecords[month] ?? {};
      const storeBucket = createOpenMonthlyStoreRecord(monthBucket[storeId]);
      const nextStoreBucket = updater(storeBucket);
      return {
        ...current,
        monthlyRecords: {
          ...current.monthlyRecords,
          [month]: { ...monthBucket, [storeId]: { ...nextStoreBucket, savedAt: new Date().toISOString() } },
        },
      };
    });
  }

  function patchMonthlyEntry(employeeId, patch) {
    if (!activeStore || isLocked) {
      setNotice("本月工资已月结，请先解锁");
      return;
    }
    updateMonthlyStore(activeMonth, activeStore.id, (storeBucket) => {
      const changesCompletion = Object.prototype.hasOwnProperty.call(patch, "isComplete");
      return {
        ...storeBucket,
        rows: {
          ...storeBucket.rows,
          [employeeId]: {
            ...defaultMonthlyEntry(),
            ...(storeBucket.rows[employeeId] ?? {}),
            ...patch,
            ...(!changesCompletion ? { isComplete: false, completedAt: null } : {}),
          },
        },
      };
    });
  }

  function toggleEntryComplete(employeeId, complete) {
    const row = payrollRows.find((item) => item.employee.id === employeeId);
    if (complete && row?.validationIssues?.length) {
      setNotice(row.validationIssues[0]);
      return;
    }
    patchMonthlyEntry(employeeId, {
      isComplete: complete,
      completedAt: complete ? new Date().toISOString() : null,
    });
    if (row) {
      setNotice(complete ? `${row.employee.name} 已确认完成` : `${row.employee.name} 已取消确认，请重新核对后再确认`);
    }
  }

  function requestClosePayroll() {
    const invalid = payrollRows.filter((row) => row.validationIssues?.length > 0);
    if (invalid.length > 0) {
      setNotice(`${invalid[0].employee.name}：${invalid[0].validationIssues[0]}`);
      return;
    }
    const pending = payrollRows.filter((row) => !entryHasInput(row.entry));
    if (pending.length > 0) {
      setNotice(`还有 ${pending.length} 位员工未确认，暂不能月结`);
      return;
    }
    setCloseModal({ issues: payrollRows.filter((row) => getPayrollIssueItems(row).length > 0) });
  }

  async function confirmClosePayroll() {
    if (!activeStore) return;
    const now = new Date().toISOString();
    const next = closeStoreMonth(workspace, {
      storeId: activeStore.id,
      month: activeMonth,
      rows: payrollRows,
      at: now,
      eventId: makeId("close"),
      reason: closeModal?.issues.length ? "异常确认后月结" : "工资核对完成",
    });
    setWorkspace(next);
    setCloseModal(null);
    setNotice("本店本月工资已月结");
    await createAutomaticBackup("month-close", next);
  }

  function confirmUnlockPayroll(event) {
    event.preventDefault();
    const reason = unlockModal?.reason.trim();
    if (!reason || !activeStore) {
      setNotice("请填写解锁原因");
      return;
    }
    setWorkspace((current) => unlockStoreMonth(current, {
      storeId: activeStore.id,
      month: activeMonth,
      at: new Date().toISOString(),
      eventId: makeId("unlock"),
      reason,
    }));
    setUnlockModal(null);
    setNotice("本月工资已解锁，请重新核对后月结");
  }

  function patchStoreConfig(key, value) {
    if (!activeStore) return "当前没有可用门店";
    const nextConfig = { ...activeStore.config, [key]: value };
    const error = validateStoreConfig(nextConfig)[0];
    if (error) {
      setNotice(error);
      return error;
    }
    const labels = {
      socialInsuranceBase: "社保补助基数", mealAllowanceBase: "饭补基数",
      auditPassedBonus: "稽核达标奖励", auditFallbackBonus: "稽核未达标保底",
      nightShiftRate: "夜班每小时补贴", leaveDaysDivisor: "请假天数除数",
      leaveHoursDivisor: "请假小时除数", monthDays: "每月计薪天数",
    };
    const previousValue = activeStore.config[key];
    if (previousValue === value) return null;
    setWorkspace((current) => ({
      ...current,
      stores: current.stores.map((store) => store.id === activeStore.id ? { ...store, config: { ...store.config, [key]: value } } : store),
      ruleHistory: [{ id: makeId("rule"), storeId: activeStore.id, key, label: labels[key] ?? key, previousValue, newValue: value, at: new Date().toISOString() }, ...(current.ruleHistory ?? [])],
    }));
    setNotice("门店工资规则已更新；已月结月份不受影响");
    return null;
  }

  function submitStore(event) {
    event.preventDefault();
    const name = storeModal.name.trim();
    try {
      if (storeModal.mode === "create") {
        const id = makeId("store");
        setWorkspace(createStore(workspace, { sourceStoreId: activeStore.id, name, id, at: new Date().toISOString() }));
        setActiveStoreId(id);
        setNotice("新门店已创建，工资规则已复制");
      } else {
        setWorkspace(renameStore(workspace, { storeId: storeModal.storeId, name }));
        setNotice("门店名称已更新");
      }
    } catch (error) {
      setNotice(error.message);
      return;
    }
    setStoreModal(null);
  }

  function requestArchiveStore(store) {
    try {
      archiveStore(workspace, { storeId: store.id, month: currentMonth, at: new Date().toISOString() });
    } catch (error) {
      setNotice(error.message);
      return;
    }
    setArchiveStoreModal(store);
  }

  function confirmArchiveStore() {
    const store = archiveStoreModal;
    if (!store) return;
    const fallback = activeStores.find((item) => item.id !== store.id);
    setWorkspace((current) => archiveStore(current, { storeId: store.id, month: currentMonth, at: new Date().toISOString() }));
    if (activeStoreId === store.id) setActiveStoreId(fallback?.id ?? "");
    setArchiveStoreModal(null);
    setNotice("门店已停用，历史数据仍可在报表中查看");
  }

  function restoreStore(storeId) {
    setWorkspace((current) => restoreStoreOperation(current, storeId));
    setNotice("门店已恢复营业");
  }

  function exportCurrentMonth() {
    if (!activeStore) return;
    const isFormal = monthlyStore.status === "closed";
    const status = isFormal ? "正式·已月结" : "草稿·未月结";
    const rows = buildExportRows(activeStore, payrollRows, status);
    const headers = Object.keys(rows[0] ?? {});
    if (headers.length === 0) return setNotice("当前没有可导出的工资数据");
    const csvLines = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
    const blob = new Blob([`\uFEFF${csvLines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeDownloadFileName(activeStore.name)}-${activeMonth}-工资表-${isFormal ? "正式" : "草稿"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(isFormal ? "正式工资表已导出" : "草稿工资表已导出，月结后再用于发薪");
  }

  function exportWorkspaceBackup() {
    const payload = makeBackupPayload(workspace);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `门店工资助手-数据备份-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("数据备份已导出");
  }

  async function prepareWorkspaceRestore(file) {
    if (!file) return;
    try {
      validateBackupFileSize(file.size);
      const payload = JSON.parse(await file.text());
      validateBackupPayload(payload);
      const data = migrateWorkspace(payload.data);
      if (!Array.isArray(data.employees) || !Array.isArray(data.assignments)) return setNotice("备份数据结构不完整");
      setRestoreModal({ data, exportedAt: payload.exportedAt, version: payload.version, storeCount: data.stores.length });
    } catch {
      setNotice("文件不是工资系统备份");
    }
  }

  async function prepareAutomaticRestore(id) {
    if (!desktopApi) return;
    try {
      const payload = await desktopApi.readBackup(id);
      const data = migrateWorkspace(payload.data);
      setRestoreModal({ data, exportedAt: payload.exportedAt, version: payload.version, storeCount: data.stores.length, source: "automatic" });
    } catch {
      setNotice("自动恢复点已损坏，无法恢复");
    }
  }

  async function confirmWorkspaceRestore() {
    const next = restoreModal?.data;
    if (!next) return;
    const safetyBackup = await createAutomaticBackup("before-restore", workspace);
    if (desktopApi && !safetyBackup) return;
    setWorkspace(next);
    setActiveStoreId(next.stores.find((store) => store.status === "active")?.id ?? "");
    setSelectedEmployeeId("");
    setRestoreModal(null);
    setNotice("备份数据已恢复并升级至新版结构");
  }

  async function confirmDemoWorkspaceReset() {
    const next = createInitialWorkspace();
    const safetyBackup = await createAutomaticBackup("before-demo-reset", workspace);
    if (desktopApi && !safetyBackup) return;
    setWorkspace(next);
    setActiveStoreId(next.stores.find((store) => store.status === "active")?.id ?? "");
    setActiveMonth(createDefaultMonthValue());
    setActivePage("home");
    setSelectedEmployeeId("");
    setDemoResetModal(false);
    setNotice("已恢复为泛化演示工作区");
  }

  function submitEmployee(event) {
    event.preventDefault();
    const name = employeeModal.draft.name.trim();
    if (!name || !activeStore) return setNotice("员工姓名不能为空");
    if (employeeModal.mode === "create") {
      const employeeId = makeId("employee");
      const employee = {
        id: employeeId, name, baseSalary: 0, overtimeRate: 0, attendanceBonus: 0, salaryConfigured: false,
      };
      setWorkspace((current) => ({
        ...current,
        employees: [...current.employees, employee],
        assignments: [...current.assignments, {
          id: makeId("assignment"), employeeId, storeId: activeStore.id, startMonth: currentMonth,
          endMonth: null, createdAt: new Date().toISOString(), note: "新增员工",
        }],
      }));
      setSelectedEmployeeId(employeeId);
      setAdjustmentModal({ mode: "initial", draft: createAdjustmentDraft(employee) });
      setActiveMonth(currentMonth);
      setActivePage("payroll");
      setNotice("员工已新增，请设置初始薪资");
    } else {
      setWorkspace((current) => ({
        ...current,
        employees: current.employees.map((employee) => employee.id === employeeModal.employeeId ? { ...employee, name } : employee),
      }));
      setNotice("员工档案已更新");
    }
    setEmployeeModal(null);
  }

  function openAdjustmentModal(employeeId = selectedRow?.employee.id) {
    if (isLocked) return setNotice("本月工资已月结，不能新增调薪");
    const employee = activeEmployees.find((item) => item.id === employeeId) ?? activeEmployees[0];
    if (!employee) return setNotice("当前门店没有在职员工");
    setAdjustmentModal({ mode: employee.salaryConfigured ? "adjustment" : "initial", draft: createAdjustmentDraft(employee) });
  }

  function submitAdjustment(event) {
    event.preventDefault();
    const draft = adjustmentModal.draft;
    const target = workspace.employees.find((employee) => employee.id === draft.employeeId);
    if (!target || !activeStore) return setNotice("请选择要调薪的员工");
    const values = Object.fromEntries(EMPLOYEE_FIELDS.map((field) => [field.key, Number(draft.values?.[field.key])]));
    if (EMPLOYEE_FIELDS.some((field) => !Number.isFinite(values[field.key]))) return setNotice("调薪后的数值无效");
    if (values.baseSalary <= 0) return setNotice("基础工资必须大于 0");
    if (values.overtimeRate < 0 || values.attendanceBonus < 0) return setNotice("加班时薪和全勤奖金不能小于 0");
    const changedFields = EMPLOYEE_FIELDS.filter((field) => values[field.key] !== target[field.key]);
    if (changedFields.length === 0 && target.salaryConfigured) return setNotice("没有检测到薪资变化");
    const changes = changedFields.map((field) => ({ key: field.key, label: field.label, previousValue: target[field.key], newValue: values[field.key] }));
    setWorkspace((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === target.id ? { ...employee, ...values, salaryConfigured: true } : employee),
      adjustments: [{
        id: makeId("adjustment"), employeeId: target.id, employeeName: target.name, storeId: activeStore.id,
        item: "salaryComponents", itemLabel: target.salaryConfigured ? "薪资组件" : "初始薪资",
        previousValue: changes.map((change) => `${change.label} ${change.previousValue}`).join(" / "),
        newValue: changes.map((change) => `${change.label} ${change.newValue}`).join(" / "),
        changes, date: draft.date, notes: draft.notes.trim(),
      }, ...current.adjustments],
    }));
    setSelectedEmployeeId(target.id);
    setAdjustmentModal(null);
    setNotice(target.salaryConfigured ? "调薪记录已保存；已月结月份不受影响" : "初始薪资已设置，可以录入工资");
  }

  function handleToggleResignation(employee, shouldResign) {
    setResignationModal({ employee, mode: shouldResign ? "resign" : "restore", date: new Date().toISOString().slice(0, 10) });
  }

  function submitResignation(event) {
    event.preventDefault();
    if (!resignationModal?.employee || (resignationModal.mode === "resign" && !resignationModal.date)) return setNotice("请选择离职日期");
    const isResigned = resignationModal.mode === "resign";
    setWorkspace((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === resignationModal.employee.id
        ? { ...employee, isResigned, resignationDate: isResigned ? resignationModal.date : null }
        : employee),
    }));
    setResignationModal(null);
    setNotice(isResigned ? "已办理离职" : "已恢复在职");
  }

  function openTransferModal(employee) {
    const hasFutureTransfer = getEmployeeAssignments(workspace, employee.id).some((assignment) => assignment.startMonth > currentMonth);
    if (hasFutureTransfer) return setNotice("该员工已有计划调店记录");
    const targetStore = activeStores.find((store) => store.id !== activeStore.id);
    if (!targetStore) return setNotice("没有可接收员工的其他营业门店");
    setTransferModal({ employee, targetStoreId: targetStore.id, effectiveMonth: currentMonth, notes: "" });
  }

  function submitTransfer(event) {
    event.preventDefault();
    const draft = transferModal;
    const targetStore = activeStores.find((store) => store.id === draft.targetStoreId);
    if (!draft || !targetStore) return setNotice("请选择有效的目标门店");
    try {
      setWorkspace(transferEmployee(workspace, {
        employeeId: draft.employee.id,
        targetStoreId: draft.targetStoreId,
        effectiveMonth: draft.effectiveMonth,
        currentMonth,
        at: new Date().toISOString(),
        assignmentId: makeId("assignment"),
        note: draft.notes,
      }));
    } catch (error) {
      setNotice(error.message);
      return;
    }
    if (draft.effectiveMonth === currentMonth) setActiveStoreId(targetStore.id);
    setTransferModal(null);
    setNotice(`调店计划已保存，将于 ${draft.effectiveMonth} 生效`);
  }

  if (!activeStoreView) return <div className="app-empty">没有可用门店，请从备份恢复数据。</div>;

  return (
    <div className="app-shell">
      <main className="workspace">
        <header className="topbar">
          <div className="topbar__brand"><img className="topbar__logo" src="/app-icon.svg" alt="" /><div><strong>门店工资助手</strong><span>老板结薪工作台</span></div></div>
          <nav className="topbar__nav" aria-label="主导航">
            {NAV_ITEMS.map((item) => <button key={item.id} aria-current={item.id === activePage ? "page" : undefined} className={item.id === activePage ? "topbar__nav-item is-active" : "topbar__nav-item"} type="button" onClick={() => setActivePage(item.id)}>{item.label}</button>)}
          </nav>
          <label className="topbar__nav-select"><span>当前功能</span><select value={activePage} onChange={(event) => setActivePage(event.target.value)}>{NAV_ITEMS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          <div className="topbar__aside">
            <div className="topbar__feature">
              <span>当前功能</span>
              <strong>{currentFeature.label}</strong>
            </div>
            <label className="store-select"><span>当前门店</span><select aria-label="当前门店" value={activeStore.id} onChange={(event) => setActiveStoreId(event.target.value)}>{activeStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
            <div className={saveState.status === "error" ? "autosave-status is-error" : "autosave-status"}><span>{saveState.status === "error" ? "保存失败" : "已自动保存"}</span><strong>{saveState.savedAt ? formatTimestamp(saveState.savedAt) : "正在保存"}</strong></div>
          </div>
        </header>

        {activePage === "home" ? <HomePage workspace={workspace} activeMonth={activeMonth} onNavigate={setActivePage} onSelectStore={setActiveStoreId} /> : null}
        {activePage === "employees" ? <EmployeesPage workspace={workspace} store={activeStore} currentMonth={currentMonth} onCreate={() => setEmployeeModal({ mode: "create", draft: createEmployeeDraft() })} onEdit={(employee) => setEmployeeModal({ mode: "edit", employeeId: employee.id, draft: createEmployeeDraft(employee) })} onToggleResignation={handleToggleResignation} onTransfer={openTransferModal} /> : null}
        {activePage === "attendance" ? <AttendancePage store={activeStore} activeMonth={activeMonth} rows={payrollRows} patchEntry={patchMonthlyEntry} toggleComplete={toggleEntryComplete} isLocked={isLocked} onNavigate={setActivePage} /> : null}
        {activePage === "reports" ? <ReportsPage workspace={workspace} activeMonth={activeMonth} setActiveMonth={setActiveMonth} onSelectStore={setActiveStoreId} onNavigate={setActivePage} /> : null}
        {activePage === "settings" ? <SettingsPage store={activeStore} stores={workspace.stores} patchConfig={patchStoreConfig} appVersion={APP_VERSION} onExportBackup={exportWorkspaceBackup} onImportBackup={prepareWorkspaceRestore} onCreateStore={() => setStoreModal({ mode: "create", name: "" })} onEditStore={(store) => setStoreModal({ mode: "edit", storeId: store.id, name: store.name })} onArchiveStore={requestArchiveStore} onRestoreStore={restoreStore} autoBackups={autoBackups} autoBackupAvailable={Boolean(desktopApi)} autoBackupBusy={autoBackupBusy} onCreateAutoBackup={() => createAutomaticBackup("manual")} onRestoreAutoBackup={prepareAutomaticRestore} onResetDemoWorkspace={() => setDemoResetModal(true)} ruleHistory={(workspace.ruleHistory ?? []).filter((record) => record.storeId === activeStore.id)} /> : null}
        {activePage === "payroll" ? <PayrollPage activeStore={activeStoreView} activeMonth={activeMonth} setActiveMonth={setActiveMonth} exportCurrentMonth={exportCurrentMonth} totalNetSalary={totalNetSalary} forecastNetSalary={forecastNetSalary} payrollRows={payrollRows} touchedRows={touchedRows} exceptionCount={exceptionCount} completionRate={completionRate} monthlyStore={monthlyStore} selectedRow={selectedRow} setSelectedEmployeeId={setSelectedEmployeeId} patchMonthlyEntry={patchMonthlyEntry} toggleEntryComplete={toggleEntryComplete} setEmployeeModal={setEmployeeModal} openAdjustmentModal={openAdjustmentModal} isLocked={isLocked} onClosePayroll={requestClosePayroll} onUnlockPayroll={() => setUnlockModal({ reason: "" })} /> : null}
      </main>

      {notice ? <div className="toast" role="status" aria-live="polite">{notice}</div> : null}

      {storeModal ? <Modal title={storeModal.mode === "create" ? "新增门店" : "编辑门店名称"} onClose={() => setStoreModal(null)}><form className="modal-form" onSubmit={submitStore}><label className="field"><span>门店名称</span><input autoFocus maxLength="40" value={storeModal.name} onChange={(event) => setStoreModal((current) => ({ ...current, name: event.target.value }))} placeholder="例如：人民广场店" /></label>{storeModal.mode === "create" ? <p className="modal-copy">新门店会复制当前门店的工资规则，不会复制员工或工资记录。</p> : null}<ModalActions onCancel={() => setStoreModal(null)} label="保存门店" /></form></Modal> : null}

      {archiveStoreModal ? <Modal title="停用门店" onClose={() => setArchiveStoreModal(null)}><div className="modal-form"><div className="modal-summary"><strong>{archiveStoreModal.name}</strong><span>停用后将从日常录入中隐藏，历史工资仍可在报表中查看。</span></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setArchiveStoreModal(null)}>取消</button><button className="danger-button" type="button" onClick={confirmArchiveStore}>确认停用</button></div></div></Modal> : null}

      {employeeModal ? <Modal title={employeeModal.mode === "create" ? "新增员工" : "编辑员工姓名"} onClose={() => setEmployeeModal(null)}><form className="modal-form" onSubmit={submitEmployee}><label className="field"><span>姓名</span><input autoFocus value={employeeModal.draft.name} onChange={(event) => setEmployeeModal((current) => ({ ...current, draft: { ...current.draft, name: event.target.value } }))} /></label><p className="modal-copy">基础工资、加班时薪和全勤奖金只能在工资管理的调薪记录中修改。</p><ModalActions onCancel={() => setEmployeeModal(null)} label="保存员工" /></form></Modal> : null}

      {adjustmentModal ? <Modal title={adjustmentModal.mode === "initial" ? "设置初始薪资" : "新增调薪记录"} onClose={() => setAdjustmentModal(null)}><form className="modal-form modal-form--wide" onSubmit={submitAdjustment}><label className="field"><span>员工</span><select value={adjustmentModal.draft.employeeId} onChange={(event) => { const employee = activeEmployees.find((item) => item.id === event.target.value); setAdjustmentModal((current) => ({ ...current, mode: employee?.salaryConfigured ? "adjustment" : "initial", draft: { ...createAdjustmentDraft(employee), date: current.draft.date, notes: current.draft.notes } })); }}>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><label className="field"><span>调整日期</span><input type="date" value={adjustmentModal.draft.date} onChange={(event) => setAdjustmentModal((current) => ({ ...current, draft: { ...current.draft, date: event.target.value } }))} /></label><div className="adjustment-grid"><div className="adjustment-grid__head">当前值</div><div className="adjustment-grid__head">调整后</div>{EMPLOYEE_FIELDS.map((field) => { const employee = activeEmployees.find((item) => item.id === adjustmentModal.draft.employeeId); const old = employee?.[field.key] ?? 0; return <div className="adjustment-row" key={field.key}><div className="adjustment-row__old"><span>{field.label}</span><strong>{field.key === "overtimeRate" ? `${old} / 小时` : formatCurrency(old)}</strong></div><label className="field adjustment-row__new"><span>{field.label}</span><input type="number" min={field.key === "baseSalary" ? "0.01" : "0"} step={field.step} value={adjustmentModal.draft.values?.[field.key] ?? ""} onChange={(event) => setAdjustmentModal((current) => ({ ...current, draft: { ...current.draft, values: { ...current.draft.values, [field.key]: event.target.value } } }))} /></label></div>; })}</div><label className="field"><span>备注</span><textarea value={adjustmentModal.draft.notes} onChange={(event) => setAdjustmentModal((current) => ({ ...current, draft: { ...current.draft, notes: event.target.value } }))} placeholder={adjustmentModal.mode === "initial" ? "例如：入职初始薪资" : "说明本次调整原因"} /></label><ModalActions onCancel={() => setAdjustmentModal(null)} label={adjustmentModal.mode === "initial" ? "确认初始薪资" : "保存记录"} /></form></Modal> : null}

      {transferModal ? <Modal title="员工调店" onClose={() => setTransferModal(null)}><form className="modal-form" onSubmit={submitTransfer}><div className="modal-summary"><strong>{transferModal.employee.name}</strong><span>当前门店：{activeStore.name}</span></div><label className="field"><span>目标门店</span><select value={transferModal.targetStoreId} onChange={(event) => setTransferModal((current) => ({ ...current, targetStoreId: event.target.value }))}>{activeStores.filter((store) => store.id !== activeStore.id).map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label><label className="field"><span>生效月份</span><input type="month" min={currentMonth} value={transferModal.effectiveMonth} onChange={(event) => setTransferModal((current) => ({ ...current, effectiveMonth: event.target.value }))} /></label><label className="field"><span>调店备注</span><textarea value={transferModal.notes} onChange={(event) => setTransferModal((current) => ({ ...current, notes: event.target.value }))} placeholder="例如：新店开业支援、长期调任" /></label><ModalActions onCancel={() => setTransferModal(null)} label="保存调店计划" /></form></Modal> : null}

      {resignationModal ? <Modal title={resignationModal.mode === "resign" ? "办理离职" : "恢复在职"} onClose={() => setResignationModal(null)}><form className="modal-form" onSubmit={submitResignation}><div className="modal-summary"><strong>{resignationModal.employee.name}</strong><span>{activeStore.name} · 工号 {resignationModal.employee.id}</span></div>{resignationModal.mode === "resign" ? <label className="field"><span>离职日期</span><input type="date" value={resignationModal.date} onChange={(event) => setResignationModal((current) => ({ ...current, date: event.target.value }))} /></label> : <p className="modal-copy">恢复在职后，该员工会回到当前归属门店的工资和考勤列表中。</p>}<ModalActions onCancel={() => setResignationModal(null)} label={resignationModal.mode === "resign" ? "确认离职" : "确认恢复"} /></form></Modal> : null}

      {closeModal ? <Modal title="确认本月月结" onClose={() => setCloseModal(null)}><div className="modal-form"><div className="modal-summary"><strong>{activeStore.name} · {activeMonth}</strong><span>月结后将冻结 {payrollRows.length} 位员工的工资结果。</span></div>{closeModal.issues.length > 0 ? <div className="modal-warning"><strong>仍有 {closeModal.issues.length} 位员工存在异常</strong>{closeModal.issues.slice(0, 5).map((row) => <span key={row.employee.id}>{row.employee.name}：{getPayrollIssueItems(row).join("、")}</span>)}</div> : <p className="modal-copy">所有员工已完成录入，当前没有需要复核的异常。</p>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setCloseModal(null)}>继续核对</button><button className="primary-button" type="button" onClick={confirmClosePayroll}>{closeModal.issues.length ? "确认异常并月结" : "确认月结"}</button></div></div></Modal> : null}

      {unlockModal ? <Modal title="解锁本月工资" onClose={() => setUnlockModal(null)}><form className="modal-form" onSubmit={confirmUnlockPayroll}><div className="modal-summary"><strong>{activeStore.name} · {activeMonth}</strong><span>解锁后可以重新录入，原月结结果将停止使用。</span></div><label className="field"><span>解锁原因</span><textarea autoFocus value={unlockModal.reason} onChange={(event) => setUnlockModal({ reason: event.target.value })} placeholder="请说明发现的问题或需要修改的内容" /></label><ModalActions onCancel={() => setUnlockModal(null)} label="确认解锁" /></form></Modal> : null}

      {restoreModal ? <Modal title="恢复备份数据" onClose={() => setRestoreModal(null)}><div className="modal-form"><div className="modal-summary"><strong>即将覆盖当前工资系统数据</strong><span>备份版本：{restoreModal.version ?? "未知"} · 门店数量：{restoreModal.storeCount} 家</span><span>导出时间：{restoreModal.exportedAt ? new Date(restoreModal.exportedAt).toLocaleString("zh-CN") : "未知"}</span></div><p className="modal-copy">旧版备份会自动升级，恢复后保留全部门店、员工及工资记录。</p><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setRestoreModal(null)}>取消</button><button className="primary-button" type="button" onClick={confirmWorkspaceRestore}>确认恢复</button></div></div></Modal> : null}

      {demoResetModal ? <Modal title="恢复泛化演示工作区" onClose={() => setDemoResetModal(false)}><div className="modal-form"><div className="modal-summary"><strong>即将重置为默认演示数据</strong><span>会恢复为泛化门店、虚构员工和示例金额。</span><span>当前本地工作区会被覆盖；如桌面版可用，将先创建恢复点。</span></div><p className="modal-copy">这个操作不会自动迁移旧示例门店名，而是直接回到默认演示工作区。</p><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setDemoResetModal(false)}>取消</button><button className="primary-button" type="button" onClick={confirmDemoWorkspaceReset}>确认恢复演示数据</button></div></div></Modal> : null}
    </div>
  );
}

function ModalActions({ onCancel, label }) {
  return <div className="modal-actions"><button className="secondary-button" type="button" onClick={onCancel}>取消</button><button className="primary-button" type="submit">{label}</button></div>;
}
