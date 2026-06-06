import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Input, cn } from '@duopoker/ui-kit';
import { tierLabel, type SubscriptionTier } from '@duopoker/shared-types';
import { PlayerAvatar } from './cosmetics/PlayerAvatar';
import { prepareAvatarUpload } from '../lib/avatar-upload';
import { translateProfileError } from '../lib/translate-store-error';
import { useAppStore } from '../store/useAppStore';

export function ProfileEditor({ className }: { className?: string }) {
  const { t } = useTranslation();
  const displayName = useAppStore((s) => s.displayName);
  const nickname = useAppStore((s) => s.nickname);
  const avatarUrl = useAppStore((s) => s.avatarUrl);
  const tableStatus = useAppStore((s) => s.tableStatus);
  const equipped = useAppStore((s) => s.equipped);
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const updateNickname = useAppStore((s) => s.updateNickname);

  const [nameDraft, setNameDraft] = useState(displayName ?? '');
  const [nickDraft, setNickDraft] = useState(nickname ?? '');
  const [statusDraft, setStatusDraft] = useState(tableStatus ?? '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl ?? null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameDraft(displayName ?? '');
    setNickDraft(nickname ?? '');
    setStatusDraft(tableStatus ?? '');
    setPreviewUrl(avatarUrl ?? null);
    setAvatarDirty(false);
  }, [displayName, nickname, tableStatus, avatarUrl]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);

    const nick = nickDraft.trim().replace(/^@/, '').toLowerCase();
    if (nick !== (nickname ?? '')) {
      const nickResult = await updateNickname(nick);
      if (!nickResult.ok) {
        setBusy(false);
        setError(translateProfileError(nickResult.error));
        return;
      }
    }

    const payload: {
      displayName?: string;
      avatar?: string | null;
      tableStatus?: string | null;
    } = {
      tableStatus: statusDraft.trim() || null
    };

    const trimmedName = nameDraft.trim();
    if (trimmedName.length >= 2 && trimmedName !== displayName) {
      payload.displayName = trimmedName;
    }
    if (avatarDirty) {
      payload.avatar = previewUrl;
    }

    const result = await updateProfile(payload);
    setBusy(false);
    if (result.ok) {
      setAvatarDirty(false);
      setMessage(t('profile.saved'));
    } else {
      setError(translateProfileError(result.error));
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <button
          type="button"
          className="group relative shrink-0 rounded-2xl p-1 transition hover:ring-2 hover:ring-gold/40"
          onClick={() => fileRef.current?.click()}
          aria-label={t('profile.uploadPhoto')}
        >
          <PlayerAvatar
            name={nickDraft ? `@${nickDraft.replace(/^@/, '')}` : displayName ?? t('auth.player')}
            avatarUrl={previewUrl}
            frameId={equipped.frame}
            tier={subscriptionTier}
            tableStatus={statusDraft.trim() || tableStatus}
            size="lg"
            showTier
          />
          <span className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-black/60 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold opacity-0 transition group-hover:opacity-100">
            {t('profile.changePhoto')}
          </span>
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={subscriptionTier === 'FREE' ? 'default' : 'gold'}>
              {subscriptionTier === 'FREE' ? t('profile.tierFree') : tierLabel[subscriptionTier as SubscriptionTier]}
            </Badge>
          </div>
          <Input
            label={t('auth.nickname')}
            placeholder={t('auth.nicknamePlaceholder')}
            maxLength={20}
            value={nickDraft}
            onChange={(e) => setNickDraft(e.target.value.replace(/^@/, '').toLowerCase())}
          />
          <Input
            label={t('auth.displayName')}
            placeholder={t('auth.displayNamePlaceholder')}
            maxLength={40}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
          />
          <Input
            label={t('profile.tableStatus')}
            placeholder={t('profile.tableStatusPlaceholder')}
            maxLength={80}
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value)}
          />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setError(null);
          try {
            const dataUrl = await prepareAvatarUpload(file);
            setPreviewUrl(dataUrl);
            setAvatarDirty(true);
          } catch (err) {
            const code = err instanceof Error ? err.message : 'uploadFailed';
            setError(translateProfileError(code === 'tooLarge' ? 'fileTooLarge' : 'uploadFailed'));
          }
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          {t('profile.uploadPhoto')}
        </Button>
        {previewUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPreviewUrl(null);
              setAvatarDirty(true);
            }}
          >
            {t('profile.removeAvatar')}
          </Button>
        ) : null}
        <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
          {busy ? t('profile.saving') : t('profile.save')}
        </Button>
      </div>

      {message ? (
        <p className="rounded-lg border border-emerald/20 bg-emerald/10 px-3 py-2 text-xs text-emerald">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>
      ) : null}
      <p className="text-[11px] leading-relaxed text-subtle">{t('profile.hint')}</p>
    </div>
  );
}
