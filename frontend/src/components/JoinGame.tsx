/**
 * Component for joining a game by ID
 */

import { useState } from 'react';

interface JoinGameProps {
  onJoinGame: (gameId: string) => void;
}

export function JoinGame({ onJoinGame }: JoinGameProps) {
  const [gameId, setGameId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameId.trim()) {
      onJoinGame(gameId.trim());
    }
  };

  return (
    <div className="join-game">
      <h2>Join Game by ID</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="gameId">Enter Game ID:</label>
          <input
            id="gameId"
            type="text"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            placeholder="430e15fc-72c1-43d6..."
            autoComplete="off"
          />
        </div>
        <button type="submit" disabled={!gameId.trim()}>
          Join Game
        </button>
      </form>
    </div>
  );
}
