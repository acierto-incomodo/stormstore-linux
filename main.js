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
    // only perform update checks when the app is packaged; avoids noisy logs during development
    if (app.isPackaged) {
        autoUpdater.checkForUpdatesAndNotify()
    } else {
        console.log("skipping updater because app is not packaged")
        // let UI know if needed
        sendUpdateStatus('error', {message: 'updater-disabled'})
    }

})

// Forward autoUpdater events to renderer for real-time update UI
function sendUpdateStatus(status, info) {
    if (win && win.webContents) {
        win.webContents.send('update-status', {status, info})
    }
}

autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'))
autoUpdater.on('update-available', info => sendUpdateStatus('available', info))
autoUpdater.on('update-not-available', info => sendUpdateStatus('not-available', info))
autoUpdater.on('error', err => sendUpdateStatus('error', {message: err == null ? "unknown" : (err.stack || err).toString()}))
autoUpdater.on('download-progress', progress => sendUpdateStatus('progress', progress))

let downloadedFilePath = null;
autoUpdater.on('update-downloaded', info => {
    downloadedFilePath = info.downloadedFile || null;
    sendUpdateStatus('downloaded', info)
})

// IPC handlers for update actions
ipcMain.handle('check-for-updates', () => {
    if (app.isPackaged) {
        return autoUpdater.checkForUpdates()
    } else {
        sendUpdateStatus('error', {message: 'updater-disabled'})
    }
})

ipcMain.handle('restart-app', () => {
    // default installer behavior
    if (downloadedFilePath && process.platform === 'linux' && downloadedFilePath.endsWith('.deb')) {
        // install deb with privilege escalation
        exec(`pkexec dpkg -i "${downloadedFilePath}"`, (err) => {
            if (err) console.error('Deb install failed', err)
            app.quit()
        })
    } else {
        autoUpdater.quitAndInstall()
    }
})

// provide app version
ipcMain.handle('get-version', () => {
    return app.getVersion()
})

// get system accent color (Linux KDE fallback)
ipcMain.handle('get-accent-color', async () => {
    try {
        // Try to get KDE Plasma accent color
        const { execSync } = require('child_process')
        const kdeAccent = execSync('kreadconfig5 --group "General" --key "AccentColor" --file kdeglobals 2>/dev/null || echo ""', { encoding: 'utf8' }).trim()

        if (kdeAccent) {
            // KDE stores as "r,g,b" (e.g., "61,174,233")
            const [r, g, b] = kdeAccent.split(',').map(Number)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
            }
        }

        // Try alternative KDE config location
        const fs = require('fs')
        const kdeGlobalsPath = require('os').homedir() + '/.config/kdeglobals'
        if (fs.existsSync(kdeGlobalsPath)) {
            const config = fs.readFileSync(kdeGlobalsPath, 'utf8')
            const accentMatch = config.match(/AccentColor=([0-9]+),([0-9]+),([0-9]+)/)
            if (accentMatch) {
                const [, r, g, b] = accentMatch.map(Number)
                return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
            }
        }

        // Fallback to default blue
        return '#0078d4'
    } catch (error) {
        console.log('Could not get system accent color, using default')
        return '#0078d4'
    }
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