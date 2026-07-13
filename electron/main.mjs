import { app, BrowserWindow, shell, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const appRoot = isDev ? path.join(__dirname, "..") : app.getAppPath();

const BACKUP_FILE_NAME = "finance-backup.json";
const backupConfigPath = () => path.join(app.getPath("userData"), "backup-config.json");

async function readBackupConfig() {
  try {
    return JSON.parse(await fs.readFile(backupConfigPath(), "utf-8"));
  } catch {
    return {};
  }
}

async function writeBackupConfig(config) {
  await fs.writeFile(backupConfigPath(), JSON.stringify(config), "utf-8");
}

ipcMain.handle("backup:getStatus", async () => {
  const config = await readBackupConfig();
  return { configured: Boolean(config.backupPath), label: config.backupPath };
});

ipcMain.handle("backup:choosePath", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  await writeBackupConfig({ backupPath: result.filePaths[0] });
  return { ok: true, label: result.filePaths[0] };
});

ipcMain.handle("backup:write", async (_event, json) => {
  const config = await readBackupConfig();
  if (!config.backupPath) return { ok: false, error: "no-path" };
  try {
    await fs.writeFile(path.join(config.backupPath, BACKUP_FILE_NAME), json, "utf-8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
});

ipcMain.handle("backup:clear", async () => {
  await writeBackupConfig({});
  return { ok: true };
});

const windowIcon = isDev
  ? path.join(appRoot, "public", "pwa-512x512.png")
  : path.join(appRoot, "dist", "pwa-512x512.png");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: windowIcon,
    title: "Finzo",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(appRoot, "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
