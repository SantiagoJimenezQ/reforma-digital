'use client';

import { useEffect, useRef, useState } from 'react';
import { LockKeyhole, Pause, Play } from 'lucide-react';

const duration = 5000;
export default function DesktopDemo() {
  const [view, setView] = useState<'legacy' | 'enhanced'>('enhanced');
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const resize = new ResizeObserver(() => {
      element.style.setProperty('--demo-scale', String(element.clientWidth / 960));
    });
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(Boolean(entry?.isIntersecting)),
    );
    resize.observe(element);
    observer.observe(element);
    return () => {
      resize.disconnect();
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (paused || focused || !visible) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (!document.hidden) elapsed.current += Math.min(now - last, 100);
      last = now;
      if (elapsed.current >= duration) {
        elapsed.current = 0;
        setView((value) => (value === 'legacy' ? 'enhanced' : 'legacy'));
      }
      if (progress.current)
        progress.current.style.transform = `scaleX(${elapsed.current / duration})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, focused, visible]);

  function select(next: 'legacy' | 'enhanced') {
    setView(next);
    elapsed.current = 0;
    if (progress.current) progress.current.style.transform = 'scaleX(0)';
  }

  return (
    <div className="desktop-demo">
      <div className="desktop-demo-tabs" role="group" aria-label="Versión de la web">
        <button type="button" aria-pressed={view === 'legacy'} onClick={() => select('legacy')}>
          Original
        </button>
        <button type="button" aria-pressed={view === 'enhanced'} onClick={() => select('enhanced')}>
          Mejorada
        </button>
        <button
          className="desktop-demo-pause"
          type="button"
          aria-label={paused ? 'Reanudar comparación automática' : 'Pausar comparación automática'}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={15} /> : <Pause size={15} />}
        </button>
      </div>
      <div className="desktop-demo-browser">
        <div className="desktop-demo-address">
          <span aria-hidden="true">● ● ●</span>
          <LockKeyhole size={12} />
          <span>www2.agenciatributaria.gob.es</span>
        </div>
        <div className="desktop-demo-progress" aria-hidden="true">
          <span ref={progress} />
        </div>
        <div
          ref={viewport}
          className="desktop-demo-viewport"
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={() => setFocused(false)}
        >
          <iframe
            hidden={view !== 'legacy'}
            title="Web original de la Agencia Tributaria · demo"
            src="/demo?view=legacy"
            width="960"
            height="640"
          />
          <iframe
            hidden={view !== 'enhanced'}
            title="Web mejorada con Reforma Digital · demo"
            src="/demo?view=enhanced"
            width="960"
            height="640"
          />
        </div>
      </div>
    </div>
  );
}
