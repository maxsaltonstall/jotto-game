/**
 * Datadog Real User Monitoring (RUM) initialization
 * Tracks frontend performance, errors, and user interactions
 */

import { datadogRum } from '@datadog/browser-rum';

export function initializeDatadogRUM() {
  // Only initialize if configuration is provided
  const applicationId = import.meta.env.VITE_DD_RUM_APP_ID;
  const clientToken = import.meta.env.VITE_DD_RUM_CLIENT_TOKEN;

  if (!applicationId || !clientToken) {
    console.warn('Datadog RUM not initialized: missing configuration');
    return;
  }

  datadogRum.init({
    applicationId,
    clientToken,
    site: 'datadoghq.com',
    service: 'jotto-frontend',
    env: import.meta.env.MODE || 'development',
    version: '1.0.0',
    sessionSampleRate: 100, // 100% of sessions
    sessionReplaySampleRate: 20, // 20% session replay
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask-user-input', // Mask sensitive user input
    allowedTracingUrls: [
      import.meta.env.VITE_API_URL,
      import.meta.env.VITE_WEBSOCKET_URL
    ]
  });

  // Start session tracking
  datadogRum.startSessionReplayRecording();

  console.log('Datadog RUM initialized');
}

/**
 * Track custom user actions
 */
export const RUMTracking = {
  trackGameCreated(gameId: string, isAiGame: boolean) {
    datadogRum.addAction('game.created', {
      gameId,
      isAiGame,
      timestamp: new Date().toISOString()
    });
  },

  trackGameJoined(gameId: string) {
    datadogRum.addAction('game.joined', {
      gameId,
      timestamp: new Date().toISOString()
    });
  },

  trackGuess(gameId: string, matchCount: number, isWinning: boolean) {
    datadogRum.addAction('game.guess', {
      gameId,
      matchCount,
      isWinning,
      timestamp: new Date().toISOString()
    });
  },

  trackGameCompleted(gameId: string, won: boolean, guessCount: number) {
    datadogRum.addAction('game.completed', {
      gameId,
      won,
      guessCount,
      timestamp: new Date().toISOString()
    });
  },

  trackWebSocketEvent(event: 'connected' | 'disconnected' | 'error', details?: Record<string, any>) {
    datadogRum.addAction(`websocket.${event}`, {
      ...details,
      timestamp: new Date().toISOString()
    });
  },

  trackError(error: Error, context?: Record<string, any>) {
    datadogRum.addError(error, {
      ...context,
      timestamp: new Date().toISOString()
    });
  },

  setUser(userId: string, userName: string) {
    datadogRum.setUser({
      id: userId,
      name: userName
    });
  }
};
