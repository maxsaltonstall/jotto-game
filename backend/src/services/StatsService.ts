/**
 * Stats service - handles player statistics calculation and updates
 */

import { GameRepository } from '../repositories/GameRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import type { UserStats } from '../models/user-types.js';

export class StatsService {
  private gameRepository: GameRepository;
  private userRepository: UserRepository;

  constructor(gameRepository?: GameRepository, userRepository?: UserRepository) {
    this.gameRepository = gameRepository || new GameRepository();
    this.userRepository = userRepository || new UserRepository();
  }

  /**
   * Update user stats after a game completion
   */
  async updateGameStats(
    gameId: string,
    winnerId: string,
    winnerUserId: string | undefined,
    guessCount: number
  ): Promise<void> {
    // Only update stats if winner is authenticated
    if (!winnerUserId) {
      return;
    }

    try {
      // Get current user stats
      const user = await this.userRepository.getUserById(winnerUserId);

      // Calculate new stats
      const newTotalGames = user.totalGames + 1;
      const newTotalWins = user.totalWins + 1;
      const newTotalGuesses = user.totalGuesses + guessCount;
      const newAverage = newTotalGuesses / newTotalWins;

      // Update user stats
      await this.userRepository.updateUserStats(winnerUserId, {
        totalGames: newTotalGames,
        totalWins: newTotalWins,
        totalGuesses: newTotalGuesses,
        averageGuessesToWin: Math.round(newAverage * 10) / 10 // Round to 1 decimal
      });
    } catch (error) {
      // Log error but don't fail the game completion
      console.error('Failed to update user stats:', error);
    }
  }

  /**
   * Get user stats
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const user = await this.userRepository.getUserById(userId);

    return {
      totalGames: user.totalGames,
      totalWins: user.totalWins,
      totalGuesses: user.totalGuesses,
      averageGuessesToWin: user.averageGuessesToWin
    };
  }
}
