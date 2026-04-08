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

  win.setMenuBarVisibility(false);
  win.loadFile('renderer/index.html');
}

app.whenReady().then(createWindow);

// === Handlers ===

// Instalar paquete
ipcMain.handle('install-package', async (event, pkg) => {
  log.info(`Intentando instalar paquete: ${pkg}`);
  return new Promise((resolve) => {
    exec(`sudo apt install -y ${pkg}`, (err, stdout, stderr) => {
      if(err){
        log.error(`Error instalando ${pkg}: ${stderr}`);
        resolve({ success: false, message: stderr });
      } else {
        log.info(`Instalado ${pkg}: ${stdout}`);
        resolve({ success: true, message: stdout });
      }
    });
  });
});

// Desinstalar paquete
ipcMain.handle('remove-package', async (event, pkg) => {
  log.info(`Intentando eliminar paquete: ${pkg}`);
  return new Promise((resolve) => {
    exec(`sudo apt remove -y ${pkg}`, (err, stdout, stderr) => {
      if(err){
        log.error(`Error eliminando ${pkg}: ${stderr}`);
        resolve({ success: false, message: stderr });
      } else {
        log.info(`Eliminado ${pkg}: ${stdout}`);
        resolve({ success: true, message: stdout });
      }
    });
  });
});

// Actualizar lista APT (opcional)
ipcMain.handle('update-list', async () => {
  log.info(`Actualizando lista APT`);
  return new Promise((resolve) => {
    exec('sudo apt update', (err, stdout, stderr) => {
      if(err){
        log.error(`Error actualizando APT: ${stderr}`);
        resolve({ success: false, message: stderr });
      } else {
        log.info(`APT actualizado: ${stdout}`);
        resolve({ success: true, message: stdout });
      }
    });
  });
});

// Listar paquetes disponibles sin sudo
ipcMain.handle('list-packages', async () => {
  log.info(`Listando paquetes disponibles`);
  return new Promise((resolve) => {
    exec('apt list 2>/dev/null', (err, stdout, stderr) => {
      if(err){
        log.error(`Error listando paquetes: ${stderr}`);
        resolve({ success: false, message: stderr, packages: [] });
      } else {
        log.info(`Paquetes listados correctamente`);
        const packages = stdout.split('\n')
          .slice(1)
          .map(line => {
            const [pkgFull] = line.split(' ');
            const pkg = pkgFull.split('/')[0];
            return { name: pkg, description: '' };
          })
          .filter(p => p.name);
        resolve({ success: true, packages });
      }
    });
  });
});