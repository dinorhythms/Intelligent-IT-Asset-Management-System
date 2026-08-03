const { app, BrowserWindow, Menu, session, shell } = require('electron');
const path = require('path');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const APP_ORIGIN = new URL(APP_URL).origin;
const API_ORIGIN = new URL(API_URL).origin;

const PROTECTED_PATHS = ['/', '/assets', '/requests', '/services', '/analytics', '/scan'];
const PUBLIC_PATHS = ['/login', '/register'];

function isProtectedPath(pathname) {
  return PROTECTED_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

async function hasAuthToken() {
  try {
    const cookies = await session.defaultSession.cookies.get({
      url: APP_URL,
      name: 'auth_token',
    });
    return cookies.length > 0 && Boolean(cookies[0].value);
  } catch {
    return false;
  }
}

async function enforceAuth(window, targetUrl) {
  try {
    const target = new URL(targetUrl);
    if (target.origin !== APP_ORIGIN) return;

    const pathname = target.pathname;

    if (isPublicPath(pathname)) {
      // Prevent an authenticated user from lingering on the login page.
      if (await hasAuthToken() && pathname !== '/register') {
        window.loadURL(APP_URL);
      }
      return;
    }

    if (isProtectedPath(pathname) && !(await hasAuthToken())) {
      const loginUrl = new URL('/login', APP_URL);
      loginUrl.searchParams.set('next', pathname + target.search);
      window.loadURL(loginUrl.toString());
    }
  } catch {
    // Ignore malformed URLs; navigation is blocked elsewhere.
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#020617',
    title: 'Intelligent IT Asset Manager',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    // Never allow the renderer to spawn new Electron windows.
    if (url.startsWith('https://')) {
      // External documentation links can open in the system browser.
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    const target = new URL(url);
    if (target.origin !== APP_ORIGIN) {
      event.preventDefault();
      if (target.origin === API_ORIGIN) return;
      if (target.protocol === 'https:') shell.openExternal(url);
    }
  });

  window.webContents.on('did-navigate', (_event, url) => {
    enforceAuth(window, url);
  });

  window.webContents.on('did-navigate-in-page', (_event, _url, isMainFrame) => {
    if (isMainFrame) {
      enforceAuth(window, window.webContents.getURL());
    }
  });

  window.webContents.on('will-redirect', (event, url) => {
    const target = new URL(url);
    if (target.origin !== APP_ORIGIN && target.origin !== API_ORIGIN) {
      event.preventDefault();
    }
  });

  window.loadURL(APP_URL);
  return window;
}

function buildMenu(window) {
  const template = [
    {
      label: 'App',
      submenu: [
        {
          label: 'Go to Dashboard',
          accelerator: 'CmdOrCtrl+D',
          click: () => window.loadURL(APP_URL),
        },
        { type: 'separator' },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Toggle Developer Tools', accelerator: 'CmdOrCtrl+Shift+I', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { label: 'Reset Zoom', role: 'resetZoom' },
        { label: 'Full Screen', role: 'togglefullscreen' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  const window = createWindow();
  buildMenu(window);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = createWindow();
      buildMenu(win);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});
