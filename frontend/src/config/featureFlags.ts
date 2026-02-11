/**
 * Feature flags for gradual rollout of new features
 */

export const FEATURE_FLAGS = {
  /**
   * Enable WebSocket for real-time game updates
   * When false, falls back to polling
   */
  USE_WEBSOCKETS: import.meta.env.VITE_USE_WEBSOCKETS === 'true'
};
