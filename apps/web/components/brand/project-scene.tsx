'use client';
import { Input } from '@reforma-digital/design/ui/input';

import { Button } from '@reforma-digital/design/ui/button';

// Escenas del buscador y de la extensión, para los proyectos de la portada.
import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';

import { savePendingQuestion } from '../../lib/pending-question';
import { catalogo as cifras } from './catalogo';
import { Icon } from './icon';

const pregunta = '¿Dónde pido cita para la renta?';
const { resultadosRenta: resultados, total } = cifras;

function Navegador({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={
        'rc-navegador flex flex-col w-full overflow-hidden [border-radius:16px_16px_0_0] [background:var(--background)] [box-shadow:var(--shadow-overlay)]'
      }
    >
      <div
        className={
          'rc-navegador-barra flex items-center [gap:6px] shrink-0 h-10 [padding:0_12px] [border-bottom:1px_solid_var(--border)] [&_i]:[width:9px] [&_i]:[height:9px] [&_i]:[border-radius:50%] [&_i]:[background:var(--disabled)]'
        }
      >
        <i />
        <i />
        <i />
        <span
          className={
            'rc-url inline-flex [flex:1] items-center [gap:6px] [min-width:0] [height:26px] [margin-left:6px] [padding:0_10px] overflow-hidden [border-radius:999px] [background:var(--muted)] [color:var(--text-secondary)] text-xs whitespace-nowrap t-dato [font-family:var(--font-brand-mono)] [font-variant-numeric:tabular-nums] [letter-spacing:0]'
          }
        >
          <Icon name="candado" size={12} />
          www2.agenciatributaria.gob.es
        </span>
      </div>
      <div className={'rc-navegador-cuerpo [flex:1] [min-height:0] overflow-hidden'}>
        {children}
      </div>
    </div>
  );
}

// El compositor de la portada abre el chat con la pregunta. Sin JavaScript, el formulario solo
// abre /chat: el campo no tiene name para que la pregunta no viaje en la URL.
function Compositor() {
  const id = useId();
  const router = useRouter();
  const [texto, setTexto] = useState('');
  return (
    <form
      className={
        'rc-pieza absolute [inset:0] rc-hero [--ring:var(--background)] flex flex-col items-center justify-center [gap:6cqi] [padding:6cqi] [background:var(--brand-gradient)] [color:var(--background)] text-center'
      }
      action="/chat"
      onSubmit={(e) => {
        e.preventDefault();
        savePendingQuestion(texto.trim());
        router.push('/chat');
      }}
    >
      <label
        className={
          'rc-hero-titulo [margin-top:-8cqi] [font-family:var(--font-brand-heading)] [font-size:clamp(28px,_8cqi,_52px)] [line-height:1] [letter-spacing:-0.02em]'
        }
        htmlFor={id}
      >
        ¿Qué necesitas hacer?
      </label>
      <span
        className={
          'rc-compositor flex items-center gap-3 [width:min(100%,_440px)] min-h-16 [padding:5px_5px_5px_20px] [border:1px_solid_var(--foreground)] [border-radius:999px] [background:var(--background)] [box-shadow:var(--shadow-overlay)] [color:var(--foreground)] text-left [pointer-events:auto] [&:has(.rc-compositor-texto:focus-visible)]:[outline:2px_solid_var(--ring)] [&:has(.rc-compositor-texto:focus-visible)]:[outline-offset:2px] [&_[data-slot=button][data-size=icon-lg]]:[--ring:var(--foreground)]'
        }
      >
        <Input
          id={id}
          className={
            'rc-compositor-texto [flex:1] [align-self:stretch] [min-width:0] [text-overflow:ellipsis] [user-select:text]'
          }
          type="text"
          autoComplete="off"
          placeholder={pregunta}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Button
          type="submit"
          aria-label="Enviar pregunta"
          disabled={texto.trim().length < 4}
          size="icon-lg"
          variant="default"
        >
          <Icon name="enviar" size={20} />
        </Button>
      </span>
    </form>
  );
}

// Escenas: piezas de la interfaz. Solo el compositor del buscador es real; el resto es decorativo
// y el texto de cada paso ya cuenta lo que muestra.
export function ProjectScene({ project }: { project: 'search' | 'extension' }) {
  if (project === 'search') return <Compositor />;

  return (
    <div
      className={
        'rc-pieza absolute [inset:0] rc-sobre-sol flex items-center justify-center [padding:6cqi] rc-pieza-web [align-items:stretch] [padding:7cqi_7cqi_0]'
      }
      aria-hidden="true"
    >
      <Navegador>
        <div
          className={
            'rc-ordenada flex flex-col gap-3 p-5 [@container(max-width:_420px)]:[gap:10px] [@container(max-width:_420px)]:p-4'
          }
        >
          <span
            className={
              't-etiqueta [font-family:var(--font-brand-mono)] text-xs font-medium [line-height:1.3] [letter-spacing:0.08em] uppercase rc-ordenada-etiqueta [color:var(--text-secondary)]'
            }
          >
            Catálogo de servicios de asistencia
          </span>
          <span
            className={
              'rc-buscador flex items-center gap-2 min-h-12 [padding:0_16px] [border-radius:999px] [box-shadow:inset_0_0_0_2px_var(--foreground)] text-base'
            }
          >
            <Icon name="buscar" size={16} />
            <span className={'rc-buscador-texto [flex:1]'}>renta</span>
            <span
              className={
                'rc-buscador-cuenta [color:var(--text-secondary)] [font-size:13px] t-dato [font-family:var(--font-brand-mono)] [font-variant-numeric:tabular-nums] [letter-spacing:0]'
              }
            >
              {resultados.length} de {total}
            </span>
          </span>
          <span className={'rc-resultados flex flex-col'}>
            {resultados.map((s) => (
              <span
                key={s.id}
                className={
                  'rc-resultado grid [gap:2px] [padding:10px_14px] [border-radius:12px] [&_+_.rc-resultado]:[margin-top:2px] [&[data-elegido]]:[background:var(--resolved)] [&[data-elegido]]:[box-shadow:inset_0_0_0_1px_rgba(35,_70,_232,_0.24)] [&[data-elegido]_.rc-resultado-cat]:[color:var(--link)] [@container(max-width:_420px)]:[padding:8px_12px]'
                }
                data-elegido={s.name === 'Renta' ? '' : undefined}
              >
                <span
                  className={
                    'rc-resultado-cat [color:var(--text-secondary)] text-xs [@container(max-width:_420px)]:hidden t-dato [font-family:var(--font-brand-mono)] [font-variant-numeric:tabular-nums] [letter-spacing:0]'
                  }
                >
                  {s.category}
                </span>
                <span
                  className={'rc-resultado-nombre [font-size:15px] font-medium [line-height:1.35]'}
                >
                  {s.name}
                </span>
              </span>
            ))}
          </span>
          <span
            className={
              'rc-solicitar inline-flex [align-self:flex-start] items-center gap-2 min-h-11 [padding:0_20px] [border-radius:999px] [background:var(--foreground)] [color:var(--background)] [font-size:15px] font-medium'
            }
          >
            <Icon name="calendario" size={16} /> Solicita asistencia y cita
          </span>
        </div>
      </Navegador>
    </div>
  );
}
