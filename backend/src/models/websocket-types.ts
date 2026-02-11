/**
 * WebSocket message types and interfaces
 */

import type { Game, Guess } from './types.js';

export type WebSocketMessageType =
  | 'GAME_UPDATE'
  | 'PLAYER_JOINED'
  | 'GAME_COMPLETED'
  | 'PONG'
  | 'ERROR';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp: string;
}

export interface GameUpdatePayload {
  game: Game;
  guesses: Guess[];
  myTurn?: boolean;
}

export interface PlayerJoinedPayload {
  game: Game;
  player2Name: string;
}

export interface GameCompletedPayload {
  game: Game;
  winnerId: string;
  winnerName: string;
}

export interface Connection {
  connectionId: string;
  gameId: string;
  playerId: string;
  playerName: string;
  connectedAt: string;
  ttl: number;
}

export interface ConnectionKey {
  PK: string; // GAME#{gameId}
  SK: string; // CONNECTION#{connectionId}
}
