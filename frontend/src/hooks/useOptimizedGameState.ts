/**
 * Optimized game state hook with React Query caching
 * Uses React Query for initial fetch and caching, WebSocket for real-time updates
 */

import { useWebSocket } from './useWebSocket';

export function useOptimizedGameState(
  gameId: string | null,
  playerId: string | null,
  playerName: string = 'Anonymous'
) {
  // WebSocket-only - no React Query caching interference
  const wsResult = useWebSocket(gameId, playerId, playerName);

  return {
    gameState: wsResult.gameState,
    loading: wsResult.loading,
    error: wsResult.error,
    isOnline: wsResult.isOnline,
    connectionStatus: wsResult.connectionStatus,
    refetch: wsResult.refetch,
    setEtag: wsResult.setEtag,
  };
}
