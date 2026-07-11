const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let fileToOpenOnStartup = null;

// Parse arguments to find Markdown files
function parseArgv(argv) {
  // On packaged Windows apps, argv[0] is executable, argv[1] could be the file
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg && !arg.startsWith('--') && (arg.toLowerCase().endsWith('.md') || arg.toLowerCase().endsWith('.markdown') || arg.toLowerCase().endsWith('.txt'))) {
      try {
        if (fs.existsSync(arg) && fs.statSync(arg).isFile()) {
          return path.resolve(arg);
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }
  return null;
}

// Check command-line arguments on launch
fileToOpenOnStartup = parseArgv(process.argv);

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      const filePath = parseArgv(commandLine);
      if (filePath) {
        mainWindow.webContents.send('open-file', filePath);
      }
    }
  });

  app.whenReady().then(() => {
    createWindow();
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // frameless window for modern, custom-designed UI
    transparent: false,
    backgroundColor: '#0a0a0c',
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open dev tools in development mode if run with --dev
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler - Read file content safely
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const resolvedPath = path.resolve(filePath);
    const content = fs.readFileSync(resolvedPath, 'utf8');
    const stats = fs.statSync(resolvedPath);
    return {
      success: true,
      content: content,
      name: path.basename(resolvedPath),
      path: resolvedPath,
      mtime: stats.mtime
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC Handler - Save file content
ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(path.resolve(filePath), content, 'utf8');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC Handler - Open File Dialog
ipcMain.handle('show-open-dialog', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  // Read all selected files
  const fileInfos = [];
  for (const filePath of result.filePaths) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      fileInfos.push({
        name: path.basename(filePath),
        path: filePath,
        content: content
      });
    } catch (e) {
      // Skip failed files
    }
  }
  return fileInfos;
});

// IPC Handler - Get startup file
ipcMain.handle('get-startup-file', async () => {
  const file = fileToOpenOnStartup;
  fileToOpenOnStartup = null; // Clear it after consumed
  if (file) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      return {
        name: path.basename(file),
        path: file,
        content: content
      };
    } catch (e) {
      return null;
    }
  }
  return null;
});

// Window controls IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('is-window-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});
