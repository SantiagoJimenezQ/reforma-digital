import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

export default defineConfig({
  root: path.resolve('apps/playground'),
  plugins: [
    react(),
    tailwind(),
    {
      name: 'synthetic-official-pages',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const route = req.url?.split('?')[0];
          const fixture =
            route === '/citaPreviaDni/Inicio.action'
              ? 'landing.html'
              : route === '/citaPreviaDni/InicioDNINIE.action'
                ? 'login.html'
                : null;
          if (!fixture) {
            if (route?.startsWith('/citaPreviaDni/')) {
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(
                '<!doctype html><html lang="es"><title>Pantalla desconocida</title><body><h1>Pantalla sin adaptación</h1><input aria-label="Control original"></body></html>',
              );
              return;
            }
            return next();
          }
          const html = await readFile(path.resolve('sites/dni/fixtures', fixture), 'utf8');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
        });
      },
    },
  ],
  server: { host: '127.0.0.1', port: 4173, strictPort: true, fs: { allow: [path.resolve('.')] } },
});
