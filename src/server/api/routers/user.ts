import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// NOTICE: This router is currently inactive because the required 'user' model and related models
// (userRole) no longer exist in the Prisma schema. The context structure has also changed.
// Keep this file for reference or delete it if not needed.

// Either delete this file or uncomment and update the router when the models are added to the schema
export const userRouter = createTRPCRouter({});

/* Original router code removed due to missing models in schema
export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view your profile",
        });
      }

      // user model no longer exists
      // const user = await ctx.db.user.findUnique({
      //   where: { id: ctx.userId },
      // });

      // Rest of the code...
    }),

  // Other procedures with similar issues...
});
*/
