import React, { useState, useEffect } from 'react';
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
  const showAdminTab = user && adminId && user.id?.toString() === adminId.toString();

  const [tonConnectUI] = useTonConnectUI();
  const [showManual, setShowManual] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  const SUPABASE_URL = 'https://kfgmorqatvpnecjbixak.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_6suJaEKh-tUo5UTmL7qFVw_wgdFAOh7';
  const USERS_TABLE = 'users';

  // Cleanup on mount / unmount
  useEffect(() => {
    // Ensure any lingering listeners are removed
    if (tonConnectUI && typeof tonConnectUI.off === 'function') {
      tonConnectUI.off();
    }
    // Observe TonConnect modal to hide any stray vConsole (defensive)
    const observer = new MutationObserver(() => {
      const modal = document.querySelector('.tc-modal');
      if (modal) {
        const vc = document.querySelector('.vc-panel') || document.querySelector('.vconsole');
        if (vc) vc.style.display = 'none';
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      if (tonConnectUI && typeof tonConnectUI.disconnect === 'function') {
        tonConnectUI.disconnect();
      }
      if (tonConnectUI && typeof tonConnectUI.off === 'function') {
        tonConnectUI.off();
      }
      observer.disconnect();
    };
  }, []);

  const handleManualSave = async () => {
    if (!manualAddress.trim()) return;
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/${USERS_TABLE}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ address: manualAddress.trim(), created_at: new Date().toISOString() }),
      });
      if (resp.ok) {
        setWalletAddress(manualAddress.trim());
        setIsConnected(true);
        setManualAddress('');
        setShowManual(false);
      } else {
        console.error('Failed to save address', await resp.text());
      }
    } catch (e) {
      console.error('Unexpected error while saving address', e);
    }
  };

  const handleConnect = async () => {
    const isMobileEnv = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.platform && /android|ios|mobile|iphone|ipad/i.test(window.Telegram.WebApp.platform);
    if (isMobileEnv) {
      setShowManual(true);
      return;
    }
    if (!tonConnectUI) {
      setShowManual(true);
      return;
    }
    try {
      // Ensure previous listeners are cleared
      if (tonConnectUI && typeof tonConnectUI.off === 'function') {
        tonConnectUI.off();
      }
      await tonConnectUI.connectWallet();
      const address = tonConnectUI?.wallet?.account?.address || '';
      setWalletAddress(address);
      setIsConnected(true);
    } catch (e) {
      console.warn('TonConnect connection failed, falling back to manual', e);
      setShowManual(true);
    }
  };

  const handleDisconnect = () => {
    if (tonConnectUI?.disconnect) {
      tonConnectUI.disconnect();
    }
    setIsConnected(false);
    setWalletAddress('');
  };

  return (
    <>
      <Header />
      <nav className="nav-tabs">
        <NavLink to="/" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>🏆 Match Prediction</NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>📊 Leaderboard</NavLink>
        {showAdminTab && (
          <NavLink to="/admin" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>⚙️ Admin</NavLink>
        )}
      </nav>

      {/* Connection UI */}
      {isConnected ? (
        <>
          <span className="wallet-info">Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
          <button onClick={handleDisconnect} className="disconnect-btn" style={{ marginLeft: '0.5rem' }}>Disconnect</button>
        </>
      ) : (
        <button onClick={handleConnect} className="connect-btn">Connect Wallet</button>
      )}
      <button onClick={() => setShowManual(true)} className="manual-btn" style={{ marginLeft: '0.5rem' }}>Manual Connect</button>

      {showManual && (
        <div className="manual-connect" style={{ marginTop: '1rem' }}>
          <input
            type="text"
            placeholder="Enter your TON wallet address"
            value={manualAddress}
            onChange={e => setManualAddress(e.target.value)}
            className="address-input"
            style={{ padding: '0.5rem', width: '60%' }}
          />
          <button onClick={handleManualSave} className="save-btn" style={{ marginLeft: '0.5rem', padding: '0.5rem' }}>Save Address</button>
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
  const isMobile = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.platform && /android|ios|mobile|iphone|ipad/i.test(window.Telegram.WebApp.platform);

  return (
    <>
      <TonConnectUIProvider
        manifestUrl={manifestUrl}
        walletsListSource={walletsSource}
        restoreConnection={!isMobile}
        uiPreferences={{ theme: THEME.DARK }}
        actionsConfiguration={{ returnStrategy: 'back' }}
      >
        <Router>
          <AppContent />
        </Router>
      </TonConnectUIProvider>
    </>
  );
}