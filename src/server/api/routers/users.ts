import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Clerk } from '@clerk/clerk-sdk-node';

// Initialize Clerk client
const secretKey = process.env.CLERK_SECRET_KEY;
const clerk = Clerk({ secretKey: secretKey || "" });

/**
 * Router for user/account management functions
 */
export const usersRouter = createTRPCRouter({
  // Get user by Clerk ID
  getByClerkId: protectedProcedure
    .input(z.object({ clerkId: z.string() }))
    .query(async ({ input }) => {
      if (!input.clerkId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Clerk ID is required",
        });
      }

      try {
        // Fetch user from Clerk
        const user = await clerk.users.getUser(input.clerkId);
        
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Get primary email address if available
        const emailAddress = user.emailAddresses.length > 0 
          ? user.emailAddresses[0]?.emailAddress 
          : undefined;
          
        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          emailAddress,
          // Include public metadata which contains role information
          publicMetadata: user.publicMetadata
        };
      } catch (error) {
        console.error("Error fetching user from Clerk:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user data",
          cause: error,
        });
      }
    }),
}); 