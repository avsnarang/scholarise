'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';
import { supabaseClient, activityControls } from '@/lib/supabase/activity-aware-client';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<void>;
  activityStatus: () => any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session cache to reduce redundant fetches
class SessionCache {
  private session: Session | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds

  async getSession(): Promise<Session | null> {
    const now = Date.now();
    
    // Return cached session if still fresh
    if (this.session && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.session;
    }

    // Fetch fresh session
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      this.session = session;
      this.lastFetch = now;
      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  setSession(session: Session | null) {
    this.session = session;
    this.lastFetch = Date.now();
  }

  clear() {
    this.session = null;
    this.lastFetch = 0;
  }
}

const sessionCache = new SessionCache();

export function ActivityAwareAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializeRef = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize auth state once
  useEffect(() => {
    if (initializeRef.current) return;
    initializeRef.current = true;

    const initializeAuth = async () => {
      try {
        // Get initial session from cache
        const cachedSession = await sessionCache.getSession();
        if (cachedSession) {
          setSession(cachedSession);
          setUser(cachedSession.user);
          
          // Schedule periodic refresh checks (only when active)
          startRefreshSchedule(cachedSession);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[ActivityAwareAuth] Auth state change:', event);
        
        // Update cache
        sessionCache.setSession(newSession);
        
        // Update state
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Handle specific events
        switch (event) {
          case 'TOKEN_REFRESHED':
            console.log('[ActivityAwareAuth] Token refreshed successfully');
            break;
          case 'SIGNED_OUT':
            sessionCache.clear();
            stopRefreshSchedule();
            break;
          case 'SIGNED_IN':
            if (newSession) {
              startRefreshSchedule(newSession);
            }
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      stopRefreshSchedule();
    };
  }, []);

  // Start the refresh schedule
  const startRefreshSchedule = (session: Session) => {
    stopRefreshSchedule(); // Clear any existing schedule
    
    if (!session) return;
    
    // Calculate when the token expires
    const expiresAt = session.expires_at;
    if (!expiresAt) return;
    
    // Schedule refresh for 1 minute before expiry, but at least every 30 minutes
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = expiresAt - now;
    const refreshIn = Math.min(Math.max(expiresIn - 60, 60), 1800); // Between 1 min and 30 min
    
    console.log(`[ActivityAwareAuth] Scheduling refresh in ${refreshIn} seconds`);
    
    refreshIntervalRef.current = setTimeout(async () => {
      // Only refresh if app is active
      const status = activityControls.getStatus();
      if (status.isActive) {
        console.log('[ActivityAwareAuth] Performing scheduled refresh');
        await refreshSession();
      } else {
        console.log('[ActivityAwareAuth] Skipping refresh - app is idle');
      }
      
      // Re-schedule for the next refresh
      const currentSession = await sessionCache.getSession();
      if (currentSession) {
        startRefreshSchedule(currentSession);
      }
    }, refreshIn * 1000);
  };

  const stopRefreshSchedule = () => {
    if (refreshIntervalRef.current) {
      clearTimeout(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const signIn = async (email: string, password: string) => {
    // Resume activity on sign in
    activityControls.resumeRefresh();
    
    const { error, data } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data.session) {
      sessionCache.setSession(data.session);
      startRefreshSchedule(data.session);
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    // Resume activity on sign up
    activityControls.resumeRefresh();
    
    const { error, data } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    
    if (!error && data.session) {
      sessionCache.setSession(data.session);
      startRefreshSchedule(data.session);
    }
    
    return { error };
  };

  const signOut = async () => {
    sessionCache.clear();
    stopRefreshSchedule();
    activityControls.pauseRefresh();
    const { error } = await supabaseClient.auth.signOut();
    return { error };
  };

  const signInWithGoogle = async () => {
    // Resume activity on OAuth sign in
    activityControls.resumeRefresh();
    
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const refreshSession = async () => {
    try {
      // Check if we should refresh
      const status = activityControls.getStatus();
      if (!status.isActive) {
        console.log('[ActivityAwareAuth] Skipping refresh - app is idle');
        return;
      }
      
      const { data: { session }, error } = await supabaseClient.auth.refreshSession();
      if (!error && session) {
        sessionCache.setSession(session);
        setSession(session);
        setUser(session.user);
        console.log('[ActivityAwareAuth] Session refreshed successfully');
      } else if (error) {
        console.error('[ActivityAwareAuth] Refresh error:', error);
        
        // If we get a rate limit error, pause refreshing
        if (error.message?.includes('rate') || error.status === 429) {
          console.log('[ActivityAwareAuth] Rate limited - pausing refresh');
          activityControls.pauseRefresh();
          
          // Resume after a delay
          setTimeout(() => {
            activityControls.resumeRefresh();
          }, 5 * 60 * 1000); // 5 minutes
        }
      }
    } catch (err) {
      console.error('[ActivityAwareAuth] Unexpected refresh error:', err);
    }
  };

  const activityStatus = () => activityControls.getStatus();

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    refreshSession,
    activityStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}