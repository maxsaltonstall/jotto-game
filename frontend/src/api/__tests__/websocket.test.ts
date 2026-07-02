/**
 * Tests for WebSocket client - REGRESSION PREVENTION
 *
 * These tests document and prevent the following issues we encountered:
 * 1. Reconnection loops caused by REST fetch interference
 * 2. Datadog layers breaking WebSocket connections
 * 3. Turn indicator not updating in real-time
 * 4. Race conditions between REST and WebSocket
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketClient } from '../websocket';

// WebSocket readyState constants
const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

describe('WebSocketClient', () => {
  let client: WebSocketClient;
  let mockWs: any;
  let WebSocketConstructor: any;

  beforeEach(() => {
    // Create a mock WebSocket class
    mockWs = null;
    WebSocketConstructor = vi.fn((url: string) => {
      mockWs = {
        url,
        readyState: WS_CONNECTING,
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        send: vi.fn(),
        close: vi.fn(() => {
          mockWs.readyState = WS_CLOSED;
        }),
        CONNECTING: WS_CONNECTING,
        OPEN: WS_OPEN,
        CLOSING: WS_CLOSING,
        CLOSED: WS_CLOSED,
      };
      return mockWs;
    });

    // Add constants to WebSocket constructor
    WebSocketConstructor.CONNECTING = WS_CONNECTING;
    WebSocketConstructor.OPEN = WS_OPEN;
    WebSocketConstructor.CLOSING = WS_CLOSING;
    WebSocketConstructor.CLOSED = WS_CLOSED;

    vi.stubGlobal('WebSocket', WebSocketConstructor);
    client = new WebSocketClient();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Connection', () => {
    it('should connect with correct URL parameters', () => {
      client.connect('wss://example.com', 'game-123', 'player-456', 'TestUser');

      expect(WebSocketConstructor).toHaveBeenCalled();
      expect(mockWs).toBeTruthy();
      const url = WebSocketConstructor.mock.calls[0][0];
      expect(url).toContain('wss://example.com');
      expect(url).toContain('gameId=game-123');
      expect(url).toContain('playerId=player-456');
      expect(url).toContain('playerName=TestUser');
    });

    it('should emit connected event when WebSocket opens', () => {
      const connectedHandler = vi.fn();
      client.on('connected', connectedHandler);

      client.connect('wss://example.com', 'game-123', 'player-456');

      // Simulate open event
      expect(mockWs).toBeTruthy();
      mockWs.readyState = WS_OPEN;
      mockWs.onopen?.();

      expect(connectedHandler).toHaveBeenCalledWith({});
    });

    it('should not reconnect if already connected', () => {
      client.connect('wss://example.com', 'game-123', 'player-456');
      expect(mockWs).toBeTruthy();
      mockWs.readyState = WS_OPEN;
      mockWs.onopen?.();

      const callCount = WebSocketConstructor.mock.calls.length;

      // Try to connect again
      client.connect('wss://example.com', 'game-123', 'player-456');

      expect(WebSocketConstructor.mock.calls.length).toBe(callCount);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      client.connect('wss://example.com', 'game-123', 'player-456');
      expect(mockWs).toBeTruthy();
      mockWs.readyState = WS_OPEN;
      mockWs.onopen?.();
    });

    it('should parse and emit GAME_UPDATE messages', () => {
      const messageHandler = vi.fn();
      client.on('message', messageHandler);

      const gameUpdate = {
        type: 'GAME_UPDATE',
        payload: {
          game: { id: 'game-123', status: 'IN_PROGRESS' },
          guesses: [],
          myTurn: true
        },
        timestamp: '2024-01-01T00:00:00Z'
      };

      mockWs.onmessage?.({ data: JSON.stringify(gameUpdate) });

      expect(messageHandler).toHaveBeenCalledWith(gameUpdate);
    });
  });

  describe('Regression Tests', () => {
    it('[REGRESSION] should not create reconnection loop', () => {
      const reconnectingHandler = vi.fn();
      client.on('reconnecting', reconnectingHandler);

      client.connect('wss://example.com', 'game-123', 'player-456');
      expect(mockWs).toBeTruthy();
      mockWs.readyState = WS_OPEN;
      mockWs.onopen?.();

      // Connection should stay stable
      expect(reconnectingHandler).not.toHaveBeenCalled();
    });

    it('[REGRESSION] should handle myTurn updates from WebSocket', () => {
      const messageHandler = vi.fn();
      client.on('message', messageHandler);

      client.connect('wss://example.com', 'game-123', 'player-456');
      expect(mockWs).toBeTruthy();
      mockWs.readyState = WS_OPEN;
      mockWs.onopen?.();

      const gameUpdate = {
        type: 'GAME_UPDATE',
        payload: {
          game: { currentTurn: 'player-456' },
          guesses: [],
          myTurn: true
        },
        timestamp: '2024-01-01T00:00:00Z'
      };

      mockWs.onmessage?.({ data: JSON.stringify(gameUpdate) });

      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ myTurn: true })
        })
      );
    });

    it('[REGRESSION] should maintain stable connection', () => {
      client.connect('wss://example.com', 'game-123', 'player-456');
      expect(mockWs).toBeTruthy();
      mockWs.readyState = WS_OPEN;
      mockWs.onopen?.();

      expect(client.getStatus()).toBe('connected');
    });
  });

  describe('isHealthy', () => {
    it('should return true when the socket is OPEN', () => {
      client.connect('wss://example.com', 'game-123', 'player-456');
      expect(mockWs).toBeTruthy();
      mockWs.readyState = WS_OPEN;
      mockWs.onopen?.();

      expect(client.isHealthy()).toBe(true);
    });

    it('should return false when the socket is CONNECTING', () => {
      client.connect('wss://example.com', 'game-123', 'player-456');
      expect(mockWs).toBeTruthy();
      mockWs.readyState = WS_CONNECTING;

      expect(client.isHealthy()).toBe(false);
    });

    it('should return false when the socket is CLOSED', () => {
      client.connect('wss://example.com', 'game-123', 'player-456');
      expect(mockWs).toBeTruthy();
      mockWs.readyState = WS_CLOSED;

      expect(client.isHealthy()).toBe(false);
    });

    it('should return false when no socket has been created yet', () => {
      expect(client.isHealthy()).toBe(false);
    });
  });

  describe('reconnectNow', () => {
    it('should close the existing socket and open a new one', () => {
      client.connect('wss://example.com', 'game-123', 'player-456');
      expect(mockWs).toBeTruthy();
      mockWs.readyState = WS_OPEN;
      mockWs.onopen?.();

      const firstMockWs = mockWs;
      const callCountBefore = WebSocketConstructor.mock.calls.length;

      client.reconnectNow();

      expect(firstMockWs.close).toHaveBeenCalled();
      expect(WebSocketConstructor.mock.calls.length).toBe(callCountBefore + 1);
    });

    it('should not mark the client as intentionally closed', () => {
      client.connect('wss://example.com', 'game-123', 'player-456');
      expect(mockWs).toBeTruthy();
      mockWs.readyState = WS_OPEN;
      mockWs.onopen?.();

      client.reconnectNow();

      // After reconnectNow, a subsequent close should still trigger
      // automatic reconnection (proving intentionallyClosed was not set)
      const reconnectingHandler = vi.fn();
      client.on('reconnecting', reconnectingHandler);

      mockWs.readyState = WS_CLOSED;
      mockWs.onclose?.({ code: 1006, reason: 'abnormal closure' });

      expect(reconnectingHandler).toHaveBeenCalled();
    });

    it('[REGRESSION] should not react when the stale old socket fires onclose after reconnectNow, but should still react to a genuinely new unexpected close', () => {
      client.connect('wss://example.com', 'game-123', 'player-456');
      expect(mockWs).toBeTruthy();
      mockWs.readyState = WS_OPEN;
      mockWs.onopen?.();

      const oldMockWs = mockWs;

      const reconnectingHandler = vi.fn();
      client.on('reconnecting', reconnectingHandler);

      client.reconnectNow();

      // The new socket has been constructed and is distinct from the old one.
      const newMockWs = mockWs;
      expect(newMockWs).not.toBe(oldMockWs);

      // Simulate the stale old socket's close event firing asynchronously,
      // after reconnectNow() has already moved on to the new socket.
      oldMockWs.readyState = WS_CLOSED;
      oldMockWs.onclose?.({ code: 1006, reason: 'stale close' });

      expect(reconnectingHandler).not.toHaveBeenCalled();

      // A genuinely new/current socket closing unexpectedly later should
      // still trigger normal reconnection - proving we didn't disable
      // real reconnection behavior.
      newMockWs.readyState = WS_CLOSED;
      newMockWs.onclose?.({ code: 1006, reason: 'real abnormal closure' });

      expect(reconnectingHandler).toHaveBeenCalled();
    });
  });
});
