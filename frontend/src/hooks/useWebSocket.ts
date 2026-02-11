/**
 * Hook for WebSocket-based game state updates with fallback to REST API
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, GameStateResponse } from '../api/client';
import { WebSocketClient } from '../api/websocket';
import type { WebSocketMessage, GameUpdateMessage, ConnectionStatus } from '../types/websocket';
import { cacheGameState, getCachedGameState } from '../utils/offlineStorage';

export function useWebSocket(
  gameId: string | null,
  playerId: string | null,
  playerName: string = 'Anonymous'
) {
  const [gameState, setGameState] = useState<GameStateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isOnline] = useState<boolean>(true); // For compatibility with useGamePolling interface

  const wsClientRef = useRef<WebSocketClient | null>(null);
  const failedConnectionAttemptsRef = useRef<number>(0);
  const maxConnectionAttempts = 3;

  // Fetch game state via REST API (used for initial load and fallback)
  const fetchGameState = useCallback(async () => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    try {
      const state = await api.getGameState(gameId, playerId || undefined);
      setGameState(state);
      setError(null);

      // Cache the game state for offline access
      if (state) {
        cacheGameState(gameId, state);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch game state');

      // Try to load from cache as fallback
      const cached = getCachedGameState(gameId);
      if (cached && !gameState) {
        setGameState(cached);
        setError((err instanceof Error ? err.message : 'Failed to fetch game state') + ' (showing cached data)');
      }
    } finally {
      setLoading(false);
    }
  }, [gameId, playerId, gameState]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'GAME_UPDATE') {
      const gameUpdate = message as GameUpdateMessage;
      const payload = gameUpdate.payload;

      // Ensure myTurn is always a boolean
      const stateWithMyTurn: GameStateResponse = {
        game: payload.game,
        guesses: payload.guesses,
        myTurn: payload.myTurn ?? false
      };

      setGameState(stateWithMyTurn);
      setError(null);

      // Cache the updated game state
      if (gameId) {
        cacheGameState(gameId, stateWithMyTurn);
      }
    } else if (message.type === 'PLAYER_JOINED' || message.type === 'GAME_COMPLETED') {
      // For these events, refetch the full game state
      fetchGameState();
    }
  }, [gameId, fetchGameState]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!gameId || !playerId) return;

    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
    if (!wsUrl) {
      console.warn('WebSocket URL not configured, skipping WebSocket connection');
      // Fallback to REST API fetch
      fetchGameState();
      return;
    }

    // Create WebSocket client
    const wsClient = new WebSocketClient();
    wsClientRef.current = wsClient;

    // Register event handlers
    wsClient.on('connected', () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      failedConnectionAttemptsRef.current = 0;
    });

    wsClient.on('disconnected', () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
    });

    wsClient.on('reconnecting', () => {
      console.log('WebSocket reconnecting');
      setConnectionStatus('reconnecting');
    });

    wsClient.on('failed', () => {
      console.error('WebSocket connection failed after max attempts');
      setConnectionStatus('failed');
      failedConnectionAttemptsRef.current++;

      // If WebSocket fails, fallback to REST API
      if (failedConnectionAttemptsRef.current >= maxConnectionAttempts) {
        setError('WebSocket connection failed, using REST API');
        fetchGameState();
      }
    });

    wsClient.on('message', handleWebSocketMessage);

    wsClient.on('error', (data) => {
      console.error('WebSocket error:', data);
      setError('WebSocket error: ' + (data.error || 'Unknown error'));
    });

    // Connect to WebSocket
    wsClient.connect(wsUrl, gameId, playerId, playerName);

    // Initial REST API fetch while WebSocket connects
    fetchGameState();

    // Cleanup on unmount
    return () => {
      wsClient.disconnect();
      wsClientRef.current = null;
    };
  }, [gameId, playerId, playerName, fetchGameState, handleWebSocketMessage]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && connectionStatus !== 'connected') {
        // Page became visible - refetch only if WebSocket is NOT connected
        // This avoids redundant polling when WebSocket is working
        fetchGameState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchGameState, connectionStatus]);

  return {
    gameState,
    loading,
    error,
    isOnline,
    connectionStatus,
    refetch: fetchGameState,
    setEtag: () => {} // No-op for compatibility with useGamePolling interface
  };
}
