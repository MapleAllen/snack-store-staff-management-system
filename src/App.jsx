import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  createDefaultMonthValue,
  createAnonymousMemberCode,
  createInitialWorkspace,
  createOpenMonthlyStoreRecord,
  defaultMonthlyEntry,
  EMPLOYEE_FIELDS,
  migrateWorkspace,
  ASSIGNMENT_REASONS,
  PAYROLL_ADJUSTMENT_REASONS,
  PAYROLL_UNLOCK_REASONS,
} from "./payrollData.js";
import {
  buildExportRows,
  createAdjustmentDraft,
  createEmployeeDraft,
  csvEscape,
  formatCurrency,
  getEmployeeAssignments,
  getEmployeesForStore,
  getMonthlyStoreRecord,
  getPayrollCloseSummary,
  getPayrollIssueMessage,
  getPayrollIssueItems,
  getPayrollStageSummary,
  getStorePayrollRows,
  sanitizeDownloadFileName,
} from "./payrollLogic.js";
import {
  archiveStore,
  closeStoreMonth,
  createStore,
  recordSalaryAdjustment,
  renameStore,
  resignEmployee,
  restoreEmployee,
  restoreStore as restoreStoreOperation,
  transferEmployee,
  updateStoreConfig,
  unlockStoreMonth,
} from "./workspaceOperations.js";
import { Modal } from "./components/Modal.jsx";
import { LockScreen } from "./components/LockScreen.jsx";
import { RecoveryScreen } from "./components/RecoveryScreen.jsx";
import {
  BACKUP_TYPE,
  STORAGE_KEY,
  BACKUP_REASONS,
  validateBackupFileSize,
  validateBackupPayload,
} from "../shared/backup-format.js";
import { loadWorkspace, saveWorkspace, getStorageStatus, isDesktopStorage } from "./storageAdapter.js";

