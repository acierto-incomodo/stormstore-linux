const repoDiv = document.getElementById("repo")
const appsDiv = document.getElementById("apps")

async function init(){

    const repo = await window.storm.repoStatus()

    if(!repo){

        repoDiv.innerHTML = `
        <p>No tienes instalado el repositorio StormGamesStudios</p>
        <button id="installRepo">Instalar repositorio</button>
        `

        document.getElementById("installRepo").onclick = () => {
            window.storm.installRepo()
        }

        return
    }

    repoDiv.innerHTML = `
    <button id="removeRepo">Eliminar repositorio</button>
    `

    document.getElementById("removeRepo").onclick = () => {
        window.storm.removeRepo()
    }

    loadApps()
}

async function loadApps(){

    const res = await fetch("https://raw.githubusercontent.com/acierto-incomodo/StormStore/main/apps.json")

    const apps = await res.json()

    appsDiv.innerHTML = ""

    for(const app of apps){

        const installed = await window.storm.isInstalled(app.id)

        const el = document.createElement("div")

        el.className = "app"

        el.innerHTML = `
        <img src="${app.icon}">
        <h3>${app.name}</h3>
        <p>${app.description}</p>
        <button>${installed ? "Eliminar" : "Instalar"}</button>
        `

        const btn = el.querySelector("button")

        btn.onclick = () => {

            if(installed)
                window.storm.removeApp(app.id)
            else
                window.storm.installApp(app.id)

        }

        appsDiv.appendChild(el)
    }
}

init()