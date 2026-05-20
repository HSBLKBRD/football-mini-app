import React from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { getTelegramUser } from '../lib/telegramUtils';

export default function Header() {
  const user = getTelegramUser();
  const [tonConnectUI] = useTonConnectUI();
  const connected = tonConnectUI.connected;
  const address = tonConnectUI.account?.address;

  const handleWalletClick = async () => {
    if (connected) {
      if (window.confirm("Do you want to disconnect your wallet?")) {
        await tonConnectUI.disconnect();
      }
    } else {
      // Connect directly to Telegram Wallet to prevent user confusion with other wallets
      try {
        await tonConnectUI.openSingleWalletModal('telegram-wallet');
      } catch (err) {
        console.error("Failed to open Telegram Wallet modal:", err);
      }
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
          onClick={handleWalletClick}
          style={{
            background: connected ? 'rgba(16, 185, 129, 0.1)' : 'var(--primary-gold)',
            color: connected ? 'var(--accent-emerald)' : 'var(--bg-dark)',
            border: connected ? '1px solid rgba(16, 185, 129, 0.2)' : 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {connected ? (
            <>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block' }}></span>
              {formatAddress(address)}
            </>
          ) : (
            'Connect Wallet'
          )}
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
