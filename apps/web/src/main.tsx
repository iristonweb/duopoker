import './i18n';
import './index.css';
import * as Sentry from '@sentry/react';
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoadingSkeleton } from '@duopoker/ui-kit';
import { MatchRedirect } from './components/MatchRedirect';
import { AppBrandBar } from './components/AppBrandBar';
import { Lobby } from './routes/Lobby';
import { LegalPrivacy } from './routes/LegalPrivacy';
import { LegalCommunity } from './routes/LegalCommunity';
import { LegalTerms } from './routes/LegalTerms';
import { ProfilePage } from './routes/ProfilePage';
import { VerifyEmail } from './routes/VerifyEmail';
import { Clubs } from './routes/Clubs';
import { ClubNew } from './routes/ClubNew';
import { ClubDashboard } from './routes/ClubDashboard';
import { TableManager } from './routes/TableManager';
import { InviteAccept } from './routes/InviteAccept';
import { ServiceWorkerNavigationBridge } from './components/ServiceWorkerNavigationBridge';
import { TableBackgroundBanner } from './components/table/TableBackgroundBanner';
import { TableRouteOrientationGate } from './components/table/TableRouteOrientationGate';

const Table = lazy(() => import('./routes/Table').then((m) => ({ default: m.Table })));
const AdminPage = lazy(() => import('./routes/AdminPage').then((m) => ({ default: m.AdminPage })));

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1)
  });
}

const RouteFallback = () => (
  <div className="mx-auto max-w-lg p-8">
    <LoadingSkeleton lines={3} />
  </div>
);

const App = () => (
  <BrowserRouter>
    <ServiceWorkerNavigationBridge />
    <MatchRedirect />
    <AppBrandBar />
    <TableBackgroundBanner />
    <TableRouteOrientationGate />
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/clubs" element={<Clubs />} />
        <Route path="/clubs/new" element={<ClubNew />} />
        <Route path="/clubs/:clubId" element={<ClubDashboard />} />
        <Route path="/clubs/:clubId/tables/:tableId" element={<TableManager />} />
        <Route path="/invite/:code" element={<InviteAccept />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/table/:sessionId" element={<Table />} />
        <Route path="/legal/terms" element={<LegalTerms />} />
        <Route path="/legal/privacy" element={<LegalPrivacy />} />
        <Route path="/legal/community" element={<LegalCommunity />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/" element={<Navigate to="/lobby" replace />} />
        <Route path="*" element={<Navigate to="/lobby" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
