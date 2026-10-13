import type { ReactNode } from 'react';
import { CongressShell } from '../../../../components/congreso/shell';

export default function Layout({ children }: { children: ReactNode }) {
  return <CongressShell>{children}</CongressShell>;
}
