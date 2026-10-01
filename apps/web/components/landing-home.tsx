'use client';

import { useState } from 'react';
import Chat from './chat';
import Landing from '../landing/Landing';
import HeroComposer from '../landing/HeroComposer';
import '../landing/landing.css';

export default function LandingHome({ mode }: { mode: 'preview' | 'live' }) {
  const [conversation, setConversation] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  if (conversation !== null) {
    return (
      <Chat
        key={chatKey}
        initialQuestion={conversation}
        onGoHome={() => {
          setConversation(null);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onNewConversation={() => {
          setConversation('');
          setChatKey((value) => value + 1);
        }}
      />
    );
  }
  return (
    <Landing
      composer={<HeroComposer mode={mode} onAsk={(query) => setConversation(query)} />}
    />
  );
}
