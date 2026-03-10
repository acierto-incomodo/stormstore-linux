const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("storm", {

    repoStatus: () => ipcRenderer.invoke("repo-status"),

    installRepo: () => ipcRenderer.invoke("install-repo"),

    removeRepo: () => ipcRenderer.invoke("remove-repo"),

    installApp: (pkg) => ipcRenderer.invoke("install-app", pkg),

    removeApp: (pkg) => ipcRenderer.invoke("remove-app", pkg),

    isInstalled: (pkg) => ipcRenderer.invoke("is-installed", pkg)

})