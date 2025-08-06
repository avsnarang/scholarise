"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabaseClient as supabase } from "@/lib/supabase/activity-aware-client";
import type { User, Session, AuthError } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session cache with memory storage
class SessionCache {
  private session: Session | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  
  async getSession(): Promise<Session | null> {
    const now = Date.now();
    
    // Return cached session if still valid
    if (this.session && (now - this.lastFetch) < this.CACHE_DURATION) {
      // Check if token will expire soon (within 5 minutes)
      const expiresAt = this.session.expires_at ? this.session.expires_at * 1000 : 0;
      if (expiresAt > now + 300000) { // 5 minutes buffer
        return this.session;
      }
    }
    
    // Fetch fresh session
    const { data: { session } } = await supabase.auth.getSession();
    this.session = session;
    this.lastFetch = now;
    
    return session;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializeRef = useRef(false);

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
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state change:', event);
        
        // Update cache
        sessionCache.setSession(newSession);
        
        // Update state
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Handle specific events
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        } else if (event === 'SIGNED_OUT') {
          sessionCache.clear();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data.session) {
      sessionCache.setSession(data.session);
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    
    if (!error && data.session) {
      sessionCache.setSession(data.session);
    }
    
    return { error };
  };

  const signOut = async () => {
    sessionCache.clear();
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const refreshSession = async () => {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (!error && session) {
      sessionCache.setSession(session);
      setSession(session);
      setUser(session.user);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Export the session cache for use in API utils
export { sessionCache };