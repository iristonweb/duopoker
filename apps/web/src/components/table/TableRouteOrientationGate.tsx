import { useLocation } from 'react-router-dom';
import { useTableLayoutMode } from '../../hooks/useTableLayoutMode';
import { TableOrientationGate } from './TableOrientationGate';

/** Portrait overlay for /table/* — mounted outside lazy Table chunk so E2E and PWA see it immediately. */
export function TableRouteOrientationGate() {
  const { pathname } = useLocation();
  const layoutMode = useTableLayoutMode();
  if (!pathname.startsWith('/table/')) return null;
  if (layoutMode === 'mobile-immersive') return null;
  return <TableOrientationGate />;
}
