/**
 * DynamoDB repository for user data
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import type { UserItem, UsernameIndexItem, User, UserWithPassword } from '../models/user-types.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'JottoGameTable';

export class UserRepository {
  /**
   * Create a new user
   */
  async createUser(user: UserWithPassword): Promise<void> {
    const userItem: UserItem = {
      PK: `USER#${user.userId}`,
      SK: 'PROFILE',
      userId: user.userId,
      username: user.username,
      displayName: user.displayName,
      passwordHash: user.passwordHash,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      totalGames: 0,
      totalWins: 0,
      totalGuesses: 0,
      averageGuessesToWin: 0
    };

    const usernameIndex: UsernameIndexItem = {
      PK: `USERNAME#${user.username.toLowerCase()}`,
      SK: 'MAPPING',
      userId: user.userId
    };

    // Transactional write to ensure username uniqueness
    await Promise.all([
      docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: userItem
      })),
      docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: usernameIndex,
        ConditionExpression: 'attribute_not_exists(PK)' // Ensure username doesn't exist
      }))
    ]);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserWithPassword> {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      }
    }));

    if (!result.Item) {
      throw new NotFoundError(`User ${userId} not found`);
    }

    const item = result.Item as UserItem;
    return {
      userId: item.userId,
      username: item.username,
      displayName: item.displayName,
      passwordHash: item.passwordHash,
      email: item.email,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      totalGames: item.totalGames,
      totalWins: item.totalWins,
      totalGuesses: item.totalGuesses,
      averageGuessesToWin: item.averageGuessesToWin
    };
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<UserWithPassword> {
    // First, look up userId from username index
    const indexResult = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USERNAME#${username.toLowerCase()}`,
        SK: 'MAPPING'
      }
    }));

    if (!indexResult.Item) {
      throw new NotFoundError(`User ${username} not found`);
    }

    const indexItem = indexResult.Item as UsernameIndexItem;
    return this.getUserById(indexItem.userId);
  }

  /**
   * Check if username exists
   */
  async checkUsernameExists(username: string): Promise<boolean> {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USERNAME#${username.toLowerCase()}`,
        SK: 'MAPPING'
      }
    }));

    return !!result.Item;
  }

  /**
   * Update user stats
   */
  async updateUserStats(
    userId: string,
    stats: {
      totalGames: number;
      totalWins: number;
      totalGuesses: number;
      averageGuessesToWin: number;
    }
  ): Promise<void> {
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      },
      UpdateExpression: 'SET totalGames = :games, totalWins = :wins, totalGuesses = :guesses, averageGuessesToWin = :avg, updatedAt = :updated',
      ExpressionAttributeValues: {
        ':games': stats.totalGames,
        ':wins': stats.totalWins,
        ':guesses': stats.totalGuesses,
        ':avg': stats.averageGuessesToWin,
        ':updated': new Date().toISOString()
      }
    }));
  }

  /**
   * Sanitize user (remove password hash)
   */
  sanitizeUser(user: UserWithPassword): User {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
