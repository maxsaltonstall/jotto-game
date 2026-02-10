/**
 * Lambda function to create a game against AI opponent
 */

import { APIGatewayProxyHandler } from 'aws-lambda';
import { GameService } from '../services/GameService.js';
import { AIService, AI_PLAYER_ID, AI_PLAYER_NAME } from '../services/AIService.js';
import { ValidationError } from '../utils/errors.js';

// Create services
const gameService = new GameService();
const aiService = new AIService(gameService);
gameService.setAIService(aiService);

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { playerId, playerName, secretWord, userId } = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!playerId || !playerName || !secretWord) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Missing required fields' })
      };
    }

    // Create game with Player 1 (human), marked as AI game
    const game = await gameService.createGame(playerId, playerName, secretWord, userId, true);

    // Immediately join with AI as Player 2
    const aiSecret = aiService.pickSecretWord();
    await gameService.joinGame(game.gameId, AI_PLAYER_ID, AI_PLAYER_NAME, aiSecret);

    // Refetch game to get updated state (now ACTIVE)
    const gameState = await gameService.getGameState(game.gameId, playerId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game: gameState.game,
        isAiGame: true
      })
    };
  } catch (error) {
    console.error('Error creating AI game:', error);

    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: error.message })
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
