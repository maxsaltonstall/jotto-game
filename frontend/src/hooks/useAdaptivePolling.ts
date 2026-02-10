/**
 * Adaptive polling hook that adjusts interval based on game state
 * Reduces polling frequency when updates are less urgent
 */

import type { GameStateResponse } from '../api/client';

export interface AdaptivePollingConfig {
  gameState: GameStateResponse | null;
  myTurn: boolean;
  baseInterval?: number;
}

/**
 * Calculate polling interval based on game state
 * - WAITING: 10 seconds (game not started)
 * - ACTIVE + My Turn: 2 seconds (need fast updates)
 * - ACTIVE + Opponent Turn: 5 seconds (less urgent)
 * - COMPLETED: 0 (stop polling)
 */
export function calculatePollingInterval(config: AdaptivePollingConfig): number {
  const { gameState, myTurn } = config;

  if (!gameState) {
    return 5000; // Default 5 seconds if no state yet
  }

  const { game } = gameState;

  // Stop polling if game is completed
  if (game.status === 'COMPLETED') {
    return 0;
  }

  // Waiting for opponent to join: poll slowly
  if (game.status === 'WAITING') {
    return 10000; // 10 seconds
  }

  // Active game: adjust based on whose turn it is
  if (game.status === 'ACTIVE') {
    if (myTurn) {
      return 2000; // 2 seconds - fast updates for my turn
    } else {
      return 5000; // 5 seconds - slower when waiting for opponent
    }
  }

  // Fallback to default
  return 5000;
}
