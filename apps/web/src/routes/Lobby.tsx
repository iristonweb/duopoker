import { useEffect } from 'react';
import { GlassCard, SkinSelector, VoiceChatPanel } from '@duopoker/ui-kit/src/index';
import { useAppStore } from '../store/useAppStore';

export const Lobby = () => {
  const { mode, setMode, connect, queue, session } = useAppStore();
  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <main style={{ padding: 24, color: '#ffd700', background: '#0a0a0a', minHeight: '100vh' }}>
      <h1>DualModeLobby</h1>
      <p>Virtual chips only. No real-money gambling.</p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setMode('HOLDEM')}>Hold'em</button>
        <button onClick={() => setMode('RASPISNOY')}>Raspisnoy</button>
        <button onClick={queue}>Queue {mode}</button>
      </div>
      <GlassCard>
        <pre>{JSON.stringify(session ?? { mode, phase: 'waiting' }, null, 2)}</pre>
      </GlassCard>
      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        <SkinSelector />
        <VoiceChatPanel />
      </div>
    </main>
  );
};
