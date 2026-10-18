'use client';
import { Table } from './ui/table';

import { Card } from './ui/card';
import { cn } from './lib/utils';
import { Drawer, DrawerContent, DrawerTitle } from './ui/drawer';
import { useMobile } from './hooks/use-mobile';

import { Button } from './ui/button';

import { memo, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import { Streamdown, type Components, type ExtraProps } from 'streamdown';

/**
 * Shared chat composition built from shadcn/Base UI. Presentational only: the app decides which verified
 * block each one renders and passes the icons in (Icon lives in apps/web).
 */

/* ─── Markdown ─────────────────────────────────────────────────────────────── */

const prose: Components = {
  p: ({ children }) => <p>{children}</p>,
  h1: ({ children }) => (
    <h1
      className={
        'chat-md-heading [margin:16px_0_4px]! [font-family:var(--font-brand-text)] [font-size:1em] font-semibold [letter-spacing:0]'
      }
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      className={
        'chat-md-heading [margin:16px_0_4px]! [font-family:var(--font-brand-text)] [font-size:1em] font-semibold [letter-spacing:0]'
      }
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      className={
        'chat-md-heading [margin:16px_0_4px]! [font-family:var(--font-brand-text)] [font-size:1em] font-semibold [letter-spacing:0]'
      }
    >
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4
      className={
        'chat-md-heading [margin:16px_0_4px]! [font-family:var(--font-brand-text)] [font-size:1em] font-semibold [letter-spacing:0]'
      }
    >
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5
      className={
        'chat-md-heading [margin:16px_0_4px]! [font-family:var(--font-brand-text)] [font-size:1em] font-semibold [letter-spacing:0]'
      }
    >
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6
      className={
        'chat-md-heading [margin:16px_0_4px]! [font-family:var(--font-brand-text)] [font-size:1em] font-semibold [letter-spacing:0]'
      }
    >
      {children}
    </h6>
  ),
  ul: ({ children }) => <ul>{children}</ul>,
  ol: ({ children }) => <ol>{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  hr: () => <hr />,
  table: ({ children }) => (
    <div
      className={
        'chat-md-table overflow-x-auto [&_table]:[border-collapse:collapse] [&_table]:text-sm [&_:is(th,_td)]:[padding:8px_10px] [&_:is(th,_td)]:[border-bottom:1px_solid_var(--border)] [&_:is(th,_td)]:text-left [&_:is(th,_td)]:[vertical-align:top]'
      }
    >
      <Table>{children}</Table>
    </div>
  ),
  inlineCode: ({ children }) => <code>{children}</code>,
  // Quoted content is read here and opened on the official site: no links, images or checkboxes.
  a: ({ children }) => <span>{children}</span>,
  img: () => null,
  input: () => null,
};

type CitationTag = ComponentProps<'span'> & ExtraProps & { index?: string };

/**
 * Markdown for answers and official excerpts, rendered with Streamdown. While tokens arrive it
 * repairs unterminated syntax and reveals each word; finished content renders in static mode.
 */
export const Response = memo(function Response({
  children,
  streaming = false,
  skipHtml = false,
  renderCitation,
  className,
}: {
  children: string;
  streaming?: boolean;
  /** HTML from official sites is never rendered. */
  skipHtml?: boolean;
  /** Renders the `<rd-cite index="n">` tags added by withCitations, never by the model. */
  renderCitation?: (index: number, label: ReactNode) => ReactNode;
  className?: string;
}) {
  return (
    <Streamdown
      className={cn(
        'chat-md [&_[data-sd-animate]]:[animation:var(--sd-animation,_sd-reveal)_var(--sd-duration,_240ms)_var(--sd-easing,_var(--ease-brand))_var(--sd-delay,_0ms)_both] [&_>_*_+_*]:mt-3 [&_p_+_p]:mt-3 [&_:where(p,_ul,_ol,_blockquote)]:[margin-block:0] [&_:where(ul,_ol)]:[padding-left:22px] [&_li_+_li]:mt-1 [&_strong]:font-semibold [&_blockquote]:pl-3 [&_blockquote]:[border-left:2px_solid_var(--border)] [&_blockquote]:[color:var(--text-secondary)] [&_hr]:[margin:16px_0] [&_hr]:border-0 [&_hr]:[border-top:1px_solid_var(--border)] [&_code]:[padding:1px_5px] [&_code]:[border-radius:6px] [&_code]:[background:var(--muted)] [&_code]:[font-family:var(--font-brand-mono)] [&_code]:[font-size:0.88em]',
        className,
      )}
      mode={streaming ? 'streaming' : 'static'}
      isAnimating={streaming}
      animated={{ animation: 'reveal', duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
      skipHtml={skipHtml}
      controls={false}
      {...(renderCitation
        ? {
            allowedTags: { 'rd-cite': ['index'] },
            literalTagContent: ['rd-cite'],
            components: {
              ...prose,
              'rd-cite': ({ index, children: label }: CitationTag) =>
                renderCitation(Number(index), label),
            },
          }
        : { components: prose })}
    >
      {children}
    </Streamdown>
  );
});

const escapeTag = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Appends citations after the verified text so they flow with its last line. */
export function withCitations(text: string, labels: readonly string[]): string {
  return labels.reduce(
    (out, label, index) => `${out} <rd-cite index="${index}">${escapeTag(label)}</rd-cite>`,
    text,
  );
}

/* ─── Conversation ─────────────────────────────────────────────────────────── */

/** The question is the heading of its turn; `details` holds the lines under it. */
export function Question({
  level,
  children,
  attachment,
  details,
}: {
  level: 1 | 2;
  children: ReactNode;
  attachment?: ReactNode;
  details?: ReactNode;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <header
      className={
        'chat-question [&:has(.chat-hidden-datum:focus-visible)___.chat-hidden-datum:not(:focus-visible)___.chat-hidden-tooltip]:[visibility:hidden] mb-10 [@media(max-width:_760px)]:mb-8'
      }
    >
      {attachment && (
        <p
          className={
            'chat-attached-message flex items-center gap-2 [margin:0_0_12px] [color:var(--text-secondary)] text-sm [overflow-wrap:anywhere]'
          }
        >
          {attachment}
        </p>
      )}
      <Heading
        className={
          'chat-question-title m-0 [font-family:var(--font-brand-text)] [font-size:clamp(34px,_5vw,_52px)] font-normal [line-height:1.08] [letter-spacing:-0.03em] [white-space:pre-wrap] [overflow-wrap:anywhere] [animation:chat-enter_420ms_var(--ease-brand)_both]'
        }
      >
        {children}
      </Heading>
      {details && <div className={'chat-question-details grid gap-1 mt-3'}>{details}</div>}
    </header>
  );
}

/** One short status line under the question, e.g. «Respuesta verificada con 2 fuentes oficiales». */
export function QuestionDetail({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p
      className={
        'chat-question-detail flex items-center gap-2 m-0 [color:var(--text-secondary)] [font-size:15px] [animation-delay:80ms] [&_.icono]:[color:var(--brand)] chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]'
      }
    >
      {icon}
      {children}
    </p>
  );
}

/** Activity indicator: the shimmer says work is pending; the stage crossfades when it changes. */
export function Thinking({ label, stage }: { label: string; stage?: string }) {
  return (
    <div className={'chat-thinking grid [gap:2px] min-h-6 [margin:0_0_24px]'} role="status">
      <span
        className={
          'chat-shimmer [width:fit-content] font-medium [color:transparent] [background:linear-gradient(_90deg,_transparent_calc(50%_-_28px),_var(--foreground),_transparent_calc(50%_+_28px)_),_linear-gradient(var(--muted-foreground),_var(--muted-foreground))] [background-size:250%_100%,_auto] [background-repeat:no-repeat] [background-clip:text] [-webkit-background-clip:text] [animation:chat-shimmer_1.6s_linear_infinite] [@media(prefers-reduced-motion:_reduce)]:[animation:none] [@media(prefers-reduced-motion:_reduce)]:[background:none] [@media(prefers-reduced-motion:_reduce)]:[color:var(--text-secondary)]'
        }
      >
        {label}
      </span>
      {stage && (
        <span
          key={stage}
          className={
            'chat-stage [color:var(--text-secondary)] text-sm [animation:chat-stage-change_280ms_var(--ease-brand)_both]'
          }
        >
          {stage}
        </span>
      )}
    </div>
  );
}

const noticeBoxes = {
  info: 'caja-plana [background:var(--background)] [box-shadow:0_0_0_1px_var(--border)]',
  warning:
    'caja-aviso [&.chat-notice_p]:[color:inherit] [background:var(--warning)] [color:var(--warning-foreground)]',
  error:
    'caja-error [background:var(--background)] [box-shadow:inset_0_0_0_1.5px_var(--brand)] [&_:where(strong,_h3,_h4)]:[color:var(--brand-dark)]',
} as const;

export function Notice({
  tone,
  icon,
  title,
  children,
  actions,
  role,
}: {
  tone: keyof typeof noticeBoxes;
  icon: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  role?: 'status' | 'alert';
}) {
  return (
    <Card
      render={<div />}
      className={cn(
        cn(
          'chat-notice flex items-start gap-3 [margin:0_0_8px] [&_>_.icono]:shrink-0 [&_>_.icono]:[margin-top:3px] [&_>_div]:[min-width:0] [&_p]:m-0 [&_p]:[color:var(--text-secondary)] [&_p]:[white-space:pre-wrap] chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]',
          noticeBoxes[tone],
        ),
        'ring-0',
      )}
      role={role}
    >
      {icon}
      <div>
        {title && <strong className={'chat-notice-title block mb-1 font-medium'}>{title}</strong>}
        {children}
        {actions && (
          <div className={'chat-notice-actions flex flex-wrap [gap:8px_12px] mt-4'}>{actions}</div>
        )}
      </div>
    </Card>
  );
}

/* ─── Answer blocks ────────────────────────────────────────────────────────── */

export function Answer({ children }: { children: ReactNode }) {
  return (
    <div
      className={
        'chat-answer text-lg [line-height:1.55] [&_>_*_+_*]:mt-8 [@media(max-width:_760px)]:[font-size:17px]'
      }
    >
      {children}
    </div>
  );
}

export function StepList({ start, children }: { start: number; children: ReactNode }) {
  return (
    <ol className={'chat-steps grid gap-5 m-0 p-0 list-none'} start={start}>
      {children}
    </ol>
  );
}

export function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <li
      className={
        'chat-step grid [grid-template-columns:32px_minmax(0,_1fr)] gap-x-4 [@media(max-width:_760px)]:[grid-template-columns:24px_minmax(0,_1fr)] [@media(max-width:_760px)]:gap-x-3 chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]'
      }
    >
      <span
        className={
          'chat-step-number [color:var(--brand)] [font-size:26px] [font-weight:300] [line-height:1.1] [font-variant-numeric:tabular-nums] [@media(max-width:_760px)]:[font-size:22px]'
        }
      >
        {number}
        <span
          className={
            'sr-only absolute [width:1px] [height:1px] p-0 [margin:-1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0'
          }
        >
          .
        </span>
      </span>
      <div>{children}</div>
    </li>
  );
}

export function Fact({ children }: { children: ReactNode }) {
  return (
    <div
      className={
        'chat-fact [&_+_.chat-fact]:mt-4 chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]'
      }
    >
      {children}
    </div>
  );
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className={
        'chat-details grid [grid-template-columns:repeat(auto-fit,_minmax(190px,_1fr))] gap-3'
      }
    >
      {children}
    </div>
  );
}

/** Documentation, cost or deadline card. `highlight` is the single sun-coloured card of a view. */
export function DetailCard({
  label,
  figure,
  highlight = false,
  children,
}: {
  label: string;
  figure?: string | undefined;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      render={<section />}
      className={cn(
        cn(
          'chat-detail [min-width:0] text-base [line-height:1.55] [&_.chat-md_p_+_p]:mt-2 [&_.chat-source-chip]:[background:var(--background)] chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]',
          highlight
            ? 'caja-sol [&_.chat-detail-label]:[color:var(--foreground)] [background:radial-gradient(120%_90%_at_100%_0%,_#ffd34d_0%,_rgba(255,_211,_77,_0)_60%),_var(--brand-yellow)] [color:var(--foreground)]'
            : 'caja-gris [background:var(--muted)]',
        ),
        'ring-0',
      )}
    >
      <h3
        className={
          'chat-detail-label [margin:0_0_8px] [color:var(--text-secondary)] [font-family:var(--font-brand-text)] text-sm font-medium'
        }
      >
        {label}
      </h3>
      {figure && (
        <p
          className={
            'chat-detail-figure [margin:0_0_8px] [font-size:clamp(32px,_3.4vw,_42px)] font-normal [line-height:1.05] [letter-spacing:-0.02em] [font-variant-numeric:lining-nums_tabular-nums]'
          }
        >
          {figure}
        </p>
      )}
      <div className={figure ? 'chat-detail-note text-sm [line-height:1.5]' : 'chat-detail-text'}>
        {children}
      </div>
    </Card>
  );
}

/** Where the procedure is done, with the action that opens the official page. */
export function WhereCard({
  label,
  title,
  description,
  action,
}: {
  label: string;
  title: string;
  description?: ReactNode;
  action: ReactNode;
}) {
  return (
    <Card
      render={<section />}
      className={cn(
        'chat-where flex flex-wrap items-center justify-between [gap:16px_24px] [&_>_div]:[flex:1_1_260px] [&_>_div]:[min-width:0] [&_>_[data-slot=button][data-variant=sunset]]:shrink-0 [@media(max-width:_760px)]:[&_[data-slot=button][data-variant=sunset]]:w-full caja-plana [background:var(--background)] [box-shadow:0_0_0_1px_var(--border)] chat-enter [animation:chat-enter_360ms_var(--ease-brand)_both]',
        'ring-0',
      )}
    >
      <div>
        <p className={'chat-where-label [margin:0_0_4px] [color:var(--text-secondary)] text-sm'}>
          {label}
        </p>
        <h3
          className={
            'chat-where-title m-0 [font-family:var(--font-brand-text)] text-lg font-medium [line-height:1.35]'
          }
        >
          {title}
        </h3>
        {description && (
          <p
            className={
              'chat-where-description [margin:4px_0_0] [color:var(--text-secondary)] text-sm'
            }
          >
            {description}
          </p>
        )}
      </div>
      {action}
    </Card>
  );
}

/** Inline citation: the organisation's name; opens the cited fragment. */
export function SourceChip({
  children,
  icon,
  title,
  onOpen,
}: {
  children: ReactNode;
  icon: ReactNode;
  title?: string;
  onOpen: () => void;
}) {
  return (
    <Button
      type="button"
      className={
        "chat-source-chip inline-flex items-center [gap:6px] relative [margin-left:2px] whitespace-nowrap [vertical-align:2px] [&::after]:[content:''] [&::after]:absolute [&::after]:[inset:-9px_-2px]"
      }
      title={title}
      onClick={onOpen}
    >
      {children}
      {icon}
    </Button>
  );
}

/** Organisation monogram. Drawn locally, so no request reveals which sources were consulted. */
function Monogram({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || 'ES';
  return (
    <span
      className={
        'chat-monogram [display:inline-grid] shrink-0 [place-items:center] w-7 h-7 [border-radius:50%] [background:var(--foreground)] [color:var(--background)] [font-size:11px] font-medium [letter-spacing:0.02em]'
      }
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function SourcesButton({
  organization,
  count,
  onOpen,
}: {
  organization: string;
  count: number;
  onOpen: () => void;
}) {
  return (
    <Button
      type="button"
      className={'chat-sources-button inline-flex items-center gap-2'}
      onClick={onOpen}
    >
      <Monogram name={organization} />
      Fuentes · {count}
    </Button>
  );
}

/* ─── Controls ─────────────────────────────────────────────────────────────── */

export function Suggestions({ children }: { children: ReactNode }) {
  return <div className={'chat-followups flex flex-wrap [gap:10px] mt-8'}>{children}</div>;
}

/** Example or follow-up question. `index` staggers its entrance after the previous one. */
export function Suggestion({
  children,
  icon,
  index = 0,
  onSelect,
}: {
  children: string;
  icon: ReactNode;
  index?: number;
  onSelect: (question: string) => void;
}) {
  return (
    <Button
      type="button"
      className={
        'chat-suggestion inline-flex items-center gap-3 [max-width:100%] text-left [animation:chat-enter_360ms_calc(var(--index,_0)_*_50ms_+_120ms)_var(--ease-brand)_both]'
      }
      style={{ '--index': index } as CSSProperties}
      onClick={() => onSelect(children)}
    >
      {children}
      {icon}
    </Button>
  );
}

/**
 * Two glyphs in the same spot: the inactive one shrinks and blurs out as the other arrives, so
 * send/stop and copy/copied switch without the control jumping.
 */
export function IconSwap({ active, a, b }: { active: 'a' | 'b'; a: ReactNode; b: ReactNode }) {
  return (
    <span
      className={
        "icon-swap relative grid [place-items:center] [&_>_span]:[grid-area:1_/_1] [&_>_span]:grid [&_>_span]:[place-items:center] [&_>_span]:[transition:opacity_180ms_var(--ease-brand),_transform_180ms_var(--ease-brand),_filter_180ms_var(--ease-brand)] [&[data-active='a']_>_.icon-swap-b]:[opacity:0] [&[data-active='a']_>_.icon-swap-b]:[transform:scale(0.5)] [&[data-active='a']_>_.icon-swap-b]:[filter:blur(3px)] [&[data-active='b']_>_.icon-swap-a]:[opacity:0] [&[data-active='b']_>_.icon-swap-a]:[transform:scale(0.5)] [&[data-active='b']_>_.icon-swap-a]:[filter:blur(3px)] [@media(prefers-reduced-motion:_reduce)]:[&_>_span]:[transform:none]! [@media(prefers-reduced-motion:_reduce)]:[&_>_span]:[filter:none]!"
      }
      data-active={active}
    >
      <span className="icon-swap-a">{a}</span>
      <span className="icon-swap-b">{b}</span>
    </span>
  );
}

/** Jump to the latest message. Stays mounted so showing and hiding can interrupt each other. */
export function JumpButton({
  visible,
  onClick,
  children,
}: {
  visible: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      className={
        "chat-jump absolute -top-8 [left:calc(50%_-_22px)] grid [place-items:center] [&[data-visible='false']]:opacity-0 [&[data-visible='false']]:pointer-events-none"
      }
      data-visible={visible}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={onClick}
      aria-label="Ir al último mensaje"
    >
      {children}
    </Button>
  );
}

/* ─── Sources sheet ────────────────────────────────────────────────────────── */

/**
 * Base UI Drawer: a side sheet on wide screens and a bottom sheet on phones. Moving between the
 * list and a fragment slides in the direction of travel; the first view arrives with the sheet.
 */
export function SourceSheet({
  open,
  view,
  title,
  back,
  close,
  onClose,
  children,
}: {
  open: boolean;
  /** Changing it remounts the content with a slide; `detail` slides forward. */
  view: string;
  title: string;
  back?: ReactNode;
  close: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const mobile = useMobile();
  const [shown, setShown] = useState({ view, direction: 'forward' });
  if (shown.view !== view) setShown({ view, direction: view === 'list' ? 'back' : 'forward' });
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      swipeDirection={mobile ? 'down' : 'right'}
      showSwipeHandle={mobile}
    >
      <DrawerContent className="m-2 max-h-[calc(100dvh-16px)] motion-reduce:transition-none">
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-3">
          {back}
          {close}
        </div>
        <div
          key={view}
          className="overflow-y-auto px-6 pb-6 motion-safe:animate-in motion-safe:fade-in motion-safe:data-[direction=forward]:slide-in-from-right-4 motion-safe:data-[direction=back]:slide-in-from-left-4"
          data-direction={shown.direction}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function SourceDetail({
  eyebrow,
  organization,
  title,
  excerpt,
  meta,
  action,
  children,
}: {
  eyebrow: string;
  organization: string;
  title: string;
  excerpt: ReactNode;
  meta: { label: string; value: string }[];
  action: ReactNode;
  /** Other sources of the same answer. */
  children?: ReactNode;
}) {
  return (
    <article className={'chat-source [&_[data-slot=button][data-variant=sunset]]:w-full'}>
      <p className={'chat-source-eyebrow [margin:0_0_12px] [color:var(--brand)] [font-size:13px]'}>
        {eyebrow}
      </p>
      <p
        className={
          'chat-source-organization flex items-center [gap:10px] [margin:0_0_12px] [font-size:15px] font-medium'
        }
      >
        <Monogram name={organization} />
        {organization}
      </p>
      <h2
        className={
          'chat-source-title [margin:0_0_20px] [font-family:var(--font-brand-text)] text-2xl font-normal [line-height:1.25] [letter-spacing:-0.01em]'
        }
      >
        {title}
      </h2>
      <blockquote
        className={
          'chat-source-excerpt [margin:0_0_20px] p-5 [border-radius:20px] [background:var(--muted)] [font-size:15px] [line-height:1.6] [overflow-wrap:anywhere] [&_>_*]:pl-4 [&_>_*]:[border-left:3px_solid_var(--brand-yellow)]'
        }
      >
        {excerpt}
      </blockquote>
      <dl
        className={
          'chat-source-meta [margin:0_0_20px] text-sm [&_>_div]:flex [&_>_div]:justify-between [&_>_div]:gap-4 [&_>_div]:[padding:10px_0] [&_>_div]:[border-top:1px_solid_var(--border)] [&_>_div:last-child]:[border-bottom:1px_solid_var(--border)] [&_dt]:[color:var(--text-secondary)] [&_dd]:m-0 [&_dd]:[text-align:right]'
        }
      >
        {meta.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {action}
      {children}
    </article>
  );
}

export function SourceList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      className={
        'chat-source-list mt-8 [&_h3]:[margin:0_0_8px] [&_h3]:[color:var(--text-secondary)] [&_h3]:[font-family:var(--font-brand-text)] [&_h3]:[font-size:13px] [&_h3]:font-normal [&_ul]:grid [&_ul]:gap-2 [&_ul]:m-0 [&_ul]:p-0 [&_ul]:list-none'
      }
    >
      <h3>{title}</h3>
      <ul>{children}</ul>
    </section>
  );
}

export function SourceCard({
  title,
  meta,
  icon,
  onOpen,
}: {
  title: string;
  meta: string;
  icon: ReactNode;
  onOpen: () => void;
}) {
  return (
    <li>
      <Button
        type="button"
        className={
          'chat-source-card flex items-center justify-between gap-3 w-full text-left [&_strong]:block [&_small]:block'
        }
        onClick={onOpen}
      >
        <span>
          <strong>{title}</strong>
          <small>{meta}</small>
        </span>
        {icon}
      </Button>
    </li>
  );
}
