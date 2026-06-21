const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("payrollDesktop", Object.freeze({
  createBackup: (payload, reason) => ipcRenderer.invoke("payroll-backup:create", payload, reason),
  listBackups: () => ipcRenderer.invoke("payroll-backup:list"),
  readBackup: (id) => ipcRenderer.invoke("payroll-backup:read", id),
}));
