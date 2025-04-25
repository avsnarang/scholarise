import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const groupRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.group.findMany({
      orderBy: { name: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.group.findUnique({
        where: { id: input.id },
        include: {
          users: {
            include: {
              user: true,
            },
          },
          roles: {
            include: {
              role: true,
            },
          },
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

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      return group;
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      if (input.query.length < 3) {
        return [];
      }

      return ctx.db.group.findMany({
        where: {
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { description: { contains: input.query, mode: "insensitive" } },
          ],
        },
        take: 10,
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to create groups
      // This would be a real permission check in production

      return ctx.db.group.create({
        data: input,
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

      // Check if user has permission to update groups
      // This would be a real permission check in production

      return ctx.db.group.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to delete groups
      // This would be a real permission check in production

      return ctx.db.group.delete({
        where: { id: input.id },
      });
    }),

  addUser: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to add users to groups
      // This would be a real permission check in production

      // Check if the user is already in the group
      const existingMembership = await ctx.db.userGroup.findUnique({
        where: {
          userId_groupId: {
            userId: input.userId,
            groupId: input.groupId,
          },
        },
      });

      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already in this group",
        });
      }

      return ctx.db.userGroup.create({
        data: {
          userId: input.userId,
          groupId: input.groupId,
        },
      });
    }),

  removeUser: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to remove users from groups
      // This would be a real permission check in production

      return ctx.db.userGroup.delete({
        where: {
          userId_groupId: {
            userId: input.userId,
            groupId: input.groupId,
          },
        },
      });
    }),

  addRole: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        roleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to add roles to groups
      // This would be a real permission check in production

      // Check if the role is already assigned to the group
      const existingRole = await ctx.db.groupRole.findUnique({
        where: {
          groupId_roleId: {
            groupId: input.groupId,
            roleId: input.roleId,
          },
        },
      });

      if (existingRole) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Group already has this role",
        });
      }

      return ctx.db.groupRole.create({
        data: {
          groupId: input.groupId,
          roleId: input.roleId,
        },
      });
    }),

  removeRole: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        roleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to remove roles from groups
      // This would be a real permission check in production

      return ctx.db.groupRole.delete({
        where: {
          groupId_roleId: {
            groupId: input.groupId,
            roleId: input.roleId,
          },
        },
      });
    }),
});
