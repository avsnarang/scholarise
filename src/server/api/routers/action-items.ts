import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permission } from "@/types/permissions";
import { rbacService } from "@/services/rbac-service";
import { Prisma, type Prisma as PrismaType } from "@prisma/client";

export const actionItemsRouter = createTRPCRouter({
  // Get all action items with filtering and permission-based visibility
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        assignedToId: z.string().optional(),
        assignedById: z.string().optional(),
        studentId: z.string().optional(),
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "VERIFIED", "REJECTED", "CANCELLED"]).optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        dueDateFrom: z.date().optional(),
        dueDateTo: z.date().optional(),
        branchId: z.string().optional(),
        courtesyCallFeedbackId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { 
        page, 
        limit, 
        assignedToId, 
        assignedById, 
        studentId, 
        status, 
        priority, 
        dueDateFrom, 
        dueDateTo, 
        branchId,
        courtesyCallFeedbackId
      } = input;
      const offset = (page - 1) * limit;

      // Check if user is super admin first
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);

      let canViewAll = false;
      let canViewOwn = false;

      if (isSuperAdmin) {
        canViewAll = true; // SuperAdmins can view all action items
      } else {
        // Check permissions for non-super admins
        canViewAll = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_ALL_ACTION_ITEMS
        );
        canViewOwn = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_OWN_ACTION_ITEMS
        );

        if (!canViewAll && !canViewOwn) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view action items",
          });
        }
      }

      // Get current user's teacher record for filtering own action items
      const teacher = await ctx.db.teacher.findFirst({
        where: {
          OR: [
            { userId: ctx.userId },
            { clerkId: ctx.userId },
          ],
        },
      });

      // Build where clause
      const where: PrismaType.ActionItemWhereInput = {};

      // Apply permission-based filters
      if (!canViewAll && canViewOwn && teacher) {
        where.assignedToId = teacher.id;
      }

      // Apply input filters
      if (assignedToId) where.assignedToId = assignedToId;
      if (assignedById) where.assignedById = assignedById;
      if (studentId) where.studentId = studentId;
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (branchId) where.branchId = branchId;
      if (courtesyCallFeedbackId) where.courtesyCallFeedbackId = courtesyCallFeedbackId;

      // Date range filter
      if (dueDateFrom || dueDateTo) {
        where.dueDate = {};
        if (dueDateFrom) where.dueDate.gte = dueDateFrom;
        if (dueDateTo) where.dueDate.lte = dueDateTo;
      }

      const [actionItems, totalCount] = await Promise.all([
        ctx.db.actionItem.findMany({
          where,
          include: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
              },
            },
            assignedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
              },
            },
            verifiedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
              },
            },
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
                rollNumber: true,
                section: {
                  select: {
                    name: true,
                    class: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            courtesyCallFeedback: {
              select: {
                id: true,
                callDate: true,
                purpose: true,
                feedback: true,
              },
            },
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            { priority: "desc" },
            { dueDate: "asc" },
            { createdAt: "desc" },
          ],
          skip: offset,
          take: limit,
        }),
        ctx.db.actionItem.count({ where }),
      ]);

      return {
        items: actionItems,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      };
    }),

  // Get action item by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { id } = input;

      // Check if user is super admin first
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);

      let canViewAll = false;
      let canViewOwn = false;

      if (isSuperAdmin) {
        canViewAll = true;
      } else {
        canViewAll = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_ALL_ACTION_ITEMS
        );
        canViewOwn = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_OWN_ACTION_ITEMS
        );

        if (!canViewAll && !canViewOwn) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view action items",
          });
        }
      }

      const actionItem = await ctx.db.actionItem.findUnique({
        where: { id },
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              phone: true,
              officialEmail: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
              rollNumber: true,
              section: {
                select: {
                  name: true,
                  class: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              parent: {
                select: {
                  id: true,
                  fatherName: true,
                  motherName: true,
                  fatherMobile: true,
                  motherMobile: true,
                },
              },
            },
          },
          courtesyCallFeedback: {
            select: {
              id: true,
              callDate: true,
              purpose: true,
              feedback: true,
              followUp: true,
              callerType: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!actionItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Action item not found",
        });
      }

      // Check if user can view this specific action item
      if (!canViewAll && canViewOwn) {
        const teacher = await ctx.db.teacher.findFirst({
          where: {
            OR: [
              { userId: ctx.userId },
              { clerkId: ctx.userId },
            ],
          },
        });

        if (!teacher || actionItem.assignedToId !== teacher.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view this action item",
          });
        }
      }

      return actionItem;
    }),

  // Create new action item
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().min(1, "Description is required"),
        assignedToId: z.string().min(1, "Assigned teacher is required"),
        courtesyCallFeedbackId: z.string().min(1, "Courtesy call feedback is required"),
        studentId: z.string().min(1, "Student is required"),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is super admin first
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);

      if (!isSuperAdmin) {
        // Check permission for non-super admins
        const canCreate = await rbacService.hasPermission(
          ctx.userId,
          Permission.CREATE_ACTION_ITEM
        );

        if (!canCreate) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to create action items",
          });
        }
      }

      // Get the current user's employee record (action items are created by employees/heads)
      const employee = await ctx.db.employee.findFirst({
        where: {
          OR: [
            { userId: ctx.userId },
            { clerkId: ctx.userId },
          ],
        },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee record not found. Only employees can create action items",
        });
      }

      // Verify the courtesy call feedback exists and get related data
      const courtesyCallFeedback = await ctx.db.courtesyCallFeedback.findUnique({
        where: { id: input.courtesyCallFeedbackId },
        include: {
          student: true,
          branch: true,
        },
      });

      if (!courtesyCallFeedback) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Courtesy call feedback not found",
        });
      }

      // Verify the assigned teacher exists
      const assignedTeacher = await ctx.db.teacher.findUnique({
        where: { id: input.assignedToId },
      });

      if (!assignedTeacher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assigned teacher not found",
        });
      }

      // Create the action item
      const actionItem = await ctx.db.actionItem.create({
        data: {
          title: input.title,
          description: input.description,
          assignedToId: input.assignedToId,
          assignedById: employee.id,
          courtesyCallFeedbackId: input.courtesyCallFeedbackId,
          studentId: input.studentId,
          branchId: courtesyCallFeedback.branchId,
          priority: input.priority,
          dueDate: input.dueDate,
          status: "PENDING",
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
            },
          },
          courtesyCallFeedback: {
            select: {
              id: true,
              callDate: true,
              purpose: true,
              feedback: true,
            },
          },
        },
      });

      return actionItem;
    }),

  // Update action item status (for teachers to update progress)
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
        completionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, status, completionNotes } = input;

      // Check if user is super admin first
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);

      if (!isSuperAdmin) {
        // Check permission for non-super admins
        const canComplete = await rbacService.hasPermission(
          ctx.userId,
          Permission.COMPLETE_ACTION_ITEM
        );

        if (!canComplete) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update action items",
          });
        }
      }

      // Get the action item
      const actionItem = await ctx.db.actionItem.findUnique({
        where: { id },
      });

      if (!actionItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Action item not found",
        });
      }

      // Get current user's teacher record
      const teacher = await ctx.db.teacher.findFirst({
        where: {
          OR: [
            { userId: ctx.userId },
            { clerkId: ctx.userId },
          ],
        },
      });

      // Verify the user is the assigned teacher (unless super admin)
      if (!isSuperAdmin && (!teacher || actionItem.assignedToId !== teacher.id)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own action items",
        });
      }

      // Prepare update data
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === "COMPLETED") {
        updateData.completedAt = new Date();
        if (completionNotes) {
          updateData.completionNotes = completionNotes;
        }
      }

      // Update the action item
      const updatedActionItem = await ctx.db.actionItem.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
            },
          },
        },
      });

      return updatedActionItem;
    }),

  // Verify or reject action item (for heads/supervisors)
  verifyOrReject: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        action: z.enum(["VERIFIED", "REJECTED"]),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, action, rejectionReason } = input;

      // Check if user is super admin first
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);

      if (!isSuperAdmin) {
        // Check permission for non-super admins
        const canVerify = await rbacService.hasPermission(
          ctx.userId,
          Permission.VERIFY_ACTION_ITEM
        );
        const canReject = await rbacService.hasPermission(
          ctx.userId,
          Permission.REJECT_ACTION_ITEM
        );

        if ((action === "VERIFIED" && !canVerify) || (action === "REJECTED" && !canReject)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You don't have permission to ${action.toLowerCase()} action items`,
          });
        }
      }

      // Get the action item
      const actionItem = await ctx.db.actionItem.findUnique({
        where: { id },
      });

      if (!actionItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Action item not found",
        });
      }

      // Action item must be completed before verification/rejection
      if (actionItem.status !== "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Action item must be completed before verification or rejection",
        });
      }

      // Get current user's employee record
      const employee = await ctx.db.employee.findFirst({
        where: {
          OR: [
            { userId: ctx.userId },
            { clerkId: ctx.userId },
          ],
        },
      });

      if (!employee && !isSuperAdmin) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee record not found",
        });
      }

      // Prepare update data
      const updateData: any = {
        status: action,
        updatedAt: new Date(),
      };

      if (action === "VERIFIED") {
        updateData.verifiedAt = new Date();
        updateData.verifiedById = employee?.id;
      } else if (action === "REJECTED") {
        updateData.rejectionReason = rejectionReason;
        updateData.verifiedById = employee?.id;
      }

      // Update the action item
      const updatedActionItem = await ctx.db.actionItem.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
            },
          },
        },
      });

      return updatedActionItem;
    }),

  // Delete action item
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      // Check if user is super admin first
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);

      if (!isSuperAdmin) {
        // Check permission for non-super admins
        const canDelete = await rbacService.hasPermission(
          ctx.userId,
          Permission.DELETE_ACTION_ITEM
        );

        if (!canDelete) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete action items",
          });
        }
      }

      // Get the action item
      const actionItem = await ctx.db.actionItem.findUnique({
        where: { id },
      });

      if (!actionItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Action item not found",
        });
      }

      // Delete the action item
      await ctx.db.actionItem.delete({
        where: { id },
      });

      return { success: true };
    }),

  // Get action items for a specific teacher (dashboard view)
  getMyActionItems: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "VERIFIED", "REJECTED", "CANCELLED"]).optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { status, limit } = input;

      // Get current user's teacher record
      const teacher = await ctx.db.teacher.findFirst({
        where: {
          OR: [
            { userId: ctx.userId },
            { clerkId: ctx.userId },
          ],
        },
      });

      if (!teacher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Teacher record not found",
        });
      }

      // Build where clause
      const where: PrismaType.ActionItemWhereInput = {
        assignedToId: teacher.id,
      };

      if (status) {
        where.status = status;
      }

      const actionItems = await ctx.db.actionItem.findMany({
        where,
        include: {
          assignedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
              rollNumber: true,
              section: {
                select: {
                  name: true,
                  class: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          courtesyCallFeedback: {
            select: {
              id: true,
              callDate: true,
              purpose: true,
              feedback: true,
            },
          },
        },
        orderBy: [
          { priority: "desc" },
          { dueDate: "asc" },
          { createdAt: "desc" },
        ],
        take: limit,
      });

      return actionItems;
    }),

  // Get action items stats for dashboard
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user is super admin first
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);

      let whereClause: PrismaType.ActionItemWhereInput = {};

      if (!isSuperAdmin) {
        // For non-super admins, only show their own action items if they're teachers
        const teacher = await ctx.db.teacher.findFirst({
          where: {
            OR: [
              { userId: ctx.userId },
              { clerkId: ctx.userId },
            ],
          },
        });

        if (teacher) {
          whereClause.assignedToId = teacher.id;
        } else {
          // If not a teacher and not super admin, return empty stats
          return {
            total: 0,
            pending: 0,
            inProgress: 0,
            completed: 0,
            verified: 0,
            rejected: 0,
            overdue: 0,
          };
        }
      }

      const [
        total,
        pending,
        inProgress,
        completed,
        verified,
        rejected,
        overdue,
      ] = await Promise.all([
        ctx.db.actionItem.count({ where: whereClause }),
        ctx.db.actionItem.count({ where: { ...whereClause, status: "PENDING" } }),
        ctx.db.actionItem.count({ where: { ...whereClause, status: "IN_PROGRESS" } }),
        ctx.db.actionItem.count({ where: { ...whereClause, status: "COMPLETED" } }),
        ctx.db.actionItem.count({ where: { ...whereClause, status: "VERIFIED" } }),
        ctx.db.actionItem.count({ where: { ...whereClause, status: "REJECTED" } }),
        ctx.db.actionItem.count({
          where: {
            ...whereClause,
            dueDate: {
              lt: new Date(),
            },
            status: {
              in: ["PENDING", "IN_PROGRESS"],
            },
          },
        }),
      ]);

      return {
        total,
        pending,
        inProgress,
        completed,
        verified,
        rejected,
        overdue,
      };
    }),
});