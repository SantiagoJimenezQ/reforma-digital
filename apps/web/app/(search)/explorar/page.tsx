import type { Metadata } from 'next';
import ExploreHome from '../../../components/explore-home';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Reforma Digital — Una forma más fácil de hacer lo público',
  robots: { index: false, follow: false },
};

export default function ExplorePage() {
  return <ExploreHome mode={process.env.SEARCH_MODE === 'live' ? 'live' : 'preview'} />;
}
