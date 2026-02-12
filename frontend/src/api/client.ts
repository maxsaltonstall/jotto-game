/**
 * API client for Jotto game backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Game {
  gameId: string;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
  player1Id: string;
  player1Name: string;
  player2Id?: string;
  player2Name?: string;
  currentTurn?: string;
  winnerId?: string; // First player to guess correctly
  player1Completed?: boolean; // True if player1 guessed correctly
  player2Completed?: boolean; // True if player2 guessed correctly
  createdAt: string;
  updatedAt: string;
}

export interface Guess {
  gameId: string;
  playerId: string;
  guessWord: string;
  matchCount: number;
  timestamp: string;
  isWinningGuess: boolean;
}

export interface GameStateResponse {
  game: Game;
  guesses: Guess[];
  myTurn: boolean;
}

export interface UserStats {
  totalGames: number;
  totalWins: number;
  totalGuesses: number;
  averageGuessesToWin: number;
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

class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  // Get auth token from localStorage
  const token = localStorage.getItem('jotto-auth-token');

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options?.headers
      }
    });

    // Handle 304 Not Modified specially
    if (response.status === 304) {
      throw new ApiError(304, 'Not Modified');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiError(response.status, error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const api = {
  /**
   * Create a new game
   */
  async createGame(playerId: string, playerName: string, secretWord: string, userId?: string): Promise<Game> {
    const response = await request<{ game: Game }>('/games', {
      method: 'POST',
      body: JSON.stringify({ playerId, playerName, secretWord, userId })
    });
    return response.game;
  },

  /**
   * Create a game against AI opponent
   */
  async createAIGame(playerId: string, playerName: string, secretWord: string, userId?: string): Promise<Game> {
    const response = await request<{ game: Game }>('/ai-game', {
      method: 'POST',
      body: JSON.stringify({ playerId, playerName, secretWord, userId, isAiGame: true })
    });
    return response.game;
  },

  /**
   * Join an existing game
   */
  async joinGame(gameId: string, playerId: string, playerName: string, secretWord: string, userId?: string): Promise<Game> {
    const response = await request<{ game: Game }>(`/games/${gameId}/join`, {
      method: 'POST',
      body: JSON.stringify({ playerId, playerName, secretWord, userId })
    });
    return response.game;
  },

  /**
   * Make a guess
   */
  async makeGuess(gameId: string, playerId: string, guessWord: string): Promise<Guess> {
    const response = await request<{ guess: Guess }>(`/games/${gameId}/guess`, {
      method: 'POST',
      body: JSON.stringify({ playerId, guessWord })
    });
    return response.guess;
  },

  /**
   * Get game state with optional ETag for caching
   */
  async getGameState(gameId: string, playerId?: string, etag?: string): Promise<GameStateResponse | null> {
    const query = playerId ? `?playerId=${playerId}` : '';
    const headers: Record<string, string> = {};

    if (etag) {
      headers['If-None-Match'] = etag;
    }

    try {
      return await request<GameStateResponse>(`/games/${gameId}${query}`, { headers });
    } catch (error) {
      // If 304 Not Modified, return null to indicate cached version is still valid
      if (error instanceof ApiError && error.statusCode === 304) {
        return null;
      }
      throw error;
    }
  },

  /**
   * List games by status
   */
  async listGames(status: 'WAITING' | 'ACTIVE' = 'WAITING'): Promise<Game[]> {
    const response = await request<{ games: Game[] }>(`/games?status=${status}`);
    return response.games;
  },

  /**
   * Register a new user
   */
  async register(username: string, password: string, displayName: string): Promise<RegisterResponse> {
    return await request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName })
    });
  },

  /**
   * Login user
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    return await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  /**
   * Get user stats
   */
  async getStats(userId: string): Promise<UserStats> {
    const response = await request<{ stats: UserStats }>(`/auth/stats?userId=${userId}`);
    return response.stats;
  }
};
