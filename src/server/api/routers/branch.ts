import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

export const branchRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      // Simple direct query without any complications
      const branches = await ctx.db.branch.findMany({
        orderBy: [
          { order: "asc" },
          { name: "asc" }
        ],
      });
      
      console.log(`Successfully found ${branches.length} branches`);
      return branches;
    } catch (error) {
      console.error('Error fetching branches:', error);
      // Always return an array even on error
      return [];
    }
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // If no ID is provided or it's an empty string, return null
      if (!input.id || input.id.trim() === "") {
        console.log('No valid branch ID provided to getById');
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

        // Instead of throwing an error for not found, just return null
        // Only throw errors for actual database issues
        if (error instanceof Error && error.message.includes('not found')) {
          return null;
        }

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
        logoUrl: z.string().optional(),
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

      // If creating headquarters, use special ID
      const branchData = input.code === 'HQ' && input.name === 'Headquarters' 
        ? { ...input, id: 'headquarters' }
        : input;

      return ctx.db.branch.create({
        data: branchData,
      });
    }),

  createHeadquarters: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check if headquarters already exists
      const existingHQ = await ctx.db.branch.findUnique({
        where: { id: 'headquarters' },
      });

      if (existingHQ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Headquarters branch already exists.",
        });
      }

      // Create headquarters with predefined values
      return ctx.db.branch.create({
        data: {
          id: 'headquarters',
          name: 'Headquarters',
          code: 'HQ',
          address: 'Main Office',
          city: 'Central City',
          state: 'Central State',
          country: 'Country',
          phone: '+91 98169 00056',
          email: 'info@tsh.edu.in',
          order: 0,
        },
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
        logoUrl: z.string().optional(),
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

        // If there are related records, throw a user-friendly error
        if (relatedStudents > 0 || relatedTeachers > 0 || relatedEmployees > 0 || relatedClasses > 0) {
          const relatedEntities = [];
          if (relatedStudents > 0) relatedEntities.push(`${relatedStudents} student${relatedStudents !== 1 ? 's' : ''}`);
          if (relatedTeachers > 0) relatedEntities.push(`${relatedTeachers} teacher${relatedTeachers !== 1 ? 's' : ''}`);
          if (relatedEmployees > 0) relatedEntities.push(`${relatedEmployees} employee${relatedEmployees !== 1 ? 's' : ''}`);
          if (relatedClasses > 0) relatedEntities.push(`${relatedClasses} class${relatedClasses !== 1 ? 'es' : ''}`);

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

  getUserBranches: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Get the current user's ID from the context
        const userId = ctx.userId;
        
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User is not authenticated",
          });
        }

        // First check if the user is an employee
        const employee = await ctx.db.employee.findFirst({
          where: { 
            OR: [
              { clerkId: userId },
              { userId: userId }
            ]
          },
          include: {
            branchAccessRecords: {
              include: {
                branch: true,
              },
            },
          },
        });

        if (employee) {
          // Check if employee has multi-branch access
          if (employee.branchAccessRecords && employee.branchAccessRecords.length > 0) {
            // Return all branches the employee has access to
            return employee.branchAccessRecords.map(access => access.branch);
          } else {
            // Return the employee's primary assigned branch
            return ctx.db.branch.findMany({
              where: {
                id: employee.branchId,
              },
              orderBy: [
                { order: "asc" },
                { name: "asc" },
              ],
            });
          }
        }
        
        // Check if the user is a teacher
        const teacher = await ctx.db.teacher.findFirst({
          where: { 
            OR: [
              { clerkId: userId },
              { userId: userId }
            ]
          },
        });
        
        if (teacher) {
          // Return the teacher's branch
          return ctx.db.branch.findMany({
            where: {
              id: teacher.branchId,
            },
            orderBy: [
              { order: "asc" },
              { name: "asc" },
            ],
          });
        }
        
        // If user isn't an employee or teacher, check if they're a super admin
        const userRoles = await ctx.db.userRole.findMany({
          where: { userId: userId },
          include: {
            role: true,
          },
        });
        
        const isSuperAdmin = userRoles.some(
          userRole => userRole.role.name === "Super Admin" || 
                     userRole.role.name === "SUPER_ADMIN" ||
                     userRole.role.name === "super_admin" ||
                     userRole.role.isSystem
        );
        
        // Also check Clerk metadata for superadmin status
        const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
        const isSuperAdminFromClerk = userMetadata?.role === 'super_admin' || 
          userMetadata?.roles?.includes('super_admin') ||
          userMetadata?.roles?.includes('Super Admin') ||
          userMetadata?.roles?.includes('SuperAdmin');
        
        if (isSuperAdmin || isSuperAdminFromClerk) {
          // Super admins can access all branches
          return ctx.db.branch.findMany({
            orderBy: [
              { order: "asc" },
              { name: "asc" },
            ],
          });
        }
        
        // If we get here, user doesn't have access to any branches
        return [];
      } catch (error) {
        console.error("Error fetching user branches:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch branches accessible to the user",
        });
      }
    }),
});
