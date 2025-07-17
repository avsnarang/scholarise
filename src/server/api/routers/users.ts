import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getUserById } from '@/utils/supabase-auth';

/**
 * Router for user/account management functions
 */
export const usersRouter = createTRPCRouter({
  // Get user by Supabase ID
  getByUserId: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      if (!input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User ID is required",
        });
      }

      try {
        // Fetch user from Supabase
        const user = await getUserById(input.userId);
        
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
          
        return {
          id: user.id,
          email: user.email,
          // Include user metadata which contains role information
          userMetadata: user.user_metadata,
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at,
        };
      } catch (error) {
        console.error("Error fetching user from Supabase:", error);
        
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