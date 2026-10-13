'use client';
import { Dialog, DialogContent, DialogTitle } from '@reforma-digital/design/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@reforma-digital/design/ui/select';
import { Button } from '@reforma-digital/design/ui/button';
import { Textarea } from '@reforma-digital/design/ui/textarea';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { APICallError } from 'ai';
import { Icon } from './brand/icon';
import type { Region, Stage } from '@reforma-digital/core';

import {
  IconSwap,
  JumpButton,
  Notice,
  Question,
  QuestionDetail,
  Response,
  SourcesButton,
  Suggestion,
  Suggestions,
  Thinking,
} from '@reforma-digital/design/chat';
import { AttachmentPicker } from './attachment-picker';
import type { PdfContext } from '../lib/attachment';
import { warm } from '../lib/pii';
import { ProtectedQuestion } from './protected-question';
import { chatTransport, textOf } from '../lib/chat-transport';
import type { ChatMessage } from '../lib/chat-message';
import { AnswerBlocks, citedEvidence, readAnswer, type AnswerView } from './chat-answer';
import { Sources, type SourceView } from './chat-sources';
import type { Evidence } from '@reforma-digital/core';
import dynamic from 'next/dynamic';
// The map geometry is only downloaded when the coverage dialog opens.
const SourcesMap = dynamic(() => import('./sources-map'), {
  loading: () => (
    <section
      className={
        "sources-map [&_h2]:pr-14 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:[line-height:1.3] [&_a:not(.sources-map-region)]:[text-decoration:underline] [&_a:not(.sources-map-region)]:[text-underline-offset:3px] [&_[data-band='0']]:[fill:rgb(var(--bg-danger-line))] [&_[data-band='0']]:[background:rgb(var(--bg-danger-line))] [&_[data-band='1']]:[fill:rgb(var(--bg-warning-line))] [&_[data-band='1']]:[background:rgb(var(--bg-warning-line))] [&_[data-band='2']]:[fill:rgb(var(--bg-success-line))] [&_[data-band='2']]:[background:rgb(var(--bg-success-line))] [&_[data-band='3']]:[fill:rgb(var(--bg-success-fg))] [&_[data-band='3']]:[background:rgb(var(--bg-success-fg))] sources-map-cargando [min-height:100dvh]"
      }
      aria-labelledby="sources-map-title"
    >
      <h2 id="sources-map-title">Fuentes por territorio</h2>
    </section>
  ),
});

const stages: Record<Stage, string> = {
  understandQuery: 'Entendiendo tu pregunta',
  retrieval: 'Consultando fuentes oficiales',
  generation: 'Redactando y verificando la respuesta',
  evaluation: 'Comprobando referencias',
};
const fallbackError = 'No se ha podido completar la respuesta.';
export type LimitedRegion = { id: Region; name: string; sourceCount: number };

function describeError(error: Error | undefined): string {
  if (!error) return fallbackError;
  if (APICallError.isInstance(error)) {
    try {
      const body = JSON.parse(error.responseBody ?? '') as { error?: unknown };
      if (typeof body.error === 'string') return body.error;
    } catch {
      /* HTML or empty error bodies are not shown to the user. */
    }
    return 'No se ha podido consultar las fuentes.';
  }
  if (error instanceof TypeError)
    return 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.';
  return error.message || fallbackError;
}

