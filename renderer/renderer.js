const repoDiv = document.getElementById("repo")
const appsDiv = document.getElementById("apps")
const refreshListsBtn = document.getElementById('refreshListsBtn')

let lang = localStorage.getItem('lang') || 'es'
const translations = {
    es: {
        title: 'StormStore',
        home: 'Inicio',
        updates: 'Actualizaciones',
        language: 'Idioma:',
        noRepo: 'No tienes instalado el repositorio StormGamesStudios',
        installRepo: 'Instalar repositorio',
        removeRepo: 'Eliminar repositorio',
        install: 'Instalar',
        remove: 'Eliminar',
        refreshLists: 'Actualizar listas'
    },
    en: {
        title: 'StormStore',
        home: 'Home',
        updates: 'Updates',
        language: 'Language:',
        noRepo: 'You do not have the StormGamesStudios repository installed',
        installRepo: 'Install repository',
        removeRepo: 'Remove repository',
        install: 'Install',
        remove: 'Remove',
        refreshLists: 'Refresh lists'
    },
    eu: {
        title: 'StormStore',
        home: 'Hasiera',
        updates: 'Eguneratzeak',
        language: 'Hizkuntza:',
        noRepo: 'Ez duzu StormGamesStudios biltegia instalatuta',
        installRepo: 'Biltegia instalatu',
        removeRepo: 'Biltegia ezabatu',
        install: 'Instalatu',
        remove: 'Kendu',
        refreshLists: 'Zerrendak eguneratu'
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

    if (refreshListsBtn) refreshListsBtn.textContent = t('refreshLists')
}
function setupLanguageSelector(){
    const sel = document.getElementById('langSelect')
    if(sel){
        sel.value = lang
        sel.onchange = () => {
            lang = sel.value
            localStorage.setItem('lang', lang)
            applyTranslations()
            init()
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

async function init(){
    applyTranslations()
    setupLanguageSelector()

    // Refresh apt package lists (this will prompt for credentials via pkexec)
    window.storm.updateAptLists().catch(() => {})

    let repo = await window.storm.repoStatus()

    if(!repo){
        // automatically install repository if missing
        repoDiv.innerHTML = `
        <p>${t('noRepo')}</p>
        <button id="installRepo" class="install">${t('installRepo')}</button>
        `
        document.getElementById("installRepo").onclick = async () => {
            document.getElementById("installRepo").disabled = true
            document.getElementById("installRepo").textContent = '...' // spinner
            await window.storm.installRepo()
            await new Promise(r=>setTimeout(r,500)) // slight delay
            init() // refresh state after installation
        }
        // kick off install automatically
        document.getElementById("installRepo").click()
        return
    }

    repoDiv.innerHTML = `
    <button id="removeRepo" class="remove">${t('removeRepo')}</button>
    `
    document.getElementById("removeRepo").onclick = async () => {
        await window.storm.removeRepo()
        init() // refresh UI after removal
    }

    loadApps()
}

async function loadApps(){
    const res = await fetch("https://raw.githubusercontent.com/acierto-incomodo/stormstore-linux/main/apps.json")
    const apps = await res.json()
    appsDiv.innerHTML = ""
    for(const app of apps){
        const installed = await window.storm.isInstalled(app.id)
        const el = document.createElement("div")
        el.className = "app"
        el.innerHTML = `
        <div class="app-header">
            <img src="${app.icon}" alt="${app.name}">
            <div class="app-info">
                <h3>${app.name}</h3>
                <p>${app.description}</p>
            </div>
        </div>
        <div class="app-actions">
            <button class="${installed ? 'remove' : 'install'}">${installed ? t('remove') : t('install')}</button>
        </div>
        `
        const btn = el.querySelector("button")
        btn.onclick = async () => {
            if(installed) await window.storm.removeApp(app.id)
            else await window.storm.installApp(app.id)
            loadApps() // refresh buttons after operation
        }
        appsDiv.appendChild(el)
    }
}

if (refreshListsBtn) {
    refreshListsBtn.onclick = async () => {
        refreshListsBtn.disabled = true
        await window.storm.updateAptLists().catch(() => {})
        refreshListsBtn.disabled = false
    }
}

// Initialize app with system accent color
setAccentColor().then(() => init()).catch(() => init())