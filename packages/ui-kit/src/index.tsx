import type { PropsWithChildren } from 'react';

export const GlassCard = ({ children }: PropsWithChildren) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 16,
      backdropFilter: 'blur(12px)',
      padding: 16
    }}
  >
    {children}
  </div>
);

export const SubscriptionTierCard = ({
  tier,
  price
}: {
  tier: 'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL';
  price: string;
}) => (
  <GlassCard>
    <h3>{tier}</h3>
    <p>{price}</p>
  </GlassCard>
);

export const VoiceChatPanel = () => (
  <GlassCard>
    <strong>Voice Chat</strong>
    <p>Push-to-talk ready</p>
  </GlassCard>
);

export const SkinSelector = () => (
  <GlassCard>
    <strong>Skin Selector</strong>
    <p>Deck/Table/Frame preview</p>
  </GlassCard>
);
