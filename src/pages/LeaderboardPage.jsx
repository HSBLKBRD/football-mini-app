import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getTelegramUser } from '../lib/telegramUtils';

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const currentUser = getTelegramUser();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLeaders(data || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setErrorMsg('Failed to load leaderboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        Loading leaderboard...
      </div>
    );
  }

  return (
    <div className="match-container">
      <h2 className="section-title">Global Leaderboard</h2>
      
      {errorMsg && <div className="alert-error">{errorMsg}</div>}

      <div className="leaderboard-card">
        {leaders.length > 0 ? (
          <div className="leaderboard-list">
            {leaders.map((leader, index) => {
              const rank = index + 1;
              const isMe = currentUser && currentUser.id.toString() === leader.user_id;
              
              // Formatting rank colors in UI
              let rankClass = `rank`;
              if (rank <= 3) {
                rankClass += ` rank-${rank}`;
              }

              return (
                <div key={leader.user_id} className={`leaderboard-item ${isMe ? 'current-user' : ''}`}>
                  <div className="user-info">
                    <span className={rankClass}>#{rank}</span>
                    <span className="username">
                      {leader.username || `User ${leader.user_id.substring(0, 5)}...`}
                      {isMe && ' (You)'}
                    </span>
                  </div>
                  <div className="points">{leader.total_points} pts</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-leaderboard">
            No players recorded yet. Be the first to predict!
          </div>
        )}
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button className="text-btn" onClick={fetchLeaderboard}>Refresh Standings</button>
      </div>
    </div>
  );
}
