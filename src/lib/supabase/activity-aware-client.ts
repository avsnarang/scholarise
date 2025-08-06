import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';
import { AUTH_ACTIVITY_CONFIG } from '@/config/auth-activity.config';

// Activity tracking
let lastActivityTime = Date.now();
let isAppActive = true;
let activityCheckInterval: NodeJS.Timeout | null = null;
let refreshTimeout: NodeJS.Timeout | null = null;

// Track last refresh attempt
let lastRefreshAttempt = 0;

// Use configuration
const {
  IDLE_TIMEOUT,
  ACTIVITY_CHECK_INTERVAL,
  MIN_REFRESH_INTERVAL,
  MAX_BACKOFF_DELAY,
  ACTIVITY_EVENTS,
  DEBUG_MODE
} = AUTH_ACTIVITY_CONFIG;

// Update last activity time
function updateActivity() {
  lastActivityTime = Date.now();
  
  // If app was inactive and now active, trigger a single refresh
  if (!isAppActive) {
    if (DEBUG_MODE) console.log('[Auth] App became active, scheduling token refresh');
    isAppActive = true;
    scheduleTokenRefresh();
  }
}

// Check if the app is idle
function checkIdleState() {
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivityTime;
  
  if (timeSinceLastActivity > IDLE_TIMEOUT && isAppActive) {
    if (DEBUG_MODE) console.log('[Auth] App is idle, pausing token refresh');
    isAppActive = false;
    
    // Clear any pending refresh
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = null;
    }
  }
}

// Schedule a controlled token refresh
function scheduleTokenRefresh() {
  // Clear any existing timeout
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
  
  // Only schedule if app is active
  if (!isAppActive) {
    return;
  }
  
  // Ensure minimum interval between refreshes
  const now = Date.now();
  const timeSinceLastRefresh = now - lastRefreshAttempt;
  
  if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
    // Schedule for later
    const delay = MIN_REFRESH_INTERVAL - timeSinceLastRefresh;
    refreshTimeout = setTimeout(() => scheduleTokenRefresh(), delay);
    return;
  }
  
  // Perform the refresh
  lastRefreshAttempt = now;
  supabaseClient.auth.refreshSession().then(({ data, error }) => {
    if (error) {
      console.error('[Auth] Token refresh error:', error);
      
      // If rate limited, back off exponentially
      if (error.message?.includes('rate') || error.status === 429) {
        const backoffDelay = Math.min(MIN_REFRESH_INTERVAL * 4, MAX_BACKOFF_DELAY);
        console.log(`[Auth] Rate limited, backing off for ${backoffDelay / 1000}s`);
        refreshTimeout = setTimeout(() => scheduleTokenRefresh(), backoffDelay);
      }
    } else if (data.session) {
      if (DEBUG_MODE) console.log('[Auth] Token refreshed successfully');
    }
  }).catch(err => {
    console.error('[Auth] Unexpected refresh error:', err);
  });
}

// Initialize activity tracking
function initActivityTracking() {
  if (typeof window === 'undefined') return;
  
  // Add activity listeners
  ACTIVITY_EVENTS.forEach(event => {
    window.addEventListener(event, updateActivity, { passive: true });
  });
  
  // Start idle checking
  activityCheckInterval = setInterval(checkIdleState, ACTIVITY_CHECK_INTERVAL);
  
  // Track visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (DEBUG_MODE) console.log('[Auth] Page hidden, marking as inactive');
      isAppActive = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }
    } else {
      if (DEBUG_MODE) console.log('[Auth] Page visible, marking as active');
      updateActivity();
    }
  });
  
  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    if (activityCheckInterval) {
      clearInterval(activityCheckInterval);
    }
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
  });
}

// Create the Supabase client with custom configuration
export const supabaseClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false, // Disable automatic refresh, we'll handle it manually
      persistSession: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key: string) => {
          if (typeof window !== 'undefined') {
            return document.cookie
              .split('; ')
              .find((row) => row.startsWith(`${key}=`))
              ?.split('=')[1] || null;
          }
          return null;
        },
        setItem: (key: string, value: string) => {
          if (typeof window !== 'undefined') {
            document.cookie = `${key}=${value}; path=/; SameSite=Strict; Secure=${window.location.protocol === 'https:'}`;
          }
        },
        removeItem: (key: string) => {
          if (typeof window !== 'undefined') {
            document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
          }
        },
      },
    }
  }
);

// Initialize activity tracking when in browser
if (typeof window !== 'undefined') {
  initActivityTracking();
}

// Export utilities for manual control
export const activityControls = {
  pauseRefresh: () => {
    if (DEBUG_MODE) console.log('[Auth] Manually pausing refresh');
    isAppActive = false;
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = null;
    }
  },
  resumeRefresh: () => {
    if (DEBUG_MODE) console.log('[Auth] Manually resuming refresh');
    updateActivity();
  },
  forceRefresh: () => {
    if (DEBUG_MODE) console.log('[Auth] Forcing immediate refresh');
    lastRefreshAttempt = 0;
    scheduleTokenRefresh();
  },
  getStatus: () => ({
    isActive: isAppActive,
    lastActivity: new Date(lastActivityTime).toISOString(),
    timeSinceActivity: Math.floor((Date.now() - lastActivityTime) / 1000),
    lastRefreshAttempt: lastRefreshAttempt ? new Date(lastRefreshAttempt).toISOString() : 'Never'
  })
};