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
        'inline-flex rounded-xl border border-white/10 bg-black/30 p-1 shadow-inner',
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
            'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200',
            current === lng
              ? 'bg-gradient-to-b from-gold/25 to-gold/10 text-gold-light shadow-inner-gold'
              : 'text-subtle hover:text-muted'
          )}
        >
          {t(`lang.${lng}`)}
        </button>
      ))}
    </div>
  );
}
