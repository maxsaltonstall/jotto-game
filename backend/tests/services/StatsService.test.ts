/**
 * StatsService unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatsService } from '../../src/services/StatsService.js';
import { GameRepository } from '../../src/repositories/GameRepository.js';
import { UserRepository } from '../../src/repositories/UserRepository.js';
import { createMockUser, generateUserId, generateGameId, generatePlayerId } from '../utils/testFactories.js';

describe('StatsService', () => {
  let statsService: StatsService;
  let mockGameRepository: GameRepository;
  let mockUserRepository: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mocked repositories
    mockGameRepository = {
      getGame: vi.fn(),
      createGame: vi.fn()
    } as any;

    mockUserRepository = {
      getUserById: vi.fn(),
      updateUserStats: vi.fn()
    } as any;

    statsService = new StatsService(mockGameRepository, mockUserRepository);
  });

  describe('updateGameStats', () => {
    it('should update user stats after a win', async () => {
      const userId = generateUserId();
      const gameId = generateGameId();
      const winnerId = generatePlayerId();
      const guessCount = 5;

      const currentUser = createMockUser({
        userId,
        totalGames: 10,
        totalWins: 5,
        totalGuesses: 50,
        averageGuessesToWin: 10
      });

      vi.mocked(mockUserRepository.getUserById).mockResolvedValue(currentUser);
      vi.mocked(mockUserRepository.updateUserStats).mockResolvedValue(undefined);

      await statsService.updateGameStats(gameId, winnerId, userId, guessCount);

      expect(mockUserRepository.getUserById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.updateUserStats).toHaveBeenCalledWith(userId, {
        totalGames: 11,
        totalWins: 6,
        totalGuesses: 55,
        averageGuessesToWin: 9.2 // 55 / 6 = 9.166... rounded to 1 decimal
      });
    });

    it('should calculate correct average for first win', async () => {
      const userId = generateUserId();
      const gameId = generateGameId();
      const winnerId = generatePlayerId();
      const guessCount = 8;

      const newUser = createMockUser({
        userId,
        totalGames: 0,
        totalWins: 0,
        totalGuesses: 0,
        averageGuessesToWin: 0
      });

      vi.mocked(mockUserRepository.getUserById).mockResolvedValue(newUser);
      vi.mocked(mockUserRepository.updateUserStats).mockResolvedValue(undefined);

      await statsService.updateGameStats(gameId, winnerId, userId, guessCount);

      expect(mockUserRepository.updateUserStats).toHaveBeenCalledWith(userId, {
        totalGames: 1,
        totalWins: 1,
        totalGuesses: 8,
        averageGuessesToWin: 8.0 // 8 / 1 = 8.0
      });
    });

    it('should round average to 1 decimal place', async () => {
      const userId = generateUserId();
      const gameId = generateGameId();
      const winnerId = generatePlayerId();
      const guessCount = 7;

      const currentUser = createMockUser({
        userId,
        totalGames: 5,
        totalWins: 2,
        totalGuesses: 20,
        averageGuessesToWin: 10.0
      });

      vi.mocked(mockUserRepository.getUserById).mockResolvedValue(currentUser);
      vi.mocked(mockUserRepository.updateUserStats).mockResolvedValue(undefined);

      await statsService.updateGameStats(gameId, winnerId, userId, guessCount);

      // 27 / 3 = 9.0
      expect(mockUserRepository.updateUserStats).toHaveBeenCalledWith(userId, {
        totalGames: 6,
        totalWins: 3,
        totalGuesses: 27,
        averageGuessesToWin: 9.0
      });
    });

    it('should handle fractional averages correctly', async () => {
      const userId = generateUserId();
      const gameId = generateGameId();
      const winnerId = generatePlayerId();
      const guessCount = 10;

      const currentUser = createMockUser({
        userId,
        totalGames: 2,
        totalWins: 2,
        totalGuesses: 16,
        averageGuessesToWin: 8.0
      });

      vi.mocked(mockUserRepository.getUserById).mockResolvedValue(currentUser);
      vi.mocked(mockUserRepository.updateUserStats).mockResolvedValue(undefined);

      await statsService.updateGameStats(gameId, winnerId, userId, guessCount);

      // 26 / 3 = 8.666... should round to 8.7
      expect(mockUserRepository.updateUserStats).toHaveBeenCalledWith(userId, {
        totalGames: 3,
        totalWins: 3,
        totalGuesses: 26,
        averageGuessesToWin: 8.7
      });
    });

    it('should not update stats if winnerUserId is undefined', async () => {
      const gameId = generateGameId();
      const winnerId = generatePlayerId();
      const guessCount = 5;

      await statsService.updateGameStats(gameId, winnerId, undefined, guessCount);

      expect(mockUserRepository.getUserById).not.toHaveBeenCalled();
      expect(mockUserRepository.updateUserStats).not.toHaveBeenCalled();
    });

    it('should not throw error if user lookup fails', async () => {
      const userId = generateUserId();
      const gameId = generateGameId();
      const winnerId = generatePlayerId();
      const guessCount = 5;

      vi.mocked(mockUserRepository.getUserById).mockRejectedValue(new Error('User not found'));

      // Should not throw
      await expect(
        statsService.updateGameStats(gameId, winnerId, userId, guessCount)
      ).resolves.toBeUndefined();

      expect(mockUserRepository.updateUserStats).not.toHaveBeenCalled();
    });

    it('should not throw error if update fails', async () => {
      const userId = generateUserId();
      const gameId = generateGameId();
      const winnerId = generatePlayerId();
      const guessCount = 5;

      const currentUser = createMockUser({ userId });

      vi.mocked(mockUserRepository.getUserById).mockResolvedValue(currentUser);
      vi.mocked(mockUserRepository.updateUserStats).mockRejectedValue(new Error('Update failed'));

      // Should not throw
      await expect(
        statsService.updateGameStats(gameId, winnerId, userId, guessCount)
      ).resolves.toBeUndefined();
    });

    it('should increment all counters correctly', async () => {
      const userId = generateUserId();
      const gameId = generateGameId();
      const winnerId = generatePlayerId();
      const guessCount = 12;

      const currentUser = createMockUser({
        userId,
        totalGames: 99,
        totalWins: 50,
        totalGuesses: 500,
        averageGuessesToWin: 10.0
      });

      vi.mocked(mockUserRepository.getUserById).mockResolvedValue(currentUser);
      vi.mocked(mockUserRepository.updateUserStats).mockResolvedValue(undefined);

      await statsService.updateGameStats(gameId, winnerId, userId, guessCount);

      expect(mockUserRepository.updateUserStats).toHaveBeenCalledWith(userId, {
        totalGames: 100,
        totalWins: 51,
        totalGuesses: 512,
        averageGuessesToWin: 10.0 // 512 / 51 = 10.03... rounds to 10.0
      });
    });
  });

  describe('getUserStats', () => {
    it('should retrieve user stats', async () => {
      const userId = generateUserId();

      const user = createMockUser({
        userId,
        totalGames: 20,
        totalWins: 10,
        totalGuesses: 100,
        averageGuessesToWin: 10.0
      });

      vi.mocked(mockUserRepository.getUserById).mockResolvedValue(user);

      const stats = await statsService.getUserStats(userId);

      expect(stats).toEqual({
        totalGames: 20,
        totalWins: 10,
        totalGuesses: 100,
        averageGuessesToWin: 10.0
      });
      expect(mockUserRepository.getUserById).toHaveBeenCalledWith(userId);
    });

    it('should return zero stats for new user', async () => {
      const userId = generateUserId();

      const newUser = createMockUser({
        userId,
        totalGames: 0,
        totalWins: 0,
        totalGuesses: 0,
        averageGuessesToWin: 0
      });

      vi.mocked(mockUserRepository.getUserById).mockResolvedValue(newUser);

      const stats = await statsService.getUserStats(userId);

      expect(stats).toEqual({
        totalGames: 0,
        totalWins: 0,
        totalGuesses: 0,
        averageGuessesToWin: 0
      });
    });

    it('should throw error if user not found', async () => {
      const userId = generateUserId();

      vi.mocked(mockUserRepository.getUserById).mockRejectedValue(new Error('User not found'));

      await expect(
        statsService.getUserStats(userId)
      ).rejects.toThrow('User not found');
    });
  });
});
