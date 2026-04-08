const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.setMenuBarVisibility(false); // Quitar barra de menú
  win.loadFile('renderer/index.html');
}

app.whenReady().then(createWindow);

// Instalar paquete (solo se puede con sudo o pkexec)
ipcMain.handle('install-package', async (event, pkg) => {
  return new Promise((resolve) => {
    exec(`sudo apt install -y ${pkg}`, (err, stdout, stderr) => {
      if(err) resolve({ success: false, message: stderr });
      else resolve({ success: true, message: stdout });
    });
  });
});

// Desinstalar paquete
ipcMain.handle('remove-package', async (event, pkg) => {
  return new Promise((resolve) => {
    exec(`sudo apt remove -y ${pkg}`, (err, stdout, stderr) => {
      if(err) resolve({ success: false, message: stderr });
      else resolve({ success: true, message: stdout });
    });
  });
});

// Actualizar lista APT (opcional, también pide sudo)
ipcMain.handle('update-list', async () => {
  return new Promise((resolve) => {
    exec('sudo apt update', (err, stdout, stderr) => {
      if(err) resolve({ success: false, message: stderr });
      else resolve({ success: true, message: stdout });
    });
  });
});

// Listar paquetes disponibles **sin sudo**
ipcMain.handle('list-packages', async () => {
  return new Promise((resolve) => {
    // apt list sin sudo → solo lectura
    exec('apt list 2>/dev/null', (err, stdout, stderr) => {
      if(err) resolve({ success: false, message: stderr, packages: [] });
      else {
        const packages = stdout.split('\n')
          .slice(1) // quitar primera línea "Listing..."
          .map(line => {
            const [pkgFull] = line.split(' ');
            const pkg = pkgFull.split('/')[0];
            return { name: pkg, description: '' }; // no hay descripción
          })
          .filter(p => p.name);
        resolve({ success: true, packages });
      }
    });
  });
});