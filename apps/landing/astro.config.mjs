import { defineConfig } from 'astro/config';

export default defineConfig({
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1', port: Number(process.env.PORT) || 4321 },
});
