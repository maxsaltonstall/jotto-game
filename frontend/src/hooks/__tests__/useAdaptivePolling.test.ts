/**
 * Tests for useAdaptivePolling hook
 */

import { describe, it, expect } from 'vitest';
import { calculatePollingInterval } from '../useAdaptivePolling';
import type { GameStateResponse } from '../../api/client';

describe('calculatePollingInterval', () => {
  it('should return 5000ms when gameState is null', () => {
    const interval = calculatePollingInterval({
      gameState: null,
      myTurn: false
    });

    expect(interval).toBe(5000);
  });

  it('should return 0 when game status is COMPLETED', () => {
    const gameState: GameStateResponse = {
      game: {
        gameId: 'game-1',
        status: 'COMPLETED',
        player1Id: 'p1',
        player1Name: 'Alice',
        winnerId: 'p1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      },
      guesses: [],
      myTurn: false
    };

    const interval = calculatePollingInterval({ gameState, myTurn: false });

    expect(interval).toBe(0);
  });

  it('should return 10000ms when game status is WAITING', () => {
    const gameState: GameStateResponse = {
      game: {
        gameId: 'game-1',
        status: 'WAITING',
        player1Id: 'p1',
        player1Name: 'Alice',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      },
      guesses: [],
      myTurn: false
    };

    const interval = calculatePollingInterval({ gameState, myTurn: false });

    expect(interval).toBe(10000);
  });

  it('should return 2000ms when game is ACTIVE and myTurn is true', () => {
    const gameState: GameStateResponse = {
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

    const interval = calculatePollingInterval({ gameState, myTurn: true });

    expect(interval).toBe(2000);
  });

  it('should return 5000ms when game is ACTIVE and myTurn is false', () => {
    const gameState: GameStateResponse = {
      game: {
        gameId: 'game-1',
        status: 'ACTIVE',
        player1Id: 'p1',
        player1Name: 'Alice',
        player2Id: 'p2',
        player2Name: 'Bob',
        currentTurn: 'p2',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      },
      guesses: [],
      myTurn: false
    };

    const interval = calculatePollingInterval({ gameState, myTurn: false });

    expect(interval).toBe(5000);
  });

  it('should ignore baseInterval parameter (not used)', () => {
    const gameState: GameStateResponse = {
      game: {
        gameId: 'game-1',
        status: 'WAITING',
        player1Id: 'p1',
        player1Name: 'Alice',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      },
      guesses: [],
      myTurn: false
    };

    const interval = calculatePollingInterval({
      gameState,
      myTurn: false,
      baseInterval: 3000
    });

    // Should still use status-based logic, not baseInterval
    expect(interval).toBe(10000);
  });

  it('should handle edge case with unknown status', () => {
    const gameState: GameStateResponse = {
      game: {
        gameId: 'game-1',
        status: 'UNKNOWN' as any, // Invalid status
        player1Id: 'p1',
        player1Name: 'Alice',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      },
      guesses: [],
      myTurn: false
    };

    const interval = calculatePollingInterval({ gameState, myTurn: false });

    // Should fall back to default 5000ms
    expect(interval).toBe(5000);
  });

  it('should prioritize status over myTurn when WAITING', () => {
    const gameState: GameStateResponse = {
      game: {
        gameId: 'game-1',
        status: 'WAITING',
        player1Id: 'p1',
        player1Name: 'Alice',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      },
      guesses: [],
      myTurn: true // Should be ignored for WAITING
    };

    const interval = calculatePollingInterval({ gameState, myTurn: true });

    expect(interval).toBe(10000); // WAITING always 10s
  });

  it('should prioritize status over myTurn when COMPLETED', () => {
    const gameState: GameStateResponse = {
      game: {
        gameId: 'game-1',
        status: 'COMPLETED',
        player1Id: 'p1',
        player1Name: 'Alice',
        player2Id: 'p2',
        player2Name: 'Bob',
        winnerId: 'p1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      },
      guesses: [],
      myTurn: true // Should be ignored for COMPLETED
    };

    const interval = calculatePollingInterval({ gameState, myTurn: true });

    expect(interval).toBe(0); // COMPLETED always 0
  });
});
