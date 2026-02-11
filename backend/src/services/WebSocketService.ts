/**
 * WebSocket service for broadcasting game updates to connected clients
 */

import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException
} from '@aws-sdk/client-apigatewaymanagementapi';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import type { Game, Guess } from '../models/types.js';
import type { WebSocketMessage } from '../models/websocket-types.js';
import { logger } from '../utils/logger.js';

interface PendingBroadcast {
  gameId: string;
  game: Game;
  guesses: Guess[];
  timeout: NodeJS.Timeout;
}

export class WebSocketService {
  private client: ApiGatewayManagementApiClient | null;
  private connectionRepository: ConnectionRepository;
  private wsEndpoint: string;
  private pendingBroadcasts: Map<string, PendingBroadcast> = new Map();
  private readonly DEBOUNCE_MS = 500; // Batch broadcasts within 500ms window

  constructor(wsEndpoint?: string, connectionRepository?: ConnectionRepository) {
    this.wsEndpoint = wsEndpoint || process.env.WEBSOCKET_API_ENDPOINT || '';
    this.connectionRepository = connectionRepository || new ConnectionRepository();

    // Initialize API Gateway Management API client
    if (this.wsEndpoint) {
      this.client = new ApiGatewayManagementApiClient({
        endpoint: this.wsEndpoint
      });
    } else {
      this.client = null;
    }
  }

  /**
   * Broadcast game update to all players in a game
   * Debounced by 500ms to batch rapid successive updates
   */
  async broadcastGameUpdate(
    gameId: string,
    game: Game,
    guesses: Guess[]
  ): Promise<void> {
    if (!this.wsEndpoint) {
      logger.warn('WebSocket endpoint not configured, skipping broadcast');
      return;
    }

    // Clear existing timeout for this game if any
    const existing = this.pendingBroadcasts.get(gameId);
    if (existing) {
      clearTimeout(existing.timeout);
      logger.debug('Cleared pending broadcast, batching updates', { gameId });
    }

    // Schedule new broadcast after debounce period
    const timeout = setTimeout(() => {
      this.doBroadcastGameUpdate(gameId, game, guesses)
        .catch(error => {
          logger.error('Error in debounced broadcast', {
            gameId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        })
        .finally(() => {
          this.pendingBroadcasts.delete(gameId);
        });
    }, this.DEBOUNCE_MS);

    // Store pending broadcast
    this.pendingBroadcasts.set(gameId, { gameId, game, guesses, timeout });

    logger.debug('Scheduled debounced broadcast', {
      gameId,
      debounceMs: this.DEBOUNCE_MS
    });
  }

  /**
   * Internal method to actually perform the broadcast
   */
  private async doBroadcastGameUpdate(
    gameId: string,
    game: Game,
    guesses: Guess[]
  ): Promise<void> {
    const connections = await this.connectionRepository.getConnectionsByGameId(gameId);

    if (connections.length === 0) {
      logger.info('No active connections for game', { gameId });
      return;
    }

    logger.info('Broadcasting game update', {
      gameId,
      connectionCount: connections.length
    });

    // Send to each connection
    const results = await Promise.allSettled(
      connections.map(async (connection) => {
        const message: WebSocketMessage = {
          type: 'GAME_UPDATE',
          payload: {
            game,
            guesses,
            myTurn: game.currentTurn === connection.playerId
          },
          timestamp: new Date().toISOString()
        };

        return this.postToConnection(connection.connectionId, message, gameId);
      })
    );

    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info('Broadcast complete', {
      gameId,
      total: connections.length,
      successful,
      failed
    });
  }

  /**
   * Broadcast player joined event
   */
  async broadcastPlayerJoined(
    gameId: string,
    game: Game,
    player2Name: string
  ): Promise<void> {
    if (!this.wsEndpoint) {
      logger.warn('WebSocket endpoint not configured, skipping broadcast');
      return;
    }

    const connections = await this.connectionRepository.getConnectionsByGameId(gameId);

    if (connections.length === 0) {
      logger.info('No active connections for game', { gameId });
      return;
    }

    logger.info('Broadcasting player joined', {
      gameId,
      player2Name,
      connectionCount: connections.length
    });

    const message: WebSocketMessage = {
      type: 'PLAYER_JOINED',
      payload: {
        game,
        player2Name
      },
      timestamp: new Date().toISOString()
    };

    await Promise.allSettled(
      connections.map(connection =>
        this.postToConnection(connection.connectionId, message, gameId)
      )
    );
  }

  /**
   * Broadcast game completed event
   */
  async broadcastGameCompleted(
    gameId: string,
    game: Game,
    winnerId: string,
    winnerName: string
  ): Promise<void> {
    if (!this.wsEndpoint) {
      logger.warn('WebSocket endpoint not configured, skipping broadcast');
      return;
    }

    const connections = await this.connectionRepository.getConnectionsByGameId(gameId);

    if (connections.length === 0) {
      logger.info('No active connections for game', { gameId });
      return;
    }

    logger.info('Broadcasting game completed', {
      gameId,
      winnerId,
      winnerName,
      connectionCount: connections.length
    });

    const message: WebSocketMessage = {
      type: 'GAME_COMPLETED',
      payload: {
        game,
        winnerId,
        winnerName
      },
      timestamp: new Date().toISOString()
    };

    await Promise.allSettled(
      connections.map(connection =>
        this.postToConnection(connection.connectionId, message, gameId)
      )
    );
  }

  /**
   * Post message to a specific connection
   * Handles stale connections (410 Gone)
   */
  private async postToConnection(
    connectionId: string,
    message: WebSocketMessage,
    gameId: string
  ): Promise<void> {
    if (!this.client) {
      logger.warn('WebSocket client not initialized');
      return;
    }

    try {
      const command = new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(message))
      });

      await this.client.send(command);

      logger.debug('Message sent to connection', { connectionId, type: message.type });
    } catch (error) {
      if (error instanceof GoneException) {
        // Connection is stale, remove it from database
        logger.info('Stale connection detected, removing', { connectionId, gameId });
        await this.connectionRepository.deleteConnectionByKey(gameId, connectionId);
      } else {
        logger.error('Failed to send message to connection', {
          connectionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    }
  }
}
