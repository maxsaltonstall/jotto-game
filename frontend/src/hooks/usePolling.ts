/**
 * Hook for polling game state with adaptive intervals and ETag support
 * Includes offline caching support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, GameStateResponse } from '../api/client';
import { calculatePollingInterval } from './useAdaptivePolling';
import { cacheGameState, getCachedGameState, isOffline as checkIsOffline, clearExpiredCaches } from '../utils/offlineStorage';

export function useGamePolling(gameId: string | null, playerId: string | null, baseInterval: number = 5000) {
  const [gameState, setGameState] = useState<GameStateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(!checkIsOffline());

  const errorCountRef = useRef(0);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef<boolean>(!document.hidden);

  const fetchGameState = useCallback(async (skipEtag = false) => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    // If offline, try to load from cache
    if (checkIsOffline()) {
      const cached = getCachedGameState(gameId);
      if (cached) {
        setGameState(cached);
        setError('Showing cached data (offline)');
      } else {
        setError('No cached data available (offline)');
      }
      setLoading(false);
      return;
    }

    try {
      // Send ETag for caching (unless explicitly skipped)
      const state = await api.getGameState(gameId, playerId || undefined, skipEtag ? undefined : etag || undefined);

      if (state) {
        // Only update if we got new data (not 304)
        setGameState(state);
        setError(null);
        errorCountRef.current = 0; // Reset error count on success

        // Cache the game state for offline access
        cacheGameState(gameId, state);
      }
    } catch (err) {
      // Increment error count for exponential backoff
      errorCountRef.current++;
      setError(err instanceof Error ? err.message : 'Failed to fetch game state');

      // If we have cached data, use it as fallback
      const cached = getCachedGameState(gameId);
      if (cached && !gameState) {
        setGameState(cached);
        setError((err instanceof Error ? err.message : 'Failed to fetch game state') + ' (showing cached data)');
      }
    } finally {
      setLoading(false);
    }
  }, [gameId, playerId, etag, gameState]);

  useEffect(() => {
    if (!gameId) return;

    // Initial fetch
    fetchGameState(true); // Skip ETag on first fetch

    // Calculate adaptive interval
    const myTurn = gameState?.myTurn || false;
    let pollingInterval = calculatePollingInterval({ gameState, myTurn, baseInterval });

    // Apply exponential backoff on errors (2s, 4s, 8s, max 30s)
    if (errorCountRef.current > 0) {
      const backoffMultiplier = Math.min(Math.pow(2, errorCountRef.current), 15);
      pollingInterval = Math.min(pollingInterval * backoffMultiplier, 30000);
    }

    // Stop polling if game is completed
    if (gameState?.game.status === 'COMPLETED') {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      return;
    }

    // Set up interval with adaptive timing (only if page is visible)
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    if (isVisibleRef.current) {
      intervalIdRef.current = setInterval(() => {
        fetchGameState();
      }, pollingInterval);
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [gameId, gameState, fetchGameState, baseInterval]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      isVisibleRef.current = isVisible;

      if (isVisible) {
        // Page became visible - immediately fetch and restart polling
        fetchGameState(true); // Force fresh data on resume
      } else {
        // Page became hidden - stop polling
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchGameState]);

  // Handle online/offline changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // When coming back online, immediately fetch fresh data
      if (gameId) {
        fetchGameState(true);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      // When going offline, stop polling
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [gameId, fetchGameState]);

  // Clear expired caches on mount
  useEffect(() => {
    clearExpiredCaches();
  }, []);

  return {
    gameState,
    loading,
    error,
    isOnline,
    refetch: () => fetchGameState(true),
    setEtag
  };
}
