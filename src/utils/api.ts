/**
 * This is the client-side entrypoint for your tRPC API. It is used to create the `api` object which
 * contains the Next.js App-wrapper, as well as your type-safe React Query hooks.
 *
 * We also create a few inference helpers for input and output types.
 */
import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import superjson from "superjson";
import { supabase } from "@/lib/supabase/client";

import { type AppRouter } from "@/server/api/root";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

// For App Router with client components
export const api = createTRPCReact<AppRouter>({
  // Remove the global override that invalidates all queries on mutation success
  // This was causing infinite loops as any mutation would invalidate all queries including getAttendanceByDate
  // Instead, we'll handle invalidations manually in each specific mutation
});

// Common links configuration with transformer
const commonLinks = [
  loggerLink({
    enabled: (opts) => {
      // Only log errors in both development and production
      return opts.direction === "down" && opts.result instanceof Error;
    },
  }),
  httpBatchLink({
    url: `${getBaseUrl()}/api/trpc`,
    transformer: superjson,
    headers: async () => {
      try {
        // Get the current session from Supabase with retries
        let session = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!session && attempts < maxAttempts) {
          const { data } = await supabase.auth.getSession();
          session = data.session;
          attempts++;
          
          if (!session && attempts < maxAttempts) {
            console.log(`🔄 Retrying session fetch, attempt ${attempts}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // Debug session state
        console.log('🔍 tRPC Headers - Session State:', {
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
          userId: session?.user?.id,
          tokenLength: session?.access_token?.length || 0,
          attempts
        });
        
        if (session?.access_token) {
          return {
            Authorization: `Bearer ${session.access_token}`,
          };
        }
        
        console.log('⚠️ No access token found, returning empty headers');
        return {};
      } catch (error) {
        console.error('❌ Error getting session for headers:', error);
        return {};
      }
    },
  }),
];

// For App Router - used in providers
export const getClientConfig = () => ({
  links: commonLinks,
});

// For Pages Router - used in withTRPC wrapper
export const pagesRouterApi = createTRPCNext<AppRouter>({
  config() {
    return {
      links: commonLinks,
    };
  },
  ssr: false,
  transformer: superjson,
});

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
