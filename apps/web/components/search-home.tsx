'use client';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { ChevronDown, ArrowRight, ArrowUp, PanelsTopLeft } from 'lucide-react';
import Link from 'next/link';
import { ProjectHeader, ProjectFooter } from './project-header';
import Chat from './chat';
import DesktopDemo from './desktop-demo';
import Image from 'next/image';
import { links } from '../landing/site';

export default function SearchHome({
  mode,
  children,
}: {
  mode: 'preview' | 'live';
  children: ReactNode;
}) {
  const [query, setQuery] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [conversation, setConversation] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const slot = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLFormElement>(null);
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    if (conversation !== null || !slot.current || !composer.current) return;
    const anchor = slot.current;
    const form = composer.current;
    const resize = new ResizeObserver(() => {
      if (!form.classList.contains('is-docked')) {
        anchor.style.minHeight = `${form.getBoundingClientRect().height}px`;
      }
    });
    resize.observe(form);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      setDocked(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(anchor);
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, [conversation]);
  function submit(event?: FormEvent, question?: string) {
    event?.preventDefault();
    const q = (question ?? query).trim();
    if (q.length < 4) return;
    setConversation(q);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  if (conversation !== null)
    return (
      <Chat
        key={chatKey}
        initialQuestion={conversation}
        onGoHome={() => {
          setDocked(false);
          setConversation(null);
          setQuery('');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onNewConversation={() => {
          setConversation('');
          setChatKey((value) => value + 1);
        }}
      />
    );
  return (
    <div className="reform-home">
      <ProjectHeader />
      <main id="main">
        <div className="reform-front">
          <div className="reform-hero">
            <div className="reform-hero-copy">
              <section className="reform-intro" aria-labelledby="reform-title">
                <div>
                  <h1 id="reform-title">
                    Lo público es de todos.
                    <br />
                    <span>Hagámoslo más fácil.</span>
                  </h1>
                </div>
                <div className="reform-purpose">
                  <p>
                    Trabajamos en dos frentes: ayudarte a entender los trámites y mejorar las webs
                    donde los haces.
                  </p>
                  <Link href="/#iniciativa">
                    Lee nuestra propuesta <ChevronDown size={17} aria-hidden="true" />
                  </Link>
                </div>
              </section>

              <section className="reform-search" aria-label="Buscador de trámites">
                <label htmlFor="question">¿Qué trámite necesitas resolver?</label>
                <div ref={slot} className="reform-composer-slot">
                  <form
                    ref={composer}
                    onSubmit={submit}
                    className={`reform-composer${docked ? ' is-docked' : ''}`}
                  >
                    <textarea
                      id="question"
                      aria-label="¿Qué trámite necesitas resolver?"
                      ref={textarea}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          submit();
                        }
                      }}
                      placeholder="Pregunta sobre trámites, ayudas, impuestos…"
                      maxLength={1200}
                      rows={1}
                    />
                    <button type="submit" disabled={query.trim().length < 4} aria-label="Preguntar">
                      <ArrowUp size={20} />
                    </button>
                  </form>
                </div>
                {mode === 'preview' && (
                  <p className="reform-search-note">
                    Vista previa con fragmentos oficiales. Respuestas con IA pendientes de conexión.
                  </p>
                )}
              </section>
            </div>
            <figure className="reform-hero-photo">
              <Image
                src="/madrid.jpg"
                alt="La Gran Vía de Madrid y sus edificios al atardecer"
                fill
                sizes="(max-width: 760px) 100vw, 40vw"
                priority
              />
              <div className="government-orbit" aria-hidden="true">
                {[
                  ['SEPE', 'Empleo', 'employment'],
                  ['AEAT', 'Impuestos', 'tax'],
                  ['DGT', 'Tráfico', 'traffic'],
                  ['BOE', 'Normativa', 'law'],
                  ['Seguridad Social', 'Prestaciones', 'social'],
                ].map(([name, label, tone], index) => (
                  <div
                    key={name}
                    className="government-orbit-slot"
                    style={
                      {
                        '--orbit-delay': `${-index * 9.6}s`,
                        '--orbit-angle': `${index * 72}deg`,
                      } as CSSProperties
                    }
                  >
                    <div className="government-orbit-counter">
                      <div className={`government-orbit-badge government-orbit-${tone}`}>
                        <strong>{name}</strong>
                        <span>{label}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </figure>
          </div>
          <section className="reform-extension" aria-labelledby="extension-tool-title">
            <div className="reform-extension-copy">
              <PanelsTopLeft size={28} aria-hidden="true" />
              <h2 id="extension-tool-title">Mejoramos las webs donde haces tus trámites.</h2>
              <p>
                La extensión reorganiza los portales que hemos adaptado. Una interfaz más clara, en
                la misma sede oficial.
              </p>
              <a href={links.install} className="reform-demo-link">
                Prueba la extensión <ArrowRight size={18} />
              </a>
            </div>
            <div className="initiative-demo" id="demostracion">
              <DesktopDemo />
              <p className="reform-demo-caption">
                Demo interactiva de la Agencia Tributaria. No envía datos.
              </p>
            </div>
          </section>
        </div>
        {children}
      </main>
      <ProjectFooter />
    </div>
  );
}
