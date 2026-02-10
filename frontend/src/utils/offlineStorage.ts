import type { GameStateResponse } from '../api/client';

const CACHE_KEY_PREFIX = 'jotto-offline-game-';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedGameState {
  data: GameStateResponse;
  timestamp: number;
}

/**
 * Cache game state in localStorage for offline access
 */
export function cacheGameState(gameId: string, gameState: GameStateResponse): void {
  try {
    const cached: CachedGameState = {
      data: gameState,
      timestamp: Date.now()
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${gameId}`, JSON.stringify(cached));
  } catch (error) {
    console.warn('Failed to cache game state:', error);
  }
}

/**
 * Retrieve cached game state from localStorage
 * Returns null if not found or expired
 */
export function getCachedGameState(gameId: string): GameStateResponse | null {
  try {
    const item = localStorage.getItem(`${CACHE_KEY_PREFIX}${gameId}`);
    if (!item) {
      return null;
    }

    const cached: CachedGameState = JSON.parse(item);

    // Check if cache is expired
    if (Date.now() - cached.timestamp > CACHE_EXPIRY_MS) {
      clearCachedGameState(gameId);
      return null;
    }

    return cached.data;
  } catch (error) {
    console.warn('Failed to retrieve cached game state:', error);
    return null;
  }
}

/**
 * Clear cached game state for a specific game
 */
export function clearCachedGameState(gameId: string): void {
  try {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${gameId}`);
  } catch (error) {
    console.warn('Failed to clear cached game state:', error);
  }
}

/**
 * Clear all expired cached game states
 */
export function clearExpiredCaches(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const cached: CachedGameState = JSON.parse(item);
            if (now - cached.timestamp > CACHE_EXPIRY_MS) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // Skip invalid entries
        }
      }
    });
  } catch (error) {
    console.warn('Failed to clear expired caches:', error);
  }
}

/**
 * Check if we're currently offline
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}
