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
        include: {
          _count: {
            select: {
              leaveApplications: true,
              leaveBalances: true,
            }
          }
        },
        orderBy: {
          name: 'asc',
        },
      });
    }),

  // Create a new leave policy
  createPolicy: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Policy name is required"),
      description: z.string().optional(),
      maxDaysPerYear: z.number().int().positive("Maximum days must be positive"),
      isPaid: z.boolean(),
      applicableRoles: z.array(z.string()).min(1, "At least one applicable role is required"),
      branchId: z.string(),
      autoInitializeBalances: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if policy with same name already exists
      const existingPolicy = await ctx.db.leavePolicy.findFirst({
        where: {
          name: input.name,
          branchId: input.branchId,
        },
      });

      if (existingPolicy) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A leave policy with this name already exists",
        });
      }

      // Create the policy
      const policy = await ctx.db.leavePolicy.create({
        data: {
          name: input.name,
          description: input.description,
          maxDaysPerYear: input.maxDaysPerYear,
          isPaid: input.isPaid,
          applicableRoles: input.applicableRoles,
          branchId: input.branchId,
        },
      });

      // Auto-initialize leave balances for existing staff if requested
      if (input.autoInitializeBalances) {
        await initializeLeaveBalancesForPolicy(ctx, policy.id, policy.maxDaysPerYear, policy.applicableRoles, input.branchId);
      }

      return policy;
    }),

  // Initialize leave balances for all staff members for a specific policy
  initializeLeaveBalances: protectedProcedure
    .input(z.object({
      policyId: z.string(),
      year: z.number().int().optional(),
      branchId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const year = input.year || new Date().getFullYear();
      
      const policy = await ctx.db.leavePolicy.findUnique({
        where: { id: input.policyId },
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Leave policy not found",
        });
      }

      const result = await initializeLeaveBalancesForPolicy(
        ctx, 
        input.policyId, 
        policy.maxDaysPerYear, 
        policy.applicableRoles, 
        input.branchId,
        year
      );

      return {
        initialized: result.initialized,
        skipped: result.skipped,
        message: `Initialized ${result.initialized} leave balances, skipped ${result.skipped} existing records`,
      };
    }),

  // Get leave balance for a staff member with auto-initialization
  getLeaveBalance: protectedProcedure
    .input(z.object({
      teacherId: z.string().optional(),
      employeeId: z.string().optional(),
      year: z.number().int().optional(),
      branchId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!input.teacherId && !input.employeeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either teacherId or employeeId must be provided",
        });
      }

      const year = input.year || new Date().getFullYear();

      let balances = await ctx.db.leaveBalance.findMany({
        where: {
          OR: [
            { teacherId: input.teacherId },
            { employeeId: input.employeeId },
          ],
          year: year,
        },
        include: {
          policy: true,
        },
        orderBy: {
          policy: {
            name: 'asc',
          },
        },
      });

      // If no balances found and branchId provided, auto-initialize
      if (balances.length === 0 && input.branchId) {
        const staffRole = input.teacherId ? "Teacher" : "Employee";
        await initializeLeaveBalancesForStaff(ctx, input.teacherId, input.employeeId, staffRole, input.branchId, year);
        
        // Refetch balances after initialization
        balances = await ctx.db.leaveBalance.findMany({
          where: {
            OR: [
              { teacherId: input.teacherId },
              { employeeId: input.employeeId },
            ],
            year: year,
          },
          include: {
            policy: true,
          },
          orderBy: {
            policy: {
              name: 'asc',
            },
          },
        });
      }

      return balances;
    }),

  // Create a leave application with enhanced validation
  createApplication: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      reason: z.string().min(10, "Reason must be at least 10 characters"),
      policyId: z.string(),
      teacherId: z.string().optional(),
      employeeId: z.string().optional(),
      attachments: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate user identity
      if (!input.teacherId && !input.employeeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either teacherId or employeeId must be provided",
        });
      }

      // Validate dates
      if (input.startDate > input.endDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start date must be before or equal to end date",
        });
      }

      // Check if start date is not in the past (with some tolerance for today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(input.startDate);
      startDate.setHours(0, 0, 0, 0);

      if (startDate < today) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Leave cannot be applied for past dates",
        });
      }

      // Calculate number of days (inclusive)
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

      // Check for overlapping leave applications
      const overlappingApplications = await ctx.db.leaveApplication.findMany({
        where: {
          ...(input.teacherId ? { teacherId: input.teacherId } : { employeeId: input.employeeId }),
          status: { in: ["PENDING", "APPROVED"] },
          OR: [
            {
              startDate: { lte: input.endDate },
              endDate: { gte: input.startDate },
            },
          ],
        },
      });

      if (overlappingApplications.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a leave application for overlapping dates",
        });
      }

      // Get current year's leave balance
      const currentYear = input.startDate.getFullYear();
      let leaveBalance = await ctx.db.leaveBalance.findFirst({
        where: {
          policyId: input.policyId,
          year: currentYear,
          ...(input.teacherId ? { teacherId: input.teacherId } : { employeeId: input.employeeId }),
        },
      });

      // If no balance found, try to initialize it
      if (!leaveBalance) {
        // Get staff info to determine role and branch
        let staffRole = "";
        let branchId = "";
        
        if (input.teacherId) {
          const teacher = await ctx.db.teacher.findUnique({
            where: { id: input.teacherId },
            select: { branchId: true },
          });
          if (teacher) {
            staffRole = "Teacher";
            branchId = teacher.branchId;
          }
        } else if (input.employeeId) {
          const employee = await ctx.db.employee.findUnique({
            where: { id: input.employeeId },
            select: { branchId: true },
          });
          if (employee) {
            staffRole = "Employee";
            branchId = employee.branchId;
          }
        }

        if (branchId && policy.applicableRoles.includes(staffRole)) {
          await initializeLeaveBalancesForStaff(ctx, input.teacherId, input.employeeId, staffRole, branchId, currentYear);
          
          // Refetch the balance
          leaveBalance = await ctx.db.leaveBalance.findFirst({
            where: {
              policyId: input.policyId,
              year: currentYear,
              ...(input.teacherId ? { teacherId: input.teacherId } : { employeeId: input.employeeId }),
            },
          });
        }
      }

      if (!leaveBalance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Leave balance not found. Please contact your administrator.",
        });
      }

      if (leaveBalance.remainingDays < days) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient leave balance. You have ${leaveBalance.remainingDays} days remaining, but requested ${days} days.`,
        });
      }

      // Create the application
      return ctx.db.leaveApplication.create({
        data: {
          startDate: input.startDate,
          endDate: input.endDate,
          reason: input.reason,
          policyId: input.policyId,
          teacherId: input.teacherId,
          employeeId: input.employeeId,
          status: "PENDING",
        },
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
      });
    }),

  // Get leave applications with enhanced filtering
  getApplications: protectedProcedure
    .input(z.object({
      teacherId: z.string().optional(),
      employeeId: z.string().optional(),
      status: z.string().optional(),
      branchId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      policyId: z.string().optional(),
      limit: z.number().int().positive().max(100).optional().default(50),
      offset: z.number().int().nonnegative().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      // Build where clause
      const where: any = {};

      // Filter by staff member
      if (input.teacherId || input.employeeId) {
        where.OR = [
          ...(input.teacherId ? [{ teacherId: input.teacherId }] : []),
          ...(input.employeeId ? [{ employeeId: input.employeeId }] : []),
        ];
      }

      // Filter by status
      if (input.status) {
        where.status = input.status;
      }

      // Filter by policy
      if (input.policyId) {
        where.policyId = input.policyId;
      }

      // Filter by date range
      if (input.startDate || input.endDate) {
        where.OR = [
          ...(where.OR || []),
          {
            startDate: {
              ...(input.startDate ? { gte: input.startDate } : {}),
              ...(input.endDate ? { lte: input.endDate } : {}),
            },
          },
        ];
      }

      // Filter by branch (through staff member's branch)
      if (input.branchId) {
        where.OR = [
          {
            teacher: {
              branchId: input.branchId,
            },
          },
          {
            employee: {
              branchId: input.branchId,
            },
          },
        ];
      }

      const [applications, totalCount] = await Promise.all([
        ctx.db.leaveApplication.findMany({
          where,
          include: {
            policy: true,
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                branchId: true,
              }
            },
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
                branchId: true,
              }
            }
          },
          orderBy: {
            createdAt: "desc",
          },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.leaveApplication.count({ where }),
      ]);

      return {
        applications,
        totalCount,
        hasMore: input.offset + input.limit < totalCount,
      };
    }),

  // Bulk update application status
  bulkUpdateApplicationStatus: protectedProcedure
    .input(z.object({
      applicationIds: z.array(z.string()).min(1, "At least one application ID is required"),
      status: z.enum(["APPROVED", "REJECTED"]),
      comments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch all applications to validate and update balances
      const applications = await ctx.db.leaveApplication.findMany({
        where: {
          id: { in: input.applicationIds },
          status: "PENDING", // Only allow updating pending applications
        },
        include: {
          policy: true,
        },
      });

      if (applications.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No pending applications found for the provided IDs",
        });
      }

      if (applications.length !== input.applicationIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some applications are not pending or do not exist",
        });
      }

      // Use transaction for bulk updates
      const result = await ctx.db.$transaction(async (tx) => {
        const results = [];

        for (const application of applications) {
          // If approving, update leave balance
          if (input.status === "APPROVED") {
            const days = Math.ceil((application.endDate.getTime() - application.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const applicationYear = application.startDate.getFullYear();

            // Find the correct leave balance record
            const leaveBalance = await tx.leaveBalance.findFirst({
              where: {
                policyId: application.policyId,
                year: applicationYear,
                ...(application.teacherId ? { teacherId: application.teacherId } : {}),
                ...(application.employeeId ? { employeeId: application.employeeId } : {}),
              },
            });

            if (!leaveBalance) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: `Leave balance not found for application ${application.id}`,
              });
            }

            if (leaveBalance.remainingDays < days) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Insufficient leave balance for application ${application.id}`,
              });
            }

            // Update the balance
            await tx.leaveBalance.update({
              where: { id: leaveBalance.id },
              data: {
                usedDays: { increment: days },
                remainingDays: { decrement: days },
              },
            });
          }

          // Update application status
          const updatedApplication = await tx.leaveApplication.update({
            where: { id: application.id },
            data: {
              status: input.status,
              comments: input.comments,
              approvedBy: ctx.auth.userId,
            },
          });

          results.push(updatedApplication);
        }

        return results;
      });

      return {
        updated: result.length,
        applications: result,
      };
    }),

  // Update leave application status (single)
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

      if (application.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending applications can be updated",
        });
      }

      // Use transaction for consistency
      return ctx.db.$transaction(async (tx) => {
        // If approving, update leave balance
        if (input.status === "APPROVED") {
          const days = Math.ceil((application.endDate.getTime() - application.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const applicationYear = application.startDate.getFullYear();

          // Find the correct leave balance record
          const leaveBalance = await tx.leaveBalance.findFirst({
            where: {
              policyId: application.policyId,
              year: applicationYear,
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

          if (leaveBalance.remainingDays < days) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Insufficient leave balance. Available: ${leaveBalance.remainingDays} days, Required: ${days} days`,
            });
          }

          // Update the balance
          await tx.leaveBalance.update({
            where: { id: leaveBalance.id },
            data: {
              usedDays: { increment: days },
              remainingDays: { decrement: days },
            },
          });
        }

        // Update application status
        return tx.leaveApplication.update({
          where: { id: input.id },
          data: {
            status: input.status,
            comments: input.comments,
            approvedBy: ctx.auth.userId,
          },
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
        });
      });
    }),

  // Get leave analytics for dashboard
  getLeaveAnalytics: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      year: z.number().int().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const year = input.year || new Date().getFullYear();
      const startDate = input.startDate || new Date(year, 0, 1);
      const endDate = input.endDate || new Date(year, 11, 31);

      // Build where clause for applications
      const applicationWhere: any = {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (input.branchId) {
        applicationWhere.OR = [
          { teacher: { branchId: input.branchId } },
          { employee: { branchId: input.branchId } },
        ];
      }

      // Build where clause for balances
      const balanceWhere: any = { year };
      if (input.branchId) {
        balanceWhere.OR = [
          { teacher: { branchId: input.branchId } },
          { employee: { branchId: input.branchId } },
        ];
      }

      const [
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        applicationsByPolicy,
        applicationsByMonth,
        leaveBalancesSummary,
      ] = await Promise.all([
        // Total applications
        ctx.db.leaveApplication.count({ where: applicationWhere }),
        
        // Pending applications
        ctx.db.leaveApplication.count({
          where: { ...applicationWhere, status: "PENDING" },
        }),
        
        // Approved applications
        ctx.db.leaveApplication.count({
          where: { ...applicationWhere, status: "APPROVED" },
        }),
        
        // Rejected applications
        ctx.db.leaveApplication.count({
          where: { ...applicationWhere, status: "REJECTED" },
        }),
        
        // Applications by policy
        ctx.db.leaveApplication.groupBy({
          by: ['policyId'],
          where: applicationWhere,
          _count: true,
          orderBy: { _count: { policyId: 'desc' } },
        }),
        
        // Applications by month
        input.branchId ? 
          ctx.db.$queryRaw`
            SELECT 
              EXTRACT(MONTH FROM "startDate") as month,
              COUNT(*) as count
            FROM "LeaveApplication"
            WHERE "startDate" >= ${startDate} AND "startDate" <= ${endDate}
              AND ("teacherId" IN (SELECT "id" FROM "Teacher" WHERE "branchId" = ${input.branchId}) 
                   OR "employeeId" IN (SELECT "id" FROM "Employee" WHERE "branchId" = ${input.branchId}))
            GROUP BY EXTRACT(MONTH FROM "startDate")
            ORDER BY month
          ` :
          ctx.db.$queryRaw`
            SELECT 
              EXTRACT(MONTH FROM "startDate") as month,
              COUNT(*) as count
            FROM "LeaveApplication"
            WHERE "startDate" >= ${startDate} AND "startDate" <= ${endDate}
            GROUP BY EXTRACT(MONTH FROM "startDate")
            ORDER BY month
          `,
        
        // Leave balances summary
        ctx.db.leaveBalance.groupBy({
          by: ['policyId'],
          where: balanceWhere,
          _sum: {
            totalDays: true,
            usedDays: true,
            remainingDays: true,
          },
        }),
      ]);

      // Get policy names for the grouped data
      const policyIds = [...new Set([
        ...applicationsByPolicy.map(p => p.policyId),
        ...leaveBalancesSummary.map(p => p.policyId),
      ])];

      const policies = await ctx.db.leavePolicy.findMany({
        where: { id: { in: policyIds } },
        select: { id: true, name: true },
      });

      const policyMap = new Map(policies.map(p => [p.id, p.name]));

      return {
        summary: {
          totalApplications,
          pendingApplications,
          approvedApplications,
          rejectedApplications,
          approvalRate: totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0,
        },
        applicationsByPolicy: applicationsByPolicy.map(item => ({
          policyId: item.policyId,
          policyName: policyMap.get(item.policyId) || 'Unknown',
          count: item._count,
        })),
        applicationsByMonth: applicationsByMonth as Array<{ month: number; count: bigint }>,
        leaveBalancesSummary: leaveBalancesSummary.map(item => ({
          policyId: item.policyId,
          policyName: policyMap.get(item.policyId) || 'Unknown',
          totalDays: item._sum.totalDays || 0,
          usedDays: item._sum.usedDays || 0,
          remainingDays: item._sum.remainingDays || 0,
          utilizationRate: item._sum.totalDays ? ((item._sum.usedDays || 0) / item._sum.totalDays) * 100 : 0,
        })),
      };
    }),

  // Update a leave policy with balance adjustments
  updatePolicy: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1, "Policy name is required"),
      description: z.string().optional(),
      maxDaysPerYear: z.number().int().positive("Maximum days must be positive"),
      isPaid: z.boolean(),
      applicableRoles: z.array(z.string()).min(1, "At least one applicable role is required"),
      adjustExistingBalances: z.boolean().optional().default(false),
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

      // Check for duplicate name (excluding current policy)
      const duplicatePolicy = await ctx.db.leavePolicy.findFirst({
        where: {
          name: input.name,
          branchId: existingPolicy.branchId,
          id: { not: input.id },
        },
      });

      if (duplicatePolicy) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A leave policy with this name already exists",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        // Update the policy
        const updatedPolicy = await tx.leavePolicy.update({
          where: { id: input.id },
          data: {
            name: input.name,
            description: input.description,
            maxDaysPerYear: input.maxDaysPerYear,
            isPaid: input.isPaid,
            applicableRoles: input.applicableRoles,
          },
        });

        // Adjust existing balances if requested and maxDaysPerYear changed
        if (input.adjustExistingBalances && input.maxDaysPerYear !== existingPolicy.maxDaysPerYear) {
          const currentYear = new Date().getFullYear();
          
          await tx.leaveBalance.updateMany({
            where: {
              policyId: input.id,
              year: currentYear,
            },
            data: {
              totalDays: input.maxDaysPerYear,
              remainingDays: {
                increment: input.maxDaysPerYear - existingPolicy.maxDaysPerYear,
              },
            },
          });
        }

        return updatedPolicy;
      });
    }),

  // Delete a leave policy with proper cleanup
  deletePolicy: protectedProcedure
    .input(z.object({
      id: z.string(),
      forceDelete: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if the policy exists
      const existingPolicy = await ctx.db.leavePolicy.findUnique({
        where: { id: input.id },
        include: {
          leaveBalances: { select: { id: true } },
          leaveApplications: { 
            select: { id: true, status: true },
            where: { status: { in: ["PENDING", "APPROVED"] } },
          },
        },
      });

      if (!existingPolicy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Leave policy not found",
        });
      }

      // Check for active applications
      const hasActiveApplications = existingPolicy.leaveApplications.length > 0;
      
      if (hasActiveApplications && !input.forceDelete) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete policy with pending or approved leave applications. Use forceDelete to override.",
        });
      }

      // Delete with transaction for data consistency
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
    }),
});

// Helper function to initialize leave balances for a specific policy
async function initializeLeaveBalancesForPolicy(
  ctx: any,
  policyId: string,
  maxDaysPerYear: number,
  applicableRoles: string[],
  branchId: string,
  year?: number
) {
  const targetYear = year || new Date().getFullYear();
  let initialized = 0;
  let skipped = 0;

  // Get all staff members based on applicable roles
  const promises = [];

  if (applicableRoles.includes("Teacher")) {
    promises.push(
      ctx.db.teacher.findMany({
        where: { 
          branchId: branchId,
          isActive: true,
        },
        select: { id: true },
      })
    );
  }

  if (applicableRoles.includes("Employee")) {
    promises.push(
      ctx.db.employee.findMany({
        where: { 
          branchId: branchId,
          isActive: true,
        },
        select: { id: true },
      })
    );
  }

  const [teachers = [], employees = []] = await Promise.all(promises);

  // Initialize balances for teachers
  for (const teacher of teachers) {
    const existingBalance = await ctx.db.leaveBalance.findFirst({
      where: {
        policyId,
        teacherId: teacher.id,
        year: targetYear,
      },
    });

    if (!existingBalance) {
      await ctx.db.leaveBalance.create({
        data: {
          policyId,
          teacherId: teacher.id,
          year: targetYear,
          totalDays: maxDaysPerYear,
          usedDays: 0,
          remainingDays: maxDaysPerYear,
        },
      });
      initialized++;
    } else {
      skipped++;
    }
  }

  // Initialize balances for employees
  for (const employee of employees) {
    const existingBalance = await ctx.db.leaveBalance.findFirst({
      where: {
        policyId,
        employeeId: employee.id,
        year: targetYear,
      },
    });

    if (!existingBalance) {
      await ctx.db.leaveBalance.create({
        data: {
          policyId,
          employeeId: employee.id,
          year: targetYear,
          totalDays: maxDaysPerYear,
          usedDays: 0,
          remainingDays: maxDaysPerYear,
        },
      });
      initialized++;
    } else {
      skipped++;
    }
  }

  return { initialized, skipped };
}

// Helper function to initialize leave balances for a specific staff member
async function initializeLeaveBalancesForStaff(
  ctx: any,
  teacherId: string | undefined,
  employeeId: string | undefined,
  staffRole: string,
  branchId: string,
  year?: number
) {
  const targetYear = year || new Date().getFullYear();

  // Get all policies applicable to this staff member
  const policies = await ctx.db.leavePolicy.findMany({
    where: {
      branchId,
      applicableRoles: { has: staffRole },
    },
  });

  // Initialize balances for each applicable policy
  for (const policy of policies) {
    const existingBalance = await ctx.db.leaveBalance.findFirst({
      where: {
        policyId: policy.id,
        year: targetYear,
        ...(teacherId ? { teacherId } : { employeeId }),
      },
    });

    if (!existingBalance) {
      await ctx.db.leaveBalance.create({
        data: {
          policyId: policy.id,
          year: targetYear,
          totalDays: policy.maxDaysPerYear,
          usedDays: 0,
          remainingDays: policy.maxDaysPerYear,
          ...(teacherId ? { teacherId } : { employeeId }),
        },
      });
    }
  }
} 