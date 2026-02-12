/**
 * Admin page for game management
 */

import { useState } from 'react';
import './Admin.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function Admin() {
  const [adminSecret, setAdminSecret] = useState('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleCleanupAll = async () => {
    if (!adminSecret) {
      alert('Please enter admin secret');
      return;
    }

    if (!confirm('Are you sure you want to delete ALL games? This cannot be undone!')) {
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const response = await fetch(`${API_URL}/admin/cleanup-games?all=true`, {
        method: 'POST',
        headers: {
          'x-admin-secret': adminSecret,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setResult(`✅ Success! Deleted ${data.deletedCount} out of ${data.totalGames} games.`);
      } else {
        setResult(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      setResult(`❌ Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupOld = async (hours: number) => {
    if (!adminSecret) {
      alert('Please enter admin secret');
      return;
    }

    if (!confirm(`Delete games older than ${hours} hours?`)) {
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const response = await fetch(
        `${API_URL}/admin/cleanup-games?olderThanHours=${hours}`,
        {
          method: 'POST',
          headers: {
            'x-admin-secret': adminSecret,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResult(`✅ Success! Deleted ${data.deletedCount} out of ${data.totalGames} games (${data.criteria}).`);
      } else {
        setResult(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      setResult(`❌ Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        <h1>🔧 Admin Panel</h1>

        <div className="admin-section">
          <label htmlFor="adminSecret">Admin Secret:</label>
          <input
            id="adminSecret"
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="Enter admin secret"
            disabled={loading}
          />
        </div>

        <div className="admin-section">
          <h2>Cleanup Games</h2>

          <div className="button-group">
            <button
              onClick={() => handleCleanupOld(1)}
              disabled={loading || !adminSecret}
              className="cleanup-btn"
            >
              Delete games older than 1 hour
            </button>

            <button
              onClick={() => handleCleanupOld(6)}
              disabled={loading || !adminSecret}
              className="cleanup-btn"
            >
              Delete games older than 6 hours
            </button>

            <button
              onClick={() => handleCleanupOld(24)}
              disabled={loading || !adminSecret}
              className="cleanup-btn"
            >
              Delete games older than 24 hours
            </button>

            <button
              onClick={handleCleanupAll}
              disabled={loading || !adminSecret}
              className="cleanup-btn danger"
            >
              ⚠️ Delete ALL Games
            </button>
          </div>
        </div>

        {loading && <p className="loading">Processing...</p>}
        {result && <p className="result">{result}</p>}

        <div className="admin-help">
          <h3>Help</h3>
          <p>Use the admin secret from your environment variables (ADMIN_SECRET).</p>
          <p>Default for development: <code>change-me-in-production</code></p>
        </div>
      </div>
    </div>
  );
}
