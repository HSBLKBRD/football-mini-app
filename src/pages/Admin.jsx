import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getTelegramUser } from '../lib/telegramUtils';

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  
  // Form states for creating a new match
  const [newTeamA, setNewTeamA] = useState('');
  const [newTeamB, setNewTeamB] = useState('');
  const [newDate, setNewDate] = useState('');
  
  // Selected match for updating scores
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [resA, setResA] = useState('');
  const [resB, setResB] = useState('');
  const [matchStatus, setMatchStatus] = useState('scheduled');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const currentUser = getTelegramUser();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = () => {
    const configAdminId = import.meta.env.VITE_ADMIN_ID || import.meta.env.REACT_APP_ADMIN_ID || '';
    
    if (currentUser && configAdminId && currentUser.id.toString() === configAdminId.toString()) {
      setIsAdmin(true);
      fetchMatches();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setErrorMsg('Failed to load matches.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!newTeamA || !newTeamB || !newDate) {
      setErrorMsg('Please fill out all match details.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const matchPayload = {
        date: new Date(newDate).toISOString(),
        status: 'scheduled'
      };

      // Try inserting with team_a and team_b first
      let { error } = await supabase
        .from('matches')
        .insert({
          ...matchPayload,
          team_a: newTeamA,
          team_b: newTeamB
        });

      // Fallback: If error indicates missing columns, try home_team and away_team
      if (error && error.message && (error.message.includes('column') || error.code === '42703')) {
        console.log('Inserting team_a/team_b failed. Retrying insertion with home_team/away_team...');
        const retryResult = await supabase
          .from('matches')
          .insert({
            ...matchPayload,
            home_team: newTeamA,
            away_team: newTeamB
          });
        error = retryResult.error;
      }

      if (error) throw error;
      
      setSuccessMsg('Match created successfully.');
      setNewTeamA('');
      setNewTeamB('');
      setNewDate('');
      fetchMatches();
    } catch (err) {
      console.error('Failed to create match:', err);
      setErrorMsg(err.message || 'Error creating match.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectMatch = (match) => {
    setSelectedMatch(match);
    setResA(match.result_a !== null ? match.result_a : '');
    setResB(match.result_b !== null ? match.result_b : '');
    setMatchStatus(match.status);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Logic to calculate points based on predictions
  const calculatePoints = (predA, predB, actualA, actualB) => {
    if (predA === actualA && predB === actualB) {
      return 3; // Perfect prediction
    }
    
    const predDiff = predA - predB;
    const actualDiff = actualA - actualB;
    
    // Check if the outcome (Win, Lose, Draw) is predicted correctly
    if (Math.sign(predDiff) === Math.sign(actualDiff)) {
      return 1; // Correct outcome
    }
    
    return 0; // Wrong prediction
  };

  const handleUpdateMatch = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isFinished = matchStatus === 'finished';
      const actualA = resA !== '' ? parseInt(resA, 10) : null;
      const actualB = resB !== '' ? parseInt(resB, 10) : null;

      if (isFinished && (actualA === null || actualB === null)) {
        throw new Error('Finished matches must have score results.');
      }

      // Update the match in Supabase
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          status: matchStatus,
          result_a: actualA,
          result_b: actualB
        })
        .eq('id', selectedMatch.id);

      if (matchError) throw matchError;

      // If the match is newly finished, calculate user scores and update the leaderboard
      if (isFinished) {
        const { data: predictions, error: predError } = await supabase
          .from('predictions')
          .select('*')
          .eq('match_id', selectedMatch.id);

        if (predError) throw predError;

        if (predictions && predictions.length > 0) {
          for (const pred of predictions) {
            const pointsAwarded = calculatePoints(pred.pred_a, pred.pred_b, actualA, actualB);

            if (pointsAwarded > 0) {
              const { data: boardData, error: boardError } = await supabase
                .from('leaderboard')
                .select('total_points')
                .eq('user_id', pred.user_id)
                .maybeSingle();

              if (boardError) throw boardError;

              const currentPoints = boardData ? boardData.total_points : 0;
              const newPoints = currentPoints + pointsAwarded;

              const { error: upsertError } = await supabase
                .from('leaderboard')
                .upsert({ 
                  user_id: pred.user_id,
                  total_points: newPoints,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

              if (upsertError) throw upsertError;
            }
          }
        }
      }

      setSuccessMsg('Match and leaderboard updated successfully!');
      setSelectedMatch(null);
      fetchMatches();
    } catch (err) {
      console.error('Failed to update match:', err);
      setErrorMsg(err.message || 'Error updating match.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        Authenticating Admin...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-container" style={{ marginTop: '24px' }}>
        <div className="alert-error">
          <h3>ACCESS DENIED</h3>
          <p style={{ marginTop: '8px', fontSize: '0.8rem' }}>
            You do not have administrative permissions to view this page.
          </p>
          {currentUser && (
            <p style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Current User ID: <strong>{currentUser.id}</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  const selectedTeamAName = selectedMatch ? (selectedMatch.team_a || selectedMatch.home_team) : '';
  const selectedTeamBName = selectedMatch ? (selectedMatch.team_b || selectedMatch.away_team) : '';

  return (
    <div className="admin-container">
      <h2 className="section-title">Admin Dashboard</h2>

      {errorMsg && <div className="alert-error">{errorMsg}</div>}
      {successMsg && <div className="alert-success">{successMsg}</div>}

      {/* Selected Match Editing Panel */}
      {selectedMatch && (
        <div className="match-card" style={{ borderColor: 'var(--primary-gold)' }}>
          <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--primary-gold)', marginBottom: '16px' }}>
            Update Match Score
          </h3>
          <form onSubmit={handleUpdateMatch}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 600 }}>{selectedTeamAName}</span>
              <span style={{ color: 'var(--text-muted)' }}>vs</span>
              <span style={{ fontWeight: 600 }}>{selectedTeamBName}</span>
            </div>

            <div className="prediction-inputs" style={{ margin: '10px 0' }}>
              <div className="score-input-wrapper">
                <label className="prediction-label">{selectedTeamAName}</label>
                <input
                  type="number"
                  min="0"
                  className="score-input"
                  value={resA}
                  onChange={(e) => setResA(e.target.value)}
                  disabled={actionLoading}
                />
              </div>

              <div className="prediction-sep">:</div>

              <div className="score-input-wrapper">
                <label className="prediction-label">{selectedTeamBName}</label>
                <input
                  type="number"
                  min="0"
                  className="score-input"
                  value={resB}
                  onChange={(e) => setResB(e.target.value)}
                  disabled={actionLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Match Status</label>
              <select 
                className="form-control" 
                value={matchStatus} 
                onChange={(e) => setMatchStatus(e.target.value)}
                disabled={actionLoading}
                style={{ background: 'var(--bg-dark)' }}
              >
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="finished">Finished (Triggers leaderboard points calculation)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="submit" className="btn-primary" style={{ flex: 2, marginTop: 0 }} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ flex: 1, marginTop: 0, background: '#272e3a', color: 'var(--text-muted)' }} 
                onClick={() => setSelectedMatch(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create New Match Panel */}
      <div className="match-card">
        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '16px' }}>Create New Match</h3>
        <form onSubmit={handleCreateMatch}>
          <div className="form-group">
            <label>Team A/Home Team Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Real Madrid"
              value={newTeamA}
              onChange={(e) => setNewTeamA(e.target.value)}
              disabled={actionLoading}
              required
            />
          </div>

          <div className="form-group">
            <label>Team B/Away Team Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Barcelona"
              value={newTeamB}
              onChange={(e) => setNewTeamB(e.target.value)}
              disabled={actionLoading}
              required
            />
          </div>

          <div className="form-group">
            <label>Match Date & Time</label>
            <input
              type="datetime-local"
              className="form-control"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              disabled={actionLoading}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={actionLoading}>
            {actionLoading ? 'Creating...' : 'Create Match'}
          </button>
        </form>
      </div>

      {/* Matches List */}
      <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', marginTop: '10px' }}>Active Matches</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {matches.length > 0 ? (
          matches.map((m) => (
            <div 
              key={m.id} 
              className="leaderboard-item" 
              style={{ cursor: 'pointer', border: '1px solid var(--border)' }}
              onClick={() => handleSelectMatch(m)}
            >
              <div className="user-info" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {(m.team_a || m.home_team)} vs {(m.team_b || m.away_team)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(m.date).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: m.status === 'finished' ? 'rgba(255,255,255,0.05)' : m.status === 'live' ? 'rgba(16,185,129,0.1)' : 'rgba(197,168,128,0.1)',
                  color: m.status === 'finished' ? 'var(--text-muted)' : m.status === 'live' ? 'var(--accent-emerald)' : 'var(--primary-gold)'
                }}>
                  {m.status}
                </span>
                {m.status === 'finished' && (
                  <span style={{ fontWeight: 700, color: 'var(--primary-gold)' }}>
                    {m.result_a} - {m.result_b}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No matches created yet.
          </div>
        )}
      </div>
    </div>
  );
}
