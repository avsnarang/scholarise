import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { createClient } from '@supabase/supabase-js';

import { env } from "@/env";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

// We create a simplified version of the context here
// The actual context creation happens in src/server/api/trpc.ts
export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

async function handleRequest(req: NextRequest) {
  // Create Supabase client for auth with all possible cookie keys
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        storage: {
          getItem: (key: string) => {
            return req.cookies.get(key)?.value || null;
          },
          setItem: () => {},
          removeItem: () => {},
        },
      },
    }
  );

  // Try multiple approaches to get the session
  let session = null;
  let user = null;
  let userId = null;

  // Approach 1: Try getSession first
  const { data: { session: supabaseSession } } = await supabase.auth.getSession();
  if (supabaseSession?.user) {
    session = supabaseSession;
    user = supabaseSession.user;
    userId = user.id;
  }

  // Approach 2: If no session, try to extract access token from cookies directly
  if (!session) {
    // Generate the correct cookie name based on the actual Supabase URL
    const supabaseHostname = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;
    const projectId = supabaseHostname.split('.')[0];
    const cookieName = `sb-${projectId}-auth-token`;
    
        const accessToken = req.cookies.get(cookieName)?.value;
    if (accessToken) {
      try {
        const { data: { user: tokenUser } } = await supabase.auth.getUser(accessToken);
        if (tokenUser) {
          user = tokenUser;
          userId = tokenUser.id;
        }
      } catch (error: unknown) {
        // Handle JWT validation errors by attempting refresh
        if (error instanceof Error && error.message.includes('InvalidJWTToken')) {
          try {
            const { data: { session } } = await supabase.auth.refreshSession();
            if (session?.user) {
              user = session.user;
              userId = session.user.id;
            }
          } catch (refreshError) {
            console.error('Failed to refresh session after JWT error:', refreshError);
          }
        }
      }
    }
  }

  // Approach 3: Check for authorization header as fallback
  if (!user && req.headers.get('authorization')) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (token) {
      try {
        const { data: { user: headerUser } } = await supabase.auth.getUser(token);
        if (headerUser) {
          user = headerUser;
          userId = headerUser.id;
        }
      } catch (error: unknown) {
        // Ignore token validation errors
      }
    }
  }

  // Approach 4: Check common cookie names for Supabase auth tokens
  if (!user) {
    const cookieNames = [
      `sb-${new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]}-auth-token`,
      'sb-access-token',
      'supabase-auth-token',
      'supabase.auth.token'
    ];
    
    for (const cookieName of cookieNames) {
      const token = req.cookies.get(cookieName)?.value;
      if (token) {
        try {
          const { data: { user: cookieUser } } = await supabase.auth.getUser(token);
          if (cookieUser) {
            user = cookieUser;
            userId = cookieUser.id;
            break;
          }
        } catch (error: unknown) {
          // Continue to next cookie name
        }
      }
    }
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => {
      // Create context with proper user ID, metadata, and database connection
      return {
        userId,
        auth: { userId },
        user: user ? {
          id: user.id,
          role: user.user_metadata?.role as string,
          roles: user.user_metadata?.roles as string[],
          isHQ: user.user_metadata?.isHQ as boolean,
          branchId: user.user_metadata?.branchId as string,
        } : null,
        db,
      };
    },
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });
} 