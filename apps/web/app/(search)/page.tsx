import type { Metadata } from 'next';
import SearchHome from '../../components/search-home';
import Initiative from '../../components/initiative';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || 'http://localhost:3000'),
  title: 'Reforma Digital — Lo público, más fácil de usar.',
  description:
    'Encuentra tu trámite con fuentes oficiales y descubre una iniciativa abierta para hacer más sencillas las webs de la Administración.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Reforma Digital — Lo público, más fácil de usar.',
    description:
      'Una iniciativa abierta: un buscador para entender los trámites y una extensión para mejorar las webs oficiales.',
    images: ['/og.png'],
    locale: 'es_ES',
    type: 'website',
  },
  icons: { icon: '/favicon.svg' },
};
export default function HomePage() {
  return (
    <SearchHome mode={process.env.SEARCH_MODE === 'live' ? 'live' : 'preview'}>
      <Initiative />
    </SearchHome>
  );
}
