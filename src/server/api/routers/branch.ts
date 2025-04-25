import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

export const branchRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      console.log('Fetching all branches...');

      // Add a timeout promise to detect if the database query is hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Database query timeout after 5 seconds'));
        }, 5000);
      });

      // Create the actual query promise
      const queryPromise = ctx.db.branch.findMany({
        orderBy: [
          { order: "asc" },
          { name: "asc" }
        ],
      });

      // Race the promises to see which resolves/rejects first
      const branches = await Promise.race([queryPromise, timeoutPromise]) as any;

      console.log(`Successfully found ${branches.length} branches`);

      // Return the branches, or an empty array if none found
      return branches || [];
    } catch (error) {
      console.error('Error fetching all branches:', error);

      // Instead of silently returning an empty array, throw a proper error
      // that will be handled by the tRPC error formatter
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch branches. Please try again.',
        cause: error,
      });
    }
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // If no ID is provided or it's an empty string, return null
      if (!input.id) {
        console.log('No branch ID provided to getById');
        return null;
      }

      try {
        console.log(`Fetching branch with ID: ${input.id}`);

        // Add a timeout promise to detect if the database query is hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Database query timeout after 5 seconds for branch ID: ${input.id}`));
          }, 5000);
        });

        // Create the actual query promise
        const queryPromise = ctx.db.branch.findUnique({
          where: { id: input.id },
        });

        // Race the promises to see which resolves/rejects first
        const branch = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (!branch) {
          console.log(`Branch with ID ${input.id} not found`);
          return null;
        }

        console.log(`Found branch: ${branch.name} (${branch.code})`);
        return branch;
      } catch (error) {
        console.error('Error fetching branch by ID:', error);

        // Instead of silently returning null, throw a proper error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch branch with ID: ${input.id}. Please try again.`,
          cause: error,
        });
      }
    }),

  getByCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const branch = await ctx.db.branch.findUnique({
        where: { code: input.code },
      });

      if (!branch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Branch with code '${input.code}' not found`,
        });
      }

      return branch;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        order: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to create branches
      // This would be a real permission check in production

      // Check if branch code already exists
      const existingBranch = await ctx.db.branch.findUnique({
        where: { code: input.code },
      });

      if (existingBranch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Branch code '${input.code}' is already in use. Please choose a different code.`,
        });
      }

      return ctx.db.branch.create({
        data: input,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        code: z.string().min(1).optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        order: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if user has permission to update this branch
      // This would be a real permission check in production

      // If code is being updated, check if it's already in use by another branch
      if (data.code) {
        const existingBranch = await ctx.db.branch.findUnique({
          where: { code: data.code },
        });

        if (existingBranch && existingBranch.id !== id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Branch code '${data.code}' is already in use. Please choose a different code.`,
          });
        }
      }

      return ctx.db.branch.update({
        where: { id },
        data,
      });
    }),

  updateOrder: protectedProcedure
    .input(z.array(z.object({
      id: z.string(),
      order: z.number().int().min(0),
    })))
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to update branch order
      // This would be a real permission check in production

      // Update each branch's order in a transaction
      return ctx.db.$transaction(
        input.map(item =>
          ctx.db.branch.update({
            where: { id: item.id },
            data: { order: item.order } as any
          })
        )
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to delete this branch
      // This would be a real permission check in production

      try {
        // First, check if there are any related records
        const relatedStudents = await ctx.db.student.count({
          where: { branchId: input.id },
        });

        const relatedTeachers = await ctx.db.teacher.count({
          where: { branchId: input.id },
        });

        const relatedEmployees = await ctx.db.employee.count({
          where: { branchId: input.id },
        });

        const relatedClasses = await ctx.db.class.count({
          where: { branchId: input.id },
        });

        const relatedUsers = await ctx.db.user.count({
          where: { branchId: input.id },
        });

        // If there are related records, throw a user-friendly error
        if (relatedStudents > 0 || relatedTeachers > 0 || relatedEmployees > 0 || relatedClasses > 0 || relatedUsers > 0) {
          const relatedEntities = [];
          if (relatedStudents > 0) relatedEntities.push(`${relatedStudents} student${relatedStudents !== 1 ? 's' : ''}`);
          if (relatedTeachers > 0) relatedEntities.push(`${relatedTeachers} teacher${relatedTeachers !== 1 ? 's' : ''}`);
          if (relatedEmployees > 0) relatedEntities.push(`${relatedEmployees} employee${relatedEmployees !== 1 ? 's' : ''}`);
          if (relatedClasses > 0) relatedEntities.push(`${relatedClasses} class${relatedClasses !== 1 ? 'es' : ''}`);
          if (relatedUsers > 0) relatedEntities.push(`${relatedUsers} user${relatedUsers !== 1 ? 's' : ''}`);

          const errorMessage = `Cannot delete this branch because it has ${relatedEntities.join(', ')} associated with it. Please reassign or delete these entities first.`;

          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: errorMessage,
          });
        }

        // If no related records, proceed with deletion
        return ctx.db.branch.delete({
          where: { id: input.id },
        });
      } catch (error) {
        // Handle other potential errors
        if (error instanceof TRPCError) {
          throw error; // Re-throw our custom error
        }

        // Handle Prisma errors
        if (typeof error === 'object' && error !== null && 'code' in error) {
          if (error.code === 'P2003') {
            // P2003 is the Prisma error code for foreign key constraint violation
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Cannot delete this branch because it has related records. Please remove all students, teachers, employees, and classes from this branch first.',
            });
          }
        }

        // For any other error, throw a generic error
        console.error('Error deleting branch:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while deleting the branch.',
        });
      }
    }),
});
