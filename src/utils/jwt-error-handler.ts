/**
 * Centralized JWT error handling utility
 * 
 * When invalid JWT tokens are detected, this handler:
 * 1. Immediately signs out the user
 * 2. Clears all auth state and tokens
 * 3. Prevents unhandled promise rejections
 * 4. Optionally redirects to sign-in page
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface JWTErrorHandlerOptions {
  /** Whether to redirect to sign-in page (client-side only) */
  redirectToSignIn?: boolean;
  /** Whether to log the error for debugging */
  logError?: boolean;
  /** Custom redirect URL */
  redirectUrl?: string;
}

class JWTErrorHandler {
  private static instance: JWTErrorHandler;
  private isClientSide = typeof window !== 'undefined';

  static getInstance(): JWTErrorHandler {
    if (!this.instance) {
      this.instance = new JWTErrorHandler();
    }
    return this.instance;
  }

  /**
   * Handle JWT validation errors by signing out the user
   */
  async handleJWTError(
    error: Error, 
    supabaseClient?: SupabaseClient<any, any, any>,
    options: JWTErrorHandlerOptions = {}
  ): Promise<void> {
    const { 
      redirectToSignIn = true, 
      logError = true,
      redirectUrl = '/sign-in'
    } = options;

    if (logError) {
      console.warn('JWT Error detected, signing out user:', error.message);
    }

    try {
      // Sign out from Supabase
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      } else if (this.isClientSide) {
        // If no client provided and we're on client side, create one and sign out
        const { env } = await import('@/env');
        const supabase = createClient(
          env.NEXT_PUBLIC_SUPABASE_URL,
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        await supabase.auth.signOut();
      }

      // Clear any local storage auth data
      if (this.isClientSide) {
        this.clearClientSideAuthData();
        
        // Redirect to sign-in if requested
        if (redirectToSignIn) {
          window.location.href = redirectUrl;
        }
      }

    } catch (signOutError) {
      if (logError) {
        console.error('Error during JWT error handling sign-out:', signOutError);
      }
      
      // Even if sign-out fails, clear client-side data and redirect
      if (this.isClientSide) {
        this.clearClientSideAuthData();
        if (redirectToSignIn) {
          window.location.href = redirectUrl;
        }
      }
    }
  }

  /**
   * Check if an error is a JWT-related error that should trigger sign-out
   */
  isJWTError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const message = error.message.toLowerCase();
    return (
      message.includes('invalidjwttoken') ||
      message.includes('invalid jwt') ||
      message.includes('jwt expired') ||
      message.includes('invalid value for jwt claim') ||
      message.includes('jwt malformed') ||
      message.includes('jwt signature verification failed')
    );
  }

  /**
   * Wrapper for JWT validation that handles errors gracefully
   */
  async safeJWTValidation<T>(
    validationFn: () => Promise<T>,
    supabaseClient?: SupabaseClient<any, any, any>,
    options: JWTErrorHandlerOptions = {}
  ): Promise<T | null> {
    try {
      return await validationFn();
    } catch (error) {
      if (this.isJWTError(error)) {
        // Don't await this to prevent blocking
        this.handleJWTError(error as Error, supabaseClient, options);
        return null;
      }
      // Re-throw non-JWT errors
      throw error;
    }
  }

  /**
   * Clear client-side authentication data
   */
  private clearClientSideAuthData(): void {
    if (!this.isClientSide) return;

    try {
      // Clear localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('supabase') || 
          key.includes('sb-') || 
          key.includes('auth')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear sessionStorage
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.includes('supabase') || 
          key.includes('sb-') || 
          key.includes('auth')
        )) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

    } catch (error) {
      console.warn('Error clearing client-side auth data:', error);
    }
  }
}

// Export singleton instance
export const jwtErrorHandler = JWTErrorHandler.getInstance();

// Export utility functions for convenience
export const handleJWTError = (
  error: Error, 
  supabaseClient?: SupabaseClient<any, any, any>,
  options?: JWTErrorHandlerOptions
) => jwtErrorHandler.handleJWTError(error, supabaseClient, options);

export const isJWTError = (error: unknown) => jwtErrorHandler.isJWTError(error);

export const safeJWTValidation = <T>(
  validationFn: () => Promise<T>,
  supabaseClient?: SupabaseClient<any, any, any>,
  options?: JWTErrorHandlerOptions
) => jwtErrorHandler.safeJWTValidation(validationFn, supabaseClient, options);