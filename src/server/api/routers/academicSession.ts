import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

export const academicSessionRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        includeClassCount: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Note: AcademicSession no longer has a branchId column, so we don't apply branch filtering
      const sessions = await ctx.db.academicSession.findMany({
        where: {
          isActive: input?.isActive,
        },
        orderBy: [
          { startDate: "desc" },
          { name: "asc" },
        ],
        include: {
          ...(input?.includeClassCount ? { _count: { select: { classes: true } } } : {}),
        },
      });

      // Transform the result to include classCount if requested
      if (input?.includeClassCount) {
        return sessions.map(session => ({
          ...session,
          classCount: session._count?.classes || 0,
          _count: undefined,
        }));
      }

      return sessions;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Note: AcademicSession no longer has a branchId column, so we don't apply branch filtering
      // Use findUnique which doesn't apply any filters from middleware
      const session = await ctx.db.academicSession.findUnique({
        where: { id: input.id },
        include: {
          classes: true,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Academic session not found",
        });
      }

      return session;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        startDate: z.date(),
        endDate: z.date(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate that end date is after start date
      if (input.endDate <= input.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after start date",
        });
      }

      // Check if there's already an active session
      if (input.isActive) {
        const existingActiveSessions = await ctx.db.academicSession.findMany({
          where: {
            isActive: true,
          },
        });

        // If creating an active session, deactivate all other sessions
        if (existingActiveSessions.length > 0) {
          await ctx.db.academicSession.updateMany({
            where: {
              isActive: true,
            },
            data: {
              isActive: false,
            },
          });
        }
      }

      // Create the academic session with only the fields that exist in the model
      // Note: AcademicSession no longer has a branchId field
      // Use type assertion to bypass the type checking since the schema has been updated
      // but the Prisma client types might not be fully in sync
      return ctx.db.academicSession.create({
        data: {
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          isActive: input.isActive,
        } as Prisma.AcademicSessionCreateInput,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required").optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Get the current session
      // Note: AcademicSession no longer has a branchId column, so we don't apply branch filtering
      const currentSession = await ctx.db.academicSession.findUnique({
        where: { id },
      });

      if (!currentSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Academic session not found",
        });
      }

      // If updating dates, validate that end date is after start date
      if (data.startDate && data.endDate) {
        if (data.endDate <= data.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "End date must be after start date",
          });
        }
      } else if (data.startDate && !data.endDate) {
        if (currentSession.endDate <= data.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "End date must be after start date",
          });
        }
      } else if (!data.startDate && data.endDate) {
        if (data.endDate <= currentSession.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "End date must be after start date",
          });
        }
      }

      // If activating this session, deactivate all other sessions
      if (data.isActive && !currentSession.isActive) {
        await ctx.db.academicSession.updateMany({
          where: {
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      }

      return ctx.db.academicSession.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if there are any classes associated with this session
      // Note: AcademicSession no longer has a branchId column, so we don't apply branch filtering
      const classCount = await ctx.db.class.count({
        where: { sessionId: input.id },
      });

      if (classCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete this academic session because it has ${classCount} classes associated with it. Please delete or reassign these classes first.`,
        });
      }

      // Check if there are any academic records associated with this session
      const recordCount = await ctx.db.academicRecord.count({
        where: { sessionId: input.id },
      });

      if (recordCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete this academic session because it has ${recordCount} academic records associated with it. Please delete these records first.`,
        });
      }

      return ctx.db.academicSession.delete({
        where: { id: input.id },
      });
    }),

  // Set a session as active and deactivate all others
  setActive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Note: AcademicSession no longer has a branchId column, so we don't apply branch filtering
      const session = await ctx.db.academicSession.findUnique({
        where: { id: input.id },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Academic session not found",
        });
      }

      // Deactivate all sessions
      await ctx.db.academicSession.updateMany({
        where: {
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Activate the selected session
      return ctx.db.academicSession.update({
        where: { id: input.id },
        data: {
          isActive: true,
        },
      });
    }),

  // Get the current active session
  getCurrentSession: publicProcedure
    .query(async ({ ctx }) => {
      // Note: AcademicSession no longer has a branchId column, so we don't apply branch filtering
      const session = await ctx.db.academicSession.findFirst({
        where: {
          isActive: true,
        },
      });

      return session;
    }),
});
