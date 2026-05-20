import React from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { getTelegramUser } from '../lib/telegramUtils';

export default function Header() {
  const user = getTelegramUser();

  return (
    <header className="app-header">
      <div className="brand">
        <h1 className="brand-title">فوتبالی ترین ها</h1>
        <span className="brand-subtitle">PREDICTION APP</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <TonConnectButton />
        {user && (
          <div className="user-badge">
            <span>@{user.username || user.first_name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
