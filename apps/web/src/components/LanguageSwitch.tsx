import { useTranslation } from 'react-i18next';
import { cn } from '@duopoker/ui-kit';

export function LanguageSwitch({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = i18n.language.startsWith('en') ? 'en' : 'ru';

  const setLang = (lng: 'ru' | 'en') => {
    void i18n.changeLanguage(lng);
  };

  return (
    <div
      className={cn(
        'inline-flex rounded-xl border border-white/10 bg-black/30 p-0.5 text-[11px] font-semibold uppercase tracking-wider',
        className
      )}
      role="group"
      aria-label="Language"
    >
      {(['ru', 'en'] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => setLang(lng)}
          className={cn(
            'rounded-lg px-2.5 py-1 transition-colors',
            current === lng ? 'bg-gold/20 text-gold-light' : 'text-subtle hover:text-muted'
          )}
        >
          {t(`lang.${lng}`)}
        </button>
      ))}
    </div>
  );
}
