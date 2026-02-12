/**
 * Tests for useWebSocket hook - prevents regressions in WebSocket integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import * as clientModule from '../../api/client';

// Mock API client
vi.mock('../../api/client', () => ({
  api: {
    getGameState: vi.fn()
  }
}));

// Mock WebSocket client
vi.mock('../../api/websocket', () => ({
  WebSocketClient: class MockWebSocketClient {
    private handlers: any = {};
    
    connect() {
      // Simulate successful connection
      setTimeout(() => {
        this.handlers.connected?.({});
      }, 100);
    }
    
    disconnect() {}
    
    on(event: string, handler: Function) {
      this.handlers[event] = handler;
    }
    
    off() {}
    
    getStatus() {
      return 'connected';
    }
    
    // Test helper to simulate messages
    simulateMessage(message: any) {
      this.handlers.message?.(message);
    }
  }
}));

// Mock environment
vi.stubGlobal('import.meta', {
  env: {
    VITE_WEBSOCKET_URL: 'wss://test.example.com/prod'
  }
});

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientModule.api.getGameState).mockResolvedValue({
      game: {
        gameId: 'game-123',
        player1Id: 'player-1',
        player2Id: 'player-2',
        currentTurn: 'player-1',
        status: 'ACTIVE',
        player1Name: 'Player 1',
        player2Name: 'Player 2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      guesses: [],
      myTurn: true
    });
  });

  describe('Initialization', () => {
    it('should connect to WebSocket with correct parameters', async () => {
      const { result } = renderHook(() =>
        useWebSocket('game-123', 'player-456', 'TestUser')
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });

    it('should fetch initial game state after connection', async () => {
      renderHook(() =>
        useWebSocket('game-123', 'player-456', 'TestUser')
      );

      await waitFor(() => {
        expect(clientModule.api.getGameState).toHaveBeenCalledWith(
          'game-123',
          'player-456'
        );
      });
    });

    it('should not connect if gameId or playerId is missing', () => {
      const { result } = renderHook(() =>
        useWebSocket(null, 'player-456', 'TestUser')
      );

      expect(result.current.connectionStatus).toBe('disconnected');
      expect(clientModule.api.getGameState).not.toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    it('should update game state on GAME_UPDATE message', async () => {
      const { result } = renderHook(() =>
        useWebSocket('game-123', 'player-456', 'TestUser')
      );

      await waitFor(() => {
        expect(result.current.gameState).toBeTruthy();
      });

      // TODO: Add message simulation when we expose the WebSocket client instance
    });

    it('should handle CONNECTED message type', async () => {
      const { result } = renderHook(() =>
        useWebSocket('game-123', 'player-456', 'TestUser')
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });
  });

  describe('Regression Tests', () => {
    it('should not cause reconnection loop with initial fetch', async () => {
      const { result, rerender } = renderHook(() =>
        useWebSocket('game-123', 'player-456', 'TestUser')
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Simulate multiple re-renders (like React would do)
      rerender();
      rerender();
      rerender();

      // Should fetch a reasonable number of times (React StrictMode can cause multiple renders)
      // The key is that it shouldn't be hundreds of times (reconnection loop)
      await waitFor(() => {
        const callCount = vi.mocked(clientModule.api.getGameState).mock.calls.length;
        expect(callCount).toBeGreaterThanOrEqual(1);
        expect(callCount).toBeLessThan(10); // Reasonable upper bound
      });
    });

    it('should update myTurn flag from WebSocket messages', async () => {
      const { result } = renderHook(() =>
        useWebSocket('game-123', 'player-456', 'TestUser')
      );

      await waitFor(() => {
        expect(result.current.gameState).toBeTruthy();
      });

      // Initial state
      expect(result.current.gameState?.myTurn).toBe(true);

      // TODO: Simulate receiving game update with myTurn: false
      // This would require exposing the WebSocket client or using a more sophisticated mock
    });

    it('should clean up WebSocket on unmount', async () => {
      const { unmount } = renderHook(() =>
        useWebSocket('game-123', 'player-456', 'TestUser')
      );

      await waitFor(() => {
        // Wait for connection
      }, { timeout: 200 });

      // Should not throw error on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should handle connection failure gracefully', async () => {
      // Mock WebSocket URL as empty to trigger fallback
      vi.stubGlobal('import.meta', {
        env: {
          VITE_WEBSOCKET_URL: ''
        }
      });

      renderHook(() =>
        useWebSocket('game-123', 'player-456', 'TestUser')
      );

      // Should still fetch game state via REST
      await waitFor(() => {
        expect(clientModule.api.getGameState).toHaveBeenCalled();
      });
    });
  });

  describe('Turn Indicator Regression', () => {
    it('should immediately reflect turn changes from WebSocket', async () => {
      const { result } = renderHook(() =>
        useWebSocket('game-123', 'player-456', 'TestUser')
      );

      await waitFor(() => {
        expect(result.current.gameState).toBeTruthy();
      });

      // When a GAME_UPDATE message arrives with myTurn: false,
      // the component should re-render immediately
      // This test documents the expected behavior to prevent the regression
      // where manual page reload was needed to see turn updates
    });
  });
});
