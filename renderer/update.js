const statusDiv = document.getElementById('status')
const progressInner = document.getElementById('progressInner')
const currentVersionSpan = document.getElementById('currentVersion')
const checkBtn = document.getElementById('checkBtn')
const restartBtn = document.getElementById('restartBtn')

let lang = localStorage.getItem('lang') || 'es'
const translations = {
    es: {
        currentVersion: 'Versión actual:',
        checkUpdates: 'Buscar actualizaciones',
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
    // update button texts
    if (checkBtn) checkBtn.textContent = t('checkUpdates')
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

window.addEventListener('DOMContentLoaded', async () => {
    await setAccentColor()
    applyTranslations()
    setupLanguageSelector()
    statusDiv.textContent = t('checking')
    window.storm.checkForUpdates()
})

let lastDownloadedPath = null
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
checkBtn.onclick = () => {
    statusDiv.textContent = 'Comprobando...' 
    window.storm.checkForUpdates()
}

// automatically start checking when the page is opened
window.addEventListener('DOMContentLoaded', () => {
    statusDiv.textContent = 'Comprobando actualizaciones...'
    window.storm.checkForUpdates()
})

restartBtn.onclick = () => {
    // call same method; main will handle deb easily
    window.storm.installUpdate()
}

window.storm.onUpdateStatus((data) => {
    switch (data.status) {
        case 'checking':
            statusDiv.textContent = 'Buscando actualizaciones...'
            break
        case 'available':
            statusDiv.textContent = 'Actualización disponible! versión ' + data.info.version
            break
        case 'not-available':
            statusDiv.textContent = 'No hay actualizaciones disponibles.'
            break
        case 'error':
            statusDiv.textContent = 'Error durante actualización: ' + data.info.message
            break
        case 'progress':
            const {percent} = data.info
            statusDiv.textContent = `Descargando... ${percent.toFixed(1)}%`
            progressInner.style.width = `${percent}%`
            break
        case 'downloaded':
            statusDiv.textContent = 'Descargado. Pulse reiniciar para aplicar.'
            restartBtn.disabled = false
            break
    }
})
