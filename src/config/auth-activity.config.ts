/**
 * Configuration for activity-aware authentication
 * Adjust these values to fine-tune the idle detection and token refresh behavior
 */

export const AUTH_ACTIVITY_CONFIG = {
  /**
   * Time in milliseconds before the app is considered idle
   * Default: 5 minutes
   */
  IDLE_TIMEOUT: 5 * 60 * 1000,

  /**
   * How often to check for idle state in milliseconds
   * Default: 30 seconds
   */
  ACTIVITY_CHECK_INTERVAL: 30 * 1000,

  /**
   * Minimum time between token refresh attempts in milliseconds
   * This prevents rapid refresh attempts that could trigger rate limits
   * Default: 60 seconds
   */
  MIN_REFRESH_INTERVAL: 60 * 1000,

  /**
   * Maximum backoff delay when rate limited in milliseconds
   * Default: 4 minutes
   */
  MAX_BACKOFF_DELAY: 4 * 60 * 1000,

  /**
   * Events that indicate user activity
   */
  ACTIVITY_EVENTS: [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'focus'
  ] as const,

  /**
   * Enable debug logging for activity tracking
   */
  DEBUG_MODE: false,
};