import {
  Layout,
  Menu,
  Select,
  Tag,
  Badge,
  Button,
  Space,
  Typography,
  Alert,
  ConfigProvider,
} from "antd";
import {
  HomeOutlined,
  TeamOutlined,
  CalendarOutlined,
  PayCircleOutlined,
  FileTextOutlined,
  SettingOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const HomePage = lazy(() => import("./pages/HomePage.jsx").then((module) => ({ default: module.HomePage })));
const EmployeesPage = lazy(() => import("./pages/EmployeesPage.jsx").then((module) => ({ default: module.EmployeesPage })));
const AttendancePage = lazy(() => import("./pages/AttendancePage.jsx").then((module) => ({ default: module.AttendancePage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage.jsx").then((module) => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx").then((module) => ({ default: module.SettingsPage })));
const PayrollPage = lazy(() => import("./pages/PayrollPage.jsx").then((module) => ({ default: module.PayrollPage })));


const APP_VERSION = __APP_VERSION__;
const NAV_ITEMS = [
  { key: "home", id: "home", label: "工资总览", icon: <HomeOutlined /> },
  { key: "employees", id: "employees", label: "员工管理", icon: <TeamOutlined /> },
  { key: "attendance", id: "attendance", label: "考勤管理", icon: <CalendarOutlined /> },
  { key: "payroll", id: "payroll", label: "工资管理", icon: <PayCircleOutlined /> },
  { key: "reports", id: "reports", label: "报表中心", icon: <FileTextOutlined /> },
  { key: "settings", id: "settings", label: "门店管理", icon: <SettingOutlined /> },
];


function makeId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const value = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}-${value}`;
}

async function deriveKeyFromPassphrase(passphrase, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptPayload(payload, passphrase) {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  const ctHex = Array.from(new Uint8Array(ciphertext), (b) => b.toString(16).padStart(2, "0")).join("");
  const ivHex = Array.from(iv, (b) => b.toString(16).padStart(2, "0")).join("");
  return { salt, iv: ivHex, ctHex };
}

async function decryptPayload(encrypted, passphrase) {
  const key = await deriveKeyFromPassphrase(passphrase, encrypted.salt);
  const iv = new Uint8Array(encrypted.iv.match(/.{2}/g).map((b) => parseInt(b, 16)));
  const ctHex = encrypted.ctHex ?? encrypted.data;
  const ciphertext = new Uint8Array(ctHex.match(/.{2}/g).map((b) => parseInt(b, 16)));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
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
  const fallbackWorkspace = useMemo(createInitialWorkspace, []);
  const [loadedWorkspace, setLoadedWorkspace] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [appLocked, setAppLocked] = useState(null);
  const currentMonth = createDefaultMonthValue();
  const [workspace, setWorkspace] = useState(fallbackWorkspace);
  const [activeStoreId, setActiveStoreId] = useState("");
  const [activeMonth, setActiveMonth] = useState(currentMonth);
  const [activePage, setActivePage] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
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
  const [recoveryPassphrase, setRecoveryPassphrase] = useState("");
  const [recoveryFile, setRecoveryFile] = useState(null);
  const desktopApi = window.payrollDesktop;

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const result = await loadWorkspace();
      if (cancelled) return;

      if (result.recoveryState === "corrupt-fallback") {
        setLoadError("corrupt");
        setLoadedWorkspace(null);
        return;
      }

      const ws = result.workspace ?? fallbackWorkspace;
      setLoadedWorkspace(ws);
      setWorkspace(ws);
      setActiveStoreId(ws.stores.find((store) => store.status === "active")?.id ?? "");

      if (desktopApi) {
        try {
          const lockStatus = await desktopApi.getLockStatus();
          if (!cancelled) setAppLocked(lockStatus.locked);
        } catch {
          if (!cancelled) setAppLocked(false);
        }
      } else {
        setAppLocked(false);
      }
    }
    boot();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loadedWorkspace) return;
    let cancelled = false;
    saveWorkspace(workspace).then((result) => {
      if (cancelled) return;
      if (result.status === "error") {
        setSaveState({ status: "error", savedAt: null });
        setNotice("自动保存失败，请立即导出数据备份");
      } else {
        setSaveState({ status: "saved", savedAt: result.savedAt ?? new Date().toISOString() });
      }
    }).catch(() => {
      if (!cancelled) {
        setSaveState({ status: "error", savedAt: null });
        setNotice("自动保存失败，请立即导出数据备份");
      }
    });
    return () => { cancelled = true; };
  }, [workspace]);

  useEffect(() => {
    if (!desktopApi || !loadedWorkspace) return;
    let cancelled = false;
    desktopApi.createBackup(makeBackupPayload(loadedWorkspace), BACKUP_REASONS.DAILY_STARTUP)
      .then(() => desktopApi.listBackups())
      .then((backups) => { if (!cancelled) setAutoBackups(backups); })
      .catch(() => { if (!cancelled) setNotice("自动恢复点创建失败，请导出手动备份"); });
    return () => { cancelled = true; };
  }, [desktopApi, loadedWorkspace]);

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
      setNotice(getPayrollIssueMessage(row.validationIssues[0]));
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
    setCloseModal(getPayrollCloseSummary(payrollRows));
  }

  async function confirmClosePayroll() {
    if (!activeStore) return;
    if (!closeModal?.canClose) {
      setNotice("仍有员工阻塞本店月结，请先继续核对");
      return;
    }
    const now = new Date().toISOString();
    const next = closeStoreMonth(workspace, {
      storeId: activeStore.id,
      month: activeMonth,
      rows: payrollRows,
      at: now,
      eventId: makeId("close"),
      reason: closeModal.reviewCount > 0 ? "异常确认后月结" : "工资核对完成",
    });
    setWorkspace(next);
    setCloseModal(null);
    setNotice("本店本月工资已月结");
    await createAutomaticBackup(BACKUP_REASONS.MONTH_CLOSE, next);
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
    try {
      setWorkspace(updateStoreConfig(workspace, {
        storeId: activeStore.id,
        key,
        value,
        id: makeId("rule"),
        at: new Date().toISOString(),
      }));
    } catch (error) {
      setNotice(error.message);
      return error.message;
    }
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
        setWorkspace(renameStore(workspace, { storeId: storeModal.storeId, name, eventId: makeId("store-rename"), at: new Date().toISOString() }));
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
    setWorkspace((current) => restoreStoreOperation(current, { storeId, eventId: makeId("store-restore"), at: new Date().toISOString() }));
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

  function exportWorkspaceBackup(passphrase) {
    async function doExport() {
      const payload = makeBackupPayload(workspace);
      let json;
      if (passphrase) {
        const { salt, iv, ctHex } = await encryptPayload(payload, passphrase);
        const envelope = {
          type: BACKUP_TYPE,
          version: APP_VERSION,
          storageKey: STORAGE_KEY,
          exportedAt: new Date().toISOString(),
          reason: BACKUP_REASONS.MANUAL,
          protected: true,
          salt,
          iv,
          data: ctHex,
        };
        json = JSON.stringify(envelope, null, 2);
      } else {
        json = JSON.stringify(payload, null, 2);
      }
      const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `门店工资助手-数据备份-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(passphrase ? "加密备份已导出" : "数据备份已导出");
    }
    doExport().catch(() => setNotice("备份导出失败"));
  }

  async function prepareWorkspaceRestore(file, passphrase) {
    if (!file) return;
    try {
      validateBackupFileSize(file.size);
      const raw = await file.text();
      let payload = JSON.parse(raw);

      if (payload.protected) {
        if (!passphrase) return setNotice("此备份已加密，请输入口令");
        try {
          const decrypted = await decryptPayload(payload, passphrase);
          payload = JSON.parse(decrypted);
        } catch {
          return setNotice("口令不正确或备份已损坏");
        }
      }

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
    const safetyBackup = await createAutomaticBackup(BACKUP_REASONS.BEFORE_RESTORE, workspace);
    if (desktopApi && !safetyBackup) return;
    setWorkspace(next);
    setActiveStoreId(next.stores.find((store) => store.status === "active")?.id ?? "");
    setSelectedEmployeeId("");
    setRestoreModal(null);
    setNotice("备份数据已恢复并升级至新版结构");
  }

  async function confirmDemoWorkspaceReset() {
    const next = createInitialWorkspace();
    const safetyBackup = await createAutomaticBackup(BACKUP_REASONS.BEFORE_DEMO_RESET, workspace);
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
    if (!activeStore) return setNotice("当前没有可用门店");
    if (employeeModal.mode === "create") {
      const employeeId = makeId("employee");
      const employee = {
        id: employeeId, name: createAnonymousMemberCode(workspace.employees.length + 1), baseSalary: 0, overtimeRate: 0, attendanceBonus: 0, salaryConfigured: false,
      };
      setWorkspace((current) => ({
        ...current,
        employees: [...current.employees, employee],
        assignments: [...current.assignments, {
          id: makeId("assignment"), employeeId, storeId: activeStore.id, startMonth: currentMonth,
          endMonth: null, createdAt: new Date().toISOString(), reason: "新增岗位成员",
        }],
      }));
      setSelectedEmployeeId(employeeId);
      setAdjustmentModal({ mode: "initial", draft: createAdjustmentDraft(employee) });
      setActiveMonth(currentMonth);
      setActivePage("payroll");
      setNotice("岗位成员已新增，请设置初始薪资");
    } else {
      setNotice("成员代号由系统生成，不支持修改");
    }
    setEmployeeModal(null);
  }

  function handleNavigateToEmployee(storeId, employeeId, targetPage = "payroll", action = null) {
    if (storeId) setActiveStoreId(storeId);
    if (employeeId) setSelectedEmployeeId(employeeId);
    setActivePage(targetPage);
    if (action === "openAdjustment" && employeeId) {
      const targetEmp = (workspace.employees ?? []).find((item) => item.id === employeeId);
      if (targetEmp) {
        setAdjustmentModal({
          mode: targetEmp.salaryConfigured ? "adjustment" : "initial",
          draft: createAdjustmentDraft(targetEmp),
        });
      }
    }
  }

  function openAdjustmentModal(target = selectedRow?.employee?.id) {
    if (isLocked) return setNotice("本月工资已月结，不能新增调薪");
    const employeeId = typeof target === "object" && target !== null ? target.id : target;
    const employee = (workspace.employees ?? []).find((item) => item.id === employeeId) ?? activeEmployees[0];
    if (!employee) return setNotice("当前门店没有在职员工");
    setAdjustmentModal({ mode: employee.salaryConfigured ? "adjustment" : "initial", draft: createAdjustmentDraft(employee) });
  }

  /* 已下线的零售业务处理保留至本次重构完成前的历史补丁中，当前工资工作区不加载也不调用。
  function createInventoryItem(draft) {
    if (!activeStore) return false;
    try {
      const now = new Date().toISOString();
      setWorkspace(createInventoryItemOperation(workspace, {
        ...draft, id: makeId("inventory-item"), batchId: makeId("inventory-batch"), storeId: activeStore.id, at: now,
      }));
      setNotice("商品已加入库存目录");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function updateInventoryItem(itemId, draft) {
    if (!activeStore) return false;
    try {
      setWorkspace(updateInventoryItemOperation(workspace, {
        ...draft, itemId, priceHistoryId: makeId("product-price"), storeId: activeStore.id, at: new Date().toISOString(),
      }));
      setNotice("商品资料已更新");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function archiveInventoryItem(itemId) {
    if (!activeStore) return false;
    try {
      setWorkspace(archiveInventoryItemOperation(workspace, {
        itemId, storeId: activeStore.id, at: new Date().toISOString(),
      }));
      setNotice("商品已归档，历史流水仍可查阅");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function handleInventoryMovement(itemId, movement) {
    if (!activeStore) return false;
    try {
      setWorkspace(recordInventoryMovement(workspace, {
        id: makeId("inventory-movement"),
        batchId: makeId("inventory-batch"),
        itemId,
        storeId: activeStore.id,
        type: movement.type,
        quantity: movement.quantity,
        note: movement.note,
        at: new Date().toISOString(),
      }));
      setNotice("库存流水已记录");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function recordInventoryStocktake(stocktake) {
    if (!activeStore) return false;
    try {
      const at = new Date().toISOString();
      setWorkspace(recordInventoryStocktakeOperation(workspace, {
        id: makeId("inventory-stocktake"),
        movementIds: stocktake.lines.map(() => makeId("inventory-movement")),
        batchIds: stocktake.lines.map(() => makeId("inventory-batch")),
        storeId: activeStore.id,
        countedOn: stocktake.countedOn,
        reason: stocktake.reason,
        lines: stocktake.lines,
        at,
      }));
      setNotice("全店库存盘点已保存");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function transferInventory(itemId, transfer) {
    if (!activeStore) return false;
    try {
      const at = new Date().toISOString();
      setWorkspace(transferInventoryOperation(workspace, {
        id: makeId("inventory-transfer"),
        sourceMovementId: makeId("inventory-movement"),
        targetMovementIds: Array.from({ length: (workspace.inventoryBatches ?? []).length + 1 }, () => makeId("inventory-movement")),
        targetBatchIds: Array.from({ length: (workspace.inventoryBatches ?? []).length + 1 }, () => makeId("inventory-batch")),
        sourceStoreId: activeStore.id,
        targetStoreId: transfer.targetStoreId,
        itemId,
        quantity: transfer.quantity,
        at,
      }));
      setNotice("库存已按批次调拨至目标门店");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function recordRetailSale(sale) {
    if (!activeStore) return false;
    try {
      const at = new Date().toISOString();
      setWorkspace(recordRetailSaleOperation(workspace, {
        receiptId: makeId("sale-receipt"),
        movementIds: sale.items.map(() => makeId("inventory-movement")),
        storeId: activeStore.id,
        businessDate: sale.businessDate,
        paymentMethod: sale.paymentMethod,
        items: sale.items,
        at,
      }));
      setNotice("销售已记录，库存已同步扣减");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function recordCashMovement(movement) {
    if (!activeStore) return false;
    try {
      const at = new Date().toISOString();
      if (movement.targetStoreId) {
        const targetStore = workspace.stores.find((item) => item.id === movement.targetStoreId);
        setWorkspace(transferCashBetweenStoresOperation(workspace, {
          transferId: makeId("cash-transfer"),
          sourceMovementId: makeId("cash-movement"),
          targetMovementId: makeId("cash-movement"),
          sourceStoreId: activeStore.id,
          targetStoreId: movement.targetStoreId,
          businessDate: movement.businessDate,
          amount: movement.amount,
          at,
        }));
        setNotice(`已调拨至 ${targetStore?.name ?? "目标门店"}，两家门店的当日现金日结都会同步纳入`);
      } else {
        setWorkspace(recordCashMovementOperation(workspace, {
          id: makeId("cash-movement"),
          storeId: activeStore.id,
          businessDate: movement.businessDate,
          direction: movement.direction,
          amount: movement.amount,
          reason: movement.reason,
          at,
        }));
        setNotice(movement.direction === "in" ? "现金转入已记录，会纳入当日现金日结" : "现金转出已记录，会纳入当日现金日结");
      }
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function refundRetailSale(receiptId, items, reason) {
    if (!activeStore) return false;
    try {
      setWorkspace(refundRetailSaleOperation(workspace, {
        receiptId,
        refundId: makeId("sale-refund"),
        movementIds: items.map(() => makeId("inventory-movement")),
        storeId: activeStore.id,
        reason,
        items,
        at: new Date().toISOString(),
      }));
      setNotice("销售退款已记录，原批次库存与当日应收已同步更新");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function closeRetailDay(day) {
    if (!activeStore) return false;
    try {
      setWorkspace(closeRetailDayOperation(workspace, {
        closureId: makeId("daily-close"),
        storeId: activeStore.id,
        businessDate: day.businessDate,
        actualByPayment: day.actualByPayment,
        cashCount: day.cashCount,
        openingCash: day.openingCash,
        reason: day.reason,
        at: new Date().toISOString(),
      }));
      setNotice("营业日已日结冻结");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function reopenRetailDay(closureId, reason) {
    if (!activeStore) return false;
    try {
      setWorkspace(reopenRetailDayOperation(workspace, {
        closureId,
        storeId: activeStore.id,
        reason,
        at: new Date().toISOString(),
      }));
      setNotice("营业日已解锁，可重新录入销售");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function createSupplier(draft) {
    if (!activeStore) return false;
    try {
      setWorkspace(createSupplierOperation(workspace, {
        id: makeId("supplier"),
        storeId: activeStore.id,
        code: draft.code,
        name: draft.name,
        category: draft.category,
        at: new Date().toISOString(),
      }));
      setNotice("供应商已新增，仅保存企业主体信息");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function archiveSupplier(supplierId) {
    if (!activeStore) return false;
    try {
      setWorkspace(archiveSupplierOperation(workspace, {
        supplierId,
        storeId: activeStore.id,
        at: new Date().toISOString(),
      }));
      setNotice("供应商已归档，历史采购单仍可查阅");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function recordPurchase(purchase) {
    if (!activeStore) return false;
    try {
      const at = new Date().toISOString();
      setWorkspace(recordPurchaseOperation(workspace, {
        receiptId: makeId("purchase-receipt"),
        movementIds: purchase.items.map(() => makeId("inventory-movement")),
        batchIds: purchase.items.map(() => makeId("inventory-batch")),
        storeId: activeStore.id,
        supplierId: purchase.supplierId,
        purchasedAt: purchase.purchasedAt,
        settlementStatus: purchase.settlementStatus,
        paymentMethod: purchase.paymentMethod,
        paymentDueOn: purchase.paymentDueOn,
        items: purchase.items,
        at,
      }));
      setNotice(purchase.settlementStatus === "paid" ? "采购已付款入库，库存与最近进价已同步更新" : "采购已待付款入库，库存与最近进价已同步更新");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function settlePurchase(receiptId, paymentMethod, paidOn) {
    if (!activeStore) return false;
    try {
      setWorkspace(settlePurchaseOperation(workspace, {
        receiptId,
        storeId: activeStore.id,
        paymentMethod,
        paidOn,
        at: new Date().toISOString(),
      }));
      setNotice("采购付款已记录，并将在付款日期计入经营现金流");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function returnSupplierPurchase(receiptId, items, reason, returnedOn) {
    if (!activeStore) return false;
    try {
      const at = new Date().toISOString();
      setWorkspace(returnSupplierPurchaseOperation(workspace, {
        returnId: makeId("purchase-return"),
        movementIds: items.map(() => makeId("inventory-movement")),
        storeId: activeStore.id,
        receiptId,
        items,
        reason,
        returnedOn,
        at,
      }));
      const receipt = workspace.purchaseReceipts.find((item) => item.id === receiptId);
      setNotice(receipt?.paymentStatus === "paid"
        ? "采购退货已记录，原采购批次库存与经营现金已同步更新"
        : "采购退货已记录，原采购批次库存已同步更新；待付款退货不计入现金流");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function createOperatingExpense(expense) {
    if (!activeStore) return false;
    try {
      setWorkspace(createOperatingExpenseOperation(workspace, {
        id: makeId("operating-expense"),
        storeId: activeStore.id,
        expenseDate: expense.expenseDate,
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        amount: expense.amount,
        at: new Date().toISOString(),
      }));
      setNotice("经营费用已记录");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  function voidOperatingExpense(expenseId, reason) {
    if (!activeStore) return false;
    try {
      setWorkspace(voidOperatingExpenseOperation(workspace, {
        expenseId,
        storeId: activeStore.id,
        reason,
        at: new Date().toISOString(),
      }));
      setNotice("费用记录已作废，历史已保留");
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }
  */

  function submitAdjustment(event) {
    event.preventDefault();
    const draft = adjustmentModal.draft;
    const target = workspace.employees.find((employee) => employee.id === draft.employeeId);
    if (!target || !activeStore) return setNotice("请选择要调薪的员工");
    try {
      setWorkspace(recordSalaryAdjustment(workspace, {
        employeeId: target.id,
        storeId: activeStore.id,
        values: draft.values,
        date: draft.date,
        reason: draft.reason,
        id: makeId("adjustment"),
      }));
    } catch (error) {
      setNotice(error.message);
      return;
    }
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
    try {
      setWorkspace(isResigned
        ? resignEmployee(workspace, { employeeId: resignationModal.employee.id, resignationDate: resignationModal.date, eventId: makeId("resignation") })
        : restoreEmployee(workspace, { employeeId: resignationModal.employee.id, eventId: makeId("restore"), at: new Date().toISOString() }));
    } catch (error) {
      setNotice(error.message);
      return;
    }
    setResignationModal(null);
    setNotice(isResigned ? "已办理离职" : "已恢复在职");
  }

  function openTransferModal(employee) {
    const hasFutureTransfer = getEmployeeAssignments(workspace, employee.id).some((assignment) => assignment.startMonth > currentMonth);
    if (hasFutureTransfer) return setNotice("该员工已有计划调店记录");
    const targetStore = activeStores.find((store) => store.id !== activeStore.id);
    if (!targetStore) return setNotice("没有可接收员工的其他营业门店");
    setTransferModal({ employee, targetStoreId: targetStore.id, effectiveMonth: currentMonth, reason: "排班平衡" });
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
        reason: draft.reason,
      }));
    } catch (error) {
      setNotice(error.message);
      return;
    }
    if (draft.effectiveMonth === currentMonth) setActiveStoreId(targetStore.id);
    setTransferModal(null);
    setNotice(`调店计划已保存，将于 ${draft.effectiveMonth} 生效`);
  }

  if (appLocked === null && loadedWorkspace === null && loadError === null) {
    return <div className="app-empty">正在启动…</div>;
  }

  if (loadError === "corrupt") {
    async function handleRecoveryFileSelected(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        validateBackupFileSize(file.size);
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        if (parsed.protected) {
          setRecoveryFile(file);
          setRecoveryPassphrase("");
        } else {
          prepareWorkspaceRestore(file);
        }
      } catch {
        setNotice("文件不是工资系统备份");
      }
    }

    function handleRecoveryPassphraseSubmit(event) {
      event.preventDefault();
      if (!recoveryFile || !recoveryPassphrase) return;
      prepareWorkspaceRestore(recoveryFile, recoveryPassphrase);
      setRecoveryFile(null);
      setRecoveryPassphrase("");
    }

    return (
      <>
        <RecoveryScreen
          recoveryState="corrupt-fallback"
          onRestore={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/json,.json";
            input.onchange = handleRecoveryFileSelected;
            input.click();
          }}
          onExportCorrupt={() => {
            setNotice("请从系统设置中导出或联系支持");
          }}
          onReset={async () => {
            const next = createInitialWorkspace();
            await saveWorkspace(next);
            setWorkspace(next);
            setActiveStoreId(next.stores.find((store) => store.status === "active")?.id ?? "");
            setLoadError(null);
            setLoadedWorkspace(next);
            setActiveMonth(createDefaultMonthValue());
            setActivePage("home");
            setNotice("已重置为演示工作区");
          }}
        />
        {recoveryFile ? (
          <div className="lock-screen">
            <div className="lock-screen__card">
              <h1>此备份已加密</h1>
              <p>请输入备份口令以恢复数据</p>
              <form className="modal-form" onSubmit={handleRecoveryPassphraseSubmit}>
                <label className="field"><span>备份口令</span><input autoFocus type="password" value={recoveryPassphrase} onChange={(e) => setRecoveryPassphrase(e.target.value)} /></label>
                <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => { setRecoveryFile(null); setRecoveryPassphrase(""); }}>取消</button><button className="primary-button" type="submit" disabled={!recoveryPassphrase}>确认</button></div>
              </form>
            </div>
          </div>
        ) : null}
        {notice ? <div className="toast" role="status" aria-live="polite">{notice}</div> : null}
        {restoreModal ? <Modal title="恢复备份数据" onClose={() => setRestoreModal(null)}><div className="modal-form"><div className="modal-summary"><strong>即将覆盖当前工资系统数据</strong><span>备份版本：{restoreModal.version ?? "未知"} · 门店数量：{restoreModal.storeCount} 家</span><span>导出时间：{restoreModal.exportedAt ? new Date(restoreModal.exportedAt).toLocaleString("zh-CN") : "未知"}</span></div><p className="modal-copy">旧版备份会自动升级，恢复后保留全部门店、员工及工资记录。</p><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setRestoreModal(null)}>取消</button><button className="primary-button" type="button" onClick={confirmWorkspaceRestore}>确认恢复</button></div></div></Modal> : null}
      </>
    );
  }

  if (appLocked) {
    return <LockScreen onUnlock={() => setAppLocked(false)} />;
  }

  if (!activeStoreView) return <div className="app-empty">没有可用门店，请从备份恢复数据。</div>;

  const formattedSaveTime = saveState.savedAt
    ? `已保存 ${new Date(saveState.savedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
    : "已保存";

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          colorSuccess: "#52c41a",
          colorWarning: "#faad14",
          colorError: "#ff4d4f",
          borderRadius: 8,
          fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", -apple-system, sans-serif',
        },
      }}
    >
      <Layout style={{ minHeight: "100vh" }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="dark"
          width={220}
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 1001,
          }}
        >
          <div
            style={{
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "0" : "0 20px",
              gap: 12,
              background: "#002140",
              overflow: "hidden",
            }}
          >
            <img src="/app-icon.svg" alt="logo" style={{ width: 32, height: 32, flexShrink: 0 }} />
            {!collapsed && (
              <div style={{ color: "#fff", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                <strong style={{ fontSize: 16, display: "block", color: "#fff" }}>门店工资助手</strong>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>人员与工资一站式管理</span>
              </div>
            )}
          </div>

          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[activePage]}
            onClick={({ key }) => setActivePage(key)}
            items={NAV_ITEMS}
            style={{ borderRight: 0, marginTop: 8 }}
          />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: "all 0.2s", background: "#f0f2f5" }}>
          <Header
            style={{
              padding: "0 24px",
              background: "#fff",
              boxShadow: "0 1px 4px rgba(0,21,41,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "sticky",
              top: 0,
              zIndex: 1000,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {currentFeature?.label}
              </Typography.Title>
            </div>

            <Space size="middle">
              <Select
                aria-label="当前门店"
                value={activeStore.id}
                onChange={(val) => setActiveStoreId(val)}
                style={{ width: 160 }}
                options={activeStores.map((s) => ({ value: s.id, label: s.name }))}
                prefix={<ShopOutlined />}
              />
              {saveState.status === "error" ? (
                <Tag color="error">保存失败，请检查导出</Tag>
              ) : (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  {formattedSaveTime}
                </Tag>
              )}
            </Space>
          </Header>

          <Content style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
            <Suspense fallback={<div style={{ minHeight: 280, display: "grid", placeItems: "center", color: "#595959" }}>正在加载工作区…</div>}>
            {activePage === "home" ? <HomePage workspace={workspace} activeMonth={activeMonth} onNavigate={setActivePage} onSelectStore={setActiveStoreId} onSelectEmployee={setSelectedEmployeeId} openAdjustmentModal={openAdjustmentModal} onNavigateToEmployee={handleNavigateToEmployee} /> : null}
            {activePage === "employees" ? <EmployeesPage workspace={workspace} store={activeStore} currentMonth={currentMonth} onCreate={() => setEmployeeModal({ mode: "create", draft: createEmployeeDraft() })} onToggleResignation={handleToggleResignation} onTransfer={openTransferModal} /> : null}
            {activePage === "attendance" ? <AttendancePage store={activeStore} activeMonth={activeMonth} rows={payrollRows} patchEntry={patchMonthlyEntry} toggleComplete={toggleEntryComplete} isLocked={isLocked} onNavigate={setActivePage} /> : null}
            {activePage === "reports" ? <ReportsPage workspace={workspace} activeMonth={activeMonth} setActiveMonth={setActiveMonth} onSelectStore={setActiveStoreId} onNavigate={setActivePage} /> : null}
            {activePage === "settings" ? <SettingsPage store={activeStoreView} stores={workspace.stores} patchConfig={patchStoreConfig} onExportBackup={exportWorkspaceBackup} onImportBackup={prepareWorkspaceRestore} onCreateStore={() => setStoreModal({ mode: "create", name: "" })} onEditStore={(store) => setStoreModal({ mode: "edit", storeId: store.id, name: store.name })} onArchiveStore={requestArchiveStore} onRestoreStore={restoreStore} autoBackups={autoBackups} autoBackupAvailable={Boolean(desktopApi)} autoBackupBusy={autoBackupBusy} onCreateAutoBackup={() => createAutomaticBackup(BACKUP_REASONS.MANUAL)} onRestoreAutoBackup={prepareAutomaticRestore} onRequestLock={() => setAppLocked(true)} onResetDemoWorkspace={() => setDemoResetModal(true)} ruleHistory={(workspace.ruleHistory ?? []).filter((record) => record.storeId === activeStore.id)} operationLog={workspace.operationLog ?? []} /> : null}
            {activePage === "payroll" ? <PayrollPage activeStore={activeStoreView} activeMonth={activeMonth} setActiveMonth={setActiveMonth} exportCurrentMonth={exportCurrentMonth} totalNetSalary={totalNetSalary} forecastNetSalary={forecastNetSalary} payrollRows={payrollRows} touchedRows={touchedRows} exceptionCount={exceptionCount} completionRate={completionRate} monthlyStore={monthlyStore} selectedRow={selectedRow} setSelectedEmployeeId={setSelectedEmployeeId} patchMonthlyEntry={patchMonthlyEntry} toggleEntryComplete={toggleEntryComplete} setEmployeeModal={setEmployeeModal} openAdjustmentModal={openAdjustmentModal} isLocked={isLocked} onClosePayroll={requestClosePayroll} onUnlockPayroll={() => setUnlockModal({ reason: PAYROLL_UNLOCK_REASONS[0] })} /> : null}
            </Suspense>
          </Content>
        </Layout>
      </Layout>


      {notice ? <div className="toast" role="status" aria-live="polite">{notice}</div> : null}

      {storeModal ? <Modal title={storeModal.mode === "create" ? "新增门店" : "编辑门店名称"} onClose={() => setStoreModal(null)}><form className="modal-form" onSubmit={submitStore}><label className="field"><span>门店名称</span><input autoFocus maxLength="40" value={storeModal.name} onChange={(event) => setStoreModal((current) => ({ ...current, name: event.target.value }))} placeholder="例如：人民广场店" /></label>{storeModal.mode === "create" ? <p className="modal-copy">新门店会复制当前门店的工资规则，不会复制员工或工资记录。</p> : null}<ModalActions onCancel={() => setStoreModal(null)} label="保存门店" /></form></Modal> : null}

      {archiveStoreModal ? <Modal title="停用门店" onClose={() => setArchiveStoreModal(null)}><div className="modal-form"><div className="modal-summary"><strong>{archiveStoreModal.name}</strong><span>停用后将从日常录入中隐藏，历史工资仍可在报表中查看。</span></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setArchiveStoreModal(null)}>取消</button><button className="danger-button" type="button" onClick={confirmArchiveStore}>确认停用</button></div></div></Modal> : null}

      {employeeModal ? <Modal title="新增岗位成员" onClose={() => setEmployeeModal(null)}><form className="modal-form" onSubmit={submitEmployee}><div className="modal-summary"><strong>系统会自动生成匿名成员代号</strong><span>不会收集姓名、电话、证件、住址、银行卡或其他个人身份信息。</span></div><p className="modal-copy">基础工资、加班时薪和全勤奖金只能在工资管理的调薪记录中修改。</p><ModalActions onCancel={() => setEmployeeModal(null)} label="新增并设置薪资" /></form></Modal> : null}

      {adjustmentModal ? <Modal title={adjustmentModal.mode === "initial" ? "设置初始薪资" : "新增调薪记录"} width={700} onClose={() => setAdjustmentModal(null)}><form className="modal-form modal-form--wide" onSubmit={submitAdjustment}><label className="field"><span>员工</span><select value={adjustmentModal.draft.employeeId} onChange={(event) => { const employee = activeEmployees.find((item) => item.id === event.target.value); setAdjustmentModal((current) => ({ ...current, mode: employee?.salaryConfigured ? "adjustment" : "initial", draft: { ...createAdjustmentDraft(employee), date: current.draft.date, reason: current.draft.reason } })); }}>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><label className="field"><span>调整日期</span><input type="date" value={adjustmentModal.draft.date} onChange={(event) => setAdjustmentModal((current) => ({ ...current, draft: { ...current.draft, date: event.target.value } }))} /></label><div className="adjustment-grid"><div className="adjustment-grid__head">当前值</div><div className="adjustment-grid__head">调整后</div>{EMPLOYEE_FIELDS.map((field) => { const employee = activeEmployees.find((item) => item.id === adjustmentModal.draft.employeeId); const old = employee?.[field.key] ?? 0; return <div className="adjustment-row" key={field.key}><div className="adjustment-row__old"><span>{field.label}</span><strong>{field.key === "overtimeRate" ? `${old} / 小时` : formatCurrency(old)}</strong></div><label className="field adjustment-row__new"><span>{field.label}</span><input type="number" min={field.key === "baseSalary" ? "0.01" : "0"} step={field.step} value={adjustmentModal.draft.values?.[field.key] ?? ""} onChange={(event) => setAdjustmentModal((current) => ({ ...current, draft: { ...current.draft, values: { ...current.draft.values, [field.key]: event.target.value } } }))} /></label></div>; })}</div><label className="field"><span>业务原因</span><select value={adjustmentModal.draft.reason} onChange={(event) => setAdjustmentModal((current) => ({ ...current, draft: { ...current.draft, reason: event.target.value } }))}>{PAYROLL_ADJUSTMENT_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></label><ModalActions onCancel={() => setAdjustmentModal(null)} label={adjustmentModal.mode === "initial" ? "确认初始薪资" : "保存记录"} /></form></Modal> : null}

      {transferModal ? <Modal title="员工调店" onClose={() => setTransferModal(null)}><form className="modal-form" onSubmit={submitTransfer}><div className="modal-summary"><strong>{transferModal.employee.name}</strong><span>当前门店：{activeStore.name}</span></div><label className="field"><span>目标门店</span><select value={transferModal.targetStoreId} onChange={(event) => setTransferModal((current) => ({ ...current, targetStoreId: event.target.value }))}>{activeStores.filter((store) => store.id !== activeStore.id).map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label><label className="field"><span>生效月份</span><input type="month" min={currentMonth} value={transferModal.effectiveMonth} onChange={(event) => setTransferModal((current) => ({ ...current, effectiveMonth: event.target.value }))} /></label><label className="field"><span>调店原因</span><select value={transferModal.reason} onChange={(event) => setTransferModal((current) => ({ ...current, reason: event.target.value }))}>{ASSIGNMENT_REASONS.filter((reason) => ["新店筹备支援", "排班平衡"].includes(reason)).map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></label><ModalActions onCancel={() => setTransferModal(null)} label="保存调店计划" /></form></Modal> : null}

      {resignationModal ? <Modal title={resignationModal.mode === "resign" ? "办理离职" : "恢复在职"} onClose={() => setResignationModal(null)}><form className="modal-form" onSubmit={submitResignation}><div className="modal-summary"><strong>{resignationModal.employee.name}</strong><span>{activeStore.name} · 工号 {resignationModal.employee.id}</span></div>{resignationModal.mode === "resign" ? <label className="field"><span>离职日期</span><input type="date" value={resignationModal.date} onChange={(event) => setResignationModal((current) => ({ ...current, date: event.target.value }))} /></label> : <p className="modal-copy">恢复在职后，该员工会回到当前归属门店的工资和考勤列表中。</p>}<ModalActions onCancel={() => setResignationModal(null)} label={resignationModal.mode === "resign" ? "确认离职" : "确认恢复"} /></form></Modal> : null}

      {closeModal ? <Modal title="确认本月月结" onClose={() => setCloseModal(null)}>
        <div className="modal-form">
          <div className="modal-summary">
            <strong>{activeStore.name} · {activeMonth}</strong>
            <span>本次共核对 {closeModal.totalCount} 位员工：{closeModal.blockerCount} 位阻塞、{closeModal.reviewCount} 位需复核、{closeModal.cleanCount} 位无异常。</span>
            <span>月结后将冻结当前工资结果，后续修改需要填写原因后解锁。</span>
          </div>
          {closeModal.blockerCount > 0 ? (
            <div className="modal-warning">
              <strong>仍有 {closeModal.blockerCount} 位员工阻塞月结</strong>
              {closeModal.blockerRows.slice(0, 5).map((row) => (
                <span key={row.employee.id}>{row.employee.name}：{row.closeBlockers.map(getPayrollIssueMessage).join("、")}</span>
              ))}
            </div>
          ) : null}
          {closeModal.reviewCount > 0 ? (
            <div className="modal-warning">
              <strong>{closeModal.reviewCount} 位员工存在复核提醒</strong>
              {closeModal.reviewRows.slice(0, 5).map((row) => (
                <span key={row.employee.id}>{row.employee.name}：{row.issueItems.join("、")}</span>
              ))}
            </div>
          ) : null}
          {closeModal.cleanCount > 0 ? <p className="modal-copy">{closeModal.cleanCount} 位员工已确认完成且没有复核提醒。</p> : null}
          {closeModal.canClose ? <p className="modal-copy">当前没有月结阻塞，可以冻结本店本月工资。</p> : <p className="modal-copy">请先处理阻塞员工；清零后才能执行本店月结。</p>}
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={() => setCloseModal(null)}>继续核对</button>
            {closeModal.canClose ? <button className="primary-button" type="button" onClick={confirmClosePayroll}>{closeModal.reviewCount > 0 ? "确认复核并月结" : "确认月结"}</button> : null}
          </div>
        </div>
      </Modal> : null}

      {unlockModal ? <Modal title="解锁本月工资" onClose={() => setUnlockModal(null)}><form className="modal-form" onSubmit={confirmUnlockPayroll}><div className="modal-summary"><strong>{activeStore.name} · {activeMonth}</strong><span>解锁后可以重新录入，原月结结果将停止使用。</span></div><label className="field"><span>解锁业务原因</span><select autoFocus value={unlockModal.reason} onChange={(event) => setUnlockModal({ reason: event.target.value })}>{PAYROLL_UNLOCK_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></label><ModalActions onCancel={() => setUnlockModal(null)} label="确认解锁" /></form></Modal> : null}

      {restoreModal ? <Modal title="恢复备份数据" onClose={() => setRestoreModal(null)}><div className="modal-form"><div className="modal-summary"><strong>即将覆盖当前工资系统数据</strong><span>备份版本：{restoreModal.version ?? "未知"} · 门店数量：{restoreModal.storeCount} 家</span><span>导出时间：{restoreModal.exportedAt ? new Date(restoreModal.exportedAt).toLocaleString("zh-CN") : "未知"}</span></div><p className="modal-copy">旧版备份会自动升级，恢复后保留全部门店、员工及工资记录。</p><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setRestoreModal(null)}>取消</button><button className="primary-button" type="button" onClick={confirmWorkspaceRestore}>确认恢复</button></div></div></Modal> : null}

      {demoResetModal ? <Modal title="恢复泛化演示工作区" onClose={() => setDemoResetModal(false)}><div className="modal-form"><div className="modal-summary"><strong>即将重置为默认演示数据</strong><span>会恢复为泛化门店、虚构员工和示例金额。</span><span>当前本地工作区会被覆盖；如桌面版可用，将先创建恢复点。</span></div><p className="modal-copy">这个操作不会自动迁移旧示例门店名，而是直接回到默认演示工作区。</p><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setDemoResetModal(false)}>取消</button><button className="primary-button" type="button" onClick={confirmDemoWorkspaceReset}>确认恢复演示数据</button></div></div></Modal> : null}
    </ConfigProvider>
  );
}


function ModalActions({ onCancel, label }) {
  return <div className="modal-actions"><button className="secondary-button" type="button" onClick={onCancel}>取消</button><button className="primary-button" type="submit">{label}</button></div>;
}
