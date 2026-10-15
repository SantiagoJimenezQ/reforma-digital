# Reforma Digital para Mac

App de escritorio (Electron 44) con el asistente de trámites. Arquitectura, garantías, evaluaciones y limitaciones: [docs/desktop.md](../../docs/desktop.md).

```sh
pnpm --filter @reforma-digital/desktop exec install-electron   # una vez
pnpm --filter @reforma-digital/desktop dev                     # compila (out/) y abre la app
pnpm --filter @reforma-digital/desktop package                 # dist/mac-arm64/Reforma Digital.app
```

| Ruta                    | Qué hay                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/main/index.ts`     | Ventana, protocolo `app://`, menú, IPC validado con zod, Touch ID, certificados, ajustes y perfil.       |
| `src/main/almacen.ts`   | Archivos cifrados con AES-256-GCM; la clave la protege el llavero (`safeStorage`).                       |
| `src/main/tramites.ts`  | Turnos del agente, preguntas pendientes, notificaciones e insignia del Dock.                             |
| `src/main/navegador.ts` | Navegador de cada trámite (`WebContentsView`, sesión persistente), descargas, AutoFirma y lector oculto. |
| `src/preload`           | `window.rd`, el único puente entre la interfaz y el proceso principal.                                   |
| `src/renderer`          | Interfaz React con `@reforma-digital/design` (Sol).                                                      |
| `build/icon.svg`        | Icono; `icon.png` se genera con `qlmanage -t -s 1024 -o build build/icon.svg` y se renombra.             |

Los datos de la app están en `~/Library/Application Support/Reforma Digital/datos`, cifrados. Los documentos que descargan los trámites van a `~/Downloads/Reforma Digital/<trámite>/`.
