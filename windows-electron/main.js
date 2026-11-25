const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

let mainWindow;
let updateCheckStarted = false;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#090f1d",
    title: "NEXUS",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.on("closed", () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\\/\\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
}

async function checkForUpdates(manual = false) {
  if (!app.isPackaged) {
    if (manual) dialog.showMessageBox({ type: "info", title: "NEXUS Updates", message: "Automatic updates are available in the installed NEXUS application, not in development mode." });
    return;
  }
  if (updateCheckStarted) return;
  updateCheckStarted = true;
  try {
    const result = await autoUpdater.checkForUpdates();
    if (manual && result && result.updateInfo && result.updateInfo.version === app.getVersion()) {
      dialog.showMessageBox({ type: "info", title: "NEXUS Updates", message: "You're already using the latest version of NEXUS." });
    }
  } catch (error) {
    console.error("NEXUS update check failed:", error);
    if (manual) dialog.showMessageBox({ type: "warning", title: "Update check failed", message: "NEXUS couldn't check for updates. Please check your internet connection and try again." });
  } finally {
    updateCheckStarted = false;
  }
}

autoUpdater.on("update-available", (info) => {
  if (mainWindow) mainWindow.setTitle(`NEXUS — downloading update ${info.version}`);
});
autoUpdater.on("update-not-available", () => {
  if (mainWindow) mainWindow.setTitle("NEXUS");
});
autoUpdater.on("error", (error) => {
  console.error("NEXUS updater error:", error);
});
autoUpdater.on("update-downloaded", async (info) => {
  const choice = await dialog.showMessageBox(mainWindow, {
    type: "info",
    buttons: ["Restart and install", "Later"],
    defaultId: 0,
    cancelId: 1,
    title: "NEXUS update ready",
    message: `NEXUS ${info.version} has been downloaded.`,
    detail: "Restart NEXUS now to finish installing the update."
  });
  if (choice.response === 0) autoUpdater.quitAndInstall();
});

app.whenReady().then(() => {
  createWindow();
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "NEXUS", submenu: [
      { label: "Check for updates", click: () => checkForUpdates(true) },
      { role: "reload" },
      { role: "togglefullscreen" },
      { type: "separator" },
      { role: "quit" }
    ] }
  ]));
  if (app.isPackaged) setTimeout(() => checkForUpdates(false), 8000);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});