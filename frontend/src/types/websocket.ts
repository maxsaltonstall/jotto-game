/**
 * WebSocket types and interfaces for frontend
 */

import type { Game, Guess } from '../api/client';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export type WebSocketMessageType =
  | 'CONNECTED'
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

export interface ConnectedMessage extends WebSocketMessage {
  type: 'CONNECTED';
  connectionId: string;
  gameId: string;
  playerId: string;
}

export interface GameUpdateMessage extends WebSocketMessage {
  type: 'GAME_UPDATE';
  payload: {
    game: Game;
    guesses: Guess[];
    myTurn?: boolean;
  };
}

export interface PlayerJoinedMessage extends WebSocketMessage {
  type: 'PLAYER_JOINED';
  payload: {
    game: Game;
    player2Name: string;
  };
}

export interface GameCompletedMessage extends WebSocketMessage {
  type: 'GAME_COMPLETED';
  payload: {
    game: Game;
    winnerId: string;
    winnerName: string;
  };
}
