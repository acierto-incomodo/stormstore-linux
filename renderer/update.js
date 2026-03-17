const statusDiv = document.getElementById('status')
const progressInner = document.getElementById('progressInner')
const currentVersionSpan = document.getElementById('currentVersion')
const checkBtn = document.getElementById('checkBtn')
const refreshListsBtn = document.getElementById('refreshListsBtn')
const restartBtn = document.getElementById('restartBtn')

let lang = localStorage.getItem('lang') || 'es'
const translations = {
    es: {
        currentVersion: 'Versión actual:',
        checkUpdates: 'Buscar actualizaciones',
        refreshLists: 'Actualizar listas',
        updatingLists: 'Actualizando listas...',
        listsUpdated: 'Listas actualizadas.',
        restart: 'Reiniciar y aplicar',
        checking: 'Buscando actualizaciones...',
        checkingManual: 'Comprobando...',
        available: 'Actualización disponible! versión',
        notAvailable: 'No hay actualizaciones disponibles.',
        error: 'Error durante actualización:',
        downloaded: 'Descargado. Pulse reiniciar para aplicar.',
        language: 'Idioma:',
        install: 'Instalar y salir',
        devWarning: 'Actualizaciones desactivadas en modo desarrollo'
    },
    en: {
        currentVersion: 'Current version:',
        checkUpdates: 'Check for updates',
        refreshLists: 'Refresh lists',
        updatingLists: 'Refreshing package lists...',
        listsUpdated: 'Package lists refreshed.',
        restart: 'Restart and apply',
        checking: 'Checking for updates...',
        checkingManual: 'Checking...',
        available: 'Update available! version',
        notAvailable: 'No updates available.',
        error: 'Update error:',
        downloaded: 'Downloaded. Press restart to apply.',
        language: 'Language:',
        install: 'Install and quit',
        devWarning: 'Updates are disabled in development mode'
    },
    eu: {
        currentVersion: 'Egungo bertsioa:',
        checkUpdates: 'Eguneraketak bilatu',
        refreshLists: 'Zerrendak eguneratu',
        updatingLists: 'Zerrendak eguneratzen...',
        listsUpdated: 'Zerrendak eguneratu dira.',
        restart: 'Birstartatu eta aplikatu',
        checking: 'Eguneraketak bilatzen...',
        checkingManual: 'Kontrolatzen...',
        available: 'Eguneratze bat eskuragarri! bertsioa',
        notAvailable: 'Ez dago eguneraketarik.',
        error: 'Eguneratze-errorea:',
        downloaded: 'Deskargatua. Sakatu birstartatzeko aplikatzeko.',
        language: 'Hizkuntza:',
        install: 'Instalatu eta itxi',
        devWarning: 'Actualizaciones desactivadas en modo desarrollo'
    }
}

function t(key){
    return translations[lang][key] || key
}

function applyTranslations(){
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n')
        el.textContent = t(key)
    })

    if (checkBtn) checkBtn.textContent = t('checkUpdates')
    if (refreshListsBtn) refreshListsBtn.textContent = t('refreshLists')

    if (restartBtn) {
        if (lastDownloadedPath && lastDownloadedPath.endsWith('.deb')) {
            restartBtn.textContent = t('install')
        } else {
            restartBtn.textContent = t('restart')
        }
    }
}

function setupLanguageSelector(){
    const sel = document.getElementById('langSelect')
    if(sel){
        sel.value = lang
        sel.onchange = () => {
            lang = sel.value
            localStorage.setItem('lang', lang)
            applyTranslations()
        }
    }
}

// Set system accent color
async function setAccentColor() {
    try {
        const accentColor = await window.storm.getAccentColor()
        document.documentElement.style.setProperty('--color-accent', accentColor)
        document.documentElement.style.setProperty('--color-primary', accentColor)

        // Calculate hover color (slightly darker)
        const hoverColor = adjustColor(accentColor, -20)
        document.documentElement.style.setProperty('--color-primary-hover', hoverColor)

        // Calculate active color (darker)
        const activeColor = adjustColor(accentColor, -40)
        document.documentElement.style.setProperty('--color-primary-active', activeColor)
    } catch (error) {
        console.log('Using default accent color')
    }
}

function adjustColor(color, amount) {
    // Simple color adjustment for hover/active states
    const usePound = color[0] === '#'
    const col = usePound ? color.slice(1) : color

    const num = parseInt(col, 16)
    let r = (num >> 16) + amount
    let g = (num >> 8 & 0x00FF) + amount
    let b = (num & 0x0000FF) + amount

    r = r > 255 ? 255 : r < 0 ? 0 : r
    g = g > 255 ? 255 : g < 0 ? 0 : g
    b = b > 255 ? 255 : b < 0 ? 0 : b

    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16)
}

let lastDownloadedPath = null

async function refreshAptLists() {
    if (!refreshListsBtn) return

    refreshListsBtn.disabled = true
    checkBtn.disabled = true
    statusDiv.textContent = t('updatingLists')

    const res = await window.storm.updateAptLists()
    if (res && res.success) {
        statusDiv.textContent = t('listsUpdated')
    } else {
        const msg = res && res.error ? res.error : (res && res.stderr ? res.stderr : '')
        statusDiv.textContent = `${t('error')} ${msg}`
    }

    refreshListsBtn.disabled = false
    checkBtn.disabled = false
}

// fetch current version from main process
window.storm.getVersion().then(v => {
    currentVersionSpan.textContent = v
}).catch(() => {
    currentVersionSpan.textContent = 'unknown'
})

checkBtn.onclick = () => {
    statusDiv.textContent = t('checkingManual')
    window.storm.checkForUpdates()
}

if (refreshListsBtn) {
    refreshListsBtn.onclick = () => {
        refreshAptLists()
    }
}

restartBtn.onclick = () => {
    // call same method; main will handle deb easily
    window.storm.installUpdate()
}

window.addEventListener('DOMContentLoaded', async () => {
    await setAccentColor()
    applyTranslations()
    setupLanguageSelector()

    await refreshAptLists()

    statusDiv.textContent = t('checking')
    window.storm.checkForUpdates()
})

window.storm.onUpdateStatus((data) => {
    switch (data.status) {
        case 'checking':
            statusDiv.textContent = t('checking')
            break
        case 'available':
            statusDiv.textContent = `${t('available')} ${data.info.version}`
            break
        case 'not-available':
            statusDiv.textContent = t('notAvailable')
            break
        case 'error':
            if (data.info && data.info.message === 'updater-disabled') {
                statusDiv.textContent = t('devWarning')
            } else {
                statusDiv.textContent = `${t('error')} ${data.info.message}`
            }
            break
        case 'progress':
            const {percent} = data.info
            statusDiv.textContent = `${t('checking')} ${percent.toFixed(1)}%`
            progressInner.style.width = `${percent}%`
            break
        case 'downloaded':
            statusDiv.textContent = t('downloaded')
            lastDownloadedPath = data.info.downloadedFile || null
            restartBtn.disabled = false
            // adjust button text if it's a deb
            if (lastDownloadedPath && lastDownloadedPath.endsWith('.deb')) {
                restartBtn.textContent = t('install')
            }
            break
    }
})
