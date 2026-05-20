import React, { useEffect } from 'react';
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

  useEffect(() => {
    if (tonConnectUI) {
      console.log('TON Connect UI Instance Initialized:', tonConnectUI);
      const unsubscribeStatus = tonConnectUI.onStatusChange((wallet) => {
        console.log('TON Connect Wallet Status Changed:', wallet);
      });
      const unsubscribeModal = tonConnectUI.onModalStateChange((state) => {
        console.log('TON Connect Modal State Changed:', state);
      });
      return () => {
        unsubscribeStatus();
        unsubscribeModal();
      };
    }
  }, [tonConnectUI]);

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
    <TonConnectUIProvider 
      manifestUrl={manifestUrl} 
      walletsListSource={walletsSource}
      restoreConnection={true}
      uiPreferences={{ theme: THEME.DARK }}
      actionsConfiguration={{
        returnStrategy: 'back'
      }}
      walletsListConfiguration={{
        includeWallets: [
          {
            appName: "telegram-wallet",
            name: "Wallet",
            imageUrl: "https://wallet.tg/images/logo-288.png",
            aboutUrl: "https://wallet.tg/",
            universalLink: "https://t.me/wallet?attach=wallet",
            bridgeUrl: "https://walletbot.me/tonconnect-bridge/bridge",
            platforms: ["ios", "android", "macos", "windows", "linux"]
          }
        ]
      }}
    >
      <Router>
        <AppContent />
      </Router>
    </TonConnectUIProvider>
  );
}
