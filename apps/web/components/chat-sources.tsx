'use client';
import { Button, buttonVariants } from '@reforma-digital/design/ui/button';

import { cn } from '@reforma-digital/design/lib/utils';

import type { Evidence } from '@reforma-digital/core';

import {
  Response,
  SourceCard,
  SourceDetail,
  SourceList,
  SourceSheet,
} from '@reforma-digital/design/chat';
import { Icon } from './brand/icon';

export type SourceView = { evidence: Evidence[]; selected?: Evidence };

const longDate = (value: string) =>
  new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const host = (url: string) => new URL(url).hostname.replace(/^www\./, '');
// Jurisdictions are ES, ES-<region> or ES-<region>-<municipality>.
const scope = (jurisdiction: string) =>
  ['Estatal', 'Autonómico', 'Local'][jurisdiction.split('-').length - 1] ?? jurisdiction;

export function Sources({
  view,
  onClose,
  onSelect,
}: {
  view: SourceView | null;
  onClose: () => void;
  onSelect: (selected?: Evidence) => void;
}) {
  const evidence = view?.evidence ?? [];
  const selected = view?.selected;
  const card = (e: Evidence) => (
    <SourceCard
      key={e.chunkId}
      title={e.title}
      meta={`${host(e.canonicalUrl)} · Fragmento ${evidence.indexOf(e) + 1}`}
      icon={<Icon name="derecha" size={14} />}
      onOpen={() => onSelect(e)}
    />
  );
  return (
    <SourceSheet
      open={!!view}
      view={selected ? `detail-${selected.chunkId}` : 'list'}
      title={selected ? 'Fragmento citado' : 'Fuentes'}
      onClose={onClose}
      back={
        selected && (
          <Button
            type="button"
            className={'chat-sheet-back inline-flex items-center justify-center [gap:6px]'}
            onClick={() => onSelect()}
          >
            <Icon name="izquierda" size={12} />
            Todas las fuentes
          </Button>
        )
      }
      close={
        <Button
          type="button"
          className={'chat-sheet-close inline-flex items-center justify-center [gap:6px]'}
          onClick={onClose}
          aria-label="Cerrar fuentes"
        >
          <Icon name="cerrar" size={16} />
        </Button>
      }
    >
      {selected ? (
        <SourceDetail
          eyebrow={`Fragmento citado · ${evidence.indexOf(selected) + 1}`}
          organization={selected.organization}
          title={selected.title}
          excerpt={<Response skipHtml>{selected.content}</Response>}
          meta={[
            { label: 'Ámbito', value: scope(selected.jurisdiction) },
            { label: 'Consultado', value: longDate(selected.crawledAt) },
            {
              label: 'Actualización de origen',
              value: selected.sourceUpdatedAt ? longDate(selected.sourceUpdatedAt) : 'No indicada',
            },
          ]}
          action={
            <a
              href={selected.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-slot="button"
              data-variant="default"
              className={cn(buttonVariants({ variant: 'default' }))}
            >
              Abrir documento oficial
              <span
                className={
                  'sr-only absolute [width:1px] [height:1px] p-0 [margin:-1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0'
                }
              >
                {' '}
                (se abre en una pestaña nueva)
              </span>
              <Icon name="arrowUpRight" size={16} />
            </a>
          }
        >
          {evidence.length > 1 && (
            <SourceList title="Otras fuentes de esta respuesta">
              {evidence.filter((e) => e !== selected).map(card)}
            </SourceList>
          )}
        </SourceDetail>
      ) : (
        <>
          <h2
            className={
              'chat-sheet-title [margin:0_0_16px] [font-family:var(--font-brand-text)] text-2xl font-normal [letter-spacing:-0.01em]'
            }
          >
            Fuentes
          </h2>
          <SourceList
            title={`${evidence.length} ${evidence.length === 1 ? 'fragmento consultado' : 'fragmentos consultados'}`}
          >
            {evidence.map(card)}
          </SourceList>
        </>
      )}
    </SourceSheet>
  );
}
