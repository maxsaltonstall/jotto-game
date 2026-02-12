/**
 * Lambda handler: Cleanup old/inactive games
 * Can delete all games or games older than specified age
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GameRepository } from '../repositories/GameRepository.js';
import { createLogger } from '../utils/logger.js';
import { success, error } from '../utils/response.js';

const gameRepository = new GameRepository();
const logger = createLogger({ operation: 'cleanup-games' });

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Simple authentication - require a secret key in header or query param
    const adminSecret = process.env.ADMIN_SECRET || 'change-me-in-production';
    const providedSecret = event.headers?.['x-admin-secret'] || event.queryStringParameters?.secret;

    if (providedSecret !== adminSecret) {
      return error(new Error('Unauthorized - invalid admin secret'), 401);
    }

    // Parse options from query parameters
    const deleteAll = event.queryStringParameters?.all === 'true';
    const olderThanHours = event.queryStringParameters?.olderThanHours
      ? parseInt(event.queryStringParameters.olderThanHours)
      : 24; // Default: delete games older than 24 hours

    logger.info('Starting game cleanup', { deleteAll, olderThanHours });

    let deletedCount = 0;
    const cutoffTime = deleteAll
      ? new Date('2099-01-01').toISOString() // Far future - deletes all
      : new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

    // Get all games
    const allGames = await gameRepository.listGamesByStatus('ACTIVE');
    const waitingGames = await gameRepository.listGamesByStatus('WAITING');
    const completedGames = await gameRepository.listGamesByStatus('COMPLETED');
    const games = [...allGames, ...waitingGames, ...completedGames];

    logger.info('Found games to check', { totalGames: games.length });

    // Delete games matching criteria
    for (const game of games) {
      const shouldDelete = deleteAll || game.updatedAt < cutoffTime;

      if (shouldDelete) {
        try {
          await gameRepository.deleteGame(game.gameId);
          deletedCount++;
          logger.info('Deleted game', { gameId: game.gameId, updatedAt: game.updatedAt });
        } catch (err) {
          logger.error('Failed to delete game', {
            gameId: game.gameId,
            error: (err as Error).message
          });
        }
      }
    }

    logger.info('Game cleanup completed', {
      totalGames: games.length,
      deletedCount,
      deleteAll,
      olderThanHours
    });

    return success({
      message: 'Cleanup completed',
      totalGames: games.length,
      deletedCount,
      criteria: deleteAll ? 'all games' : `games older than ${olderThanHours} hours`
    });
  } catch (err) {
    logger.error('Cleanup failed', { error: (err as Error).message });
    return error(err as Error);
  }
}
