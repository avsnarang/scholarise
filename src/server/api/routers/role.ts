import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// NOTICE: This router is currently inactive because the required 'role' model
// no longer exists in the Prisma schema. Keep this file for reference or delete it if not needed.

// Either delete this file or uncomment and update the router when the models are added to the schema
export const roleRouter = createTRPCRouter({});

/* Original router code removed due to missing models in schema
export const roleRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.role.findMany({
      orderBy: { name: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const role = await ctx.db.role.findUnique({
        where: { id: input.id },
        include: {
          permissions: {
            include: {
              permission: {
                include: {
                  page: true,
                },
              },
            },
          },
        },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      return role;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to create roles
      // This would be a real permission check in production

      return ctx.db.role.create({
        data: {
          ...input,
          isSystem: false, // Only system can create system roles
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if user has permission to update roles
      // This would be a real permission check in production

      // Check if this is a system role
      const role = await ctx.db.role.findUnique({
        where: { id },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      if (role.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot modify system roles",
        });
      }

      return ctx.db.role.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to delete roles
      // This would be a real permission check in production

      // Check if this is a system role
      const role = await ctx.db.role.findUnique({
        where: { id: input.id },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      if (role.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete system roles",
        });
      }

      return ctx.db.role.delete({
        where: { id: input.id },
      });
    }),
});
*/
