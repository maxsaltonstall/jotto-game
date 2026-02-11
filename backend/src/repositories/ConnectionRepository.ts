/**
 * Repository for managing WebSocket connections in DynamoDB
 * Uses separate ConnectionsTable for tracking active WebSocket connections
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  GetCommand
} from '@aws-sdk/lib-dynamodb';
import type { Connection } from '../models/websocket-types.js';
import { logger } from '../utils/logger.js';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE_NAME || 'JottoGameConnectionsTable';
const TTL_HOURS = 2; // Auto-cleanup after 2 hours

export class ConnectionRepository {
  /**
   * Save a new WebSocket connection
   */
  async saveConnection(
    connectionId: string,
    gameId: string,
    playerId: string,
    playerName: string
  ): Promise<void> {
    const now = new Date();
    const ttl = Math.floor(now.getTime() / 1000) + (TTL_HOURS * 60 * 60);

    const connection = {
      PK: `GAME#${gameId}`,
      SK: `CONNECTION#${connectionId}`,
      connectionId,
      gameId,
      playerId,
      playerName,
      connectedAt: now.toISOString(),
      ttl
    };

    logger.info('Saving connection', {
      connectionId,
      gameId,
      playerId,
      playerName
    });

    await docClient.send(new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: connection
    }));
  }

  /**
   * Delete a connection by connectionId
   * We need to query by GSI to find the PK first
   */
  async deleteConnection(connectionId: string): Promise<void> {
    logger.info('Deleting connection', { connectionId });

    // Query GSI to find the connection
    const result = await docClient.send(new QueryCommand({
      TableName: CONNECTIONS_TABLE,
      IndexName: 'ConnectionIdIndex',
      KeyConditionExpression: 'connectionId = :connectionId',
      ExpressionAttributeValues: {
        ':connectionId': connectionId
      },
      Limit: 1
    }));

    if (result.Items && result.Items.length > 0) {
      const item = result.Items[0];
      await docClient.send(new DeleteCommand({
        TableName: CONNECTIONS_TABLE,
        Key: {
          PK: item.PK,
          SK: item.SK
        }
      }));
    }
  }

  /**
   * Get all active connections for a game
   */
  async getConnectionsByGameId(gameId: string): Promise<Connection[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: CONNECTIONS_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `GAME#${gameId}`,
        ':sk': 'CONNECTION#'
      }
    }));

    if (!result.Items) {
      return [];
    }

    return result.Items.map(item => ({
      connectionId: item.connectionId,
      gameId: item.gameId,
      playerId: item.playerId,
      playerName: item.playerName,
      connectedAt: item.connectedAt,
      ttl: item.ttl
    }));
  }

  /**
   * Delete a connection by PK and SK (used for stale connection cleanup)
   */
  async deleteConnectionByKey(gameId: string, connectionId: string): Promise<void> {
    logger.info('Deleting connection by key', { gameId, connectionId });

    await docClient.send(new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: {
        PK: `GAME#${gameId}`,
        SK: `CONNECTION#${connectionId}`
      }
    }));
  }
}
