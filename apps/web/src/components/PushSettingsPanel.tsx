import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, GlassPanel, SectionHeader } from '@duopoker/ui-kit';
import { usePushNotifications } from '../hooks/usePushNotifications';

export function PushSettingsPanel() {
  const { t } = useTranslation();
  const { supported, permission, subscribed, vapidConfigured, busy, subscribe, unsubscribe } =
    usePushNotifications();
  const [msg, setMsg] = useState<string | null>(null);

  if (!supported) {
    return (
      <GlassPanel className="border-white/10 p-5">
        <SectionHeader
          eyebrow={t('profile.pushEyebrow')}
          title={t('profile.pushTitle')}
          description={t('profile.pushUnsupported')}
        />
      </GlassPanel>
    );
  }

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

  return (
    <GlassPanel glow="gold" className="border-gold/20 p-5">
      <SectionHeader
        eyebrow={t('profile.pushEyebrow')}
        title={t('profile.pushTitle')}
        description={t('profile.pushDesc')}
      />
      {vapidConfigured === false ? (
        <p className="mt-3 text-xs text-amber-200/90">{t('profile.pushVapidMissing')}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {subscribed || permission === 'granted' ? (
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
        )}
      </div>
      {msg ? <p className="mt-3 text-xs text-gold-light">{msg}</p> : null}
    </GlassPanel>
  );
}
