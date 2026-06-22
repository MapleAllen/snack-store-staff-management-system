const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("payrollDesktop", Object.freeze({
  createBackup: (payload, reason) => ipcRenderer.invoke("payroll-backup:create", payload, reason),
  listBackups: () => ipcRenderer.invoke("payroll-backup:list"),
  readBackup: (id) => ipcRenderer.invoke("payroll-backup:read", id),

  loadWorkspace: () => ipcRenderer.invoke("workspace:load"),
  saveWorkspace: (workspace) => ipcRenderer.invoke("workspace:save", workspace),
  getWorkspaceStatus: () => ipcRenderer.invoke("workspace:status"),

  getLockStatus: () => ipcRenderer.invoke("lock:status"),
  setPin: (pin, oldPin) => ipcRenderer.invoke("lock:set-pin", pin, oldPin),
  unlock: (pin) => ipcRenderer.invoke("lock:unlock", pin),
  lock: () => ipcRenderer.invoke("lock:lock"),
  clearPin: (pin) => ipcRenderer.invoke("lock:clear-pin", pin),
}));
