import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view your profile",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        image: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update your profile",
        });
      }

      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          name: input.name,
          image: input.image,
        },
      });
    }),
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 10;
      const cursor = input?.cursor;

      const users = await ctx.db.user.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (users.length > limit) {
        const nextItem = users.pop();
        nextCursor = nextItem?.id;
      }

      return {
        users,
        nextCursor,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          branch: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      if (input.query.length < 3) {
        return [];
      }

      return ctx.db.user.findMany({
        where: {
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { email: { contains: input.query, mode: "insensitive" } },
          ],
        },
        take: 10,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        isActive: z.boolean().optional(),
        branchId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if user has permission to update users
      // This would be a real permission check in production

      return ctx.db.user.update({
        where: { id },
        data,
      });
    }),

  assignRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to assign roles
      // This would be a real permission check in production

      // Check if the role assignment already exists
      const existingRole = await ctx.db.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: input.userId,
            roleId: input.roleId,
          },
        },
      });

      if (existingRole) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already has this role",
        });
      }

      return ctx.db.userRole.create({
        data: {
          userId: input.userId,
          roleId: input.roleId,
        },
      });
    }),

  removeRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to remove roles
      // This would be a real permission check in production

      return ctx.db.userRole.delete({
        where: {
          userId_roleId: {
            userId: input.userId,
            roleId: input.roleId,
          },
        },
      });
    }),
});
