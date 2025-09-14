// path: electron/ipc/handlers/index.ts
import { registerTemplateIpc } from './templates';

export function registerAllIpc() {
  registerTemplateIpc();
  // TODO: register other domains: boxes, cheques, print, settings, etc.
}
