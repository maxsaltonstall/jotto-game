/**
 * Type definitions for the Jotto game
 */

export type GameStatus = 'WAITING' | 'ACTIVE' | 'COMPLETED';

export interface Game {
  gameId: string;
  status: GameStatus;
  player1Id: string;
  player1Name: string;
  player1UserId?: string; // If authenticated
  player2Id?: string;
  player2Name?: string;
  player2UserId?: string; // If authenticated
  currentTurn?: string; // playerId whose turn it is
  winnerId?: string;
  isAiGame?: boolean; // True if Player 2 is AI
  createdAt: string;
  updatedAt: string;
  // Secret words are stored separately in DynamoDB, never exposed in API
}

export interface GameWithSecrets extends Game {
  player1Secret: string;
  player2Secret?: string;
}

export interface Guess {
  gameId: string;
  playerId: string;
  guessWord: string;
  matchCount: number;
  timestamp: string;
  isWinningGuess: boolean;
}

export interface CreateGameRequest {
  playerId: string;
  playerName: string;
  userId?: string; // Optional - if authenticated
  secretWord: string;
  isAiGame?: boolean; // True to create AI opponent game
}

export interface JoinGameRequest {
  playerId: string;
  playerName: string;
  userId?: string; // Optional - if authenticated
  secretWord: string;
}

export interface MakeGuessRequest {
  playerId: string;
  guessWord: string;
}

export interface GameStateResponse {
  game: Game;
  guesses: Guess[];
  myTurn: boolean;
}

export interface ListGamesResponse {
  games: Game[];
}

// DynamoDB item types
export interface GameItem {
  PK: string;           // GAME#{gameId}
  SK: string;           // METADATA
  GSI1PK: string;       // STATUS#{status}
  GSI1SK: string;       // CREATED#{timestamp}
  gameId: string;
  status: GameStatus;
  player1Id: string;
  player1Name: string;
  player1UserId?: string;
  player1Secret: string;
  player2Id?: string;
  player2Name?: string;
  player2UserId?: string;
  player2Secret?: string;
  currentTurn?: string;
  winnerId?: string;
  isAiGame?: boolean;   // True if Player 2 is AI
  createdAt: string;
  updatedAt: string;
}

export interface GuessItem {
  PK: string;           // GAME#{gameId}
  SK: string;           // GUESS#{timestamp}#{playerId}
  gameId: string;
  playerId: string;
  guessWord: string;
  matchCount: number;
  timestamp: string;
  isWinningGuess: boolean;
}

export interface PlayerGameIndex {
  PK: string;           // PLAYER#{playerId}
  SK: string;           // GAME#{gameId}
  gameId: string;
  playerId: string;
  createdAt: string;
}
