import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const leaveRouter = createTRPCRouter({
  // Get all leave policies for a branch
  getPolicies: protectedProcedure
    .input(z.object({
      branchId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.leavePolicy.findMany({
        where: {
          branchId: input.branchId,
        },
      });
    }),

  // Create a new leave policy
  createPolicy: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      maxDaysPerYear: z.number().int().positive(),
      isPaid: z.boolean(),
      applicableRoles: z.array(z.string()),
      branchId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.leavePolicy.create({
        data: input,
      });
    }),

  // Get leave balance for a staff member
  getLeaveBalance: protectedProcedure
    .input(z.object({
      teacherId: z.string().optional(),
      employeeId: z.string().optional(),
      year: z.number().int(),
    }))
    .query(async ({ ctx, input }) => {
      if (!input.teacherId && !input.employeeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either teacherId or employeeId must be provided",
        });
      }

      return ctx.db.leaveBalance.findMany({
        where: {
          OR: [
            { teacherId: input.teacherId },
            { employeeId: input.employeeId },
          ],
          year: input.year,
        },
        include: {
          policy: true,
        },
      });
    }),

  // Create a leave application
  createApplication: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      reason: z.string(),
      policyId: z.string(),
      teacherId: z.string().optional(),
      employeeId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate dates
      if (input.startDate > input.endDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start date must be before end date",
        });
      }

      // Calculate number of days
      const days = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Get the policy
      const policy = await ctx.db.leavePolicy.findUnique({
        where: { id: input.policyId },
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Leave policy not found",
        });
      }

      // Get current year's leave balance
      const currentYear = new Date().getFullYear();
      const leaveBalance = await ctx.db.leaveBalance.findFirst({
        where: {
          policyId: input.policyId,
          year: currentYear,
          OR: [
            { teacherId: input.teacherId },
            { employeeId: input.employeeId },
          ],
        },
      });

      if (!leaveBalance || leaveBalance.remainingDays < days) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient leave balance",
        });
      }

      // Create the application
      return ctx.db.leaveApplication.create({
        data: {
          ...input,
          status: "PENDING",
        },
      });
    }),

  // Get leave applications for a staff member
  getApplications: protectedProcedure
    .input(z.object({
      teacherId: z.string().optional(),
      employeeId: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Only require either teacherId or employeeId if not admin/superadmin
      const isStaffMember = input.teacherId || input.employeeId;
      
      // If no filters provided, just return all applications (for admins)
      const where = isStaffMember ? {
        OR: [
          { teacherId: input.teacherId },
          { employeeId: input.employeeId },
        ],
        ...(input.status ? { status: input.status } : {}),
      } : (input.status ? { status: input.status } : {});

      console.log("Leave applications where clause:", JSON.stringify(where));

      const applications = await ctx.db.leaveApplication.findMany({
        where,
        include: {
          policy: true,
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            }
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              designation: true,
            }
          }
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Log each application to debug teacher/employee data
      applications.forEach(app => {
        console.log(`Application ${app.id}:
          teacherId: ${app.teacherId}, 
          teacher data present: ${!!app.teacher},
          employeeId: ${app.employeeId}, 
          employee data present: ${!!app.employee}`);
      });

      console.log(`Found ${applications.length} leave applications`);
      
      // Debug log if any applications have missing teacher/employee data
      const missingStaffInfo = applications.filter(app => 
        (app.teacherId && !app.teacher) || (app.employeeId && !app.employee)
      );
      
      if (missingStaffInfo.length > 0) {
        console.log(`Warning: ${missingStaffInfo.length} applications have missing staff info`);
        missingStaffInfo.forEach(app => {
          console.log(`  Application ID: ${app.id}, teacherId: ${app.teacherId}, employeeId: ${app.employeeId}`);
        });
      }

      return applications;
    }),

  // Update leave application status (approve/reject)
  updateApplicationStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["APPROVED", "REJECTED"]),
      comments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.db.leaveApplication.findUnique({
        where: { id: input.id },
        include: {
          policy: true,
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Leave application not found",
        });
      }

      // If approving, update leave balance
      if (input.status === "APPROVED") {
        const days = Math.ceil((application.endDate.getTime() - application.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const currentYear = new Date().getFullYear();

        // Find the correct leave balance record
        const leaveBalance = await ctx.db.leaveBalance.findFirst({
          where: {
            policyId: application.policyId,
            year: currentYear,
            ...(application.teacherId ? { teacherId: application.teacherId } : {}),
            ...(application.employeeId ? { employeeId: application.employeeId } : {}),
          },
        });

        if (!leaveBalance) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Leave balance not found for this policy and staff member",
          });
        }

        // Update the correct record by ID
        await ctx.db.leaveBalance.update({
          where: {
            id: leaveBalance.id,
          },
          data: {
            usedDays: {
              increment: days,
            },
            remainingDays: {
              decrement: days,
            },
          },
        });
      }

      // Update application status
      return ctx.db.leaveApplication.update({
        where: { id: input.id },
        data: {
          status: input.status,
          comments: input.comments,
          approvedBy: ctx.auth.userId,
        },
      });
    }),

  // Update a leave policy
  updatePolicy: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      maxDaysPerYear: z.number().int().positive(),
      isPaid: z.boolean(),
      applicableRoles: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if the policy exists
      const existingPolicy = await ctx.db.leavePolicy.findUnique({
        where: { id: input.id },
        include: {
          leaveBalances: true,
          leaveApplications: true,
        },
      });

      if (!existingPolicy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Leave policy not found",
        });
      }

      // Update the policy
      return ctx.db.leavePolicy.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          maxDaysPerYear: input.maxDaysPerYear,
          isPaid: input.isPaid,
          applicableRoles: input.applicableRoles,
        },
      });
    }),

  // Delete a leave policy
  deletePolicy: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if the policy exists
      const existingPolicy = await ctx.db.leavePolicy.findUnique({
        where: { id: input.id },
        include: {
          leaveBalances: {
            select: { id: true },
          },
          leaveApplications: {
            select: { id: true },
          },
        },
      });

      if (!existingPolicy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Leave policy not found",
        });
      }

      // Check if policy has any active leave balances or applications
      if (existingPolicy.leaveBalances.length > 0 || existingPolicy.leaveApplications.length > 0) {
        // Option 1: Throw an error
        // throw new TRPCError({
        //   code: "BAD_REQUEST",
        //   message: "Cannot delete policy with existing leave balances or applications",
        // });

        // Option 2: Delete associated records first (cascading delete)
        // In a transaction to ensure all related records are deleted properly
        return ctx.db.$transaction(async (tx) => {
          // Delete all leave balances for this policy
          await tx.leaveBalance.deleteMany({
            where: { policyId: input.id },
          });

          // Delete all leave applications for this policy
          await tx.leaveApplication.deleteMany({
            where: { policyId: input.id },
          });

          // Delete the policy
          return tx.leavePolicy.delete({
            where: { id: input.id },
          });
        });
      }

      // If no related records, just delete the policy
      return ctx.db.leavePolicy.delete({
        where: { id: input.id },
      });
    }),
}); 