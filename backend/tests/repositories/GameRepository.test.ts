/**
 * GameRepository integration tests with mocked DynamoDB
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameRepository } from '../../src/repositories/GameRepository.js';
import { NotFoundError } from '../../src/utils/errors.js';
import {
  createMockGameWithSecrets,
  createMockActiveGame,
  createMockGuess,
  createMockGameItem,
  createMockGuessItem,
  generateGameId,
  generatePlayerId
} from '../utils/testFactories.js';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
vi.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = vi.fn();

  return {
    DynamoDBDocumentClient: {
      from: vi.fn(() => ({
        send: mockSend
      }))
    },
    PutCommand: vi.fn((input) => ({ input, type: 'PutCommand' })),
    GetCommand: vi.fn((input) => ({ input, type: 'GetCommand' })),
    QueryCommand: vi.fn((input) => ({ input, type: 'QueryCommand' })),
    UpdateCommand: vi.fn((input) => ({ input, type: 'UpdateCommand' }))
  };
});

describe('GameRepository', () => {
  let repository: GameRepository;
  let mockSend: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get reference to the mocked send function
    const docClient = DynamoDBDocumentClient.from({} as any);
    mockSend = docClient.send;

    repository = new GameRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createGame', () => {
    it('should create game and player index', async () => {
      const game = createMockGameWithSecrets({
        gameId: 'game-123',
        status: 'WAITING',
        player1Id: 'player-1',
        player1Name: 'Alice',
        player1Secret: 'BREAD'
      });

      mockSend.mockResolvedValue({});

      await repository.createGame(game);

      expect(mockSend).toHaveBeenCalledTimes(2);

      // Verify game item was created
      const gameCall = mockSend.mock.calls[0][0];
      expect(gameCall.type).toBe('PutCommand');
      expect(gameCall.input.Item.PK).toBe('GAME#game-123');
      expect(gameCall.input.Item.SK).toBe('METADATA');
      expect(gameCall.input.Item.gameId).toBe('game-123');
      expect(gameCall.input.Item.player1Secret).toBe('BREAD');

      // Verify player index was created
      const indexCall = mockSend.mock.calls[1][0];
      expect(indexCall.type).toBe('PutCommand');
      expect(indexCall.input.Item.PK).toBe('PLAYER#player-1');
      expect(indexCall.input.Item.SK).toBe('GAME#game-123');
    });

    it('should set GSI1PK based on status', async () => {
      const game = createMockGameWithSecrets({
        gameId: 'game-123',
        status: 'ACTIVE'
      });

      mockSend.mockResolvedValue({});

      await repository.createGame(game);

      const gameCall = mockSend.mock.calls[0][0];
      expect(gameCall.input.Item.GSI1PK).toBe('STATUS#ACTIVE');
    });

    it('should include user ID if provided', async () => {
      const game = createMockGameWithSecrets({
        player1UserId: 'user-123'
      });

      mockSend.mockResolvedValue({});

      await repository.createGame(game);

      const gameCall = mockSend.mock.calls[0][0];
      expect(gameCall.input.Item.player1UserId).toBe('user-123');
    });
  });

  describe('getGame', () => {
    it('should retrieve game by ID', async () => {
      const gameId = 'game-123';
      const mockItem = createMockGameItem({
        gameId,
        player1Id: 'player-1',
        player1Secret: 'BREAD'
      });

      mockSend.mockResolvedValue({ Item: mockItem });

      const game = await repository.getGame(gameId);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('GetCommand');
      expect(call.input.Key.PK).toBe('GAME#game-123');
      expect(call.input.Key.SK).toBe('METADATA');

      expect(game.gameId).toBe(gameId);
      expect(game.player1Secret).toBe('BREAD');
    });

    it('should throw NotFoundError if game does not exist', async () => {
      const gameId = 'nonexistent';
      mockSend.mockResolvedValue({ Item: undefined });

      await expect(repository.getGame(gameId)).rejects.toThrow(NotFoundError);
      await expect(repository.getGame(gameId)).rejects.toThrow('Game nonexistent not found');
    });

    it('should return all game fields including secrets', async () => {
      const mockItem = createMockGameItem({
        gameId: 'game-123',
        status: 'ACTIVE',
        player1Id: 'player-1',
        player1Secret: 'BREAD',
        player2Id: 'player-2',
        player2Secret: 'WATER',
        winnerId: 'player-1'
      });

      mockSend.mockResolvedValue({ Item: mockItem });

      const game = await repository.getGame('game-123');

      expect(game.player1Secret).toBe('BREAD');
      expect(game.player2Secret).toBe('WATER');
      expect(game.winnerId).toBe('player-1');
    });
  });

  describe('joinGame', () => {
    it('should update game with player 2 and create player index', async () => {
      const gameId = 'game-123';
      const player2Id = 'player-2';
      const player2Name = 'Bob';
      const player2Secret = 'WATER';
      const timestamp = new Date().toISOString();

      mockSend.mockResolvedValue({});

      await repository.joinGame(gameId, player2Id, player2Name, undefined, player2Secret, timestamp);

      expect(mockSend).toHaveBeenCalledTimes(2);

      // Verify game update
      const updateCall = mockSend.mock.calls[0][0];
      expect(updateCall.type).toBe('UpdateCommand');
      expect(updateCall.input.Key.PK).toBe('GAME#game-123');
      expect(updateCall.input.ExpressionAttributeValues[':p2id']).toBe(player2Id);
      expect(updateCall.input.ExpressionAttributeValues[':p2secret']).toBe(player2Secret);
      expect(updateCall.input.ExpressionAttributeValues[':status']).toBe('ACTIVE');

      // Verify player index
      const indexCall = mockSend.mock.calls[1][0];
      expect(indexCall.type).toBe('PutCommand');
      expect(indexCall.input.Item.PK).toBe('PLAYER#player-2');
      expect(indexCall.input.Item.SK).toBe('GAME#game-123');
    });

    it('should include player2UserId if provided', async () => {
      const gameId = 'game-123';
      const player2Id = 'player-2';
      const userId = 'user-456';

      mockSend.mockResolvedValue({});

      await repository.joinGame(gameId, player2Id, 'Bob', userId, 'WATER', new Date().toISOString());

      const updateCall = mockSend.mock.calls[0][0];
      expect(updateCall.input.UpdateExpression).toContain('player2UserId');
      expect(updateCall.input.ExpressionAttributeValues[':p2userid']).toBe(userId);
    });
  });

  describe('updateGameState', () => {
    it('should update currentTurn', async () => {
      const gameId = 'game-123';
      const updates = { currentTurn: 'player-2' };

      mockSend.mockResolvedValue({});

      await repository.updateGameState(gameId, updates);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('UpdateCommand');
      expect(call.input.UpdateExpression).toContain('currentTurn = :turn');
      expect(call.input.ExpressionAttributeValues[':turn']).toBe('player-2');
    });

    it('should update winnerId', async () => {
      const gameId = 'game-123';
      const updates = { winnerId: 'player-1' };

      mockSend.mockResolvedValue({});

      await repository.updateGameState(gameId, updates);

      const call = mockSend.mock.calls[0][0];
      expect(call.input.UpdateExpression).toContain('winnerId = :winner');
      expect(call.input.ExpressionAttributeValues[':winner']).toBe('player-1');
    });

    it('should update status and GSI1PK', async () => {
      const gameId = 'game-123';
      const updates = { status: 'COMPLETED' as const };

      mockSend.mockResolvedValue({});

      await repository.updateGameState(gameId, updates);

      const call = mockSend.mock.calls[0][0];
      expect(call.input.UpdateExpression).toContain('#status = :status');
      expect(call.input.UpdateExpression).toContain('GSI1PK = :gsi1pk');
      expect(call.input.ExpressionAttributeValues[':status']).toBe('COMPLETED');
      expect(call.input.ExpressionAttributeValues[':gsi1pk']).toBe('STATUS#COMPLETED');
    });

    it('should update multiple fields at once', async () => {
      const gameId = 'game-123';
      const updates = {
        currentTurn: undefined,
        winnerId: 'player-1',
        status: 'COMPLETED' as const
      };

      mockSend.mockResolvedValue({});

      await repository.updateGameState(gameId, updates);

      const call = mockSend.mock.calls[0][0];
      expect(call.input.ExpressionAttributeValues[':winner']).toBe('player-1');
      expect(call.input.ExpressionAttributeValues[':status']).toBe('COMPLETED');
    });

    it('should always update updatedAt timestamp', async () => {
      const gameId = 'game-123';
      const updates = { currentTurn: 'player-2' };

      mockSend.mockResolvedValue({});

      await repository.updateGameState(gameId, updates);

      const call = mockSend.mock.calls[0][0];
      expect(call.input.UpdateExpression).toContain('updatedAt = :updated');
      expect(call.input.ExpressionAttributeValues[':updated']).toBeDefined();
    });
  });

  describe('saveGuess', () => {
    it('should save a guess to DynamoDB', async () => {
      const guess = createMockGuess({
        gameId: 'game-123',
        playerId: 'player-1',
        guessWord: 'BREAD',
        matchCount: 3,
        isWinningGuess: false
      });

      mockSend.mockResolvedValue({});

      await repository.saveGuess(guess);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('PutCommand');
      expect(call.input.Item.PK).toBe('GAME#game-123');
      expect(call.input.Item.SK).toContain('GUESS#');
      expect(call.input.Item.guessWord).toBe('BREAD');
      expect(call.input.Item.matchCount).toBe(3);
    });

    it('should save winning guess correctly', async () => {
      const guess = createMockGuess({
        gameId: 'game-123',
        matchCount: 5,
        isWinningGuess: true
      });

      mockSend.mockResolvedValue({});

      await repository.saveGuess(guess);

      const call = mockSend.mock.calls[0][0];
      expect(call.input.Item.isWinningGuess).toBe(true);
      expect(call.input.Item.matchCount).toBe(5);
    });
  });

  describe('getGuesses', () => {
    it('should retrieve all guesses for a game', async () => {
      const gameId = 'game-123';
      const mockItems = [
        createMockGuessItem({ gameId, playerId: 'player-1', guessWord: 'BREAD' }),
        createMockGuessItem({ gameId, playerId: 'player-2', guessWord: 'WATER' })
      ];

      mockSend.mockResolvedValue({ Items: mockItems });

      const guesses = await repository.getGuesses(gameId);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('QueryCommand');
      expect(call.input.KeyConditionExpression).toContain('PK = :pk');
      expect(call.input.KeyConditionExpression).toContain('begins_with(SK, :sk)');
      expect(call.input.ExpressionAttributeValues[':pk']).toBe('GAME#game-123');
      expect(call.input.ExpressionAttributeValues[':sk']).toBe('GUESS#');

      expect(guesses).toHaveLength(2);
      expect(guesses[0].guessWord).toBe('BREAD');
      expect(guesses[1].guessWord).toBe('WATER');
    });

    it('should return empty array if no guesses found', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const guesses = await repository.getGuesses('game-123');

      expect(guesses).toEqual([]);
    });

    it('should handle undefined Items', async () => {
      mockSend.mockResolvedValue({ Items: undefined });

      const guesses = await repository.getGuesses('game-123');

      expect(guesses).toEqual([]);
    });
  });

  describe('listGamesByStatus', () => {
    it('should query games by status using GSI', async () => {
      const mockItems = [
        createMockGameItem({ status: 'WAITING', gameId: 'game-1' }),
        createMockGameItem({ status: 'WAITING', gameId: 'game-2' })
      ];

      mockSend.mockResolvedValue({ Items: mockItems });

      const games = await repository.listGamesByStatus('WAITING');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('QueryCommand');
      expect(call.input.IndexName).toBe('GSI1');
      expect(call.input.KeyConditionExpression).toBe('GSI1PK = :status');
      expect(call.input.ExpressionAttributeValues[':status']).toBe('STATUS#WAITING');
      expect(call.input.ScanIndexForward).toBe(false); // Most recent first

      expect(games).toHaveLength(2);
      expect(games[0].status).toBe('WAITING');
    });

    it('should respect limit parameter', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      await repository.listGamesByStatus('ACTIVE', 10);

      const call = mockSend.mock.calls[0][0];
      expect(call.input.Limit).toBe(10);
    });

    it('should use default limit of 50', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      await repository.listGamesByStatus('WAITING');

      const call = mockSend.mock.calls[0][0];
      expect(call.input.Limit).toBe(50);
    });

    it('should return empty array if no games found', async () => {
      mockSend.mockResolvedValue({ Items: undefined });

      const games = await repository.listGamesByStatus('COMPLETED');

      expect(games).toEqual([]);
    });
  });

  describe('listPlayerGames', () => {
    it('should retrieve all games for a player', async () => {
      const playerId = 'player-1';
      const mockItems = [
        { PK: 'PLAYER#player-1', SK: 'GAME#game-1', gameId: 'game-1', playerId: 'player-1', createdAt: '2024-01-01' },
        { PK: 'PLAYER#player-1', SK: 'GAME#game-2', gameId: 'game-2', playerId: 'player-1', createdAt: '2024-01-02' }
      ];

      mockSend.mockResolvedValue({ Items: mockItems });

      const gameIds = await repository.listPlayerGames(playerId);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.type).toBe('QueryCommand');
      expect(call.input.KeyConditionExpression).toContain('PK = :pk');
      expect(call.input.ExpressionAttributeValues[':pk']).toBe('PLAYER#player-1');
      expect(call.input.ExpressionAttributeValues[':sk']).toBe('GAME#');

      expect(gameIds).toEqual(['game-1', 'game-2']);
    });

    it('should return empty array if player has no games', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const gameIds = await repository.listPlayerGames('player-new');

      expect(gameIds).toEqual([]);
    });
  });
});
