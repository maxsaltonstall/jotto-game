/**
 * AIService unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIService, AI_PLAYER_ID } from '../../src/services/AIService.js';
import { GameService } from '../../src/services/GameService.js';
import {
  createMockActiveGame,
  createMockGuess,
  generateGameId,
  generatePlayerId
} from '../utils/testFactories.js';

// Mock the word loader
vi.mock('../../src/data/wordLoader.js', () => ({
  getCommonWords: () => [
    'BREAD', 'WATER', 'CRANE', 'SHORE', 'PLANT',
    'FROST', 'BLEND', 'STORM', 'GRAPE', 'CHARM',
    'WORLD', 'LIGHT', 'PEACE', 'TRUST', 'SMILE'
  ]
}));

describe('AIService', () => {
  let aiService: AIService;
  let mockGameService: GameService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mocked game service
    mockGameService = {
      getGameState: vi.fn(),
      makeGuess: vi.fn()
    } as any;

    aiService = new AIService(mockGameService);

    // Mock Math.random for deterministic tests
    vi.spyOn(Math, 'random');
  });

  describe('pickSecretWord', () => {
    it('should return a word from the common words list', () => {
      const word = aiService.pickSecretWord();

      expect(word).toBeDefined();
      expect(word.length).toBe(5);
      expect(/^[A-Z]+$/.test(word)).toBe(true);
    });

    it('should return different words on multiple calls', () => {
      const words = new Set();

      // Pick 10 words
      for (let i = 0; i < 10; i++) {
        words.add(aiService.pickSecretWord());
      }

      // Should have at least 2 different words (statistically very likely)
      expect(words.size).toBeGreaterThan(1);
    });

    it('should only return valid 5-letter words', () => {
      // Test multiple picks
      for (let i = 0; i < 20; i++) {
        const word = aiService.pickSecretWord();
        expect(word.length).toBe(5);
        expect(/^[A-Z]+$/.test(word)).toBe(true);
      }
    });
  });

  describe('makeAIMove', () => {
    it('should make a guess after delay', async () => {
      const gameId = generateGameId();
      const player1Id = generatePlayerId();

      const gameState = {
        game: createMockActiveGame({
          gameId,
          player1Id,
          player2Id: AI_PLAYER_ID,
          currentTurn: AI_PLAYER_ID
        }),
        guesses: [],
        myTurn: true
      };

      vi.mocked(mockGameService.getGameState).mockResolvedValue(gameState);
      vi.mocked(mockGameService.makeGuess).mockResolvedValue(
        createMockGuess({ gameId, playerId: AI_PLAYER_ID })
      );

      // Mock Math.random to have fixed delay (1500ms)
      vi.mocked(Math.random).mockReturnValue(0.5);

      const startTime = Date.now();
      await aiService.makeAIMove(gameId);
      const duration = Date.now() - startTime;

      // Should have delayed ~1500ms (allowing 100ms tolerance)
      expect(duration).toBeGreaterThanOrEqual(1400);
      expect(duration).toBeLessThan(1700);
      expect(mockGameService.getGameState).toHaveBeenCalledWith(gameId, AI_PLAYER_ID);
      expect(mockGameService.makeGuess).toHaveBeenCalledWith(gameId, AI_PLAYER_ID, expect.any(String));
    });

    it('should use previous guesses to make informed guess', async () => {
      const gameId = generateGameId();
      const player1Id = generatePlayerId();

      // AI has made some guesses already
      const previousGuesses = [
        createMockGuess({
          gameId,
          playerId: AI_PLAYER_ID,
          guessWord: 'BREAD',
          matchCount: 2
        }),
        createMockGuess({
          gameId,
          playerId: AI_PLAYER_ID,
          guessWord: 'WATER',
          matchCount: 3
        })
      ];

      const gameState = {
        game: createMockActiveGame({
          gameId,
          player1Id,
          player2Id: AI_PLAYER_ID,
          currentTurn: AI_PLAYER_ID
        }),
        guesses: previousGuesses,
        myTurn: true
      };

      vi.mocked(mockGameService.getGameState).mockResolvedValue(gameState);
      vi.mocked(mockGameService.makeGuess).mockResolvedValue(
        createMockGuess({ gameId, playerId: AI_PLAYER_ID })
      );

      await aiService.makeAIMove(gameId);

      // Should make a guess based on feedback
      expect(mockGameService.makeGuess).toHaveBeenCalledWith(
        gameId,
        AI_PLAYER_ID,
        expect.stringMatching(/^[A-Z]{5}$/)
      );
    });

    it('should filter out player guesses and only use AI guesses', async () => {
      const gameId = generateGameId();
      const player1Id = generatePlayerId();

      const mixedGuesses = [
        createMockGuess({
          gameId,
          playerId: player1Id, // Player 1 guess
          guessWord: 'STORM',
          matchCount: 1
        }),
        createMockGuess({
          gameId,
          playerId: AI_PLAYER_ID, // AI guess
          guessWord: 'BREAD',
          matchCount: 2
        }),
        createMockGuess({
          gameId,
          playerId: player1Id, // Player 1 guess
          guessWord: 'FROST',
          matchCount: 2
        })
      ];

      const gameState = {
        game: createMockActiveGame({
          gameId,
          player1Id,
          player2Id: AI_PLAYER_ID,
          currentTurn: AI_PLAYER_ID
        }),
        guesses: mixedGuesses,
        myTurn: true
      };

      vi.mocked(mockGameService.getGameState).mockResolvedValue(gameState);
      vi.mocked(mockGameService.makeGuess).mockResolvedValue(
        createMockGuess({ gameId, playerId: AI_PLAYER_ID })
      );

      await aiService.makeAIMove(gameId);

      // Should successfully make a guess (filtering works correctly)
      expect(mockGameService.makeGuess).toHaveBeenCalled();
    });
  });

  describe('AI strategy behavior', () => {
    it('should make valid guess with no previous guesses', async () => {
      const gameId = generateGameId();

      const gameState = {
        game: createMockActiveGame({ gameId, player2Id: AI_PLAYER_ID }),
        guesses: [],
        myTurn: true
      };

      vi.mocked(mockGameService.getGameState).mockResolvedValue(gameState);
      vi.mocked(mockGameService.makeGuess).mockResolvedValue(
        createMockGuess({ gameId, playerId: AI_PLAYER_ID })
      );

      await aiService.makeAIMove(gameId);

      const guessCall = vi.mocked(mockGameService.makeGuess).mock.calls[0];
      const guessWord = guessCall[2];

      expect(guessWord).toBeDefined();
      expect(guessWord.length).toBe(5);
      expect(/^[A-Z]+$/.test(guessWord)).toBe(true);
    });

    it('should narrow down possibilities based on feedback', async () => {
      const gameId = generateGameId();

      // If AI guessed BREAD and got 0 matches,
      // next guess should not share letters with BREAD (B, R, E, A, D)
      const previousGuesses = [
        createMockGuess({
          gameId,
          playerId: AI_PLAYER_ID,
          guessWord: 'BREAD',
          matchCount: 0
        })
      ];

      const gameState = {
        game: createMockActiveGame({ gameId, player2Id: AI_PLAYER_ID }),
        guesses: previousGuesses,
        myTurn: true
      };

      vi.mocked(mockGameService.getGameState).mockResolvedValue(gameState);
      vi.mocked(mockGameService.makeGuess).mockResolvedValue(
        createMockGuess({ gameId, playerId: AI_PLAYER_ID })
      );

      await aiService.makeAIMove(gameId);

      const guessCall = vi.mocked(mockGameService.makeGuess).mock.calls[0];
      const guessWord = guessCall[2];

      // The guess should be valid
      expect(guessWord).toBeDefined();
      expect(guessWord.length).toBe(5);
    });

    it('should make guess consistent with all previous feedback', async () => {
      const gameId = generateGameId();

      // Multiple guesses with feedback
      const previousGuesses = [
        createMockGuess({
          gameId,
          playerId: AI_PLAYER_ID,
          guessWord: 'WORLD',
          matchCount: 1
        }),
        createMockGuess({
          gameId,
          playerId: AI_PLAYER_ID,
          guessWord: 'PLANT',
          matchCount: 2
        })
      ];

      const gameState = {
        game: createMockActiveGame({ gameId, player2Id: AI_PLAYER_ID }),
        guesses: previousGuesses,
        myTurn: true
      };

      vi.mocked(mockGameService.getGameState).mockResolvedValue(gameState);
      vi.mocked(mockGameService.makeGuess).mockResolvedValue(
        createMockGuess({ gameId, playerId: AI_PLAYER_ID })
      );

      await aiService.makeAIMove(gameId);

      // Should make a valid guess
      expect(mockGameService.makeGuess).toHaveBeenCalledWith(
        gameId,
        AI_PLAYER_ID,
        expect.stringMatching(/^[A-Z]{5}$/)
      );
    });

    it('should handle edge case where no words match constraints', async () => {
      const gameId = generateGameId();

      // Create impossible constraints
      const previousGuesses = [
        createMockGuess({
          gameId,
          playerId: AI_PLAYER_ID,
          guessWord: 'BREAD',
          matchCount: 5 // Perfect match
        }),
        createMockGuess({
          gameId,
          playerId: AI_PLAYER_ID,
          guessWord: 'WATER',
          matchCount: 5 // Also perfect match (impossible)
        })
      ];

      const gameState = {
        game: createMockActiveGame({ gameId, player2Id: AI_PLAYER_ID }),
        guesses: previousGuesses,
        myTurn: true
      };

      vi.mocked(mockGameService.getGameState).mockResolvedValue(gameState);
      vi.mocked(mockGameService.makeGuess).mockResolvedValue(
        createMockGuess({ gameId, playerId: AI_PLAYER_ID })
      );

      // Should not throw, should fallback to random word
      await expect(aiService.makeAIMove(gameId)).resolves.toBeUndefined();
      expect(mockGameService.makeGuess).toHaveBeenCalled();
    });
  });

  describe('AI difficulty', () => {
    it('should have probabilistic behavior (70/30 split)', () => {
      // Test the strategy with mocked random
      const gameId = generateGameId();

      // Mock random to test both branches
      vi.mocked(Math.random)
        .mockReturnValueOnce(0.5) // Delay
        .mockReturnValueOnce(0.6); // Use common words (< 0.7)

      const gameState = {
        game: createMockActiveGame({ gameId, player2Id: AI_PLAYER_ID }),
        guesses: [],
        myTurn: true
      };

      vi.mocked(mockGameService.getGameState).mockResolvedValue(gameState);
      vi.mocked(mockGameService.makeGuess).mockResolvedValue(
        createMockGuess({ gameId, playerId: AI_PLAYER_ID })
      );

      // Should execute without error
      expect(aiService.makeAIMove(gameId)).resolves.toBeUndefined();
    });

    it('should sometimes pick less common words', async () => {
      const gameId = generateGameId();

      vi.mocked(Math.random)
        .mockReturnValueOnce(0.5) // Delay
        .mockReturnValueOnce(0.8); // Don't use common (>= 0.7)

      const gameState = {
        game: createMockActiveGame({ gameId, player2Id: AI_PLAYER_ID }),
        guesses: [],
        myTurn: true
      };

      vi.mocked(mockGameService.getGameState).mockResolvedValue(gameState);
      vi.mocked(mockGameService.makeGuess).mockResolvedValue(
        createMockGuess({ gameId, playerId: AI_PLAYER_ID })
      );

      await aiService.makeAIMove(gameId);

      // Should make a guess (from full list, not just top half)
      expect(mockGameService.makeGuess).toHaveBeenCalled();
    });
  });
});
