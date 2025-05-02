import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

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
  // Use Clerk's auth helper for App Router
  const user = await currentUser();
  const userId = user?.id || null;

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => {
      return {
        userId,
        auth: { userId },
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