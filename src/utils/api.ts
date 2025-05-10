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
    enabled: (opts) =>
      process.env.NODE_ENV === "development" ||
      (opts.direction === "down" && opts.result instanceof Error),
  }),
  httpBatchLink({
    url: `${getBaseUrl()}/api/trpc`,
    transformer: superjson,
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
