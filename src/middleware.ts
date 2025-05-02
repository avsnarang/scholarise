import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/trpc/health',
  '/api/health', 
  '/login',
]);

export default clerkMiddleware(async (auth, req) => {
  // If the request is not for a public route, protect it
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
