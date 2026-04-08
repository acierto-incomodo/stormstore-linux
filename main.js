const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const log = require('electron-log');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.setMenuBarVisibility(false); // Oculta la barra de menú
  win.loadFile('renderer/index.html');
}

app.whenReady().then(createWindow);

// ========================
// Handlers de APT
// ========================

// Instalar paquete (requiere sudo)
ipcMain.handle('install-package', async (event, pkg) => {
  log.info(`Intentando instalar paquete: ${pkg}`);
  return new Promise((resolve) => {
    exec(`sudo apt install -y ${pkg}`, (err, stdout, stderr) => {
      if(err){
        log.error(`Error instalando ${pkg}: ${stderr || err}`);
        resolve({ success: false, message: stderr || err.toString() });
      } else {
        log.info(`Paquete instalado: ${pkg}`);
        resolve({ success: true, message: stdout });
      }
    });
  });
});

// Desinstalar paquete (requiere sudo)
ipcMain.handle('remove-package', async (event, pkg) => {
  log.info(`Intentando eliminar paquete: ${pkg}`);
  return new Promise((resolve) => {
    exec(`sudo apt remove -y ${pkg}`, (err, stdout, stderr) => {
      if(err){
        log.error(`Error eliminando ${pkg}: ${stderr || err}`);
        resolve({ success: false, message: stderr || err.toString() });
      } else {
        log.info(`Paquete eliminado: ${pkg}`);
        resolve({ success: true, message: stdout });
      }
    });
  });
});

// Actualizar lista de APT (requiere sudo)
ipcMain.handle('update-list', async () => {
  log.info(`Actualizando lista APT`);
  return new Promise((resolve) => {
    exec('sudo apt update', (err, stdout, stderr) => {
      if(err){
        log.error(`Error actualizando APT: ${stderr || err}`);
        resolve({ success: false, message: stderr || err.toString() });
      } else {
        log.info(`APT actualizado`);
        resolve({ success: true, message: stdout });
      }
    });
  });
});

// Listar paquetes disponibles sin sudo
ipcMain.handle('list-packages', async () => {
  log.info(`Listando paquetes disponibles`);
  return new Promise((resolve) => {
    // Ruta completa a apt para evitar problemas de PATH
    exec('/usr/bin/apt list 2>/dev/null', (err, stdout, stderr) => {
      if(err){
        log.error(`Error listando paquetes: ${stderr || err}`);
        resolve({ success: false, message: stderr || err.toString(), packages: [] });
      } else {
        log.info(`Paquetes listados correctamente`);
        const packages = stdout.split('\n')
          .slice(1) // Quita "Listing..."
          .map(line => {
            const [pkgFull] = line.split(' ');
            const pkg = pkgFull.split('/')[0];
            return { name: pkg, description: '' }; // apt list no da descripción
          })
          .filter(p => p.name);
        resolve({ success: true, packages });
      }
    });
  });
});