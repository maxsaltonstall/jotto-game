/**
 * Game service - business logic for Jotto game
 */

import { GameRepository } from '../repositories/GameRepository.js';
import { StatsService } from './StatsService.js';
import { WebSocketService } from './WebSocketService.js';
import type { Game, GameWithSecrets, Guess, GameStateResponse } from '../models/types.js';
import {
  ValidationError,
  GameStateError,
  InvalidTurnError,
  NotFoundError
} from '../utils/errors.js';
import {
  isValidWord,
  normalizeWord,
  countCommonLetters
} from '../utils/letterMatcher.js';
import { generateGameCode } from '../utils/gameCodeGenerator.js';
import { AI_PLAYER_ID } from './AIService.js';
import { logger } from '../utils/logger.js';

export class GameService {
  private repository: GameRepository;
  private statsService: StatsService;
  private aiService: any; // Lazy-loaded to avoid circular dependency
  private webSocketService?: WebSocketService;

  constructor(repository?: GameRepository, statsService?: StatsService, webSocketService?: WebSocketService) {
    this.repository = repository || new GameRepository();
    this.statsService = statsService || new StatsService();
    this.webSocketService = webSocketService;
  }

  /**
   * Set AI service (called after construction to avoid circular dependency)
   */
  setAIService(aiService: any): void {
    this.aiService = aiService;
  }

