import type { Metadata, Viewport } from 'next';
import '../../landing/landing.css';

const title = 'Reforma Digital · La próxima reforma de la Administración';
const description =
  'Una propuesta para que hacer un trámite con la Administración sea sencillo. La interfaz de los trámites se trata como una capa pública que cualquiera puede mejorar en abierto.';
const image = {
  url: '/og.png',
  width: 2400,
  height: 1260,
  alt: 'Reforma Digital. La próxima reforma de la Administración, hecha en comunidad.',
};
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || 'http://localhost:3000'),
  title,
  description,
  openGraph: { title, description, type: 'website', locale: 'es_ES', images: [image] },
  twitter: { card: 'summary_large_image', title, description, images: [image] },
  icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { themeColor: '#ffffff' };
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-bg-landing=""
      className="scroll-smooth scroll-pt-[88px] [color-scheme:light]"
    >
      <body className="overflow-x-hidden bg-surface font-sans text-base leading-relaxed text-ink antialiased">
        <a
          className="fixed left-3 top-3 z-[100] -translate-y-[160%] rounded-full bg-ink px-4 py-2.5 text-sm text-white no-underline transition-transform duration-200 ease-soft focus-visible:translate-y-0"
          href="#contenido"
        >
          Ir al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
