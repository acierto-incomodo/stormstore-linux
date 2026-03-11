const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("storm", {

    repoStatus: () => ipcRenderer.invoke("repo-status"),

    installRepo: () => ipcRenderer.invoke("install-repo"),

    removeRepo: () => ipcRenderer.invoke("remove-repo"),

    installApp: (pkg) => ipcRenderer.invoke("install-app", pkg),

    removeApp: (pkg) => ipcRenderer.invoke("remove-app", pkg),

    isInstalled: (pkg) => ipcRenderer.invoke("is-installed", pkg),

    // updates
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    restartApp: () => ipcRenderer.invoke('restart-app'),
    installUpdate: () => ipcRenderer.invoke('restart-app'),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, data) => callback(data)),
    getVersion: () => ipcRenderer.invoke('get-version'),

    // system accent color
    getAccentColor: () => ipcRenderer.invoke('get-accent-color')

})