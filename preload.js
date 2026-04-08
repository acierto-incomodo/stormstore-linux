const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  installPackage: (pkg) => ipcRenderer.invoke('install-package', pkg),
  removePackage: (pkg) => ipcRenderer.invoke('remove-package', pkg),
  updateList: () => ipcRenderer.invoke('update-list'),
  listPackages: () => ipcRenderer.invoke('list-packages')
});