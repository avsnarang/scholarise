/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import superjson from "superjson";
import { ZodError } from "zod";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

import { db } from "@/server/db";
import { withBranchFilter } from "@/utils/branch-filter";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */

interface CreateContextOptions {
  userId: string | null;
  auth: any;
  user?: {
    id: string;
    role?: string;
    roles?: string[];
    isHQ?: boolean;
    branchId?: string;
  } | null;
}

/**
 * This helper generates the "internals" for a tRPC context. If you need to use it, you can export
 * it from here.
 *
 * Examples of things you may need it for:
 * - testing, so we don't have to mock Next.js' req/res
 * - tRPC's `createSSGHelpers`, where we don't have req/res
 *
 * @see https://create.t3.gg/en/usage/trpc#-serverapitrpcts
 */
const createInnerTRPCContext = (opts: CreateContextOptions) => {
  // Log database state for debugging
  if (!db) {
    console.error("Database connection is null in createInnerTRPCContext");
  } else if (!db.designation) {
    console.error("Designation model is not available on the database client");
    console.log("Available models:", Object.keys(db).filter(key => !key.startsWith('_')));
  } else {
    console.log("Database connection successfully initialized");
  }

  return {
    userId: opts.userId,
    auth: opts.auth,
    user: opts.user,
    db,
  };
};

/**
 * This is the actual context you will use in your router. It will be used to process every request
 * that goes through your tRPC endpoint.
 *
 * @see https://trpc.io/docs/context
 */
export const createTRPCContext = async (
  opts: CreateNextContextOptions | FetchCreateContextFnOptions
) => {
  // For Pages Router (next adapter)
  if ('req' in opts && 'res' in opts) {
    try {
      // Get the authorization header
      const authHeader = opts.req.headers.authorization;
      let userId: string | null = null;
      
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Import createClient from @supabase/supabase-js to verify the token
        const { createClient } = await import('@supabase/supabase-js');
        const { env } = await import('@/env');
        
        const supabase = createClient(
          env.NEXT_PUBLIC_SUPABASE_URL,
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        
              try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        console.log('🔍 tRPC Context (App Router) - Token Verification:', {
          hasToken: !!token,
          tokenLength: token?.length || 0,
          hasUser: !!user,
          userId: user?.id,
          hasError: !!error,
          errorMessage: error?.message
        });
        if (!error && user) {
          userId = user.id;
        }
      } catch (authError) {
        console.error('Error verifying Supabase token:', authError);
        // If JWT is invalid, try to refresh the session
        if (authError instanceof Error && authError.message.includes('InvalidJWTToken')) {
          try {
            const { data: { session } } = await supabase.auth.refreshSession();
            if (session?.user) {
              userId = session.user.id;
            }
          } catch (refreshError) {
            console.error('Failed to refresh session:', refreshError);
          }
        }
      }
      }
      
      return createInnerTRPCContext({
        userId,
        auth: { userId },
      });
    } catch (error) {
      console.error('Error getting Pages Router auth:', error);
      return createInnerTRPCContext({
        userId: null,
        auth: { userId: null },
      });
    }
  }
  
  // For App Router (fetch adapter)
  try {
    const req = 'req' in opts 
      ? (opts.req as unknown as Request) 
      : (opts as FetchCreateContextFnOptions).req;
    
    // Get the authorization header from the Request object
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Import createClient from @supabase/supabase-js to verify the token
      const { createClient } = await import('@supabase/supabase-js');
      const { env } = await import('@/env');
      
      const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        console.log('🔍 tRPC Context - Token Verification:', {
          hasToken: !!token,
          tokenLength: token?.length || 0,
          hasUser: !!user,
          userId: user?.id,
          hasError: !!error,
          errorMessage: error?.message
        });
        if (!error && user) {
          userId = user.id;
        }
      } catch (authError) {
        console.error('Error verifying Supabase token:', authError);
      }
    }
    
    return createInnerTRPCContext({
      userId,
      auth: { userId },
    });
  } catch (error) {
    console.error('Error in createTRPCContext:', error);
    return createInnerTRPCContext({
      userId: null,
      auth: { userId: null },
    });
  }
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  const duration = end - start;
  
  // Only log slow operations or mutations in development to reduce noise
  if (t._config.isDev) {
    if (duration > 1000 || path.includes('create') || path.includes('update') || path.includes('delete')) {
      console.log(`[TRPC] ${path} took ${duration}ms to execute`);
    }
  }

  return result;
});

/**
 * Middleware for automatically adding branch filtering to procedures
 *
 * This middleware extracts the branchId from the input if available and ensures
 * that it's properly applied to database queries.
 */
const branchFilterMiddleware = t.middleware(async ({ ctx, next, input, path }) => {
  // Extract branchId from input if it exists
  const inputObj = input as Record<string, unknown>;
  const branchId = inputObj?.branchId as string | undefined;

  // Determine the model name from the path
  // Format is typically: router.procedure, e.g., academicSession.getAll
  const modelName = path.split('.')[0];

  // Pass the branchId to the context for use in procedures
  return next({
    ctx: {
      ...ctx,
      branchFilter: {
        branchId,
        // Helper function to add branch filter to where clauses
        addBranchFilter: <T extends Record<string, unknown>>(whereClause?: T) =>
          withBranchFilter(branchId, whereClause, modelName),
      },
    },
  });
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure
  .use(timingMiddleware)
  .use(branchFilterMiddleware); // Apply branch filtering to all procedures

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(branchFilterMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.userId) {
      console.log('❌ Protected Procedure - UNAUTHORIZED: No userId in context');
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
      },
    });
  });
