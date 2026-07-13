import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  isElectron: true,
  backup: {
    getStatus: () => ipcRenderer.invoke("backup:getStatus"),
    choosePath: () => ipcRenderer.invoke("backup:choosePath"),
    write: (json) => ipcRenderer.invoke("backup:write", json),
    clear: () => ipcRenderer.invoke("backup:clear"),
  },
});
