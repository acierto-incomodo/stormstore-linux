const appsContainer = document.getElementById('apps-container');
const updateBtn = document.getElementById('updateBtn');

async function loadApps() {
  appsContainer.innerHTML = '<p>Cargando aplicaciones...</p>';
  await window.api.updateList();

  const res = await window.api.listPackages();
  if(!res.success) {
    appsContainer.innerHTML = `<p>Error cargando apps: ${res.message}</p>`;
    return;
  }

  const apps = res.packages;
  appsContainer.innerHTML = '';

  apps.forEach(app => {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
      <img src="../icons/default.png" alt="${app.name}">
      <h3>${app.name}</h3>
      <p>${app.description}</p>
      <button class="installBtn">Instalar</button>
      <button class="removeBtn">Desinstalar</button>
    `;

    card.querySelector('.installBtn').addEventListener('click', async () => {
      const res = await window.api.installPackage(app.name);
      alert(res.success ? 'Instalado!' : 'Error: ' + res.message);
    });

    card.querySelector('.removeBtn').addEventListener('click', async () => {
      const res = await window.api.removePackage(app.name);
      alert(res.success ? 'Desinstalado!' : 'Error: ' + res.message);
    });

    appsContainer.appendChild(card);
  });
}

updateBtn.addEventListener('click', loadApps);
loadApps();