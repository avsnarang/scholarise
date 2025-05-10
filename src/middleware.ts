import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define matchers for different route types
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/sso-callback(.*)',
]);

const isApiRoute = createRouteMatcher([
  '/api/health',
  '/api/trpc/health',
]);

const isTrpcRoute = createRouteMatcher([
  '/api/trpc(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Handle public routes (no authentication required)
  if (isPublicRoute(req) || isApiRoute(req)) {
    return;
  }

  // Make tRPC routes public but accessible to auth methods
  if (isTrpcRoute(req)) {
    return;
  }

  // For all other routes, ensure the user is authenticated
  const { userId } = await auth();
  
  if (!userId) {
    const url = new URL('/login', req.url);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|.*\\..+$).*)',
    // Include API routes
    '/(api|trpc)(.*)',
  ],
};
