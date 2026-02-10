/**
 * Custom error types for the Jotto game
 */

export class GameError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'GAME_ERROR'
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export class NotFoundError extends GameError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends GameError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class InvalidTurnError extends GameError {
  constructor(message: string = 'Not your turn') {
    super(message, 400, 'INVALID_TURN');
    this.name = 'InvalidTurnError';
  }
}

export class GameStateError extends GameError {
  constructor(message: string) {
    super(message, 400, 'INVALID_GAME_STATE');
    this.name = 'GameStateError';
  }
}