function CoverageNotice({
  region,
  openMap,
}: {
  region: LimitedRegion | undefined;
  openMap: (regionId: string) => void;
}) {
  if (!region) return null;
  return (
    <p
      className={
        'chat-coverage-note chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]'
      }
    >
      Nuestra cobertura territorial en {region.name} es limitada: {region.sourceCount}{' '}
      {region.sourceCount === 1 ? 'fuente registrada' : 'fuentes registradas'}.{' '}
      <Button
        aria-haspopup="dialog"
        aria-controls={
          'chat-coverage-dialog [width:min(960px,_calc(100vw_-_32px))] [&_.source-close]:top-6 [&_.source-close]:right-6 [html:has(&[open])]:overflow-hidden [@media(max-width:_800px)]:[width:calc(100vw_-_16px)] [@media(max-width:_800px)]:[&_.source-modal-inner]:p-4 [@media(max-width:_800px)]:[&_.source-close]:top-4 [@media(max-width:_800px)]:[&_.source-close]:right-4'
        }
        onClick={() => openMap(region.id)}
        variant="outline"
      >
        Ver mapa de fuentes
      </Button>
    </p>
  );
}
function AnswerActions({
  message,
  view,
  showSources,
}: {
  message: ChatMessage;
  view: AnswerView;
  showSources: (evidence: Evidence[]) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<1 | -1>();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [negative, setNegative] = useState(false);
  const [reason, setReason] = useState('incorrect');
  const evidence = citedEvidence(view);
  const { searchId, feedbackToken } = message.metadata ?? {};
  async function vote(value: 1 | -1) {
    if (!searchId || !feedbackToken) return;
    setBusy(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchId,
          token: feedbackToken,
          rating: value,
          ...(value === -1 ? { reason } : {}),
        }),
      });
      if (!response.ok) throw new Error();
      setRating(value);
      setNegative(false);
      setNote('Gracias por tu valoración.');
    } catch {
      setNote('No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        [
          view.blocks.map((b) => b.claim.text).join('\n\n'),
          ...new Set(evidence.map((e) => e.canonicalUrl)),
        ].join('\n\n'),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNote('No se pudo copiar. Puedes seleccionar el texto de la respuesta.');
    }
  }
  // Sources, votes and copy only make sense next to verified claims.
  if (!view.blocks.length) return null;
  return (
    <>
      <div
        className={
          'chat-actions flex flex-wrap items-center gap-2 mt-8 [animation-delay:80ms] [@media(max-width:_800px)]:flex-wrap chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]'
        }
      >
        {evidence.length > 0 && (
          <SourcesButton
            organization={evidence[0]!.organization}
            count={new Set(evidence.map((e) => e.documentId)).size}
            onOpen={() => showSources(evidence)}
          />
        )}
        <div className={'chat-action-icons flex [margin-left:auto] [color:var(--text-secondary)]'}>
          {feedbackToken && (
            <>
              <Button
                variant={rating === 1 ? 'secondary' : 'ghost'}
                size="icon"
                className={
                  "chat-icon inline-flex justify-center items-center [&[aria-pressed='true']_.icono]:[animation:chat-pulse_320ms_var(--ease-brand)] [@media(prefers-reduced-motion:_reduce)]:[&[aria-pressed='true']_.icono]:[animation:none]"
                }
                disabled={busy}
                aria-label="Respuesta útil"
                aria-pressed={rating === 1}
                onClick={() => void vote(1)}
              >
                <Icon name="util" size={20} />
              </Button>
              <Button
                variant={rating === -1 ? 'secondary' : 'ghost'}
                size="icon"
                className={
                  "chat-icon inline-flex justify-center items-center [&[aria-pressed='true']_.icono]:[animation:chat-pulse_320ms_var(--ease-brand)] [@media(prefers-reduced-motion:_reduce)]:[&[aria-pressed='true']_.icono]:[animation:none]"
                }
                disabled={busy}
                aria-label="Respuesta no útil"
                aria-pressed={rating === -1}
                onClick={() => setNegative(!negative)}
              >
                <Icon name="noUtil" size={20} />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={
              "chat-icon inline-flex justify-center items-center [&[aria-pressed='true']_.icono]:[animation:chat-pulse_320ms_var(--ease-brand)] [@media(prefers-reduced-motion:_reduce)]:[&[aria-pressed='true']_.icono]:[animation:none]"
            }
            onClick={() => void copy()}
            aria-label={copied ? 'Copiado' : 'Copiar respuesta'}
          >
            <IconSwap
              active={copied ? 'b' : 'a'}
              a={<Icon name="copiar" size={20} />}
              b={<Icon name="hecho" size={20} />}
            />
          </Button>
        </div>
      </div>
      {negative && (
        <form
          className={
            'chat-feedback flex gap-2 flex-wrap items-center text-sm [background:rgb(var(--bg-surface-muted))] [padding:14px] [border-radius:16px] mt-4 [&_select]:[max-width:100%] chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]'
          }
          onSubmit={(e) => {
            e.preventDefault();
            void vote(-1);
          }}
        >
          <label htmlFor={`reason-${message.id}`}>¿Qué falló?</label>
          <Select
            value={reason}
            onValueChange={(value) => {
              if (value !== null) setReason(value);
            }}
            items={[
              { value: 'incorrect', label: 'Respuesta incorrecta' },
              { value: 'source', label: 'Fuente incorrecta' },
              { value: 'outdated', label: 'Información desactualizada' },
              { value: 'unanswered', label: 'No respondió' },
              { value: 'other', label: 'Otro motivo' },
            ]}
          >
            <SelectTrigger id={`reason-${message.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="incorrect">Respuesta incorrecta</SelectItem>
              <SelectItem value="source">Fuente incorrecta</SelectItem>
              <SelectItem value="outdated">Información desactualizada</SelectItem>
              <SelectItem value="unanswered">No respondió</SelectItem>
              <SelectItem value="other">Otro motivo</SelectItem>
            </SelectContent>
          </Select>
          <Button disabled={busy}>Enviar</Button>
          <Button type="button" onClick={() => setNegative(false)}>
            Cancelar
          </Button>
        </form>
      )}
      {note && (
        <p
          className={
            'chat-action-message text-sm [color:rgb(var(--bg-ink-subtle))] mt-2! chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]'
          }
          role="status"
        >
          {note}
        </p>
      )}
    </>
  );
}
export default function Chat({
  initialQuestion,
  header,
  footer,
  limitedRegions,
}: {
  initialQuestion: string;
  header: ReactNode;
  footer?: ReactNode;
  limitedRegions: readonly LimitedRegion[];
}) {
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>('understandQuery');
  const [stopped, setStopped] = useState<ReadonlySet<string>>(new Set());
  const [showJump, setShowJump] = useState(false);
  const [sourceView, setSourceView] = useState<SourceView | null>(null);
  const showSources = (evidence: Evidence[], selected?: Evidence) =>
    setSourceView({ evidence, ...(selected ? { selected } : {}) });
  const [attachment, setAttachment] = useState<PdfContext>();
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const [coverageRegionId, setCoverageRegionId] = useState<string | null>(null);
  const [coverageOpened, setCoverageOpened] = useState(false);
  const nearBottom = useRef(true);
  const { messages, sendMessage, regenerate, stop, status, error } = useChat<ChatMessage>({
    transport: chatTransport,
    onData: (part) => {
      if (part.type === 'data-stage') setStage(part.data.stage);
    },
  });
  const loading = status === 'submitted' || status === 'streaming';
  const turns: { user: ChatMessage; assistant?: ChatMessage }[] = [];
  for (const message of messages) {
    if (message.role === 'user') turns.push({ user: message });
    else if (message.role === 'assistant' && turns.length) turns.at(-1)!.assistant = message;
  }
  function jump() {
    nearBottom.current = true;
    bottom.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
    setShowJump(false);
  }
  function send(question: string) {
    const query = question.trim();
    if (query.length < 4 || loading || attachmentBusy) return;
    nearBottom.current = true;
    setStage('understandQuery');
    void sendMessage({ text: query, ...(attachment ? { metadata: { attachment } } : {}) });
    setInput('');
    setAttachment(undefined);
    setAttachmentError('');
  }
  function retry() {
    const last = turns.at(-1);
    if (!last || loading) return;
    setStopped((ids) => new Set([...ids].filter((id) => id !== last.user.id)));
    setStage('understandQuery');
    nearBottom.current = true;
    void regenerate();
  }
  function halt() {
    const last = turns.at(-1);
    if (last) setStopped((ids) => new Set(ids).add(last.user.id));
    void stop();
  }
  useEffect(() => {
    let cancelled = false;
    if (!initialQuestion) inputRef.current?.focus({ preventScroll: true });
    if (initialQuestion)
      queueMicrotask(() => {
        if (!cancelled) send(initialQuestion);
      });
    return () => {
      cancelled = true;
    };
    // A pending landing question is consumed once; conversation state is deliberately kept in memory.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);
  useEffect(() => {
    const onScroll = () => {
      nearBottom.current =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 150;
      setShowJump(!nearBottom.current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // «Nueva conversación» remounts the chat: the pending search and its model calls must stop.
  useEffect(() => () => void stop(), [stop]);
  // Errors and stops change the status without a new message part; follow them too.
  useEffect(() => {
    if (nearBottom.current) jump();
  }, [messages, status]);
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
      el.style.overflowY = el.scrollHeight > 200 ? 'auto' : 'hidden';
    }
  }, [input]);
  useEffect(() => {
    const el = dock.current;
    if (!el) return;
    const root = document.documentElement;
    let height = 0;
    const observer = new ResizeObserver(() => {
      const nextHeight = el.offsetHeight;
      if (nextHeight === height) return;
      height = nextHeight;
      const follow = nearBottom.current;
      root.style.setProperty('--chat-dock-height', `${height}px`);
      // Keep the last response visible as the composer grows, unless reading older turns.
      if (follow) jump();
    });
    observer.observe(el);
    let resizeFrame = 0;
    const onResize = () => {
      if (!nearBottom.current) return;
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(jump);
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      observer.disconnect();
      root.style.removeProperty('--chat-dock-height');
    };
  }, []);
  function rephrase(query: string) {
    setInput(query);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(query.length, query.length);
    });
  }
  function submit(e?: FormEvent) {
    e?.preventDefault();
    send(input);
  }
  function openCoverage(regionId: string) {
    setCoverageRegionId(regionId);
    setCoverageOpened(true);
  }
  return (
    <div
      className={
        'chat-page [body:has(&)]:[overflow-x:clip] [html:has(&)]:[scroll-padding-bottom:calc(var(--chat-dock-height,_160px)_+_16px)] [background:rgb(var(--bg-canvas))] [min-height:100dvh] [max-width:100%] [overflow-x:clip] [color:rgb(var(--bg-ink))] [font-family:var(--bg-font)] text-base [line-height:1.6]'
      }
    >
      {header}
      <a
        className={
          'skip-link fixed top-2 left-2 [z-index:100] [padding:12px_16px] [background:var(--foreground)] [color:var(--background)] [transform:translateY(-150%)] [&:focus]:[transform:none]'
        }
        href="#chat-input"
      >
        Ir al cuadro de mensaje
      </a>
      <main
        id="main"
        className={
          'chat-conversation [max-width:688px] [margin:0_auto] [padding:calc(108px_+_env(safe-area-inset-top,_0px))_12px_0] [overflow-wrap:anywhere] [@media(max-width:_800px)]:[padding:calc(96px_+_env(safe-area-inset-top,_0px))_16px_0]'
        }
        aria-label="Conversación"
      >
        {!turns.length && (
          <div
            className={
              'chat-empty pt-20 [&_h1]:[font:500_36px/1.2_var(--bg-font)] [&_h1]:[letter-spacing:-0.04em] [&_h1]:[margin:0_0_20px] [&_>_p]:[color:rgb(var(--bg-ink-subtle))] [@media(max-width:_800px)]:pt-10 [@media(max-width:_800px)]:[&_h1]:[font-size:clamp(28px,_8vw,_36px)]'
            }
          >
            <h1>¿Qué necesitas hacer?</h1>
            <p>Pregunta con tus palabras. Te acercamos a las fuentes oficiales.</p>
            <Suggestions>
              {['¿Cómo me hago autónomo?', '¿Cómo me empadrono en Madrid?'].map((q, i) => (
                <Suggestion
                  key={q}
                  index={i}
                  icon={<Icon name="derecha" size={17} />}
                  onSelect={send}
                >
                  {q}
                </Suggestion>
              ))}
            </Suggestions>
          </div>
        )}
        {turns.map(({ user, assistant }, turnIndex) => {
          const last = turnIndex === turns.length - 1;
          const pending = last && loading;
          const failed = last && status === 'error';
          const halted = !pending && stopped.has(user.id);
          const view = readAnswer(assistant);
          const meta = assistant?.metadata;
          const question = textOf(user);
          // A reply that ends without its final metadata was cut off on the way.
          const interrupted = !pending && !failed && !halted && !meta?.status;
          const cited = citedEvidence(view);
          const documents = new Set(cited.map((e) => e.documentId)).size;
          return (
            <section
              className={
                'chat-turn mb-14 [scroll-margin-top:120px] [@media(max-width:_800px)]:[margin-bottom:42px]'
              }
              key={user.id}
              aria-label={`Pregunta ${turnIndex + 1}`}
            >
              <Question
                level={turnIndex === 0 ? 1 : 2}
                attachment={
                  user.metadata?.attachment && (
                    <>
                      <Icon name="documento" size={16} /> {user.metadata.attachment.name}
                    </>
                  )
                }
                details={
                  (view.hidden.length > 0 || documents > 0) && (
                    <>
                      {view.hidden.length > 0 && (
                        <QuestionDetail icon={<Icon name="candado" size={16} />}>
                          {view.hidden.length === 1
                            ? '1 dato personal ocultado al modelo'
                            : `${view.hidden.length} datos personales ocultados al modelo`}
                        </QuestionDetail>
                      )}
                      {documents > 0 && (
                        <QuestionDetail icon={<Icon name="protegido" size={16} />}>
                          Respuesta verificada con {documents}{' '}
                          {documents === 1 ? 'fuente oficial' : 'fuentes oficiales'}
                        </QuestionDetail>
                      )}
                    </>
                  )
                }
              >
                <ProtectedQuestion text={question} ranges={view.hidden} id={user.id} />
              </Question>
              <div className={'chat-assistant [line-height:1.6] [overflow-wrap:anywhere]'}>
                <AnswerBlocks view={view} onCite={(selected) => showSources(cited, selected)} />
                {pending && (
                  <Thinking
                    label={assistant ? 'Pensando…' : 'Preparando todo…'}
                    stage={assistant ? stages[stage] : undefined}
                  />
                )}
                {meta?.status === 'answered' && !view.blocks.length && (
                  <Response
                    streaming={view.streaming}
                    className={'chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]'}
                  >
                    {view.text}
                  </Response>
                )}
                {meta?.status && meta.status !== 'answered' && (
                  <Notice
                    tone="info"
                    role="status"
                    icon={<Icon name="info" size={20} />}
                    title={
                      meta.status === 'needs_clarification'
                        ? 'Necesitamos un poco más de detalle'
                        : 'No hemos encontrado una respuesta verificada'
                    }
                    actions={
                      (last || view.evidence.length > 0) && (
                        <>
                          {last && (
                            <Button onClick={() => rephrase(question)} variant="outline">
                              <Icon name="nueva" size={15} />
                              Reformular la pregunta
                            </Button>
                          )}
                          {view.evidence.length > 0 && (
                            <Button
                              aria-haspopup="dialog"
                              onClick={() => showSources(view.evidence)}
                              variant="outline"
                            >
                              Ver lo consultado ({view.evidence.length})
                            </Button>
                          )}
                        </>
                      )
                    }
                  >
                    <Response streaming={view.streaming}>{view.text}</Response>
                  </Notice>
                )}
                {meta?.incomplete && (
                  <p
                    className={
                      'chat-partial text-sm [color:rgb(var(--bg-ink-subtle))] [margin:20px_0]! [line-height:22px] chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]'
                    }
                  >
                    Las fuentes no permiten confirmar todos los detalles. Aquí aparecen únicamente
                    los que hemos podido verificar.
                  </p>
                )}
                {meta?.status && (
                  <CoverageNotice
                    region={limitedRegions.find((region) => region.id === meta.region)}
                    openMap={openCoverage}
                  />
                )}
                {halted && (
                  <div
                    className={
                      'chat-stopped chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]'
                    }
                  >
                    <p
                      className={
                        'chat-partial text-sm [color:rgb(var(--bg-ink-subtle))] [margin:20px_0]! [line-height:22px]'
                      }
                      role="status"
                    >
                      Respuesta detenida.
                      {view.blocks.length > 0 && ' Los fragmentos mostrados ya están verificados.'}
                    </p>
                    {last && (
                      <Button disabled={loading} onClick={retry} variant="outline">
                        <Icon name="reintentar" size={14} /> Volver a intentar
                      </Button>
                    )}
                  </div>
                )}
                {(failed || interrupted) && (
                  <Notice
                    tone="error"
                    role="alert"
                    icon={<Icon name="error" size={20} />}
                    title="No se ha podido completar la respuesta"
                    actions={
                      last && (
                        <Button disabled={loading} onClick={retry} variant="outline">
                          <Icon name="reintentar" size={15} /> Volver a intentar
                        </Button>
                      )
                    }
                  >
                    <p>
                      {failed
                        ? describeError(error)
                        : 'La conexión se interrumpió. Puedes volver a intentarlo.'}
                    </p>
                    {view.blocks.length > 0 && (
                      <p>
                        La respuesta está incompleta. Los fragmentos mostrados están verificados.
                      </p>
                    )}
                  </Notice>
                )}
                {assistant && !pending && (
                  <AnswerActions message={assistant} view={view} showSources={showSources} />
                )}
                {last && !pending && meta?.status === 'answered' && (
                  <Suggestions>
                    {['¿Qué documentación necesito?', '¿Dónde lo puedo tramitar?'].map((q, i) => (
                      <Suggestion
                        key={q}
                        index={i}
                        icon={<Icon name="arrowUp" size={14} />}
                        onSelect={send}
                      >
                        {q}
                      </Suggestion>
                    ))}
                  </Suggestions>
                )}
              </div>
            </section>
          );
        })}
        <div
          ref={bottom}
          className={'chat-bottom [height:calc(var(--chat-dock-height,_160px)_+_24px)]'}
        />
      </main>
      <div
        ref={dock}
        className={
          "chat-composer-dock fixed [z-index:15] [bottom:0] [left:0] [right:0] [width:min(_688px,_calc(100%_-_40px_-_env(safe-area-inset-left,_0px)_-_env(safe-area-inset-right,_0px))_)] [margin-inline:auto] [box-sizing:border-box] [padding:20px_0_max(16px,_env(safe-area-inset-bottom))] [background:linear-gradient(rgb(var(--bg-canvas)_/_0),_rgb(var(--bg-canvas))_20%)] isolate [&:after]:[content:''] [&:after]:absolute [&:after]:[z-index:-1] [&:after]:[left:0] [&:after]:[right:0] [&:after]:[bottom:0] [&:after]:[top:25px] [&:after]:[background:rgb(var(--bg-canvas))] [@media(max-width:_800px)]:[width:calc(_100%_-_max(16px,_env(safe-area-inset-left,_0px))_-_max(16px,_env(safe-area-inset-right,_0px))_)] [@media(max-width:_800px)]:pt-4 [@media(max-width:_800px)]:[padding-bottom:max(12px,_env(safe-area-inset-bottom))]"
        }
      >
        <JumpButton visible={showJump} onClick={jump}>
          <Icon name="abajo" size={18} />
        </JumpButton>
        {attachmentError && (
          <p
            className={
              'chat-composer-error text-sm [background:rgb(var(--bg-surface-muted))] p-3 [border-radius:12px] [margin:0_0_8px] chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]'
            }
            role="alert"
          >
            {attachmentError}
          </p>
        )}
        {(attachment || attachmentBusy) && (
          <div
            className={
              'chat-attachment-preview [background:rgb(var(--bg-surface))] [border:1px_solid_rgb(var(--bg-brand-100))] [border-radius:var(--bg-radius-control)] [padding:10px_14px] [margin:0_8px_8px] [box-shadow:none] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:[gap:10px] [&_>_div_>_span]:[flex:1] [&_>_div_>_span]:overflow-hidden [&_>_div_>_span]:[text-overflow:ellipsis] [&_>_div_>_span]:whitespace-nowrap [&_>_div_>_span]:text-sm [&_small]:block [&_small]:[color:rgb(var(--bg-ink-subtle))] [&_small]:text-sm [&_small]:[line-height:16px] [&_small]:mt-1 chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]'
            }
          >
            <div>
              <Icon name="documento" size={20} />
              <span>{attachmentBusy ? 'Leyendo PDF…' : attachment?.name}</span>
              {attachment && !attachmentBusy && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={
                    "chat-icon inline-flex justify-center items-center [&[aria-pressed='true']_.icono]:[animation:chat-pulse_320ms_var(--ease-brand)] [@media(prefers-reduced-motion:_reduce)]:[&[aria-pressed='true']_.icono]:[animation:none]"
                  }
                  onClick={() => setAttachment(undefined)}
                  aria-label="Quitar PDF"
                >
                  <Icon name="cerrar" size={16} />
                </Button>
              )}
            </div>
            <small>
              {attachment?.truncated ? 'Se usarán los primeros 6.000 caracteres. ' : ''}
              Al enviar, el texto se usará como contexto; nunca como fuente oficial.
            </small>
          </div>
        )}
        <form
          className={
            'chat-composer flex items-end [gap:6px] [border:1px_solid_rgb(var(--bg-line-control))] [background:rgb(var(--bg-surface))] [border-radius:20px] [box-shadow:none] [padding:10px_10px_10px_14px] [cursor:text] [transition:border-color_160ms_var(--ease-brand),_box-shadow_160ms_var(--ease-brand)] [&:focus-within]:outline-none [&:focus-within]:[outline-offset:0] [&:focus-within]:[border-color:rgb(var(--bg-ink))] [&:focus-within]:[box-shadow:0_0_0_3px_rgb(var(--bg-ink)_/_0.12)] [&_textarea]:block [&_textarea]:[resize:none] [&_textarea]:border-0 [&_textarea]:outline-none [&_textarea]:[background:transparent] [&_textarea]:[border-radius:0] [&_textarea]:[box-shadow:none]! [&_textarea]:[align-self:center] [&_textarea]:min-h-6 [&_textarea]:[max-height:200px] [&_textarea]:[line-height:24px] [&_textarea]:text-base [&_textarea]:w-full [&_textarea]:[box-sizing:border-box] [&_textarea]:m-0 [&_textarea]:[padding:10px_6px_10px_2px] [&_textarea]:[color:rgb(var(--bg-ink))] [&_textarea]:[caret-color:rgb(var(--bg-ink))] [&_textarea]:[min-width:0] [&_textarea]:[overflow-y:hidden] [&_textarea]:[scrollbar-width:thin] [&_textarea::placeholder]:[color:rgb(var(--bg-ink-subtle))] [&_textarea::placeholder]:[opacity:1] [@media(max-width:_800px)]:w-full [@media(max-width:_800px)]:[padding:8px_8px_8px_12px] [@media(prefers-reduced-motion:_reduce)]:[transition-duration:0ms]'
          }
          onSubmit={submit}
          onClick={(event) => {
            if (
              event.target instanceof Element &&
              !event.target.closest('button, input, textarea, a')
            ) {
              inputRef.current?.focus();
            }
          }}
        >
          <AttachmentPicker
            busy={attachmentBusy}
            disabled={loading}
            onBusy={setAttachmentBusy}
            onAttachment={setAttachment}
            onError={setAttachmentError}
          />
          <label
            htmlFor="chat-input"
            className={
              'sr-only absolute [width:1px] [height:1px] p-0 [margin:-1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0'
            }
          >
            Pregunta sobre trámites, ayudas o impuestos
          </label>
          <Textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={1200}
            placeholder="Pregunta aquí"
            autoComplete="off"
            enterKeyHint="send"
            onChange={(e) => {
              warm();
              setInput(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (!loading) submit();
              }
            }}
          />
          {/* One button for both states so the control never jumps; the glyphs crossfade. */}
          <Button
            size="icon"
            className={'chat-send flex items-center justify-center'}
            type={loading ? 'button' : 'submit'}
            onClick={loading ? halt : undefined}
            disabled={!loading && (input.trim().length < 4 || attachmentBusy)}
            aria-label={loading ? 'Detener respuesta' : 'Enviar pregunta'}
          >
            <IconSwap
              active={loading ? 'b' : 'a'}
              a={<Icon name="arrowUp" size={18} />}
              b={<Icon name="detener" size={16} />}
            />
          </Button>
        </form>
        {footer}
        <span
          className={
            'sr-only absolute [width:1px] [height:1px] p-0 [margin:-1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0'
          }
        >
          Las respuestas se basan en fuentes oficiales. Comprueba las citas antes de realizar el
          trámite.
        </span>
      </div>
      <Dialog open={coverageOpened} onOpenChange={setCoverageOpened}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-32px)] max-w-[960px] max-h-[calc(100dvh-32px)] overflow-auto rounded-[28px] p-6 max-[800px]:p-4"
        >
          <DialogTitle className="sr-only">Mapa de fuentes oficiales</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10"
            aria-label="Cerrar mapa de fuentes"
            onClick={() => setCoverageOpened(false)}
          >
            <Icon name="cerrar" size={19} />
          </Button>
          {coverageOpened && (
            <SourcesMap selectedId={coverageRegionId} onSelect={setCoverageRegionId} />
          )}
        </DialogContent>
      </Dialog>
      <Sources
        view={sourceView}
        onClose={() => setSourceView(null)}
        onSelect={(selected) => setSourceView((v) => (v ? { ...v, selected } : null))}
      />
    </div>
  );
}
