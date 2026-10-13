'use client';
import { Button } from '@reforma-digital/design/ui/button';

import { useEffect, useState } from 'react';

import Chat, { type LimitedRegion } from '../../../components/chat';
import { Icon } from '../../../components/brand/icon';
import { Header } from '../../../components/brand/header';
import { takePendingQuestion } from '../../../lib/pending-question';

export function ChatView({
  mode,
  limitedRegions,
}: {
  mode: 'preview' | 'live';
  limitedRegions: readonly LimitedRegion[];
}) {
  const [conversation, setConversation] = useState(0);
  const [initialQuestion, setInitialQuestion] = useState('');
  const nueva = () => {
    setInitialQuestion('');
    setConversation((value) => value + 1);
  };

  // sessionStorage solo existe en el navegador: se lee después de hidratar.
  useEffect(() => {
    const question = takePendingQuestion();
    if (question) setInitialQuestion(question);
  }, []);

  return (
    <div
      className={
        "buscador [&_.in-nav]:sticky [&_.in-nav]:[top:0] [&_.in-nav]:[z-index:20] [&_.in-nav]:[border-bottom:1px_solid_var(--border)] [&_.in-nav]:[background:var(--background)] [&_.chat-conversation]:[max-width:760px] [&_.chat-conversation]:[padding:48px_var(--page-gutter)_0] [&_.chat-turn]:[scroll-margin-top:100px] [&_.chat-composer-dock]:[width:min(760px,_calc(100%_-_2_*_var(--page-gutter)))] [&_.chat-composer]:items-center [&_.chat-composer]:min-h-17 [&_.chat-composer]:[padding:8px_10px_8px_12px] [&_.chat-composer]:[border:1px_solid_var(--border)] [&_.chat-composer]:[border-radius:999px] [&_.chat-composer]:[box-shadow:var(--shadow-soft)] [&_.chat-composer_.chat-icon]:[color:var(--muted-foreground)] [&_.chat-composer_textarea]:[font-size:17px] [&_.chat-composer:focus-within]:[border-color:var(--foreground)] [&_.chat-composer:focus-within]:[box-shadow:var(--shadow-soft)] [&_.chat-send]:[align-self:center] [&_.chat-send]:w-12 [&_.chat-send]:h-12 [&_.chat-send]:[background:var(--foreground)] [&_.chat-send]:[color:var(--background)] [&_.chat-send:disabled]:[background:var(--disabled)] [&_.chat-send:disabled]:[color:var(--text-secondary)] [&_.chat-send:not(:disabled):hover]:[background:var(--brand-button-gradient)] [&_.chat-page:not(:has(.chat-empty))_.bs-pie_nav]:hidden [&_.chat-page:not(:has(.chat-empty))_.chat-composer-dock::before]:[content:''] [&_.chat-page:not(:has(.chat-empty))_.chat-composer-dock::before]:absolute [&_.chat-page:not(:has(.chat-empty))_.chat-composer-dock::before]:[z-index:-1] [&_.chat-page:not(:has(.chat-empty))_.chat-composer-dock::before]:[bottom:0] [&_.chat-page:not(:has(.chat-empty))_.chat-composer-dock::before]:[left:50%] [&_.chat-page:not(:has(.chat-empty))_.chat-composer-dock::before]:[width:100vw] [&_.chat-page:not(:has(.chat-empty))_.chat-composer-dock::before]:h-24 [&_.chat-page:not(:has(.chat-empty))_.chat-composer-dock::before]:[background:radial-gradient(_60%_100%_at_50%_100%,_rgb(255_122_26_/_0.34),_rgb(255_190_11_/_0.12)_55%,_transparent_85%_)] [&_.chat-page:not(:has(.chat-empty))_.chat-composer-dock::before]:[transform:translateX(-50%)] [&_.chat-page:not(:has(.chat-empty))_.chat-composer-dock::before]:pointer-events-none [&_.chat-page:not(:has(.chat-empty))_.chat-composer-dock::after]:[z-index:-2] [&_.chat-page:has(.chat-empty)]:[background:radial-gradient(90%_35%_at_50%_110%,_var(--warning),_transparent),_var(--background)] [&_.chat-page:has(.chat-empty)_.chat-conversation]:[padding-top:clamp(64px,_14vh,_120px)] [&_.chat-empty]:[padding-top:0] [&_.chat-empty]:text-center [&_.chat-empty_h1]:mb-6 [&_.chat-empty_h1]:[font-family:var(--font-brand-heading)] [&_.chat-empty_h1]:[font-size:clamp(36px,_4.5vw,_64px)] [&_.chat-empty_h1]:font-normal [&_.chat-empty_h1]:[line-height:1.1] [&_.chat-empty_h1]:[letter-spacing:-0.02em] [&_.chat-empty_>_p]:[max-width:52ch] [&_.chat-empty_>_p]:[margin-inline:auto] [&_.chat-empty_>_p]:[font-size:17px] [&_.chat-empty_>_p]:[color:var(--text-secondary)] [&_.chat-empty_.chat-followups]:grid [&_.chat-empty_.chat-followups]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [&_.chat-empty_.chat-followups]:[gap:0] [&_.chat-empty_.chat-followups]:[align-items:stretch] [&_.chat-empty_.chat-followups]:mt-10 [&_.chat-empty_.chat-followups]:[border:1px_solid_var(--border)] [&_.chat-empty_.chat-followups_button]:w-full [&_.chat-empty_.chat-followups_button]:min-h-18 [&_.chat-empty_.chat-followups_button]:gap-3 [&_.chat-empty_.chat-followups_button]:[padding:16px_20px] [&_.chat-empty_.chat-followups_button]:border-0 [&_.chat-empty_.chat-followups_button]:[border-radius:0] [&_.chat-empty_.chat-followups_button]:[color:var(--foreground)] [&_.chat-empty_.chat-followups_button]:text-sm [&_.chat-empty_.chat-followups_button_+_button]:[border-left:1px_solid_var(--border)] [&_.chat-page:has(.chat-empty)_.chat-bottom]:hidden [&_.chat-page:has(.chat-empty)_.chat-composer-dock]:relative [&_.chat-page:has(.chat-empty)_.chat-composer-dock]:pt-6 [&_.chat-page:has(.chat-empty)_.chat-composer-dock]:pb-10 [&_.chat-page:has(.chat-empty)_.chat-composer-dock]:[background:none] [&_.chat-page:has(.chat-empty)_.chat-composer-dock::after]:hidden [@media(max-width:_600px)]:[&_.chat-page:has(.chat-empty)_.chat-conversation]:pt-12 [@media(max-width:_600px)]:[&_.bs-nueva]:w-11 [@media(max-width:_600px)]:[&_.bs-nueva]:p-0 [@media(max-width:_600px)]:[&_.chat-empty_.chat-followups]:[grid-template-columns:minmax(0,_1fr)] [@media(max-width:_600px)]:[&_.chat-empty_.chat-followups_button_+_button]:[border-left:0] [@media(max-width:_600px)]:[&_.chat-empty_.chat-followups_button_+_button]:[border-top:1px_solid_var(--border)] [@media(max-width:_600px)]:[&_.chat-conversation]:pt-8 [@media(max-width:_600px)]:[&_.chat-turn]:[scroll-margin-top:128px]"
      }
    >
      <Chat
        key={conversation}
        initialQuestion={initialQuestion}
        limitedRegions={limitedRegions}
        header={
          <Header
            action={
              <Button
                type="button"
                onClick={nueva}
                aria-label="Nueva conversación"
                variant="outline"
                className={
                  'bs-nueva [@media(max-width:_600px)]:[&_span]:absolute [@media(max-width:_600px)]:[&_span]:[width:1px] [@media(max-width:_600px)]:[&_span]:[height:1px] [@media(max-width:_600px)]:[&_span]:overflow-hidden [@media(max-width:_600px)]:[&_span]:[clip-path:inset(50%)] [@media(max-width:_600px)]:[&_span]:whitespace-nowrap'
                }
              >
                <span>Nueva conversación</span> <Icon name="nueva" size={18} />
              </Button>
            }
          />
        }
        footer={
          <footer
            className={
              'bs-pie grid gap-1 pt-4 [color:var(--text-secondary)] text-sm [line-height:1.5] text-center [&_nav]:flex [&_nav]:items-center [&_nav]:justify-center [&_nav]:gap-3 [&_a]:inline-flex [&_a]:items-center [&_a]:min-h-11 [&_a]:[text-decoration:underline] [&_a]:[text-underline-offset:0.2em]'
            }
          >
            <p>
              {mode === 'preview'
                ? 'Vista previa con fragmentos oficiales; la generación con IA no está activada.'
                : 'Las respuestas se basan en fuentes oficiales. Comprueba las citas antes de hacer el trámite.'}
            </p>
            <nav aria-label="Información del buscador">
              <a href="/sources">Fuentes oficiales</a>
              <span aria-hidden="true">·</span>
              <a href="/privacy">Privacidad</a>
            </nav>
          </footer>
        }
      />
    </div>
  );
}
