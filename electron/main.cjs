const { app, BrowserWindow, ipcMain, session } = require("electron");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createBackupStore } = require("./backup-store.cjs");
const { createWorkspaceStore } = require("./workspace-store.cjs");

const APP_TITLE = "门店工资助手";
let backupStore;
let workspaceStore;

const LOCK_FILE = "lock.json";
const MAX_PIN_ATTEMPTS = 5;
const PIN_COOLDOWN_MS = 30_000;

let lockPinHash = null;
let lockPinSalt = null;
let failedAttempts = 0;
let cooldownUntil = null;

async function loadLockState(baseDir) {
  try {
    const raw = await fs.readFile(path.join(baseDir, LOCK_FILE), "utf8");
    const data = JSON.parse(raw);
    if (data.pinHash && data.salt) {
      lockPinHash = data.pinHash;
      lockPinSalt = data.salt;
    }
    failedAttempts = 0;
    cooldownUntil = null;
  } catch {
    lockPinHash = null;
    lockPinSalt = null;
    failedAttempts = 0;
    cooldownUntil = null;
  }
}

async function saveLockState(baseDir) {
  if (lockPinHash && lockPinSalt) {
    await fs.writeFile(path.join(baseDir, LOCK_FILE),
      JSON.stringify({ pinHash: lockPinHash, salt: lockPinSalt }), "utf8");
  } else {
    try { await fs.rm(path.join(baseDir, LOCK_FILE), { force: true }); } catch {}
  }
}

function hashPin(pin, salt) {
  salt = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(pin, salt, 100_000, 64, "sha512").toString("hex");
  return { hash, salt };
}

function verifyPin(pin) {
  if (!lockPinHash || !lockPinSalt) return true;
  return hashPin(pin, lockPinSalt).hash === lockPinHash;
}

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

app.whenReady().then(async () => {
  const userDataPath = app.getPath("userData");
  await loadLockState(userDataPath);

  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  backupStore = createBackupStore({ baseDir: userDataPath });
  workspaceStore = createWorkspaceStore({ baseDir: userDataPath });

  ipcMain.handle("payroll-backup:create", (_event, payload, reason) => backupStore.create(payload, reason));
  ipcMain.handle("payroll-backup:list", () => backupStore.list());
  ipcMain.handle("payroll-backup:read", (_event, id) => backupStore.read(id));

  ipcMain.handle("workspace:load", async () => {
    const result = await workspaceStore.load();
    return result;
  });

  ipcMain.handle("workspace:save", async (_event, workspace) => {
    try {
      return await workspaceStore.save(workspace);
    } catch (err) {
      throw err;
    }
  });

  ipcMain.handle("workspace:status", () => workspaceStore.getStatus());

  ipcMain.handle("lock:status", () => ({
    locked: lockPinHash !== null,
    pinSet: lockPinHash !== null,
  }));

  ipcMain.handle("lock:set-pin", async (_event, pin, oldPin) => {
    if (typeof pin !== "string" || !/^\d{4,6}$/.test(pin)) {
      throw Object.assign(new Error("PIN 必须为 4-6 位数字"), { code: "lock:pin-format-invalid" });
    }
    if (lockPinHash && lockPinSalt) {
      if (!oldPin || !verifyPin(oldPin)) {
        throw Object.assign(new Error("旧 PIN 不正确"), { code: "lock:pin-old-mismatch" });
      }
    }
    const { hash, salt } = hashPin(pin);
    lockPinHash = hash;
    lockPinSalt = salt;
    failedAttempts = 0;
    cooldownUntil = null;
    await saveLockState(userDataPath);
    return { success: true };
  });

  ipcMain.handle("lock:unlock", (_event, pin) => {
    if (!lockPinHash || !lockPinSalt) return { success: true };
    if (cooldownUntil && Date.now() < cooldownUntil) {
      throw Object.assign(new Error("尝试次数过多，请稍后再试"), { code: "lock:pin-attempt-limited" });
    }
    if (!verifyPin(pin)) {
      failedAttempts += 1;
      if (failedAttempts >= MAX_PIN_ATTEMPTS) {
        cooldownUntil = Date.now() + PIN_COOLDOWN_MS;
        failedAttempts = 0;
        throw Object.assign(new Error("尝试次数过多，请等待 30 秒"), { code: "lock:pin-attempt-limited" });
      }
      throw Object.assign(new Error("PIN 不正确"), { code: "lock:pin-invalid" });
    }
    failedAttempts = 0;
    cooldownUntil = null;
    return { success: true };
  });

  ipcMain.handle("lock:lock", () => {
    failedAttempts = 0;
    cooldownUntil = null;
    return { success: true };
  });

  ipcMain.handle("lock:clear-pin", async (_event, pin) => {
    if (!lockPinHash || !lockPinSalt) return { success: true };
    if (!verifyPin(pin)) {
      throw Object.assign(new Error("PIN 不正确"), { code: "lock:pin-invalid" });
    }
    lockPinHash = null;
    lockPinSalt = null;
    failedAttempts = 0;
    cooldownUntil = null;
    await saveLockState(userDataPath);
    return { success: true };
  });

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
