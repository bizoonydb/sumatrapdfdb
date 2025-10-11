const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('path');
const { machineIdSync, machineId } = require('node-machine-id');
let mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: true,
            webSecurity: false,
        },
    });

    mainWindow.setMenu(null);
    mainWindow.loadFile('login.html');
    mainWindow.webContents.openDevTools();


    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createMainWindow);

// --- Função para obter o hardware ID (mantida) ---
async function getMachineId() {
    try {
        const id = await machineId(true);
        console.log('Async Hardware ID:', id);
        return id;
    } catch (error) {
        console.error('Error fetching hardware ID:', error);
        return null;
    }
}

// --- Novo bloco: login local ---
ipcMain.on('login', async (event, credentials) => {
    try {
        const email = (credentials.email || "").trim();
        const password = (credentials.password || "").trim();

        // 🔒 Validação local (modo offline)
        if (email === "qwerty" && password === "12345") {
            console.log("Login local autorizado (modo offline).");
            mainWindow.loadFile('main5.html');
            mainWindow.webContents.once('did-finish-load', () => {
                mainWindow.webContents.send('user-data', { name: 'Usuário Local' });
            });
            return; // encerra aqui, sem chamar API
        }

        // 🔗 Login via servidor (modo online)
        const hardwareId = machineIdSync({ original: true }).toLowerCase().trim();
        console.log('Hardware ID Sent:', hardwareId);

        const response = await fetch('https://skillbypm.com/api/login-submit-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                hardware_id: hardwareId
            }),
        });

        const data = await response.json();
        console.log('Login Response:', data);

        if (data.status === 'success') {
            const dbHardwareId = (data.user.device_id || "").toLowerCase().trim();

            if (dbHardwareId && dbHardwareId === hardwareId) {
                mainWindow.loadFile('main5.html');
                mainWindow.webContents.once('did-finish-load', () => {
                    mainWindow.webContents.send('user-data', { name: data.user.name });
                });
            } else {
                event.reply('login-failed', 'Access denied: Login allowed only from the registered PC');
            }
        } else {
            event.reply('login-failed', data.message);
        }

    } catch (error) {
        console.error('API Error:', error);
        event.reply('login-failed', 'Network or server error');
    }
});

// --- Outras funções mantidas ---
ipcMain.handle('fetch-categories', async () => {
    try {
        const response = await fetch('https://skillbypm.com/api/categoriesmain.php', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        return data.categories || [];
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
});

ipcMain.on('logout', () => {
    mainWindow.loadFile('login.html');
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
