'use client';
import { useEffect, useRef } from 'react';

export default function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current)
        bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0})`;
    };
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return (
    <div
      ref={bar}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left scale-x-0 bg-ink"
      aria-hidden="true"
    />
  );
}
