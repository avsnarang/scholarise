import { createTRPCReact, httpBatchLink, loggerLink } from "@trpc/react-query";
import { createTRPCNext } from "@trpc/next";
import type { AppRouter } from "@/server/api/root";
import superjson from "superjson";
import { supabase } from "@/lib/supabase/client";
import { sessionCache } from "@/providers/optimized-auth-provider";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

// Create React Query API (App Router)
export const api = createTRPCReact<AppRouter>({
  abortOnUnmount: true,
  overrides: {
    useMutation: {
      async onSuccess(opts) {
        await opts.originalFn();
        await opts.queryClient.invalidateQueries();
      },
    },
  },
});

// Optimized headers with session caching
const getAuthHeaders = async () => {
  try {
    // Try to get cached session first
    const session = await sessionCache.getSession();
    
    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }
    
    return {};
  } catch (error) {
    console.error('❌ Error getting session for headers:', error);
    return {};
  }
};

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
    headers: getAuthHeaders,
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