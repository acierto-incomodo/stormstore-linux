const { app, BrowserWindow, ipcMain } = require("electron")
const { exec } = require("child_process")
const fs = require("fs")
const { autoUpdater } = require("electron-updater")

if (process.env.APPIMAGE) {
    app.commandLine.appendSwitch('no-sandbox')
}

let win
let sudoKeepAliveInterval = null

function ensureSudoCredentials() {
    return new Promise((resolve) => {
        // This will prompt once for sudo password and cache it for a short time.
        exec('sudo -v', (err) => {
            if (err) {
                console.warn('Could not acquire sudo credentials', err)
                return resolve(false)
            }
            resolve(true)
        })
    })
}

function startSudoKeepAlive() {
    if (sudoKeepAliveInterval) return
    // Refresh cached sudo timestamp every 4 minutes so we don't keep prompting.
    sudoKeepAliveInterval = setInterval(() => {
        exec('sudo -v', () => { /* ignore */ })
    }, 4 * 60 * 1000)
}

function stopSudoKeepAlive() {
    if (sudoKeepAliveInterval) {
        clearInterval(sudoKeepAliveInterval)
        sudoKeepAliveInterval = null
    }
}

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

function runAptUpdate() {
    return new Promise((resolve) => {
        exec('sudo apt update', {maxBuffer: 1024 * 1024}, (err, stdout, stderr) => {
            if (err) {
                console.error('apt update failed', err)
                return resolve({success: false, error: (err && err.message) || 'unknown', stdout, stderr})
            }
            resolve({success: true, stdout, stderr})
        })
    })
}

app.whenReady().then(async () => {
    // Ask once for elevated permissions so later operations can reuse the cached sudo timestamp.
    await ensureSudoCredentials().then((ok) => {
        if (ok) startSudoKeepAlive()
    })

    createWindow()

    // always refresh apt package lists on startup
    runAptUpdate().then(res => {
        if (!res.success) {
            console.warn('Failed to refresh apt lists on startup', res.error)
        }
    })

    // only perform update checks when the app is packaged; avoids noisy logs during development
    if (app.isPackaged) {
        const pkg = 'stormstore-linux'
        const candidate = await getAptCandidateVersion(pkg)
        let shouldCheckForUpdates = true
        if (candidate) {
            shouldCheckForUpdates = await isVersionLess(app.getVersion(), candidate)
        }
        if (shouldCheckForUpdates) {
            autoUpdater.checkForUpdatesAndNotify()
        } else {
            sendUpdateStatus('not-available', {message: 'version-ahead'})
        }
    } else {
        console.log("skipping updater because app is not packaged")
        // let UI know if needed
        sendUpdateStatus('error', {message: 'updater-disabled'})
    }

    app.on('will-quit', () => {
        stopSudoKeepAlive()
    })

})

// Forward autoUpdater events to renderer for real-time update UI
function sendUpdateStatus(status, info) {
    if (win && win.webContents) {
        win.webContents.send('update-status', {status, info})
    }
}

function getAptCandidateVersion(pkgName) {
    return new Promise((resolve) => {
        exec(`apt-cache policy ${pkgName}`, (err, stdout) => {
            if (err || !stdout) return resolve(null)
            const match = stdout.match(/Candidate:\s*(\S+)/)
            if (match) {
                const ver = match[1].trim()
                resolve(ver === '(none)' ? null : ver)
            } else {
                resolve(null)
            }
        })
    })
}

function isVersionLess(v1, v2) {
    return new Promise((resolve) => {
        if (!v1 || !v2) return resolve(false)
        exec(`dpkg --compare-versions "${v1}" lt "${v2}"`, (err) => {
            resolve(!err)
        })
    })
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
ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) {
        sendUpdateStatus('error', {message: 'updater-disabled'})
        return
    }

    // Compare against the version available in the apt repository (stormgamesstudios list)
    const pkg = 'stormstore-linux'
    const candidate = await getAptCandidateVersion(pkg)
    if (candidate) {
        const current = app.getVersion()
        const shouldUpdate = await isVersionLess(current, candidate)
        if (!shouldUpdate) {
            // If current version is newer or equal to the one in the repo, do not offer updates
            sendUpdateStatus('not-available', {message: 'version-ahead'})
            return
        }
    }

    return autoUpdater.checkForUpdates()
})

ipcMain.handle('restart-app', () => {
    // default installer behavior
    if (downloadedFilePath && process.platform === 'linux' && downloadedFilePath.endsWith('.deb')) {
        // install deb using sudo (credentials should already be cached)
        exec(`sudo dpkg -i "${downloadedFilePath}"`, (err) => {
            if (err) console.error('Deb install failed', err)
            app.quit()
        })
    } else {
        autoUpdater.quitAndInstall()
    }
})

// Refresh apt package lists
ipcMain.handle('apt-update', async () => {
    const result = await runAptUpdate()
    return result
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
    // Use sudo so we can reuse cached credentials and avoid repeated prompts
    exec('sudo bash -c "curl -fsSL https://raw.githubusercontent.com/acierto-incomodo/StormStore/main/install.sh | bash"')
})

ipcMain.handle("remove-repo", () => {
    exec('sudo bash -c "curl -fsSL https://raw.githubusercontent.com/acierto-incomodo/StormStore/main/remove.sh | bash"')
})

ipcMain.handle("install-app", (event, pkg) => {
    exec(`sudo apt install -y ${pkg}`)
})

ipcMain.handle("remove-app", (event, pkg) => {
    exec(`sudo apt remove -y ${pkg}`)
})

ipcMain.handle("is-installed", (event, pkg) => {

    return new Promise((resolve) => {

        exec(`dpkg -s ${pkg}`, (err) => {

            resolve(!err)

        })

    })

})