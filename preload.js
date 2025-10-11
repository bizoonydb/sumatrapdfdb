const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    sendLogin: (credentials) => ipcRenderer.send('login', credentials),
    onLoginFailed: (callback) => ipcRenderer.on('login-failed', (event, message) => callback(message)),
    onUserData: (callback) => ipcRenderer.on('user-data', (_, data) => callback(data)),
    logout: () => ipcRenderer.send('logout'),
    fetchCategories: () => ipcRenderer.invoke('fetch-categories')
});
