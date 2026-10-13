'use client';
import { Input } from '@reforma-digital/design/ui/input';
import { Textarea } from '@reforma-digital/design/ui/textarea';

import { Button } from '@reforma-digital/design/ui/button';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './icon';
import { links } from '../../lib/site';

export function Contribution() {
  const escena = useRef<HTMLDivElement>(null);
  const id = useId();
  const [animada, setAnimada] = useState(false);
  const [tocada, setTocada] = useState(false);

  useEffect(() => {
    const elemento = escena.current;
    if (!elemento) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          setAnimada(true);
          observador.disconnect();
        }
      },
      { rootMargin: '0px 0px -80px 0px' },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      className={
        'in-colaboracion block [container-type:inline-size] overflow-hidden [border-radius:28px] [background:var(--brand-gradient)] [color:var(--background)] [--ring:var(--brand)]'
      }
      ref={escena}
    >
      <div
        className={
          'in-colaboracion-composicion flex flex-col justify-center min-h-150 p-12 [@media(max-width:_480px)]:min-h-129 [@media(max-width:_480px)]:py-6 [@media(max-width:_480px)]:px-4'
        }
      >
        <form
          className={
            "in-issue [--in-gh-tinta:#1f2328] [--in-gh-gris:#59636e] [--in-gh-linea:#d1d9e0] [--in-gh-fondo:#f6f8fa] [--in-gh-verde:#1f883d] block overflow-hidden [border-radius:12px] [background:var(--background)] [box-shadow:var(--shadow-overlay)] [color:var(--in-gh-tinta)] [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_sans-serif] [font-size:15px] [line-height:1.5]"
          }
          action={`${links.repo}/issues/new`}
          method="get"
          target="_blank"
          rel="noopener noreferrer"
          aria-labelledby={`${id}-titulo`}
          onFocus={() => setTocada(true)}
        >
          <div
            className={
              'in-issue-demo [--in-issue-duracion:4800ms] [@media(prefers-reduced-motion:_no-preference)]:[&[data-animada]_.in-issue-escritura]:[animation:in-issue-escribir_var(--in-issue-duracion)_steps(24,_end)] [@media(prefers-reduced-motion:_no-preference)]:[&[data-animada]_.in-issue-descripcion]:[animation-name:in-issue-escribir-descripcion] [@media(prefers-reduced-motion:_no-preference)]:[&[data-animada]_.in-issue-cursor]:[animation:in-issue-cursor_var(--in-issue-duracion)_var(--ease-brand)] [@media(prefers-reduced-motion:_no-preference)]:[&[data-animada]_.in-issue-enviar]:[animation:in-issue-click_var(--in-issue-duracion)_var(--ease-brand)] [@media(prefers-reduced-motion:_no-preference)]:[&[data-animada]_.in-issue-enviar-texto]:[animation:in-issue-ocultar-texto_var(--in-issue-duracion)_var(--ease-brand)] [@media(prefers-reduced-motion:_no-preference)]:[&[data-animada]_.in-issue-enviar-check]:[animation:in-issue-check_var(--in-issue-duracion)_var(--ease-brand)] [@media(prefers-reduced-motion:_no-preference)]:[&[data-animada]_.in-issue-confirmacion]:[animation:in-issue-creada_var(--in-issue-duracion)_var(--ease-brand)]'
            }
            data-animada={animada && !tocada ? '' : undefined}
          >
            <div
              className={
                'in-issue-repo flex items-center gap-2 [padding:12px_24px] [border-bottom:1px_solid_var(--in-gh-linea)] [background:var(--in-gh-fondo)] [&_.t-dato]:[margin-left:auto] [&_.t-dato]:[color:var(--in-gh-gris)] [&_.t-dato]:text-xs'
              }
              aria-hidden="true"
            >
              <Icon name="documento" size={18} />
              <strong>reforma-digital</strong>
              <span
                className={
                  't-dato [font-family:var(--font-brand-mono)] [font-variant-numeric:tabular-nums] [letter-spacing:0]'
                }
              >
                Issues
              </span>
            </div>
            <div className={'in-issue-formulario relative grid gap-4 p-6'}>
              <strong
                className={
                  'in-issue-titulo flex items-center gap-2 [font-size:22px] font-semibold [line-height:1.2] [&_.icono]:[padding:2px] [&_.icono]:[border-radius:50%] [&_.icono]:[background:var(--in-gh-fondo)]'
                }
                id={`${id}-titulo`}
              >
                <Icon name="usuario" size={20} /> Crear una issue
              </strong>
              <div
                className={
                  'in-issue-campo grid gap-1 [&_>_label]:font-semibold [&_>_label_b]:[color:var(--brand-dark)] [&_>_div]:overflow-hidden [&_>_div]:[border:1px_solid_var(--in-gh-linea)] [&_>_div]:[border-radius:6px] [&_:is(input,_textarea)]:block [&_:is(input,_textarea)]:w-full [&_:is(input,_textarea)]:min-h-11 [&_:is(input,_textarea)]:[padding:8px_12px] [&_:is(input,_textarea)]:border-0 [&_:is(input,_textarea)]:[background:transparent] [&_:is(input,_textarea)]:[color:inherit] [&_:is(input,_textarea)]:[font:inherit] [&_:is(input,_textarea):focus-visible]:[outline-offset:-2px] [&_::placeholder]:[color:var(--in-gh-gris)] [&_::placeholder]:[opacity:1]'
                }
              >
                <label htmlFor={`${id}-title`}>
                  Añade un título <b aria-hidden="true">*</b>
                </label>
                <div>
                  <Input
                    className="in-issue-escritura"
                    id={`${id}-title`}
                    name="title"
                    required
                    maxLength={200}
                    autoComplete="off"
                    placeholder="Pedir cita sin perderse"
                    aria-describedby={`${id}-aviso`}
                  />
                </div>
              </div>
              <div
                className={
                  'in-issue-campo grid gap-1 [&_>_label]:font-semibold [&_>_label_b]:[color:var(--brand-dark)] [&_>_div]:overflow-hidden [&_>_div]:[border:1px_solid_var(--in-gh-linea)] [&_>_div]:[border-radius:6px] [&_:is(input,_textarea)]:block [&_:is(input,_textarea)]:w-full [&_:is(input,_textarea)]:min-h-11 [&_:is(input,_textarea)]:[padding:8px_12px] [&_:is(input,_textarea)]:border-0 [&_:is(input,_textarea)]:[background:transparent] [&_:is(input,_textarea)]:[color:inherit] [&_:is(input,_textarea)]:[font:inherit] [&_:is(input,_textarea):focus-visible]:[outline-offset:-2px] [&_::placeholder]:[color:var(--in-gh-gris)] [&_::placeholder]:[opacity:1]'
                }
              >
                <label htmlFor={`${id}-body`}>Añade una descripción</label>
                <div
                  className={
                    'in-issue-editor [&_>_.in-issue-descripcion]:min-h-35 [&_>_.in-issue-descripcion]:p-3 [&_>_.in-issue-descripcion]:[resize:vertical]'
                  }
                >
                  <div
                    className={
                      'in-issue-herramientas flex items-center gap-3 min-h-9 pr-3 [border-bottom:1px_solid_var(--in-gh-linea)] [background:var(--in-gh-fondo)] [color:var(--in-gh-gris)]'
                    }
                    aria-hidden="true"
                  >
                    <span
                      className={
                        'in-issue-tab [align-self:stretch] grid items-center [padding:0_12px] [border-right:1px_solid_var(--in-gh-linea)] [background:var(--background)] [color:var(--in-gh-tinta)]'
                      }
                    >
                      Escribir
                    </span>
                    <span>Vista previa</span>
                    <span
                      className={
                        'in-issue-formatos flex items-center gap-3 [margin-left:auto] [@media(max-width:_480px)]:gap-2 [@media(max-width:_480px)]:[&_>_:last-child]:hidden'
                      }
                    >
                      <b>B</b>
                      <i>I</i>
                      <Icon name="externo" size={14} />
                      <span>{'<>'}</span>
                    </span>
                  </div>
                  <Textarea
                    className="in-issue-escritura in-issue-descripcion"
                    id={`${id}-body`}
                    name="body"
                    rows={4}
                    maxLength={1000}
                    placeholder={
                      'El botón no explica\ncuál es el siguiente paso.\nPropongo aclararlo.'
                    }
                    aria-describedby={`${id}-aviso`}
                  />
                </div>
                <span
                  className={
                    'in-issue-aviso flex items-center gap-1 mt-1 [color:var(--in-gh-gris)] text-sm'
                  }
                  id={`${id}-aviso`}
                >
                  <Icon name="info" size={14} /> La issue será pública en GitHub. No incluyas datos
                  personales.
                </span>
              </div>
              <div
                className={
                  'in-issue-acciones flex items-center [justify-content:flex-end] gap-2 [&_.in-issue-enviar]:[display:inline-grid]'
                }
              >
                <Button type="reset" variant="outline">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className={'in-issue-enviar [&_>_span]:[grid-area:1_/_1]'}
                >
                  <span className="in-issue-enviar-texto">Crear</span>
                  <span
                    className={'in-issue-enviar-check grid [place-items:center] [opacity:0]'}
                    aria-hidden="true"
                  >
                    <Icon name="hecho" size={18} />
                  </span>
                  <span
                    className={
                      'sr-only absolute [width:1px] [height:1px] p-0 [margin:-1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0'
                    }
                  >
                    {' '}
                    (se abre en una pestaña nueva)
                  </span>
                </Button>
              </div>
              <span
                className={
                  'in-issue-confirmacion absolute left-4 bottom-5 inline-flex items-center gap-2 [padding:8px_12px] [border:1px_solid_var(--in-gh-linea)] [border-radius:6px] [background:var(--background)] [box-shadow:var(--shadow-soft)] [color:var(--in-gh-verde)] [opacity:0] pointer-events-none'
                }
                aria-hidden="true"
              >
                Una mejora en camino.
              </span>
              <svg
                className={
                  'in-issue-cursor absolute right-6 bottom-5 [opacity:0] pointer-events-none'
                }
                width="24"
                height="28"
                viewBox="0 0 24 28"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 2v21l6-5 4 8 4-2-4-8h8L3 2Z"
                  fill={'var(--background)'}
                  stroke={'var(--foreground)'}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
