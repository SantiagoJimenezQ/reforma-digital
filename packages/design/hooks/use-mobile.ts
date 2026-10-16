'use client';
import { useSyncExternalStore } from 'react';
const subscribe = (callback: () => void) => {
  const media = window.matchMedia('(max-width: 760px)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};
export function useMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(max-width: 760px)').matches,
    () => false,
  );
}
