import { useServiceWorkerNavigation } from '../hooks/useServiceWorkerNavigation';

export function ServiceWorkerNavigationBridge() {
  useServiceWorkerNavigation();
  return null;
}
