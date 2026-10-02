import type { Metadata } from 'next';
import LandingHome from '../../components/landing-home';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || 'http://localhost:3000'),
  title: 'Reforma Digital · La próxima reforma de la Administración',
  description:
    'Una iniciativa abierta: un buscador de trámites con fuentes oficiales y una extensión para hacer más sencillas las webs de la Administración.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Reforma Digital · La próxima reforma de la Administración',
    description:
      'Un buscador para entender los trámites, una extensión para las sedes oficiales, y una propuesta para tratar la interfaz como un bien común.',
    images: ['/og.png'],
    locale: 'es_ES',
    type: 'website',
  },
  icons: { icon: '/favicon.svg' },
};
export default function HomePage() {
  return <LandingHome />;
}
