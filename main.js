const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const log = require('electron-log');
const { spawn } = require('child_process');

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
  return new Promise((resolve) => {
    const apt = spawn('/usr/bin/apt', ['list']);
    let output = '';

    apt.stdout.on('data', (data) => { output += data.toString(); });
    apt.stderr.on('data', (data) => { /* ignorar o logear errores */ });
    
    apt.on('close', () => {
      const packages = output.split('\n')
        .slice(1)
        .map(line => {
          const [pkgFull] = line.split(' ');
          const pkg = pkgFull.split('/')[0];
          return { name: pkg, description: '' };
        })
        .filter(p => p.name);
      resolve({ success: true, packages });
    });
  });
});