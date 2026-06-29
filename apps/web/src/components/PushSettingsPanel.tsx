import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, GlassPanel, SectionHeader } from '@duopoker/ui-kit';
import { usePushNotifications } from '../hooks/usePushNotifications';

export function PushSettingsPanel() {
  const { t } = useTranslation();
  const { supported, permission, subscribed, vapidConfigured, busy, subscribe, unsubscribe } =
    usePushNotifications();
  const [msg, setMsg] = useState<string | null>(null);

  const onEnable = async () => {
    setMsg(null);
    const result = await subscribe();
    if (result.ok) setMsg(t('profile.pushEnabled'));
    else if (result.reason === 'noVapid') setMsg(t('profile.pushVapidMissing'));
    else if (result.reason === 'denied') setMsg(t('profile.pushDenied'));
    else setMsg(t('profile.pushFailed'));
  };

  const onDisable = async () => {
    setMsg(null);
    const ok = await unsubscribe();
    setMsg(ok ? t('profile.pushDisabled') : t('profile.pushFailed'));
  };

  const actionButton = supported ? (
    subscribed || permission === 'granted' ? (
      <Button variant="secondary" size="md" disabled={busy} onClick={() => void onDisable()}>
        {busy ? t('profile.pushBusy') : t('profile.pushDisable')}
      </Button>
    ) : (
      <Button
        variant="primary"
        size="md"
        disabled={busy || vapidConfigured === false}
        onClick={() => void onEnable()}
      >
        {busy ? t('profile.pushBusy') : t('profile.pushEnable')}
      </Button>
    )
  ) : null;

  return (
    <GlassPanel
      glow={supported ? 'gold' : 'none'}
      className="self-start w-full border-white/10 p-4 sm:border-gold/20"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
        <SectionHeader
          compact
          className="mb-0 min-w-0 sm:flex-1"
          eyebrow={t('profile.pushEyebrow')}
          title={t('profile.pushTitle')}
          description={supported ? t('profile.pushDesc') : t('profile.pushUnsupported')}
        />
        {actionButton ? <div className="shrink-0 sm:pt-0.5">{actionButton}</div> : null}
      </div>
      {supported && vapidConfigured === false ? (
        <p className="mt-2 text-xs text-amber-200/90">{t('profile.pushVapidMissing')}</p>
      ) : null}
      {msg ? <p className="mt-2 text-xs text-gold-light">{msg}</p> : null}
    </GlassPanel>
  );
}
