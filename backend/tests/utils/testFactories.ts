/**
 * Test data factories for generating mock data
 */

import type { Game, GameWithSecrets, Guess, GameItem, GuessItem } from '../../src/models/types.js';
import type { User, UserWithPassword, UserItem, UserStats } from '../../src/models/user-types.js';

let gameIdCounter = 0;
let userIdCounter = 0;
let playerIdCounter = 0;

/**
 * Generate a unique game ID for testing
 */
export function generateGameId(): string {
  return `test-game-${++gameIdCounter}-${Date.now()}`;
}

/**
 * Generate a unique user ID for testing
 */
export function generateUserId(): string {
  return `test-user-${++userIdCounter}-${Date.now()}`;
}

/**
 * Generate a unique player ID for testing
 */
export function generatePlayerId(): string {
  return `test-player-${++playerIdCounter}-${Date.now()}`;
}

/**
 * Generate a timestamp in ISO format
 */
export function generateTimestamp(offset: number = 0): string {
  return new Date(Date.now() + offset).toISOString();
}

/**
 * Create a mock Game
 */
export function createMockGame(overrides: Partial<Game> = {}): Game {
  const gameId = overrides.gameId || generateGameId();
  const now = generateTimestamp();

  return {
    gameId,
    status: 'WAITING',
    player1Id: generatePlayerId(),
    player1Name: 'Player 1',
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Create a mock Game with secrets
 */
export function createMockGameWithSecrets(overrides: Partial<GameWithSecrets> = {}): GameWithSecrets {
  const game = createMockGame(overrides);
  return {
    ...game,
    player1Secret: 'BREAD',
    player2Secret: overrides.player2Secret,
    ...overrides
  };
}

/**
 * Create a mock GameItem (DynamoDB format)
 */
export function createMockGameItem(overrides: Partial<GameItem> = {}): GameItem {
  const gameId = overrides.gameId || generateGameId();
  const now = generateTimestamp();
  const status = overrides.status || 'WAITING';

  return {
    PK: `GAME#${gameId}`,
    SK: 'METADATA',
    GSI1PK: `STATUS#${status}`,
    GSI1SK: `CREATED#${now}`,
    gameId,
    status,
    player1Id: generatePlayerId(),
    player1Name: 'Player 1',
    player1Secret: 'BREAD',
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Create a mock active game (both players joined)
 */
export function createMockActiveGame(overrides: Partial<GameWithSecrets> = {}): GameWithSecrets {
  const player1Id = generatePlayerId();
  const player2Id = generatePlayerId();

  return createMockGameWithSecrets({
    status: 'ACTIVE',
    player1Id,
    player2Id,
    player2Name: 'Player 2',
    player1Secret: 'BREAD',
    player2Secret: 'WATER',
    currentTurn: player1Id,
    ...overrides
  });
}

/**
 * Create a mock completed game
 */
export function createMockCompletedGame(overrides: Partial<GameWithSecrets> = {}): GameWithSecrets {
  const player1Id = generatePlayerId();
  const player2Id = generatePlayerId();

  return createMockGameWithSecrets({
    status: 'COMPLETED',
    player1Id,
    player2Id,
    player2Name: 'Player 2',
    player1Secret: 'BREAD',
    player2Secret: 'WATER',
    winnerId: player1Id,
    ...overrides
  });
}

/**
 * Create a mock AI game
 */
export function createMockAIGame(overrides: Partial<GameWithSecrets> = {}): GameWithSecrets {
  return createMockActiveGame({
    isAiGame: true,
    player2Name: '🤖 AI Bot',
    player2Secret: 'CRANE',
    ...overrides
  });
}

/**
 * Create a mock Guess
 */
export function createMockGuess(overrides: Partial<Guess> = {}): Guess {
  return {
    gameId: generateGameId(),
    playerId: generatePlayerId(),
    guessWord: 'WORLD',
    matchCount: 2,
    timestamp: generateTimestamp(),
    isWinningGuess: false,
    ...overrides
  };
}

/**
 * Create a mock GuessItem (DynamoDB format)
 */
export function createMockGuessItem(overrides: Partial<GuessItem> = {}): GuessItem {
  const gameId = overrides.gameId || generateGameId();
  const playerId = overrides.playerId || generatePlayerId();
  const timestamp = overrides.timestamp || generateTimestamp();

  return {
    PK: `GAME#${gameId}`,
    SK: `GUESS#${timestamp}#${playerId}`,
    gameId,
    playerId,
    guessWord: 'WORLD',
    matchCount: 2,
    timestamp,
    isWinningGuess: false,
    ...overrides
  };
}

/**
 * Create a series of guesses for a game
 */
export function createMockGuesses(
  gameId: string,
  playerId: string,
  count: number,
  overrides: Partial<Guess> = {}
): Guess[] {
  const guesses: Guess[] = [];
  const words = ['WORLD', 'BREAD', 'CRANE', 'SHORE', 'PLANT'];

  for (let i = 0; i < count; i++) {
    guesses.push(
      createMockGuess({
        gameId,
        playerId,
        guessWord: words[i % words.length],
        matchCount: i + 1,
        timestamp: generateTimestamp(i * 1000),
        ...overrides
      })
    );
  }

  return guesses;
}

/**
 * Create a mock User
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const userId = overrides.userId || generateUserId();
  const now = generateTimestamp();

  return {
    userId,
    username: `testuser${userId}`,
    displayName: 'Test User',
    createdAt: now,
    updatedAt: now,
    totalGames: 0,
    totalWins: 0,
    totalGuesses: 0,
    averageGuessesToWin: 0,
    ...overrides
  };
}

/**
 * Create a mock User with password hash
 */
export function createMockUserWithPassword(overrides: Partial<UserWithPassword> = {}): UserWithPassword {
  const user = createMockUser(overrides);
  return {
    ...user,
    passwordHash: '$2b$10$test.hash.for.password',
    ...overrides
  };
}

/**
 * Create a mock UserItem (DynamoDB format)
 */
export function createMockUserItem(overrides: Partial<UserItem> = {}): UserItem {
  const userId = overrides.userId || generateUserId();
  const username = overrides.username || `testuser${userId}`;
  const now = generateTimestamp();

  return {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    userId,
    username,
    displayName: 'Test User',
    passwordHash: '$2b$10$test.hash.for.password',
    createdAt: now,
    updatedAt: now,
    totalGames: 0,
    totalWins: 0,
    totalGuesses: 0,
    averageGuessesToWin: 0,
    ...overrides
  };
}

/**
 * Create mock UserStats
 */
export function createMockUserStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    totalGames: 10,
    totalWins: 5,
    totalGuesses: 50,
    averageGuessesToWin: 10,
    ...overrides
  };
}

/**
 * Create a mock JWT token (not cryptographically valid, just for testing)
 */
export function createMockToken(userId: string, username: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, username, iat: Date.now() })).toString('base64url');
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

/**
 * Reset all counters (useful between tests)
 */
export function resetCounters(): void {
  gameIdCounter = 0;
  userIdCounter = 0;
  playerIdCounter = 0;
}
