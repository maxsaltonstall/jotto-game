/**
 * Component for creating a new game
 */

import { useState } from 'react';
import { api } from '../api/client';

interface CreateGameProps {
  playerId: string;
  playerName: string;
  userId?: string;
  onGameCreated: (gameId: string) => void;
}

export function CreateGame({ playerId, playerName, userId, onGameCreated }: CreateGameProps) {
  const [secretWord, setSecretWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (secretWord.length !== 5) {
      setError('Secret word must be exactly 5 letters');
      return;
    }

    if (!/^[a-zA-Z]+$/.test(secretWord)) {
      setError('Secret word must contain only letters');
      return;
    }

    setLoading(true);

    try {
      const game = await api.createGame(playerId, playerName, secretWord, userId);
      onGameCreated(game.gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-game">
      <h2>Create New Game</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="secretWord">Your Secret Word (5 letters):</label>
          <input
            id="secretWord"
            type="text"
            value={secretWord}
            onChange={(e) => setSecretWord(e.target.value.toUpperCase())}
            maxLength={5}
            placeholder="CHARM"
            disabled={loading}
            autoComplete="off"
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading || secretWord.length !== 5}>
          {loading ? 'Creating...' : 'Create Game'}
        </button>
      </form>
    </div>
  );
}
