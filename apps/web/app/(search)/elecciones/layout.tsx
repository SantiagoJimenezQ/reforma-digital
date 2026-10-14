import type { ReactNode } from 'react';
import { Header } from '../../../components/brand/header';
import { Footer } from '../../../components/brand/footer';
import { electionsBase } from '../../../lib/elecciones/pages';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header current={electionsBase} />
      {children}
      <Footer />
    </>
  );
}
