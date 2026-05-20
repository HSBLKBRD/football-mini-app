import React from 'react';
import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import Header from './components/Header';
import Home from './pages/Home';
import LeaderboardPage from './pages/LeaderboardPage';
import Admin from './pages/Admin';
import { getTelegramUser } from './lib/telegramUtils';

function AppContent() {
  const user = getTelegramUser();
  const adminId = import.meta.env.VITE_ADMIN_ID || import.meta.env.REACT_APP_ADMIN_ID || '';
  const showAdminTab = user && adminId && user.id.toString() === adminId.toString();

  return (
    <>
      <Header />
      
      {/* Navigation tabs matching the premium design system */}
      <nav className="nav-tabs">
        <NavLink 
          to="/" 
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        >
          🏆 Match Prediction
        </NavLink>
        <NavLink 
          to="/leaderboard" 
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        >
          📊 Leaderboard
        </NavLink>
        {showAdminTab && (
          <NavLink 
            to="/admin" 
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            ⚙️ Admin
          </NavLink>
        )}
      </nav>

      {/* Page Routing */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}

export default function App() {
  // Use relative path for manifest to automatically resolve in dev and prod
  const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
  const walletsSource = `${window.location.origin}/wallets.json`;

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl} walletsListSource={walletsSource}>
      <Router>
        <AppContent />
      </Router>
    </TonConnectUIProvider>
  );
}
