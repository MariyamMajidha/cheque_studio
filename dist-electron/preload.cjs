"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
var api = {
  // ---------------- Templates ----------------
  templates: {
    list: () => import_electron.ipcRenderer.invoke("templates:list"),
    get: (id) => import_electron.ipcRenderer.invoke("templates:get", id),
    create: (payload) => import_electron.ipcRenderer.invoke("templates:create", payload),
    update: (id, patch) => import_electron.ipcRenderer.invoke("templates:update", id, patch),
    delete: (id) => import_electron.ipcRenderer.invoke("templates:delete", id)
  },
  // ---------------- Boxes --------------------
  boxes: {
    list: (templateId) => import_electron.ipcRenderer.invoke("boxes:list", templateId),
    upsertMany: (templateId, boxes) => import_electron.ipcRenderer.invoke("boxes:upsertMany", templateId, boxes),
    delete: (id) => import_electron.ipcRenderer.invoke("boxes:delete", id)
  },
  // ---------------- Cheques ------------------
  cheques: {
    list: (templateId) => import_electron.ipcRenderer.invoke("cheques:list", { template_id: templateId }),
    createOne: (payload) => import_electron.ipcRenderer.invoke("cheques:createOne", payload),
    update: (id, data) => import_electron.ipcRenderer.invoke("cheques:update", id, data),
    delete: (id) => import_electron.ipcRenderer.invoke("cheques:delete", id),
    importExcel: (args) => import_electron.ipcRenderer.invoke("cheques:importExcel", args)
  },
  // ---------------- Print --------------------
  print: {
    preview: (args) => import_electron.ipcRenderer.invoke("print:preview", args),
    run: (args) => import_electron.ipcRenderer.invoke("print:run", args),
    onPayload: (cb) => {
      const handler = (_evt, data) => cb(data);
      import_electron.ipcRenderer.on("print:payload", handler);
      return () => import_electron.ipcRenderer.removeListener("print:payload", handler);
    },
    ready: () => {
      import_electron.ipcRenderer.send("print:ready");
    }
  }
};
import_electron.contextBridge.exposeInMainWorld("api", api);
