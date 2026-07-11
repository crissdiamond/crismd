const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFiles: () => ipcRenderer.invoke('show-open-dialog'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  getStartupFile: () => ipcRenderer.invoke('get-startup-file'),
  onOpenFile: (callback) => {
    const subscription = (event, filePath) => callback(filePath);
    ipcRenderer.on('open-file', subscription);
    return () => ipcRenderer.removeListener('open-file', subscription);
  },
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-window-maximized')
});
