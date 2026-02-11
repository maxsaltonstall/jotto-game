/**
 * Component for listing available games
 * Optimized with React Query caching to reduce Lambda invocations
 */

import { useQuery } from '@tanstack/react-query';
import { api, Game } from '../api/client';

interface GameListProps {
  playerId: string;
  onJoinGame: (gameId: string) => void;
}

export function GameList({ playerId, onJoinGame }: GameListProps) {
  // Use React Query for smart caching and reduced polling
  const { data: games = [], isLoading: loading, error } = useQuery({
    queryKey: ['games', 'WAITING', playerId],
    queryFn: async () => {
      const availableGames = await api.listGames('WAITING');
      // Filter out games created by this player
      return availableGames.filter((g: Game) => g.player1Id !== playerId);
    },
    staleTime: 10000,           // Consider data fresh for 10 seconds
    refetchInterval: 30000,     // Refetch every 30 seconds (reduced from 5s)
    refetchOnWindowFocus: false, // Don't refetch on tab focus
  });

  if (loading) {
    return <div className="game-list">Loading available games...</div>;
  }

  if (error) {
    return <div className="game-list error">Error: {error instanceof Error ? error.message : 'Failed to load games'}</div>;
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
