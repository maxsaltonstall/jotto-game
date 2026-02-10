/**
 * Type definitions for User and Authentication
 */

export interface User {
  userId: string;
  username: string;
  displayName: string;
  email?: string;
  createdAt: string;
  updatedAt: string;

  // Stats
  totalGames: number;
  totalWins: number;
  totalGuesses: number;
  averageGuessesToWin: number;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  displayName: string;
  email?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  username: string;
  displayName: string;
  token: string;
  stats: UserStats;
}

export interface RegisterResponse {
  userId: string;
  username: string;
  displayName: string;
  token: string;
}

export interface UserStats {
  totalGames: number;
  totalWins: number;
  totalGuesses: number;
  averageGuessesToWin: number;
}

// DynamoDB item types
export interface UserItem {
  PK: string;           // USER#{userId}
  SK: string;           // PROFILE
  userId: string;
  username: string;
  displayName: string;
  passwordHash: string;
  email?: string;
  createdAt: string;
  updatedAt: string;

  // Stats
  totalGames: number;
  totalWins: number;
  totalGuesses: number;
  averageGuessesToWin: number;
}

export interface UsernameIndexItem {
  PK: string;           // USERNAME#{username}
  SK: string;           // MAPPING
  userId: string;
}
