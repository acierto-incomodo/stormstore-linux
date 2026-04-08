const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.setMenuBarVisibility(false); // <-- Ocultar barra de menú
  win.loadFile('renderer/index.html');
}

app.whenReady().then(createWindow);

// Instalar paquete
ipcMain.handle('install-package', async (event, pkg) => {
  return new Promise((resolve) => {
    exec(`sudo apt install -y ${pkg}`, (err, stdout, stderr) => {
      if (err) resolve({ success: false, message: stderr });
      else resolve({ success: true, message: stdout });
    });
  });
});

// Desinstalar paquete
ipcMain.handle('remove-package', async (event, pkg) => {
  return new Promise((resolve) => {
    exec(`sudo apt remove -y ${pkg}`, (err, stdout, stderr) => {
      if (err) resolve({ success: false, message: stderr });
      else resolve({ success: true, message: stdout });
    });
  });
});

// Actualizar lista APT
ipcMain.handle('update-list', async () => {
  return new Promise((resolve) => {
    exec('sudo apt update', (err, stdout, stderr) => {
      if (err) resolve({ success: false, message: stderr });
      else resolve({ success: true, message: stdout });
    });
  });
});

// Listar paquetes del repo
ipcMain.handle('list-packages', async () => {
  return new Promise((resolve) => {
    exec('apt-cache search .', (err, stdout, stderr) => {
      if(err) resolve({ success: false, message: stderr, packages: [] });
      else {
        const packages = stdout.split('\n').map(line => {
          const [pkg, ...desc] = line.split(' - ');
          return { name: pkg, description: desc.join(' -') };
        }).filter(p => p.name);
        resolve({ success: true, packages });
      }
    });
  });
});