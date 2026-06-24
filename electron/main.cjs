const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === 'true');

function getIconPath() {
  // Dev: use public logo (served by Vite)
  if (isDev) {
    return path.join(__dirname, '../public/images/logo.png');
  }
  // Packaged: the logo is copied by Vite into dist/images
  const distLogo = path.join(app.getAppPath(), 'dist/images/logo.png');
  try {
    if (require('fs').existsSync(distLogo)) return distLogo;
  } catch {}
  // Other fallbacks
  const candidates = [
    path.join(__dirname, '../dist/images/logo.png'),
    path.join(process.resourcesPath, 'app.asar/dist/images/logo.png'),
  ];
  for (const p of candidates) {
    try {
      if (require('fs').existsSync(p)) return p;
    } catch {}
  }
  return null; // Will use default
}

function createWindow() {
  const iconPath = getIconPath();
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    title: 'ZenScape',
    ...(iconPath ? { icon: iconPath } : {}),
    backgroundColor: '#E6E8EA', // Matches common light theme
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // No preload needed for this app (pure web + Supabase)
    },
    // Windows 11 friendly defaults
    frame: true,
    autoHideMenuBar: true, // Cleaner look, press Alt to show
  });

  // Center and show after ready to avoid flicker
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      // Open DevTools in development
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  if (isDev) {
    // In dev, load Vite dev server (hot reload works)
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // In production, load the built static files (relative paths thanks to base: './')
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external URLs (weather APIs, Supabase, links, etc.) in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only open http/https in external browser
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle navigation to prevent leaving the app for external sites
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    if (parsed.origin !== 'http://localhost:5173' && !url.startsWith('file:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  return mainWindow;
}

// Create app menu (minimal, Windows-friendly)
function createMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { role: 'close' },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Fenêtre',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Single instance lock (good desktop behavior)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const allWindows = BrowserWindow.getAllWindows();
    if (allWindows.length > 0) {
      const win = allWindows[0];
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createMenu();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  // On Windows/Linux quit when all windows closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new windows from being created outside our control (already handled above)
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (e) => {
    e.preventDefault();
  });
});