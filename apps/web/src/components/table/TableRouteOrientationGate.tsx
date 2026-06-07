import { useLocation } from 'react-router-dom';
import { TableOrientationGate } from './TableOrientationGate';

/** Portrait overlay for /table/* — mounted outside lazy Table chunk so E2E and PWA see it immediately. */
export function TableRouteOrientationGate() {
  const { pathname } = useLocation();
  if (!pathname.startsWith('/table/')) return null;
  return <TableOrientationGate />;
}
