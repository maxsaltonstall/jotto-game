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
    // Clear any transient errors when we successfully receive a message
    setError(null);

    if (message.type === 'CONNECTED') {
      // Connection confirmed by server
      console.log('WebSocket connection confirmed by server:', message);
      setConnectionStatus('connected');
    } else if (message.type === 'GAME_UPDATE') {
      const gameUpdate = message as GameUpdateMessage;
      const payload = gameUpdate.payload;

      // Ensure myTurn is always a boolean
      const stateWithMyTurn: GameStateResponse = {
        game: payload.game,
        guesses: payload.guesses,
        myTurn: payload.myTurn ?? false
      };

      setGameState(stateWithMyTurn);

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
      // Fetch initial game state after WebSocket is connected
      fetchGameState();
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
      setError('WebSocket connection failed');
    });

    wsClient.on('message', handleWebSocketMessage);

    wsClient.on('error', (data) => {
      // Only log transient errors, don't show them to user
      // They'll be shown if connection actually fails (via 'failed' event)
      console.warn('WebSocket transient error (ignoring):', data);
    });

    // Connect to WebSocket
    wsClient.connect(wsUrl, gameId, playerId, playerName);

    // Cleanup on unmount
    return () => {
      wsClient.disconnect();
      wsClientRef.current = null;
    };
  }, [gameId, playerId, playerName, fetchGameState, handleWebSocketMessage]);

  // Note: Removed visibility change REST fallback - WebSocket only

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
