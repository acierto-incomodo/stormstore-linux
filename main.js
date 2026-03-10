const { app, BrowserWindow, ipcMain } = require("electron")
const { exec } = require("child_process")
const fs = require("fs")
const { autoUpdater } = require("electron-updater")

let win

function createWindow() {

    win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: __dirname + "/preload.js"
        }
    })

    win.loadFile("renderer/index.html")
}

app.whenReady().then(() => {

    createWindow()
    autoUpdater.checkForUpdatesAndNotify()

})

ipcMain.handle("repo-status", () => {

    return fs.existsSync("/etc/apt/sources.list.d/stormgamesstudios.list")

})

ipcMain.handle("install-repo", () => {

    exec("curl -fsSL https://raw.githubusercontent.com/acierto-incomodo/StormStore/main/install.sh | pkexec bash")

})

ipcMain.handle("remove-repo", () => {

    exec("curl -fsSL https://raw.githubusercontent.com/acierto-incomodo/StormStore/main/remove.sh | pkexec bash")

})

ipcMain.handle("install-app", (event, pkg) => {

    exec(`pkexec apt install -y ${pkg}`)

})

ipcMain.handle("remove-app", (event, pkg) => {

    exec(`pkexec apt remove -y ${pkg}`)

})

ipcMain.handle("is-installed", (event, pkg) => {

    return new Promise((resolve) => {

        exec(`dpkg -s ${pkg}`, (err) => {

            resolve(!err)

        })

    })

})