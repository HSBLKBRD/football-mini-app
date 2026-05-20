import React from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { getTelegramUser } from '../lib/telegramUtils';

export default function Header() {
  const user = getTelegramUser();
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();

  const handleWalletAction = async () => {
    if (tonConnectUI.connected) {
      await tonConnectUI.disconnect();
    } else {
      await tonConnectUI.connectWallet();
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <header className="app-header">
      <div className="brand">
        <h1 className="brand-title">فوتبالی ترین ها</h1>
        <span className="brand-subtitle">PREDICTION APP</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <button 
          onClick={handleWalletAction}
          className="btn-primary"
          style={{ 
            fontSize: '13px', 
            padding: '6px 12px', 
            height: 'auto',
            borderRadius: '20px',
            background: tonConnectUI.connected ? 'rgba(239, 68, 68, 0.15)' : 'var(--accent)',
            border: tonConnectUI.connected ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
            color: tonConnectUI.connected ? '#ef4444' : 'var(--bg-main)',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {tonConnectUI.connected ? `Disconnect (${formatAddress(userAddress)})` : 'Connect Wallet'}
        </button>
        {user && (
          <div className="user-badge">
            <span>@{user.username || user.first_name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
