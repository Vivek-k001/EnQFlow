const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.enqflow.desktop');
}

function createWindow() {
  const iconIco = path.join(__dirname, 'public', 'logo.ico');
  const iconPng = path.join(__dirname, 'public', 'logo.png');
  const iconPath = process.platform === 'win32' && fs.existsSync(iconIco) ? iconIco : iconPng;

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (fs.existsSync(iconPath)) {
    mainWindow.setIcon(iconPath);
  }

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.maximize();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
