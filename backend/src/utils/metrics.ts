/**
 * Centralized metrics tracking for Datadog
 */

import { sendDistributionMetric } from 'datadog-lambda-js';
import { logger } from './logger.js';

export class MetricsService {
  /**
   * Track game lifecycle events
   */
  static trackGameCreated(gameId: string, isAiGame: boolean): void {
    try {
      sendDistributionMetric('jotto.game.created', 1,
        `is_ai_game:${isAiGame}`
      );
      logger.debug('Metric tracked: game.created', { gameId, isAiGame });
    } catch (err) {
      logger.error('Failed to track metric', { metric: 'game.created', error: (err as Error).message });
    }
  }

  static trackGameJoined(gameId: string): void {
    try {
      sendDistributionMetric('jotto.game.joined', 1);
      logger.debug('Metric tracked: game.joined', { gameId });
    } catch (err) {
      logger.error('Failed to track metric', { metric: 'game.joined', error: (err as Error).message });
    }
  }

  static trackGameCompleted(gameId: string, winnerId: string, durationMs: number, totalGuesses: number, isAiGame: boolean): void {
    try {
      const winnerType = winnerId === 'AI_PLAYER' ? 'ai' : 'human';

      sendDistributionMetric('jotto.game.completed', 1,
        `winner_type:${winnerType}`,
        `is_ai_game:${isAiGame}`
      );

      sendDistributionMetric('jotto.game.duration', durationMs,
        `winner_type:${winnerType}`,
        `is_ai_game:${isAiGame}`
      );

      sendDistributionMetric('jotto.game.total_guesses', totalGuesses,
        `winner_type:${winnerType}`,
        `is_ai_game:${isAiGame}`
      );

      logger.debug('Metrics tracked: game.completed', { gameId, winnerId, durationMs, totalGuesses });
    } catch (err) {
      logger.error('Failed to track metrics', { metric: 'game.completed', error: (err as Error).message });
    }
  }

  /**
   * Track player actions
   */
  static trackGuess(playerId: string, matchCount: number, isWinning: boolean): void {
    try {
      const playerType = playerId === 'AI_PLAYER' ? 'ai' : 'human';

      sendDistributionMetric('jotto.guess.made', 1,
        `player_type:${playerType}`,
        `match_count:${matchCount}`,
        `is_winning:${isWinning}`
      );

      if (isWinning) {
        sendDistributionMetric('jotto.guess.winning', 1,
          `player_type:${playerType}`
        );
      }

      logger.debug('Metric tracked: guess.made', { playerId, matchCount, isWinning });
    } catch (err) {
      logger.error('Failed to track metric', { metric: 'guess.made', error: (err as Error).message });
    }
  }

  static trackPlayerCompleted(playerId: string, guessCount: number, isFirstFinisher: boolean): void {
    try {
      const playerType = playerId === 'AI_PLAYER' ? 'ai' : 'human';

      sendDistributionMetric('jotto.player.completed', 1,
        `player_type:${playerType}`,
        `is_first_finisher:${isFirstFinisher}`
      );

      sendDistributionMetric('jotto.player.guess_count', guessCount,
        `player_type:${playerType}`,
        `is_first_finisher:${isFirstFinisher}`
      );

      logger.debug('Metrics tracked: player.completed', { playerId, guessCount, isFirstFinisher });
    } catch (err) {
      logger.error('Failed to track metrics', { metric: 'player.completed', error: (err as Error).message });
    }
  }

  /**
   * Track system health
   */
  static trackActiveGames(count: number): void {
    try {
      sendDistributionMetric('jotto.games.active', count);
      logger.debug('Metric tracked: games.active', { count });
    } catch (err) {
      logger.error('Failed to track metric', { metric: 'games.active', error: (err as Error).message });
    }
  }

  static trackWebSocketConnections(count: number): void {
    try {
      sendDistributionMetric('jotto.websocket.connections', count);
      logger.debug('Metric tracked: websocket.connections', { count });
    } catch (err) {
      logger.error('Failed to track metric', { metric: 'websocket.connections', error: (err as Error).message });
    }
  }

  static trackWebSocketMessageLatency(latencyMs: number, messageType: string): void {
    try {
      sendDistributionMetric('jotto.websocket.message.latency', latencyMs,
        `message_type:${messageType}`
      );
      logger.debug('Metric tracked: websocket.message.latency', { latencyMs, messageType });
    } catch (err) {
      logger.error('Failed to track metric', { metric: 'websocket.message.latency', error: (err as Error).message });
    }
  }

  /**
   * Track errors with context
   */
  static trackError(errorType: string, errorMessage: string, context: Record<string, any> = {}): void {
    try {
      sendDistributionMetric('jotto.error', 1,
        `error_type:${errorType}`
      );

      logger.error('Error tracked', {
        error_type: errorType,
        error_message: errorMessage,
        ...context
      });
    } catch (err) {
      logger.error('Failed to track error metric', { error: (err as Error).message });
    }
  }

  /**
   * Track AI performance (for LLM implementation)
   */
  static trackAIMove(durationMs: number, guessQuality: 'optimal' | 'suboptimal' | 'random'): void {
    try {
      sendDistributionMetric('jotto.ai.move.duration', durationMs,
        `quality:${guessQuality}`
      );
      logger.debug('Metric tracked: ai.move.duration', { durationMs, guessQuality });
    } catch (err) {
      logger.error('Failed to track metric', { metric: 'ai.move.duration', error: (err as Error).message });
    }
  }

  // LLM-specific metrics (for Phase 3)
  static trackLLMTokens(inputTokens: number, outputTokens: number, model: string): void {
    try {
      sendDistributionMetric('jotto.llm.tokens.input', inputTokens,
        `model:${model}`
      );
      sendDistributionMetric('jotto.llm.tokens.output', outputTokens,
        `model:${model}`
      );
      logger.debug('Metrics tracked: llm.tokens', { inputTokens, outputTokens, model });
    } catch (err) {
      logger.error('Failed to track LLM metrics', { error: (err as Error).message });
    }
  }

  static trackLLMLatency(latencyMs: number, model: string, success: boolean): void {
    try {
      sendDistributionMetric('jotto.llm.latency', latencyMs,
        `model:${model}`,
        `success:${success}`
      );
      logger.debug('Metric tracked: llm.latency', { latencyMs, model, success });
    } catch (err) {
      logger.error('Failed to track metric', { metric: 'llm.latency', error: (err as Error).message });
    }
  }
}
