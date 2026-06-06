import i18n from '../i18n';

/** Map store error codes (or API codes) to localized strings. */
export function translateAuthError(code: string | undefined): string {
  if (!code) return '';
  if (code.startsWith('referralWarning:')) {
    const err = code.slice('referralWarning:'.length);
    return i18n.t(`referral.errors.${err}`, {
      defaultValue: i18n.t('auth.errors.referralSkipped', { defaultValue: err })
    });
  }
  return i18n.t(`auth.errors.${code}`, { defaultValue: code });
}

export function isAuthReferralWarning(code: string | undefined): boolean {
  return Boolean(code?.startsWith('referralWarning:'));
}

export function translateProfileError(code: string | undefined): string {
  if (!code) return '';
  return i18n.t(`profile.errors.${code}`, { defaultValue: code });
}

export function translateQueueError(code: string | undefined): string {
  if (!code) return '';
  return i18n.t(`queue.errors.${code}`, { defaultValue: code });
}
