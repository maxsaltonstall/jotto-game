/**
 * Component for listing available games
 */

import { useState, useEffect } from 'react';
import { api, Game } from '../api/client';

interface GameListProps {
  playerId: string;
  onJoinGame: (gameId: string) => void;
}

export function GameList({ playerId, onJoinGame }: GameListProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const availableGames = await api.listGames('WAITING');
        // Filter out games created by this player
        setGames(availableGames.filter((g) => g.player1Id !== playerId));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load games');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
    const interval = setInterval(fetchGames, 5000);

    return () => clearInterval(interval);
  }, [playerId]);

  if (loading) {
    return <div className="game-list">Loading available games...</div>;
  }

  if (error) {
    return <div className="game-list error">Error: {error}</div>;
  }

  if (games.length === 0) {
    return <div className="game-list">No games available. Create one to get started!</div>;
  }

  return (
    <div className="game-list">
      <h2>Available Games</h2>
      <ul>
        {games.map((game) => (
          <li key={game.gameId}>
            <span>Game by {game.player1Name}</span>
            <span>{new Date(game.createdAt).toLocaleString()}</span>
            <button onClick={() => onJoinGame(game.gameId)}>Join</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
