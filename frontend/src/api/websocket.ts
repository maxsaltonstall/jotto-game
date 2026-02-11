/**
 * WebSocket client with auto-reconnection
 */

import type { ConnectionStatus, WebSocketMessage } from '../types/websocket';

type EventHandler = (data: any) => void;

interface EventHandlers {
  message: EventHandler[];
  connected: EventHandler[];
  disconnected: EventHandler[];
  reconnecting: EventHandler[];
  failed: EventHandler[];
  error: EventHandler[];
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private gameId: string = '';
  private playerId: string = '';
  private playerName: string = '';
  private handlers: EventHandlers = {
    message: [],
    connected: [],
    disconnected: [],
    reconnecting: [],
    failed: [],
    error: []
  };
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelays: number[] = [1000, 2000, 4000, 8000, 16000, 30000]; // Exponential backoff
  private reconnectTimeout: number | null = null;
  private heartbeatInterval: number | null = null;
  private status: ConnectionStatus = 'disconnected';
  private intentionallyClosed: boolean = false;

  /**
   * Connect to WebSocket server
   */
  connect(url: string, gameId: string, playerId: string, playerName: string = 'Anonymous'): void {
    this.url = url;
    this.gameId = gameId;
    this.playerId = playerId;
    this.playerName = playerName;
    this.intentionallyClosed = false;

    this.doConnect();
  }

  /**
   * Internal connection method
   */
  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    const queryParams = new URLSearchParams({
      gameId: this.gameId,
      playerId: this.playerId,
      playerName: this.playerName
    });

    const wsUrl = `${this.url}?${queryParams.toString()}`;

    console.log('Connecting to WebSocket:', wsUrl);
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.emit('connected', {});
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message.type);
          this.emit('message', message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        this.emit('error', { error: 'WebSocket error' });
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.stopHeartbeat();
        this.setStatus('disconnected');
        this.emit('disconnected', { code: event.code, reason: event.reason });

        // Attempt reconnection if not intentionally closed
        if (!this.intentionallyClosed) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.emit('error', { error: 'Failed to create WebSocket' });
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.intentionallyClosed) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.setStatus('failed');
      this.emit('failed', { attempts: this.reconnectAttempts });
      return;
    }

    const delay = this.reconnectDelays[Math.min(this.reconnectAttempts, this.reconnectDelays.length - 1)];
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.setStatus('reconnecting');
    this.emit('reconnecting', { attempt: this.reconnectAttempts + 1, delay });

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectAttempts++;
      this.doConnect();
    }, delay);
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    console.log('Disconnecting WebSocket');
    this.intentionallyClosed = true;
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Send a message to the server
   */
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Start heartbeat ping/pong
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'PING' });
      }
    }, 5 * 60 * 1000); // Ping every 5 minutes (reduced from 60s to minimize Lambda invocations)
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Register an event handler
   */
  on(event: keyof EventHandlers, handler: EventHandler): void {
    this.handlers[event].push(handler);
  }

  /**
   * Unregister an event handler
   */
  off(event: keyof EventHandlers, handler: EventHandler): void {
    const index = this.handlers[event].indexOf(handler);
    if (index > -1) {
      this.handlers[event].splice(index, 1);
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  private emit(event: keyof EventHandlers, data: any): void {
    this.handlers[event].forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    });
  }

  /**
   * Set connection status
   */
  private setStatus(status: ConnectionStatus): void {
    this.status = status;
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }
}
