import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { TonConnectUIProvider, THEME, useTonConnectUI } from '@tonconnect/ui-react';
import Header from './components/Header';
import Home from './pages/Home';
import LeaderboardPage from './pages/LeaderboardPage';
import Admin from './pages/Admin';
import { getTelegramUser } from './lib/telegramUtils';

function AppContent() {
  const user = getTelegramUser();
  const adminId = import.meta.env.VITE_ADMIN_ID || import.meta.env.REACT_APP_ADMIN_ID || '';
  const showAdminTab = user && adminId && user.id.toString() === adminId.toString();

  const [tonConnectUI] = useTonConnectUI();

  const [showManual, setShowManual] = useState(false);
  const [manualAddress, setManualAddress] = useState('');

  const SUPABASE_URL = 'https://kfgmorqatvpnecjbixak.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_6suJaEKh-tUo5UTmL7qFVw_wgdFAOh7';
  const USERS_TABLE = 'predictions';

  const handleManualSave = async () => {
    if (!manualAddress.trim()) {
      console.warn('No address to save');
      return;
    }
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/${USERS_TABLE}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ wallet_address: manualAddress.trim(), created_at: new Date().toISOString() }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        console.error('❌ Failed to save address', err);
      } else {
        console.log('✅ Address saved');
        setManualAddress('');
        setShowManual(false);
      }
    } catch (e) {
      console.error('❌ Unexpected error while saving address', e);
    }
  };

  const handleConnect = () => {
    if (tonConnectUI) {
      tonConnectUI.connectWallet();
    } else {
      console.warn('TonConnect UI not initialized');
    }
  };

  return (
    <>
      <Header />
      <nav className="nav-tabs">
        <NavLink to="/" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          🏆 Match Prediction
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          📊 Leaderboard
        </NavLink>
        {showAdminTab && (
          <NavLink to="/admin" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
            ⚙️ Admin
          </NavLink>
        )}
      </nav>

      {/* Connect options */}
      <button onClick={handleConnect} className="connect-btn">
        Connect Wallet via Telegram
      </button>
      <button onClick={() => setShowManual(true)} className="manual-btn" style={{ marginLeft: '0.5rem' }}>
        Manual Connect
      </button>

      {showManual && (
        <div className="manual-connect" style={{ marginTop: '1rem' }}>
          <input
            type="text"
            placeholder="Enter your TON wallet address"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            className="address-input"
            style={{ padding: '0.5rem', width: '60%' }}
          />
          <button
            onClick={handleManualSave}
            className="save-btn"
            style={{ marginLeft: '0.5rem', padding: '0.5rem' }}
          >
            Save Address
          </button>
        </div>
      )}

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
  const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
  const walletsSource = `${window.location.origin}/wallets.json`;

  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      walletsListSource={walletsSource}
      restoreConnection={true}
      uiPreferences={{ theme: THEME.DARK }}
      actionsConfiguration={{ returnStrategy: 'back' }}
    >
      <Router>
        <AppContent />
      </Router>
    </TonConnectUIProvider>
  );
}
