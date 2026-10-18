import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
import type { NextConfig } from 'next';
const config: NextConfig = {
  transpilePackages: ['@reforma-digital/design', '@reforma-digital/db'],
  serverExternalPackages: ['postgres'],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      new URL('https://avatars.githubusercontent.com/u/*?s=640'),
      new URL('https://avatars.githubusercontent.com/u/*?s=160'),
    ],
  },
  redirects() {
    return [
      { source: '/explorar', destination: '/', permanent: true },
      { source: '/chat', destination: '/', permanent: true },
      { source: '/sources', destination: '/', permanent: true },
      { source: '/how-it-works', destination: '/', permanent: true },
      { source: '/propuesta', destination: '/#iniciativa', permanent: true },
      { source: '/congreso/elecciones/calendario', destination: '/elecciones', permanent: true },
      { source: '/congreso/elecciones/:path*', destination: '/elecciones/:path*', permanent: true },
    ];
  },
};
export default config;
