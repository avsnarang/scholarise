import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const authRouter = createTRPCRouter({
  createUser: protectedProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().min(1, "Name is required"),
        role: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createServerSupabaseClient();
      
      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: input.name,
          role: input.role || "Teacher",
        },
      });
      
      if (authError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: authError.message,
        });
      }
      
      if (!authData.user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }
      
      return {
        id: authData.user.id,
        email: authData.user.email,
      };
    }),
});
