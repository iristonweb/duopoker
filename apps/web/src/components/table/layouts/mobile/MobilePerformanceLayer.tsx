import { useEffect } from 'react';

export function MobilePerformanceLayer({ active }: { active: boolean }) {
  useEffect(() => {
    if (active) {
      document.body.classList.add('table-mobile-immersive');
    } else {
      document.body.classList.remove('table-mobile-immersive');
    }
    return () => document.body.classList.remove('table-mobile-immersive');
  }, [active]);

  return null;
}
