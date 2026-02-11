/**
 * Optimized game state hook with React Query caching
 * Uses React Query for initial fetch and caching, WebSocket for real-time updates
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../api/client';
import { useWebSocket } from './useWebSocket';
import { FEATURE_FLAGS } from '../config/featureFlags';

export function useOptimizedGameState(
  gameId: string | null,
  playerId: string | null,
  playerName: string = 'Anonymous'
) {
  const queryClient = useQueryClient();

  // Use React Query for initial game state fetch with caching
  const {
    data: cachedGameState,
    isLoading: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['game', gameId, playerId],
    queryFn: async () => {
      if (!gameId) return null;
      return await api.getGameState(gameId, playerId || undefined);
    },
    enabled: !!gameId && !!playerId, // Only fetch when we have both IDs
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // WebSocket handles this
    refetchOnMount: false, // Use cached data on mount if available
  });

  // Use WebSocket for real-time updates (if enabled)
  const wsResult = useWebSocket(gameId, playerId, playerName);

  // Update React Query cache when WebSocket provides new data
  useEffect(() => {
    if (wsResult.gameState && gameId && playerId) {
      queryClient.setQueryData(['game', gameId, playerId], wsResult.gameState);
    }
  }, [wsResult.gameState, gameId, playerId, queryClient]);

  // Return the most appropriate data source
  if (FEATURE_FLAGS.USE_WEBSOCKETS) {
    return {
      gameState: wsResult.gameState || cachedGameState,
      loading: wsResult.loading,
      error: wsResult.error,
      isOnline: wsResult.isOnline,
      connectionStatus: wsResult.connectionStatus,
      refetch: () => {
        wsResult.refetch();
        queryClient.invalidateQueries({ queryKey: ['game', gameId, playerId] });
      },
      setEtag: wsResult.setEtag,
    };
  }

  // Fallback to React Query only (if WebSocket disabled)
  return {
    gameState: cachedGameState,
    loading: queryLoading,
    error: queryError ? (queryError as Error).message : null,
    isOnline: true,
    connectionStatus: 'disconnected' as const,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId, playerId] });
    },
    setEtag: () => {},
  };
}
