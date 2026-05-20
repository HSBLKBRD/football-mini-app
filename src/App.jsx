import React, { useEffect, useRef, useCallback, useState } from 'react';
import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { TonConnectUIProvider, THEME, TonConnectUI, useTonConnectUI } from '@tonconnect/ui-react';
import Header from './components/Header';
import Home from './pages/Home';
import LeaderboardPage from './pages/LeaderboardPage';
import Admin from './pages/Admin';
import { getTelegramUser } from './lib/telegramUtils';

// Tiny promise‑based delay helper
const wait = (ms) => new Promise((res) => setTimeout(res, ms));

function TonConnectInitializer() {
  const [tonConnectUI] = useTonConnectUI();
  const setTonConnectUI = () => {}; // No-op for context

  useEffect(() => {
    if (tonConnectUI) {
      window.tonConnectUI = tonConnectUI;
    }
  }, [tonConnectUI]);
  return null;
}

function AppContent() {
  const user = getTelegramUser();
  const adminId = import.meta.env.VITE_ADMIN_ID || import.meta.env.REACT_APP_ADMIN_ID || '';
  const showAdminTab =
    user && adminId && user.id.toString() === adminId.toString();

// TonConnect UI references have been removed to avoid modal interception.
// The SDK is kept disabled via the ENABLE_TON_CONNECT flag.


// Direct hard redirect to Telegram Wallet (bypassing TonConnect SDK modal)
const handleConnectWallet = () => {
  // Use TonConnect UI to open the wallet connection modal
  if (window.tonConnectUI) {
    window.tonConnectUI.connectWallet();
  } else {
    console.warn('TonConnect UI not initialized');
  }
};

   // Telegram WebApp integration – only react after the Mini App is ready
   useEffect(() => {
     const tg = window.Telegram?.WebApp;
     if (!tg) return;
     const onReady = () => {
       console.log('🟢 Telegram WebApp ready');
     };
     tg.onEvent('ready', onReady);
     return () => {
       tg.offEvent('ready', onReady);
     };
   }, []);

   // Manual connection UI state
   const [showManual, setShowManual] = useState(false);
   const [manualAddress, setManualAddress] = useState('');
   const SUPABASE_URL = 'https://kfgmorqatvpnecjbixak.supabase.co';
   const SUPABASE_ANON_KEY = 'sb_publishable_6suJaEKh-tUo5UTmL7qFVw_wgdFAOh7';
   const USERS_TABLE = 'users';

   const saveAddress = async (address) => {
     try {
       const resp = await fetch(`${SUPABASE_URL}/rest/v1/${USERS_TABLE}`, {
         method: 'POST',
         headers: {
           apikey: SUPABASE_ANON_KEY,
           Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
           'Content-Type': 'application/json',
           Prefer: 'return=representation',
         },
         body: JSON.stringify({ address, created_at: new Date().toISOString() }),
       });
       if (!resp.ok) {
         const err = await resp.text();
         console.error('❌ Failed to save address', err);
       } else {
         console.log('✅ Address saved');
       }
     } catch (e) {
       console.error('❌ Unexpected error while saving address', e);
     }
   };

  return (
    <>
      <TonConnectInitializer />
      <Header />
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

        {/* Connect options */}
        <button onClick={handleConnectWallet} className="connect-btn" style={{display:'none'}}>
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
             onClick={async () => {
               if (manualAddress.trim()) {
                 await saveAddress(manualAddress.trim());
                 setManualAddress('');
                 setShowManual(false);
               }
             }}
             className="save-btn"
             style={{ marginLeft: '0.5rem', padding: '0.5rem' }}
           >
             Save Address
           </button>
         </div>
       )}

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

// Enable or disable TonConnect provider. Set to false to completely bypass the SDK.
const ENABLE_TON_CONNECT = true;

export default function App() {
  const manifestUrl = 'https://football-mini-app.vercel.app/tonconnect-manifest.json';
  const walletsSource = `${window.location.origin}/wallets.json`;

  const appContent = (
    <Router>
      <AppContent />
    </Router>
  );

  return ENABLE_TON_CONNECT ? (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      walletsListSource={walletsSource}
      restoreConnection={true}
      uiPreferences={{ theme: THEME.DARK }}
      actionsConfiguration={{
        returnStrategy: 'back',
        bridge: 'https://walletbot.me/tonconnect-bridge/bridge',
        twaReturnUrl: window.location.origin,
      }}
      walletsListConfiguration={{
        includeWallets: [
          {
            appName: 'telegram-wallet',
            name: 'Wallet',
            imageUrl: 'https://wallet.tg/images/logo-288.png',
            aboutUrl: 'https://wallet.tg/',
            universalLink: 'https://t.me/wallet?attach=wallet',
            bridgeUrl: 'https://walletbot.me/tonconnect-bridge/bridge',
            platforms: ['ios', 'android', 'macos', 'windows', 'linux'],
          },
        ],
      }}
    >
      {appContent}
    </TonConnectUIProvider>
  ) : (
    appContent
  );
}
