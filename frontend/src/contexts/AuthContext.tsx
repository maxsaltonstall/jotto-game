/**
 * Auth Context - manages authentication state
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';

interface UserStats {
  totalGames: number;
  totalWins: number;
  totalGuesses: number;
  averageGuessesToWin: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  username: string | null;
  displayName: string | null;
  token: string | null;
  stats: UserStats | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshStats: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('jotto-auth-token');
    const storedUserId = localStorage.getItem('jotto-user-id');
    const storedUsername = localStorage.getItem('jotto-username');
    const storedDisplayName = localStorage.getItem('jotto-display-name');

    if (storedToken && storedUserId && storedUsername && storedDisplayName) {
      setToken(storedToken);
      setUserId(storedUserId);
      setUsername(storedUsername);
      setDisplayName(storedDisplayName);
      setIsAuthenticated(true);

      // Fetch stats
      api.getStats(storedUserId).then(setStats).catch(console.error);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await api.login(username, password);

    // Store auth data
    localStorage.setItem('jotto-auth-token', response.token);
    localStorage.setItem('jotto-user-id', response.userId);
    localStorage.setItem('jotto-username', response.username);
    localStorage.setItem('jotto-display-name', response.displayName);

    // Update state
    setToken(response.token);
    setUserId(response.userId);
    setUsername(response.username);
    setDisplayName(response.displayName);
    setStats(response.stats);
    setIsAuthenticated(true);
  };

  const register = async (username: string, password: string, displayName: string) => {
    const response = await api.register(username, password, displayName);

    // Store auth data
    localStorage.setItem('jotto-auth-token', response.token);
    localStorage.setItem('jotto-user-id', response.userId);
    localStorage.setItem('jotto-username', response.username);
    localStorage.setItem('jotto-display-name', response.displayName);

    // Update state
    setToken(response.token);
    setUserId(response.userId);
    setUsername(response.username);
    setDisplayName(response.displayName);
    setStats({ totalGames: 0, totalWins: 0, totalGuesses: 0, averageGuessesToWin: 0 });
    setIsAuthenticated(true);
  };

  const logout = () => {
    // Clear auth data
    localStorage.removeItem('jotto-auth-token');
    localStorage.removeItem('jotto-user-id');
    localStorage.removeItem('jotto-username');
    localStorage.removeItem('jotto-display-name');

    // Clear state
    setToken(null);
    setUserId(null);
    setUsername(null);
    setDisplayName(null);
    setStats(null);
    setIsAuthenticated(false);
  };

  const refreshStats = async () => {
    if (userId) {
      const newStats = await api.getStats(userId);
      setStats(newStats);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        username,
        displayName,
        token,
        stats,
        login,
        register,
        logout,
        refreshStats
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
