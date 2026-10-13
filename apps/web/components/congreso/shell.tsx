import type { ReactNode } from 'react';
import { Header } from '../sol/header';
import { Footer } from '../sol/footer';
import { congressBase } from '../../lib/congreso/routes';
import { CongressNav } from './nav';
import './congreso.css';

export function CongressShell({ children }: { children: ReactNode }) {
  return (
    <div className="cg">
      <Header current={congressBase} />
      <div className="cg-marco">
        <CongressNav />
        {children}
      </div>
      <Footer />
    </div>
  );
}
