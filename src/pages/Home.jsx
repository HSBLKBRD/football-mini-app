import React, { useState, useEffect } from 'react';
import { useTonConnectUI, TonConnectButton } from '@tonconnect/ui-react';
import { supabase } from '../lib/supabaseClient';
import { getTelegramUser } from '../lib/telegramUtils';

function MatchCard({ match, user, tonConnectUI }) {
  const [predA, setPredA] = useState('');
  const [predB, setPredB] = useState('');
  const [userPrediction, setUserPrediction] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  
  // Timer States
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  // Support both team_a/team_b and home_team/away_team database naming conventions
  const teamAName = match.team_a || match.home_team || 'Team A';
  const teamBName = match.team_b || match.away_team || 'Team B';

  useEffect(() => {
    if (match && user) {
      fetchUserPrediction();
    }
  }, [match, user]);

  // Live countdown timer logic
  useEffect(() => {
    if (!match) return;

    const calculateTimeRemaining = () => {
      const diff = new Date(match.date).getTime() - Date.now();
      
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return true; // Expired
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setCountdown({ days, hours, minutes, seconds, isExpired: false });
      return false;
    };

    const isExpired = calculateTimeRemaining();
    if (isExpired) return;

    const timer = setInterval(() => {
      const expired = calculateTimeRemaining();
      if (expired) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [match]);

  const fetchUserPrediction = async () => {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id.toString())
        .eq('match_id', match.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setUserPrediction(data);
        setPredA(data.pred_a);
        setPredB(data.pred_b);
      }
    } catch (err) {
      console.error('Error fetching prediction:', err);
    }
  };

  // Helper to format wallet exceptions to user-friendly messages
  const formatWalletError = (err) => {
    if (!err) return 'Unknown transaction error occurred.';
    const msg = err.message || '';
    if (msg.includes('User rejects') || msg.includes('declined') || msg.includes('canceled') || err.code === 300) {
      return 'Transaction cancelled by user in wallet.';
    }
    if (msg.includes('Insufficient balance') || msg.includes('not enough funds') || err.code === 302) {
      return 'Insufficient funds in your TON Wallet to complete this prediction.';
    }
    return msg || 'Transaction failed. Please try again.';
  };

  // Polling blockchain for transaction validation
  const verifyTransactionOnChain = async (userRawAddress, expectedAmount, targetWallet) => {
    const targetNetwork = String(import.meta.env.VITE_TON_NETWORK || '-239');
    const network = tonConnectUI.account?.network;
    const isTestnet = 
      targetNetwork === '0' || 
      targetNetwork === '-3' || 
      network === -3 || 
      network === 0 || 
      String(network) === '0' || 
      String(network) === '-3';
    const tonApiBase = isTestnet ? 'https://testnet.toncenter.com/api/v2' : 'https://toncenter.com/api/v2';
    let friendlyUserAddress = '';
    
    // Resolve raw hex user address to friendly format for TonCenter comparison
    try {
      const packRes = await fetch(`${tonApiBase}/packAddress?address=${encodeURIComponent(userRawAddress)}`);
      const packJson = await packRes.json();
      if (packJson.ok) {
        friendlyUserAddress = packJson.result;
      }
    } catch (e) {
      console.warn("Address packing failed, falling back to raw matching:", e);
    }

    const maxAttempts = 15; // 15 attempts * 4s = 60s timeout
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setStatusMsg({ type: 'info', text: `Verifying on-chain transaction... (Attempt ${attempt}/${maxAttempts})` });
        const res = await fetch(`${tonApiBase}/getTransactions?address=${encodeURIComponent(targetWallet)}&limit=10`);
        const data = await res.json();
        
        if (data.ok && data.result) {
          const tx = data.result.find(t => {
            if (!t.in_msg) return false;
            
            const source = t.in_msg.source;
            const isSenderMatch = 
              source === friendlyUserAddress || 
              source === userRawAddress || 
              source.toLowerCase() === friendlyUserAddress.toLowerCase() ||
              source.toLowerCase() === userRawAddress.toLowerCase();
            
            const value = t.in_msg.value;
            const isValueMatch = value === expectedAmount;
            
            // Check if transaction happened in the last 10 minutes
            const txTime = t.utime * 1000;
            const isRecent = (Date.now() - txTime) < 10 * 60 * 1000;

            return isSenderMatch && isValueMatch && isRecent;
          });

          if (tx) {
            return tx; // Success
          }
        }
      } catch (err) {
        console.error("Polling indexer error:", err);
      }
      // Wait 4 seconds
      await new Promise(r => setTimeout(r, 4000));
    }
    throw new Error("Transaction verification timed out. We couldn't verify your payment on the blockchain.");
  };

  const handlePredictionSubmit = async (e) => {
    e.preventDefault();
    if (countdown.isExpired) {
      setStatusMsg({ type: 'error', text: 'Match has already kicked off. Predictions are closed!' });
      return;
    }

    if (!user) {
      setStatusMsg({ type: 'error', text: 'Telegram WebApp user not loaded.' });
      return;
    }

    if (predA === '' || predB === '') {
      setStatusMsg({ type: 'error', text: 'Please enter scores for both teams.' });
      return;
    }

    const valA = parseInt(predA, 10);
    const valB = parseInt(predB, 10);

    if (isNaN(valA) || isNaN(valB) || valA < 0 || valB < 0) {
      setStatusMsg({ type: 'error', text: 'Invalid score values.' });
      return;
    }

    // Check if wallet is connected
    if (!tonConnectUI.connected) {
      setStatusMsg({ type: 'error', text: 'Please connect your TON Wallet first using the button at the top.' });
      return;
    }

    setSubmitting(true);
    setStatusMsg({ type: 'info', text: 'Initiating TON payment request...' });

    try {
      const walletAddress = import.meta.env.VITE_WALLET_ADDRESS || import.meta.env.REACT_APP_WALLET_ADDRESS || '';
      
      if (!walletAddress || walletAddress === 'PLACEHOLDER_WALLET_ADDRESS') {
        throw new Error('Destination wallet address is not configured. Please define REACT_APP_WALLET_ADDRESS in your environment.');
      }

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 120, // Valid for 2 mins
        network: String(import.meta.env.VITE_TON_NETWORK || '-239'), // Always Mainnet (-239) by default
        messages: [
          {
            address: walletAddress,
            amount: '10000000', // 0.01 TON in nanotons
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);
      
      if (!result) {
        throw new Error('Transaction cancelled or failed.');
      }

      const userRawAddress = tonConnectUI.account?.address;
      if (!userRawAddress) {
        throw new Error("Unable to retrieve sender address from your connected wallet.");
      }

      // Verify the transaction on the blockchain
      await verifyTransactionOnChain(userRawAddress, '10000000', walletAddress);

      setStatusMsg({ type: 'info', text: 'Blockchain confirmed! Saving prediction...' });

      // Save prediction in Supabase
      const payload = {
        user_id: user.id.toString(),
        match_id: match.id,
        pred_a: valA,
        pred_b: valB,
        is_paid: true
      };

      const { data, error } = await supabase
        .from('predictions')
        .upsert(payload, { onConflict: 'user_id,match_id' })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Update leaderboard record for the user to make sure they exist
      const username = user.username || `${user.first_name} ${user.last_name || ''}`.trim();
      const { error: leaderboardError } = await supabase
        .from('leaderboard')
        .upsert({ user_id: user.id.toString(), username }, { onConflict: 'user_id' });

      if (leaderboardError) {
        console.warn("Leaderboard registration failed:", leaderboardError);
      }

      setUserPrediction(data);
      setStatusMsg({ type: 'success', text: 'Prediction submitted and verified successfully!' });
    } catch (err) {
      console.error('Submission failed:', err);
      setStatusMsg({ type: 'error', text: formatWalletError(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="match-card" style={{ marginBottom: '20px' }}>
      <div className="match-status">
        <span className={countdown.isExpired ? "" : "status-dot"}></span>
        {countdown.isExpired ? "Predictions Closed" : "Predictions Open"}
      </div>

      <div className="teams-grid">
        <div className="team">
          <div className="team-logo-placeholder">⚽</div>
          <div className="team-name">{teamAName}</div>
        </div>
        
        <div className="vs-divider">VS</div>
        
        <div className="team">
          <div className="team-logo-placeholder">⚽</div>
          <div className="team-name">{teamBName}</div>
        </div>
      </div>

      {/* Countdown Clock Display */}
      {!countdown.isExpired ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Match Kickoff In
          </span>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 10px', borderRadius: '6px', minWidth: '46px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-gold)' }}>{String(countdown.days).padStart(2, '0')}</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Days</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 10px', borderRadius: '6px', minWidth: '46px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-gold)' }}>{String(countdown.hours).padStart(2, '0')}</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hours</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 10px', borderRadius: '6px', minWidth: '46px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-gold)' }}>{String(countdown.minutes).padStart(2, '0')}</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mins</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 10px', borderRadius: '6px', minWidth: '46px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-gold)' }}>{String(countdown.seconds).padStart(2, '0')}</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Secs</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', marginBottom: '20px', letterSpacing: '0.5px' }}>
          🔒 Kickoff reached. Form locked.
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Match Date: {new Date(match.date).toLocaleString()}
      </div>

      {userPrediction ? (
        <div style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
          <p style={{ color: 'var(--accent-emerald)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
            ✓ Prediction Submitted (Verified On-Chain)
          </p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {teamAName} {userPrediction.pred_a} - {userPrediction.pred_b} {teamBName}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Your prediction has been logged. Leaderboard points will update once match finishes.
          </p>
        </div>
      ) : (
        <form onSubmit={handlePredictionSubmit}>
          <div className="prediction-inputs">
            <div className="score-input-wrapper">
              <label className="prediction-label">{teamAName}</label>
              <input
                type="number"
                min="0"
                className="score-input"
                value={predA}
                onChange={(e) => setPredA(e.target.value)}
                disabled={submitting || countdown.isExpired}
                required
              />
            </div>

            <div className="prediction-sep">:</div>

            <div className="score-input-wrapper">
              <label className="prediction-label">{teamBName}</label>
              <input
                type="number"
                min="0"
                className="score-input"
                value={predB}
                onChange={(e) => setPredB(e.target.value)}
                disabled={submitting || countdown.isExpired}
                required
              />
            </div>
          </div>

          {statusMsg.text && (
            <div className={`alert-${statusMsg.type}`} style={{ marginTop: '12px' }}>
              {statusMsg.text}
            </div>
          )}

          <div className="ton-connect-section">
            {!tonConnectUI.connected ? (
              <>
                <p className="wallet-note">
                  Please connect your Telegram Wallet to submit your prediction.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                  <TonConnectButton />
                </div>
              </>
            ) : (
              <>
                <p className="wallet-note">
                  Predictions require a small fee of 0.01 TON to prevent spam.
                </p>
                <button type="submit" className="btn-primary" disabled={submitting || countdown.isExpired}>
                  {submitting ? 'Verifying payment...' : countdown.isExpired ? 'Predictions Closed' : 'Pay & Submit Prediction (0.01 TON)'}
                </button>
              </>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [tonConnectUI] = useTonConnectUI();
  const user = getTelegramUser();

  // Load the next active matches
  useEffect(() => {
    fetchActiveMatches();
  }, []);

  const fetchActiveMatches = async () => {
    try {
      setLoading(true);
      // Fetch up to 10 scheduled matches
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'scheduled')
        .order('date', { ascending: true })
        .limit(10);

      if (error) throw error;
      setMatches(data || []);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setStatusMsg({ type: 'error', text: 'Supabase connection issue: Failed to load active matches.' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        Loading active matches...
      </div>
    );
  }

  return (
    <div className="match-container">
      <h2 className="section-title">Active Match Predictions</h2>

      {statusMsg.text && (
        <div className={`alert-${statusMsg.type}`} style={{ marginBottom: '20px' }}>
          {statusMsg.text}
        </div>
      )}

      {matches.length > 0 ? (
        matches.map((match) => (
          <MatchCard 
            key={match.id} 
            match={match} 
            user={user} 
            tonConnectUI={tonConnectUI} 
          />
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No active matches are currently open for prediction.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-gold)', marginTop: '8px' }}>Please check back later!</p>
        </div>
      )}
    </div>
  );
}
