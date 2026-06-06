import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, cn } from '@duopoker/ui-kit';
import { PlayerAvatar } from './cosmetics/PlayerAvatar';
import { useAppStore } from '../store/useAppStore';

const MAX_AVATAR_BYTES = 450_000;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });

export function ProfileEditor({ className }: { className?: string }) {
  const { t } = useTranslation();
  const displayName = useAppStore((s) => s.displayName);
  const avatarUrl = useAppStore((s) => s.avatarUrl);
  const tableStatus = useAppStore((s) => s.tableStatus);
  const equipped = useAppStore((s) => s.equipped);
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);
  const updateProfile = useAppStore((s) => s.updateProfile);

  const [statusDraft, setStatusDraft] = useState(tableStatus ?? '');
  const [urlDraft, setUrlDraft] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStatusDraft(tableStatus ?? '');
    setPreviewUrl(avatarUrl ?? null);
  }, [tableStatus, avatarUrl]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await updateProfile({
      avatar: previewUrl,
      tableStatus: statusDraft.trim() || null
    });
    setBusy(false);
    if (result.ok) {
      setMessage(t('profile.saved'));
      setUrlDraft('');
    } else {
      setError(result.error ?? t('profile.saveFailed'));
    }
  };

  return (
    <div className={cn('border-t border-white/10 pt-4', className)}>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/70">
        {t('profile.title')}
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <PlayerAvatar
          name={displayName ?? t('auth.player')}
          avatarUrl={previewUrl}
          frameId={equipped.frame}
          tier={subscriptionTier}
          tableStatus={statusDraft.trim() || tableStatus}
          size="md"
          showTier
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Input
            label={t('profile.tableStatus')}
            placeholder={t('profile.tableStatusPlaceholder')}
            maxLength={80}
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                if (file.size > MAX_AVATAR_BYTES) {
                  setError(t('profile.fileTooLarge'));
                  return;
                }
                try {
                  const dataUrl = await readFileAsDataUrl(file);
                  setPreviewUrl(dataUrl);
                  setError(null);
                } catch {
                  setError(t('profile.uploadFailed'));
                }
              }}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              {t('profile.uploadPhoto')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreviewUrl(null);
                setUrlDraft('');
              }}
            >
              {t('profile.removeAvatar')}
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              label={t('profile.avatarUrl')}
              placeholder="https://…"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="sm:self-end"
              disabled={!urlDraft.trim()}
              onClick={() => {
                setPreviewUrl(urlDraft.trim());
                setError(null);
              }}
            >
              {t('profile.previewUrl')}
            </Button>
          </div>
          <Button type="button" size="sm" className="w-full sm:w-auto" disabled={busy} onClick={() => void save()}>
            {busy ? t('profile.saving') : t('profile.save')}
          </Button>
          {message ? (
            <p className="rounded-lg border border-emerald/20 bg-emerald/10 px-3 py-2 text-xs text-emerald">{message}</p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>
          ) : null}
          <p className="text-[11px] leading-relaxed text-subtle">{t('profile.hint')}</p>
        </div>
      </div>
    </div>
  );
}
