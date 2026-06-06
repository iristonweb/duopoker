import { useLocation } from 'react-router-dom';
import { AppLogo } from './AppLogo';
import { LanguageSwitch } from './LanguageSwitch';

/** Top brand bar on all pages except lobby (lobby has its own header). */
export function AppBrandBar() {
  const { pathname } = useLocation();
  if (pathname === '/lobby' || pathname.startsWith('/table/')) return null;

  return (
    <div className="relative z-20 border-b border-white/10 bg-background/90 backdrop-blur-glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <AppLogo size="md" />
        <LanguageSwitch />
      </div>
    </div>
  );
}
