import './index.css';
import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MatchRedirect } from './components/MatchRedirect';
import { Lobby } from './routes/Lobby';
import { LegalPrivacy } from './routes/LegalPrivacy';
import { LegalTerms } from './routes/LegalTerms';
import { Table } from './routes/Table';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1)
  });
}

const App = () => (
  <BrowserRouter>
    <MatchRedirect />
    <Routes>
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/table/:sessionId" element={<Table />} />
      <Route path="/legal/terms" element={<LegalTerms />} />
      <Route path="/legal/privacy" element={<LegalPrivacy />} />
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="*" element={<Navigate to="/lobby" replace />} />
    </Routes>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
