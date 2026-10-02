import DemoTransform from '../../../landing/DemoTransform';

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return (
    <main id="main" className="desktop-demo-document">
      <DemoTransform compact initialView={view === 'legacy' ? 'legacy' : 'enhanced'} />
    </main>
  );
}