  /**
   * Create a new game
   */
  async createGame(playerId: string, playerName: string, secretWord: string, userId?: string, isAiGame?: boolean): Promise<Game> {
    // Validate inputs
    if (!playerId) {
      throw new ValidationError('Player ID is required');
    }

    if (!playerName) {
      throw new ValidationError('Player name is required');
    }

    if (!isValidWord(secretWord)) {
      throw new ValidationError('Secret word must be exactly 5 letters');
    }

    const normalized = normalizeWord(secretWord);
    const gameId = generateGameCode();
    const timestamp = new Date().toISOString();

    const game: GameWithSecrets = {
      gameId,
      status: 'WAITING',
      player1Id: playerId,
      player1Name: playerName,
      player1UserId: userId,
      player1Secret: normalized,
      isAiGame: isAiGame || false,
      currentTurn: undefined,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await this.repository.createGame(game);

    return this.sanitizeGame(game);
  }

  /**
   * Join an existing game
   */
  async joinGame(gameId: string, playerId: string, playerName: string, secretWord: string, userId?: string): Promise<Game> {
    // Validate inputs
    if (!playerId) {
      throw new ValidationError('Player ID is required');
    }

    if (!playerName) {
      throw new ValidationError('Player name is required');
    }

    if (!isValidWord(secretWord)) {
      throw new ValidationError('Secret word must be exactly 5 letters');
    }

    const game = await this.repository.getGame(gameId);

    // Validate game state
    if (game.status !== 'WAITING') {
      throw new GameStateError('Game is not accepting new players');
    }

    if (game.player1Id === playerId) {
      throw new ValidationError('Cannot join your own game');
    }

    if (game.player2Id) {
      throw new GameStateError('Game already has 2 players');
    }

    const normalized = normalizeWord(secretWord);
    const timestamp = new Date().toISOString();

    // Player 2 joins, game becomes active, player 1 goes first
    await this.repository.joinGame(gameId, playerId, playerName, userId, normalized, timestamp);
    await this.repository.updateGameState(gameId, {
      currentTurn: game.player1Id,
      status: 'ACTIVE'
    });

    // Return updated game state
    const updatedGame = await this.repository.getGame(gameId);
    const sanitizedGame = this.sanitizeGame(updatedGame);

    // Broadcast player joined event via WebSocket
    if (this.webSocketService) {
      // Fire and forget - don't wait for WebSocket broadcast
      this.webSocketService.broadcastPlayerJoined(gameId, sanitizedGame, playerName).catch((err) => {
        logger.error('Failed to broadcast player joined', {
          gameId,
          error: err.message
        });
      });
    }

    return sanitizedGame;
  }

  /**
   * Make a guess
   */
  async makeGuess(gameId: string, playerId: string, guessWord: string): Promise<Guess> {
    // Validate inputs
    if (!playerId) {
      throw new ValidationError('Player ID is required');
    }

    if (!isValidWord(guessWord)) {
      throw new ValidationError('Guess must be exactly 5 letters');
    }

    const game = await this.repository.getGame(gameId);

    // Validate game state
    if (game.status !== 'ACTIVE') {
      throw new GameStateError('Game is not active');
    }

    if (game.currentTurn !== playerId) {
      throw new InvalidTurnError('Not your turn');
    }

    // Determine which player is guessing and which secret to check
    const isPlayer1 = playerId === game.player1Id;

    // Check if this player has already completed
    const playerAlreadyCompleted = isPlayer1 ? game.player1Completed : game.player2Completed;
    if (playerAlreadyCompleted) {
      throw new GameStateError('You have already guessed the secret word');
    }

    const opponentId = isPlayer1 ? game.player2Id : game.player1Id;
    const opponentSecret = isPlayer1 ? game.player2Secret : game.player1Secret;

    if (!opponentSecret) {
      throw new GameStateError('Opponent has not set a secret word');
    }

    // Count matches
    const normalized = normalizeWord(guessWord);
    const matchCount = countCommonLetters(normalized, opponentSecret);
    const isWinningGuess = matchCount === 5;

    // Save the guess
    const guess: Guess = {
      gameId,
      playerId,
      guessWord: normalized,
      matchCount,
      timestamp: new Date().toISOString(),
      isWinningGuess
    };

    await this.repository.saveGuess(guess);

    // Update game state
    if (isWinningGuess) {
      // Player correctly guessed the secret word
      logger.info('Player completed their guess', {
        gameId,
        playerId,
        matchCount
      });

      // Determine which player completed and check if both are done
      const player1Completed = isPlayer1 ? true : (game.player1Completed || false);
      const player2Completed = isPlayer1 ? (game.player2Completed || false) : true;
      const bothPlayersCompleted = player1Completed && player2Completed;

      // Set winnerId to first player who completed (if not already set)
      const winnerId = game.winnerId || playerId;
      const newStatus = bothPlayersCompleted ? 'COMPLETED' : 'ACTIVE';

      await this.repository.updateGameState(gameId, {
        winnerId,
        player1Completed,
        player2Completed,
        status: newStatus,
        currentTurn: bothPlayersCompleted ? undefined : game.currentTurn
      });

      logger.info('Game state updated', {
        gameId,
        winnerId,
        player1Completed,
        player2Completed,
        status: newStatus,
        bothPlayersCompleted
      });

      // Count winner's guesses (including this one)
      const allGuesses = await this.repository.getGuesses(gameId);
      const winnerGuesses = allGuesses.filter(g => g.playerId === playerId);
      const guessCount = winnerGuesses.length;

      logger.info('Updating player stats', {
        gameId,
        playerId,
        guessCount
      });

      // Update stats if player is authenticated
      const playerUserId = isPlayer1 ? game.player1UserId : game.player2UserId;
      if (playerUserId) {
        await this.statsService.updateGameStats(gameId, playerId, playerUserId, guessCount);
      }

      // Broadcast game update via WebSocket
      if (this.webSocketService) {
        const updatedGame = await this.repository.getGame(gameId);
        const allGuesses = await this.repository.getGuesses(gameId);
        this.webSocketService.broadcastGameUpdate(
          gameId,
          this.sanitizeGame(updatedGame),
          allGuesses
        ).catch((err) => {
          logger.error('Failed to broadcast game update', {
            gameId,
            error: err.message
          });
        });
      }
    } else {
      // Switch turns
      await this.repository.updateGameState(gameId, {
        currentTurn: opponentId
      });

      // Trigger AI move if opponent is AI
      if (game.isAiGame && opponentId === AI_PLAYER_ID && this.aiService) {
        logger.info('Triggering AI move', {
          gameId,
          opponentId
        });

        // Fire and forget - don't await to keep response fast
        this.aiService.makeAIMove(gameId).catch((err: Error) => {
          logger.error('AI move failed', {
            gameId,
            error: err.message
          });
          // Silently fail - human can continue playing
        });
      }

      // Broadcast game update via WebSocket (turn switched)
      if (this.webSocketService) {
        const updatedGame = await this.repository.getGame(gameId);
        const allGuesses = await this.repository.getGuesses(gameId);
        this.webSocketService.broadcastGameUpdate(
          gameId,
          this.sanitizeGame(updatedGame),
          allGuesses
        ).catch((err) => {
          logger.error('Failed to broadcast game update', {
            gameId,
            error: err.message
          });
        });
      }
    }

    return guess;
  }

  /**
   * Get game state for a player (no secrets exposed)
   */
  async getGameState(gameId: string, playerId?: string): Promise<GameStateResponse> {
    const game = await this.repository.getGame(gameId);
    const guesses = await this.repository.getGuesses(gameId);

    return {
      game: this.sanitizeGame(game),
      guesses,
      myTurn: playerId ? game.currentTurn === playerId : false
    };
  }

  /**
   * List available games (waiting for player 2)
   */
  async listAvailableGames(): Promise<Game[]> {
    const games = await this.repository.listGamesByStatus('WAITING', 20);
    return games.map((g) => this.sanitizeGame(g));
  }

  /**
   * List active games
   */
  async listActiveGames(): Promise<Game[]> {
    const games = await this.repository.listGamesByStatus('ACTIVE', 20);
    return games.map((g) => this.sanitizeGame(g));
  }

  /**
   * Remove secret words from game object
   */
  private sanitizeGame(game: GameWithSecrets): Game {
    const { player1Secret, player2Secret, ...sanitized } = game;
    return sanitized;
  }
}
