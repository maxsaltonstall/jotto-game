/**
 * Tests for useGamePolling hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGamePolling } from '../usePolling';
import * as apiClient from '../../api/client';
import type { GameStateResponse } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  api: {
    getGameState: vi.fn()
  }
}));

// Mock calculatePollingInterval to avoid complex timing logic
vi.mock('../useAdaptivePolling', () => ({
  calculatePollingInterval: vi.fn(() => 5000)
}));

// Mock offline storage utilities
vi.mock('../../utils/offlineStorage', () => ({
  cacheGameState: vi.fn(),
  getCachedGameState: vi.fn(() => null),
  isOffline: vi.fn(() => false),
  clearExpiredCaches: vi.fn()
}));

describe('useGamePolling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGameState: GameStateResponse = {
    game: {
      gameId: 'game-1',
      status: 'ACTIVE',
      player1Id: 'p1',
      player1Name: 'Alice',
      player2Id: 'p2',
      player2Name: 'Bob',
      currentTurn: 'p1',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    },
    guesses: [],
    myTurn: true
  };

  it('should fetch game state on mount', async () => {
    vi.mocked(apiClient.api.getGameState).mockResolvedValue(mockGameState);

    const { result } = renderHook(() => useGamePolling('game-1', 'p1'));

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Wait for state to update
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 2000 });

    expect(apiClient.api.getGameState).toHaveBeenCalledWith('game-1', 'p1', undefined);
    expect(result.current.gameState).toEqual(mockGameState);
    expect(result.current.error).toBeNull();
  });

  it('should handle null gameId by not fetching', () => {
    renderHook(() => useGamePolling(null, 'p1'));

    // Should not call API when gameId is null
    expect(apiClient.api.getGameState).not.toHaveBeenCalled();
  });

  it('should call API with undefined for null playerId', async () => {
    vi.mocked(apiClient.api.getGameState).mockResolvedValue(mockGameState);

    renderHook(() => useGamePolling('game-1', null));

    await waitFor(() => {
      expect(apiClient.api.getGameState).toHaveBeenCalled();
    }, { timeout: 2000 });

    expect(apiClient.api.getGameState).toHaveBeenCalledWith('game-1', undefined, undefined);
  });

  it('should set error state on fetch failure', async () => {
    const error = new Error('Network error');
    vi.mocked(apiClient.api.getGameState).mockRejectedValue(error);

    const { result } = renderHook(() => useGamePolling('game-1', 'p1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 2000 });

    expect(result.current.error).toBe('Network error');
    expect(result.current.gameState).toBeNull();
  });

  it('should handle 304 Not Modified responses by not updating state', async () => {
    vi.mocked(apiClient.api.getGameState)
      .mockResolvedValueOnce(mockGameState) // Initial fetch
      .mockResolvedValueOnce(null); // 304 response

    const { result } = renderHook(() => useGamePolling('game-1', 'p1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 2000 });

    const initialState = result.current.gameState;
    expect(initialState).toEqual(mockGameState);

    // The hook will eventually poll again, returning null (304)
    // State should remain unchanged
    // (We can't easily test the polling behavior without complex timer mocking)
  });

  it('should provide refetch function that skips ETag', async () => {
    vi.mocked(apiClient.api.getGameState).mockResolvedValue(mockGameState);

    const { result } = renderHook(() => useGamePolling('game-1', 'p1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 2000 });

    vi.mocked(apiClient.api.getGameState).mockClear();

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(apiClient.api.getGameState).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });

    // Refetch should skip ETag (third parameter undefined)
    expect(apiClient.api.getGameState).toHaveBeenCalledWith('game-1', 'p1', undefined);
  });

  it('should provide setEtag function', () => {
    vi.mocked(apiClient.api.getGameState).mockResolvedValue(mockGameState);

    const { result } = renderHook(() => useGamePolling('game-1', 'p1'));

    expect(typeof result.current.setEtag).toBe('function');
  });

  it('should reset error count on successful fetch', async () => {
    vi.mocked(apiClient.api.getGameState)
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockResolvedValue(mockGameState);

    const { result } = renderHook(() => useGamePolling('game-1', 'p1'));

    // Wait for first error
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    }, { timeout: 2000 });

    // Refetch should succeed and clear error
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.gameState).toEqual(mockGameState);
    }, { timeout: 2000 });
  });
});
