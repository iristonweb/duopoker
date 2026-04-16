import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Lobby } from './routes/Lobby';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/lobby" element={<Lobby />} />
      <Route path="*" element={<Navigate to="/lobby" replace />} />
    </Routes>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
