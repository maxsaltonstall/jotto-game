/**
 * DynamoDB repository for game data
 * Uses single-table design with access patterns optimized for the game
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import type {
  GameItem,
  GuessItem,
  PlayerGameIndex,
  GameWithSecrets,
  Guess,
  GameStatus
} from '../models/types.js';
import { NotFoundError } from '../utils/errors.js';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'JottoGameTable';

export class GameRepository {
  /**
   * Create a new game
   */
  async createGame(game: GameWithSecrets): Promise<void> {
    const gameItem: GameItem = {
      PK: `GAME#${game.gameId}`,
      SK: 'METADATA',
      GSI1PK: `STATUS#${game.status}`,
      GSI1SK: `CREATED#${game.createdAt}`,
      gameId: game.gameId,
      status: game.status,
      player1Id: game.player1Id,
      player1Name: game.player1Name,
      player1UserId: game.player1UserId,
      player1Secret: game.player1Secret,
      isAiGame: game.isAiGame || false,
      currentTurn: game.currentTurn,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt
    };

    const playerIndex: PlayerGameIndex = {
      PK: `PLAYER#${game.player1Id}`,
      SK: `GAME#${game.gameId}`,
      gameId: game.gameId,
      playerId: game.player1Id,
      createdAt: game.createdAt
    };

    await Promise.all([
      docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: gameItem
      })),
      docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: playerIndex
      }))
    ]);
  }

  /**
   * Get a game by ID (with secrets)
   */
  async getGame(gameId: string): Promise<GameWithSecrets> {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `GAME#${gameId}`,
        SK: 'METADATA'
      }
    }));

    if (!result.Item) {
      throw new NotFoundError(`Game ${gameId} not found`);
    }

    const item = result.Item as GameItem;
    return {
      gameId: item.gameId,
      status: item.status,
      player1Id: item.player1Id,
      player1Name: item.player1Name,
      player1UserId: item.player1UserId,
      player1Secret: item.player1Secret,
      player2Id: item.player2Id,
      player2Name: item.player2Name,
      player2UserId: item.player2UserId,
      player2Secret: item.player2Secret,
      currentTurn: item.currentTurn,
      winnerId: item.winnerId,
      isAiGame: item.isAiGame || false,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  /**
   * Update game when player 2 joins
   */
  async joinGame(
    gameId: string,
    player2Id: string,
    player2Name: string,
    player2UserId: string | undefined,
    player2Secret: string,
    timestamp: string
  ): Promise<void> {
    const playerIndex: PlayerGameIndex = {
      PK: `PLAYER#${player2Id}`,
      SK: `GAME#${gameId}`,
      gameId: gameId,
      playerId: player2Id,
      createdAt: timestamp
    };

    await Promise.all([
      docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `GAME#${gameId}`,
          SK: 'METADATA'
        },
        UpdateExpression: 'SET player2Id = :p2id, player2Name = :p2name, player2Secret = :p2secret, #status = :status, GSI1PK = :gsi1pk, updatedAt = :updated' + (player2UserId ? ', player2UserId = :p2userid' : ''),
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':p2id': player2Id,
          ':p2name': player2Name,
          ':p2secret': player2Secret,
          ':status': 'ACTIVE',
          ':gsi1pk': 'STATUS#ACTIVE',
          ':updated': timestamp,
          ...(player2UserId ? { ':p2userid': player2UserId } : {})
        }
      })),
      docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: playerIndex
      }))
    ]);
  }

  /**
   * Update game state (turn, winner, status)
   */
  async updateGameState(
    gameId: string,
    updates: {
      currentTurn?: string;
      winnerId?: string;
      status?: GameStatus;
    }
  ): Promise<void> {
    const updateExpressions: string[] = ['SET updatedAt = :updated'];
    const expressionAttributeValues: Record<string, any> = {
      ':updated': new Date().toISOString()
    };

    if (updates.currentTurn !== undefined) {
      updateExpressions.push('currentTurn = :turn');
      expressionAttributeValues[':turn'] = updates.currentTurn;
    }

    if (updates.winnerId !== undefined) {
      updateExpressions.push('winnerId = :winner');
      expressionAttributeValues[':winner'] = updates.winnerId;
    }

    if (updates.status !== undefined) {
      updateExpressions.push('#status = :status, GSI1PK = :gsi1pk');
      expressionAttributeValues[':status'] = updates.status;
      expressionAttributeValues[':gsi1pk'] = `STATUS#${updates.status}`;
    }

    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `GAME#${gameId}`,
        SK: 'METADATA'
      },
      UpdateExpression: updateExpressions.join(', '),
      ExpressionAttributeNames: updates.status !== undefined ? { '#status': 'status' } : undefined,
      ExpressionAttributeValues: expressionAttributeValues
    }));
  }

  /**
   * Save a guess
   */
  async saveGuess(guess: Guess): Promise<void> {
    const guessItem: GuessItem = {
      PK: `GAME#${guess.gameId}`,
      SK: `GUESS#${guess.timestamp}#${guess.playerId}`,
      gameId: guess.gameId,
      playerId: guess.playerId,
      guessWord: guess.guessWord,
      matchCount: guess.matchCount,
      timestamp: guess.timestamp,
      isWinningGuess: guess.isWinningGuess
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: guessItem
    }));
  }

  /**
   * Get all guesses for a game
   */
  async getGuesses(gameId: string): Promise<Guess[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `GAME#${gameId}`,
        ':sk': 'GUESS#'
      }
    }));

    return (result.Items || []).map((item) => {
      const guessItem = item as GuessItem;
      return {
        gameId: guessItem.gameId,
        playerId: guessItem.playerId,
        guessWord: guessItem.guessWord,
        matchCount: guessItem.matchCount,
        timestamp: guessItem.timestamp,
        isWinningGuess: guessItem.isWinningGuess
      };
    });
  }

  /**
   * List games by status
   */
  async listGamesByStatus(status: GameStatus, limit: number = 50): Promise<GameWithSecrets[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :status',
      ExpressionAttributeValues: {
        ':status': `STATUS#${status}`
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit
    }));

    return (result.Items || []).map((item) => {
      const gameItem = item as GameItem;
      return {
        gameId: gameItem.gameId,
        status: gameItem.status,
        player1Id: gameItem.player1Id,
        player1Name: gameItem.player1Name,
        player1UserId: gameItem.player1UserId,
        player1Secret: gameItem.player1Secret,
        player2Id: gameItem.player2Id,
        player2Name: gameItem.player2Name,
        player2UserId: gameItem.player2UserId,
        player2Secret: gameItem.player2Secret,
        currentTurn: gameItem.currentTurn,
        winnerId: gameItem.winnerId,
        createdAt: gameItem.createdAt,
        updatedAt: gameItem.updatedAt
      };
    });
  }

  /**
   * List games for a specific player
   */
  async listPlayerGames(playerId: string): Promise<string[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PLAYER#${playerId}`,
        ':sk': 'GAME#'
      }
    }));

    return (result.Items || []).map((item) => {
      const index = item as PlayerGameIndex;
      return index.gameId;
    });
  }
}
