/**
 * GameService unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameService } from '../../src/services/GameService.js';
import { GameRepository } from '../../src/repositories/GameRepository.js';
import { StatsService } from '../../src/services/StatsService.js';
import { AI_PLAYER_ID } from '../../src/services/AIService.js';
import {
  ValidationError,
  GameStateError,
  InvalidTurnError
} from '../../src/utils/errors.js';
import {
  createMockActiveGame,
  createMockGameWithSecrets,
  createMockGuess,
  generatePlayerId,
  generateGameId,
  resetCounters
} from '../utils/testFactories.js';

describe('GameService', () => {
  let gameService: GameService;
  let mockRepository: GameRepository;
  let mockStatsService: StatsService;

  beforeEach(() => {
    resetCounters();

    // Create mocked repository with spy methods
    mockRepository = {
      createGame: vi.fn(),
      getGame: vi.fn(),
      joinGame: vi.fn(),
      updateGameState: vi.fn(),
      saveGuess: vi.fn(),
      getGuesses: vi.fn(),
      listGamesByStatus: vi.fn()
    } as any;

    // Create mocked stats service
    mockStatsService = {
      updateGameStats: vi.fn()
    } as any;

    gameService = new GameService(mockRepository, mockStatsService);
  });

  describe('createGame', () => {
    it('should create a game with valid inputs', async () => {
      const playerId = generatePlayerId();
      const playerName = 'Test Player';
      const secretWord = 'BREAD';

      vi.mocked(mockRepository.createGame).mockResolvedValue(undefined);

      const game = await gameService.createGame(playerId, playerName, secretWord);

      expect(game).toBeDefined();
      expect(game.gameId).toBeDefined();
      expect(game.status).toBe('WAITING');
      expect(game.player1Id).toBe(playerId);
      expect(game.player1Name).toBe(playerName);
      expect(game.player1Secret).toBeUndefined(); // Secret should be sanitized
      expect(mockRepository.createGame).toHaveBeenCalledTimes(1);
    });

    it('should normalize secret word to uppercase', async () => {
      const playerId = generatePlayerId();
      vi.mocked(mockRepository.createGame).mockResolvedValue(undefined);

      await gameService.createGame(playerId, 'Player', 'bread');

      const call = vi.mocked(mockRepository.createGame).mock.calls[0][0];
      expect(call.player1Secret).toBe('BREAD');
    });

    it('should create AI game when isAiGame is true', async () => {
      const playerId = generatePlayerId();
      vi.mocked(mockRepository.createGame).mockResolvedValue(undefined);

      const game = await gameService.createGame(playerId, 'Player', 'BREAD', undefined, true);

      expect(game.isAiGame).toBe(true);
      const call = vi.mocked(mockRepository.createGame).mock.calls[0][0];
      expect(call.isAiGame).toBe(true);
    });

    it('should throw ValidationError if player ID is missing', async () => {
      await expect(
        gameService.createGame('', 'Player', 'BREAD')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if player name is missing', async () => {
      await expect(
        gameService.createGame(generatePlayerId(), '', 'BREAD')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if secret word is not 5 letters', async () => {
      const playerId = generatePlayerId();

      await expect(
        gameService.createGame(playerId, 'Player', 'ABC')
      ).rejects.toThrow(ValidationError);

      await expect(
        gameService.createGame(playerId, 'Player', 'TOOLONG')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if secret word contains non-letters', async () => {
      const playerId = generatePlayerId();

      await expect(
        gameService.createGame(playerId, 'Player', 'BRE4D')
      ).rejects.toThrow(ValidationError);
    });

    it('should include userId if provided', async () => {
      const playerId = generatePlayerId();
      const userId = 'user-123';
      vi.mocked(mockRepository.createGame).mockResolvedValue(undefined);

      await gameService.createGame(playerId, 'Player', 'BREAD', userId);

      const call = vi.mocked(mockRepository.createGame).mock.calls[0][0];
      expect(call.player1UserId).toBe(userId);
    });
  });

  describe('joinGame', () => {
    it('should allow player 2 to join a waiting game', async () => {
      const gameId = generateGameId();
      const player1Id = generatePlayerId();
      const player2Id = generatePlayerId();

      const waitingGame = createMockGameWithSecrets({
        gameId,
        status: 'WAITING',
        player1Id,
        player1Name: 'Player 1',
        player1Secret: 'BREAD'
      });

      const activeGame = createMockGameWithSecrets({
        ...waitingGame,
        status: 'ACTIVE',
        player2Id,
        player2Name: 'Player 2',
        player2Secret: 'WATER',
        currentTurn: player1Id
      });

      vi.mocked(mockRepository.getGame)
        .mockResolvedValueOnce(waitingGame)
        .mockResolvedValueOnce(activeGame);
      vi.mocked(mockRepository.joinGame).mockResolvedValue(undefined);
      vi.mocked(mockRepository.updateGameState).mockResolvedValue(undefined);

      const game = await gameService.joinGame(gameId, player2Id, 'Player 2', 'WATER');

      expect(game.status).toBe('ACTIVE');
      expect(game.player2Id).toBe(player2Id);
      expect(game.currentTurn).toBe(player1Id); // Player 1 goes first
      expect(mockRepository.joinGame).toHaveBeenCalledTimes(1);
      expect(mockRepository.updateGameState).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationError if trying to join own game', async () => {
      const gameId = generateGameId();
      const playerId = generatePlayerId();

      const game = createMockGameWithSecrets({
        gameId,
        status: 'WAITING',
        player1Id: playerId
      });

      vi.mocked(mockRepository.getGame).mockResolvedValue(game);

      await expect(
        gameService.joinGame(gameId, playerId, 'Player', 'WATER')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw GameStateError if game is not in WAITING status', async () => {
      const gameId = generateGameId();
      const player2Id = generatePlayerId();

      const activeGame = createMockActiveGame({ gameId });

      vi.mocked(mockRepository.getGame).mockResolvedValue(activeGame);

      await expect(
        gameService.joinGame(gameId, player2Id, 'Player 2', 'WATER')
      ).rejects.toThrow(GameStateError);
    });

    it('should throw GameStateError if game already has 2 players', async () => {
      const gameId = generateGameId();
      const newPlayerId = generatePlayerId();

      const game = createMockGameWithSecrets({
        gameId,
        status: 'WAITING',
        player2Id: generatePlayerId(), // Already has player 2
        player2Name: 'Existing Player 2'
      });

      vi.mocked(mockRepository.getGame).mockResolvedValue(game);

      await expect(
        gameService.joinGame(gameId, newPlayerId, 'New Player', 'WATER')
      ).rejects.toThrow(GameStateError);
    });
  });

  describe('makeGuess', () => {
    it('should process a valid guess and switch turns', async () => {
      const gameId = generateGameId();
      const player1Id = generatePlayerId();
      const player2Id = generatePlayerId();

      const game = createMockActiveGame({
        gameId,
        player1Id,
        player2Id,
        player1Secret: 'BREAD',
        player2Secret: 'WATER',
        currentTurn: player1Id
      });

      vi.mocked(mockRepository.getGame).mockResolvedValue(game);
      vi.mocked(mockRepository.saveGuess).mockResolvedValue(undefined);
      vi.mocked(mockRepository.updateGameState).mockResolvedValue(undefined);

      const guess = await gameService.makeGuess(gameId, player1Id, 'SHORE');

      expect(guess.guessWord).toBe('SHORE');
      expect(guess.matchCount).toBeGreaterThanOrEqual(0);
      expect(guess.isWinningGuess).toBe(false);
      expect(mockRepository.saveGuess).toHaveBeenCalledTimes(1);
      expect(mockRepository.updateGameState).toHaveBeenCalledWith(gameId, {
        currentTurn: player2Id
      });
    });

    it('should detect a winning guess with 5 matches', async () => {
      const gameId = generateGameId();
      const player1Id = generatePlayerId();
      const player2Id = generatePlayerId();

      const game = createMockActiveGame({
        gameId,
        player1Id,
        player2Id,
        player1Secret: 'BREAD',
        player2Secret: 'WATER',
        currentTurn: player1Id
      });

      const previousGuesses = [
        createMockGuess({ gameId, playerId: player1Id, guessWord: 'SHORE', matchCount: 2 }),
        createMockGuess({ gameId, playerId: player1Id, guessWord: 'LATER', matchCount: 3 })
      ];

      vi.mocked(mockRepository.getGame).mockResolvedValue(game);
      vi.mocked(mockRepository.saveGuess).mockResolvedValue(undefined);
      vi.mocked(mockRepository.updateGameState).mockResolvedValue(undefined);
      vi.mocked(mockRepository.getGuesses).mockResolvedValue([...previousGuesses]);

      // Guess the opponent's secret word
      const guess = await gameService.makeGuess(gameId, player1Id, 'WATER');

      expect(guess.matchCount).toBe(5);
      expect(guess.isWinningGuess).toBe(true);
      expect(mockRepository.updateGameState).toHaveBeenCalledWith(gameId, {
        winnerId: player1Id,
        status: 'COMPLETED',
        currentTurn: undefined
      });
    });

    it('should update stats when authenticated user wins', async () => {
      const gameId = generateGameId();
      const player1Id = generatePlayerId();
      const player2Id = generatePlayerId();
      const userId = 'user-123';

      const game = createMockActiveGame({
        gameId,
        player1Id,
        player1UserId: userId,
        player2Id,
        player1Secret: 'BREAD',
        player2Secret: 'WATER',
        currentTurn: player1Id
      });

      const previousGuesses = [
        createMockGuess({ gameId, playerId: player1Id, guessWord: 'SHORE', matchCount: 2 })
      ];

      const winningGuess = createMockGuess({
        gameId,
        playerId: player1Id,
        guessWord: 'WATER',
        matchCount: 5,
        isWinningGuess: true
      });

      vi.mocked(mockRepository.getGame).mockResolvedValue(game);
      vi.mocked(mockRepository.saveGuess).mockResolvedValue(undefined);
      vi.mocked(mockRepository.updateGameState).mockResolvedValue(undefined);
      // After the winning guess is saved, getGuesses returns all guesses including the winner
      vi.mocked(mockRepository.getGuesses).mockResolvedValue([...previousGuesses, winningGuess]);
      vi.mocked(mockStatsService.updateGameStats).mockResolvedValue(undefined);

      await gameService.makeGuess(gameId, player1Id, 'WATER');

      expect(mockStatsService.updateGameStats).toHaveBeenCalledWith(
        gameId,
        player1Id,
        userId,
        2 // 2 guesses total (previous + winning)
      );
    });

    it('should trigger AI move when opponent is AI', async () => {
      const gameId = generateGameId();
      const player1Id = generatePlayerId();

      const game = createMockActiveGame({
        gameId,
        player1Id,
        player2Id: AI_PLAYER_ID,
        player2Name: '🤖 AI Bot',
        player1Secret: 'BREAD',
        player2Secret: 'WATER',
        currentTurn: player1Id,
        isAiGame: true
      });

      const mockAIService = {
        makeAIMove: vi.fn().mockResolvedValue(undefined)
      };

      gameService.setAIService(mockAIService);

      vi.mocked(mockRepository.getGame).mockResolvedValue(game);
      vi.mocked(mockRepository.saveGuess).mockResolvedValue(undefined);
      vi.mocked(mockRepository.updateGameState).mockResolvedValue(undefined);

      await gameService.makeGuess(gameId, player1Id, 'SHORE');

      // Give AI move time to be triggered (it's fire-and-forget)
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockAIService.makeAIMove).toHaveBeenCalledWith(gameId);
    });

    it('should throw InvalidTurnError when not players turn', async () => {
      const gameId = generateGameId();
      const player1Id = generatePlayerId();
      const player2Id = generatePlayerId();

      const game = createMockActiveGame({
        gameId,
        player1Id,
        player2Id,
        currentTurn: player1Id // Player 1's turn
      });

      vi.mocked(mockRepository.getGame).mockResolvedValue(game);

      // Player 2 tries to guess on Player 1's turn
      await expect(
        gameService.makeGuess(gameId, player2Id, 'SHORE')
      ).rejects.toThrow(InvalidTurnError);
    });

    it('should throw GameStateError when game is not active', async () => {
      const gameId = generateGameId();
      const playerId = generatePlayerId();

      const game = createMockGameWithSecrets({
        gameId,
        status: 'WAITING',
        player1Id: playerId
      });

      vi.mocked(mockRepository.getGame).mockResolvedValue(game);

      await expect(
        gameService.makeGuess(gameId, playerId, 'SHORE')
      ).rejects.toThrow(GameStateError);
    });

    it('should count letter matches correctly', async () => {
      const gameId = generateGameId();
      const player1Id = generatePlayerId();
      const player2Id = generatePlayerId();

      // Player 1 secret: BREAD, Player 2 secret: WATER
      const game = createMockActiveGame({
        gameId,
        player1Id,
        player2Id,
        player1Secret: 'BREAD',
        player2Secret: 'WATER',
        currentTurn: player1Id
      });

      vi.mocked(mockRepository.getGame).mockResolvedValue(game);
      vi.mocked(mockRepository.saveGuess).mockResolvedValue(undefined);
      vi.mocked(mockRepository.updateGameState).mockResolvedValue(undefined);

      // Player 1 guesses LATER (shares A, T, E, R with WATER)
      const guess = await gameService.makeGuess(gameId, player1Id, 'LATER');

      expect(guess.matchCount).toBe(4); // LATER vs WATER = A, T, E, R match (4 letters)
    });
  });

  describe('getGameState', () => {
    it('should return game state with guesses', async () => {
      const gameId = generateGameId();
      const player1Id = generatePlayerId();
      const player2Id = generatePlayerId();

      const game = createMockActiveGame({
        gameId,
        player1Id,
        player2Id,
        currentTurn: player1Id
      });

      const guesses = [
        createMockGuess({ gameId, playerId: player1Id }),
        createMockGuess({ gameId, playerId: player2Id })
      ];

      vi.mocked(mockRepository.getGame).mockResolvedValue(game);
      vi.mocked(mockRepository.getGuesses).mockResolvedValue(guesses);

      const state = await gameService.getGameState(gameId, player1Id);

      expect(state.game).toBeDefined();
      expect(state.guesses).toHaveLength(2);
      expect(state.myTurn).toBe(true); // Player 1's turn
    });

    it('should sanitize secrets from game state', async () => {
      const gameId = generateGameId();
      const game = createMockActiveGame({ gameId });

      vi.mocked(mockRepository.getGame).mockResolvedValue(game);
      vi.mocked(mockRepository.getGuesses).mockResolvedValue([]);

      const state = await gameService.getGameState(gameId);

      expect(state.game.player1Secret).toBeUndefined();
      expect(state.game.player2Secret).toBeUndefined();
    });

    it('should set myTurn to false when not players turn', async () => {
      const gameId = generateGameId();
      const player1Id = generatePlayerId();
      const player2Id = generatePlayerId();

      const game = createMockActiveGame({
        gameId,
        player1Id,
        player2Id,
        currentTurn: player1Id
      });

      vi.mocked(mockRepository.getGame).mockResolvedValue(game);
      vi.mocked(mockRepository.getGuesses).mockResolvedValue([]);

      const state = await gameService.getGameState(gameId, player2Id);

      expect(state.myTurn).toBe(false); // Player 2 checking, but it's Player 1's turn
    });
  });

  describe('listAvailableGames', () => {
    it('should return list of waiting games', async () => {
      const games = [
        createMockGameWithSecrets({ status: 'WAITING' }),
        createMockGameWithSecrets({ status: 'WAITING' })
      ];

      vi.mocked(mockRepository.listGamesByStatus).mockResolvedValue(games);

      const result = await gameService.listAvailableGames();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('WAITING');
      expect(mockRepository.listGamesByStatus).toHaveBeenCalledWith('WAITING', 20);
    });

    it('should sanitize secrets from listed games', async () => {
      const games = [
        createMockGameWithSecrets({ status: 'WAITING', player1Secret: 'BREAD' })
      ];

      vi.mocked(mockRepository.listGamesByStatus).mockResolvedValue(games);

      const result = await gameService.listAvailableGames();

      expect(result[0].player1Secret).toBeUndefined();
    });
  });

  describe('listActiveGames', () => {
    it('should return list of active games', async () => {
      const games = [
        createMockActiveGame(),
        createMockActiveGame()
      ];

      vi.mocked(mockRepository.listGamesByStatus).mockResolvedValue(games);

      const result = await gameService.listActiveGames();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('ACTIVE');
      expect(mockRepository.listGamesByStatus).toHaveBeenCalledWith('ACTIVE', 20);
    });
  });
});
