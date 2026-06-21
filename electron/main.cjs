const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("node:path");
const { createBackupStore } = require("./backup-store.cjs");

const APP_TITLE = "门店工资助手";
let backupStore;

function createMainWindow() {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 720,
    title: APP_TITLE,
    backgroundColor: "#f4f5f5",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    const allowed = devServerUrl
      ? new URL(targetUrl).origin === new URL(devServerUrl).origin
      : targetUrl.startsWith("file:");
    if (!allowed) event.preventDefault();
  });

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    return;
  }

  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.setName(APP_TITLE);

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  backupStore = createBackupStore({ baseDir: app.getPath("userData") });
  ipcMain.handle("payroll-backup:create", (_event, payload, reason) => backupStore.create(payload, reason));
  ipcMain.handle("payroll-backup:list", () => backupStore.list());
  ipcMain.handle("payroll-backup:read", (_event, id) => backupStore.read(id));
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
