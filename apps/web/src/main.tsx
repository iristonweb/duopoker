import './i18n';
import './index.css';
import * as Sentry from '@sentry/react';
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoadingSkeleton } from '@duopoker/ui-kit';
import { MatchRedirect } from './components/MatchRedirect';
import { AppBrandBar } from './components/AppBrandBar';
import { ServiceWorkerNavigationBridge } from './components/ServiceWorkerNavigationBridge';
import { TableBackgroundBanner } from './components/table/TableBackgroundBanner';
import { TableRouteOrientationGate } from './components/table/TableRouteOrientationGate';

const Lobby = lazy(() => import('./routes/Lobby').then((m) => ({ default: m.Lobby })));
const Clubs = lazy(() => import('./routes/Clubs').then((m) => ({ default: m.Clubs })));
const ClubNew = lazy(() => import('./routes/ClubNew').then((m) => ({ default: m.ClubNew })));
const ClubDashboard = lazy(() => import('./routes/ClubDashboard').then((m) => ({ default: m.ClubDashboard })));
const TableManager = lazy(() => import('./routes/TableManager').then((m) => ({ default: m.TableManager })));
const ProfilePage = lazy(() => import('./routes/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const InviteAccept = lazy(() => import('./routes/InviteAccept').then((m) => ({ default: m.InviteAccept })));
const LegalPrivacy = lazy(() => import('./routes/LegalPrivacy').then((m) => ({ default: m.LegalPrivacy })));
const LegalCommunity = lazy(() => import('./routes/LegalCommunity').then((m) => ({ default: m.LegalCommunity })));
const LegalTerms = lazy(() => import('./routes/LegalTerms').then((m) => ({ default: m.LegalTerms })));
const LegalOrganizer = lazy(() => import('./routes/LegalOrganizer').then((m) => ({ default: m.LegalOrganizer })));
const ClubOnboarding = lazy(() => import('./routes/ClubOnboarding').then((m) => ({ default: m.ClubOnboarding })));
const VerifyEmail = lazy(() => import('./routes/VerifyEmail').then((m) => ({ default: m.VerifyEmail })));
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
        <Route path="/clubs/onboarding" element={<ClubOnboarding />} />
        <Route path="/clubs/:clubId" element={<ClubDashboard />} />
        <Route path="/clubs/:clubId/tables/:tableId" element={<TableManager />} />
        <Route path="/invite/:code" element={<InviteAccept />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/table/:sessionId" element={<Table />} />
        <Route path="/legal/terms" element={<LegalTerms />} />
        <Route path="/legal/privacy" element={<LegalPrivacy />} />
        <Route path="/legal/community" element={<LegalCommunity />} />
        <Route path="/legal/organizer" element={<LegalOrganizer />} />
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
