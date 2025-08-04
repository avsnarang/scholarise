/**
 * Auth Debug Utility
 * Helps monitor and debug authentication requests to prevent excessive calls
 */

let authRequestCount = 0;
let lastResetTime = Date.now();
const RESET_INTERVAL = 60000; // Reset counter every minute

export function trackAuthRequest(source: string) {
  const now = Date.now();
  
  // Reset counter every minute
  if (now - lastResetTime > RESET_INTERVAL) {
    console.log(`🔐 Auth requests in last minute: ${authRequestCount}`);
    authRequestCount = 0;
    lastResetTime = now;
  }
  
  authRequestCount++;
  
  // Warn if too many requests
  if (authRequestCount > 50) {
    console.warn(`⚠️ High auth request rate detected: ${authRequestCount} requests from ${source}`);
  }
  
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔐 Auth request #${authRequestCount} from: ${source}`);
  }
}

export function getAuthRequestStats() {
  return {
    count: authRequestCount,
    timeSinceReset: Date.now() - lastResetTime,
    requestsPerSecond: authRequestCount / ((Date.now() - lastResetTime) / 1000)
  };
}