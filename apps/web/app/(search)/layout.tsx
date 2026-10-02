import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import './globals.css';
import '../../components/chat.css';
import '../../components/home.css';
export const metadata: Metadata = {
  title: 'Reforma Digital — Tu punto de partida',
  description:
    'Encuentra respuestas claras sobre trámites, ayudas e impuestos, con evidencias de fuentes oficiales españolas.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-bg-landing="">
      <body>
        <a className="skip-link" href="#main">
          Saltar al contenido
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
