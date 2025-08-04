/**
 * Example: Local Storage Auth Implementation
 * ⚠️ NOT RECOMMENDED - Shown for educational purposes
 * 
 * This shows how you COULD implement local storage auth,
 * but it's not recommended due to security concerns.
 */

interface CachedAuth {
  userId: string;
  email: string;
  expiresAt: number;
  // Never store tokens in local storage!
}

const AUTH_CACHE_KEY = 'auth_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export class LocalStorageAuth {
  /**
   * Store auth state (NOT tokens!) in local storage
   */
  static setAuthCache(user: any) {
    const cache: CachedAuth = {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + CACHE_DURATION,
    };
    
    try {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error('Failed to save auth cache:', e);
    }
  }
  
  /**
   * Check if user is authenticated based on cache
   */
  static isAuthenticated(): boolean {
    try {
      const cached = localStorage.getItem(AUTH_CACHE_KEY);
      if (!cached) return false;
      
      const data: CachedAuth = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > data.expiresAt) {
        this.clearAuthCache();
        return false;
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Get cached user info (not tokens!)
   */
  static getCachedUser(): Partial<CachedAuth> | null {
    try {
      const cached = localStorage.getItem(AUTH_CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedAuth = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > data.expiresAt) {
        this.clearAuthCache();
        return null;
      }
      
      // Return user info without sensitive data
      return {
        userId: data.userId,
        email: data.email,
      };
    } catch (e) {
      return null;
    }
  }
  
  /**
   * Clear auth cache
   */
  static clearAuthCache() {
    try {
      localStorage.removeItem(AUTH_CACHE_KEY);
    } catch (e) {
      console.error('Failed to clear auth cache:', e);
    }
  }
  
  /**
   * Extend cache expiration on activity
   */
  static extendSession() {
    const user = this.getCachedUser();
    if (user && user.userId && user.email) {
      this.setAuthCache(user);
    }
  }
}

/**
 * Example usage in a component:
 * 
 * // On login
 * const { data, error } = await supabase.auth.signIn(email, password);
 * if (data?.user) {
 *   LocalStorageAuth.setAuthCache(data.user);
 * }
 * 
 * // Check auth status
 * if (LocalStorageAuth.isAuthenticated()) {
 *   // Show authenticated content
 *   // BUT still verify with Supabase for sensitive operations!
 * }
 * 
 * // On activity
 * LocalStorageAuth.extendSession();
 * 
 * // On logout
 * LocalStorageAuth.clearAuthCache();
 */

/**
 * ⚠️ LIMITATIONS & RISKS:
 * 
 * 1. Security Risk: Local storage is vulnerable to XSS attacks
 * 2. No Token Storage: Never store actual auth tokens
 * 3. False Positives: Cache might say "authenticated" but session expired server-side
 * 4. Sync Issues: Multiple tabs might have different auth states
 * 5. No Auto-Refresh: Doesn't handle token refresh automatically
 * 
 * BETTER ALTERNATIVE: Use the in-memory session cache approach
 * shown in optimized-auth-provider.tsx
 */