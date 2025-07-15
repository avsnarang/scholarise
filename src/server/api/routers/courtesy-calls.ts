import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permission } from "@/types/permissions";
import { rbacService } from "@/services/rbac-service";
import { type Prisma } from "@prisma/client";

export const courtesyCallsRouter = createTRPCRouter({
  // Get all feedback with filtering and permission-based visibility
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        studentId: z.string().optional(),
        classId: z.string().optional(),
        sectionId: z.string().optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
        callerId: z.string().optional(),
        branchId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, studentId, classId, sectionId, fromDate, toDate, callerId, branchId } = input;
      const offset = (page - 1) * limit;

      // Check if user is super admin first
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);

      let canViewAll = false;
      let canViewOwn = false;

      if (isSuperAdmin) {
        canViewAll = true; // SuperAdmins can view all feedback
      } else {
        // Check permissions for non-super admins
        canViewAll = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_ALL_COURTESY_CALL_FEEDBACK
        );
        canViewOwn = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_OWN_COURTESY_CALL_FEEDBACK
        );

        if (!canViewAll && !canViewOwn) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view courtesy call feedback",
          });
        }
      }

      // Build where clause based on permissions
      const whereClause: Prisma.CourtesyCallFeedbackWhereInput = {
        ...(branchId && { branchId }),
        ...(studentId && { studentId }),
        ...(callerId && { callerId }),
        ...(fromDate && { callDate: { gte: fromDate } }),
        ...(toDate && { callDate: { lte: toDate } }),
        ...(sectionId && {
          student: {
            sectionId,
          },
        }),
        ...(classId && {
          student: {
            section: {
              classId,
            },
          },
        }),
        // If user can only view their own feedback, filter by callerId
        ...(!canViewAll && canViewOwn && { callerId: ctx.userId }),
      };

      const [feedback, totalCount] = await Promise.all([
        ctx.db.courtesyCallFeedback.findMany({
          where: whereClause,
          skip: offset,
          take: limit,
          include: {
            student: {
              include: {
                parent: true,
                section: {
                  include: {
                    class: true,
                  },
                },
              },
            },
            teacher: true,
            employee: true,
          },
          orderBy: {
            callDate: "desc",
          },
        }),
        ctx.db.courtesyCallFeedback.count({
          where: whereClause,
        }),
      ]);

      return {
        items: feedback,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
    }),

  // Get feedback by student ID
  getByStudentId: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { studentId, page, limit } = input;
      const offset = (page - 1) * limit;

      // Check if user is super admin first
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);

      let canViewAll = false;
      let canViewOwn = false;

      if (isSuperAdmin) {
        canViewAll = true; // SuperAdmins can view all feedback
      } else {
        // Check permissions for non-super admins
        canViewAll = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_ALL_COURTESY_CALL_FEEDBACK
        );
        canViewOwn = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_OWN_COURTESY_CALL_FEEDBACK
        );

        if (!canViewAll && !canViewOwn) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view courtesy call feedback",
          });
        }
      }

      const whereClause: Prisma.CourtesyCallFeedbackWhereInput = {
        studentId,
        // If user can only view their own feedback, filter by callerId
        ...(!canViewAll && canViewOwn && { callerId: ctx.userId }),
      };

      const [feedback, totalCount] = await Promise.all([
        ctx.db.courtesyCallFeedback.findMany({
          where: whereClause,
          skip: offset,
          take: limit,
          include: {
            teacher: true,
            employee: true,
          },
          orderBy: {
            callDate: "desc",
          },
        }),
        ctx.db.courtesyCallFeedback.count({
          where: whereClause,
        }),
      ]);

      return {
        items: feedback,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
    }),

  // Get students for teacher (their assigned classes/sections)
  getTeacherStudents: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(500).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { branchId, sessionId, search, limit } = input;

      // Check if user is a teacher
      const teacherData = await ctx.db.teacher.findFirst({
        where: {
          OR: [
            { userId: ctx.userId },
            { clerkId: ctx.userId },
          ],
        },
        include: {
          sections: {
            include: {
              class: true,
            },
          },
        },
      });

      if (!teacherData) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only teachers can access this endpoint",
        });
      }

      // Get sections assigned to this teacher
      const sectionIds = teacherData.sections.map((section) => section.id);

      if (sectionIds.length === 0) {
        return {
          items: [],
          totalCount: 0,
        };
      }

      const whereClause: Prisma.StudentWhereInput = {
        sectionId: { in: sectionIds },
        isActive: true,
        ...(branchId && { branchId }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { admissionNumber: { contains: search, mode: "insensitive" } },
          ],
        }),
      };

      const [students, totalCount] = await Promise.all([
        ctx.db.student.findMany({
          where: whereClause,
          take: limit,
          include: {
            parent: true,
            section: {
              include: {
                class: true,
              },
            },
            // Include the most recent feedback for each student
            courtesyCallFeedbacks: {
              take: 1,
              orderBy: {
                callDate: "desc",
              },
              select: {
                callDate: true,
              },
            },
          },
          orderBy: [
            { section: { class: { displayOrder: "asc" } } },
            { rollNumber: "asc" },
            { firstName: "asc" },
          ],
        }),
        ctx.db.student.count({
          where: whereClause,
        }),
      ]);

      return {
        items: students,
        totalCount,
      };
    }),

  // Create new courtesy call feedback
  create: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        purpose: z.string().optional(),
        feedback: z.string().min(1, "Feedback is required"),
        followUp: z.string().optional(),
        isPrivate: z.boolean().default(false),
        callDate: z.date().optional(),
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
          Permission.CREATE_COURTESY_CALL_FEEDBACK
        );

        if (!canCreate) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to create courtesy call feedback",
          });
        }
      }

      // Get student to verify branch access
      const student = await ctx.db.student.findUnique({
        where: { id: input.studentId },
        include: {
          section: {
            include: {
              class: true,
            },
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      // Determine caller type (Teacher or Head/Employee)
      const [teacher, employee] = await Promise.all([
        ctx.db.teacher.findFirst({
          where: {
            OR: [
              { userId: ctx.userId },
              { clerkId: ctx.userId },
            ],
          },
        }),
        ctx.db.employee.findFirst({
          where: {
            OR: [
              { userId: ctx.userId },
              { clerkId: ctx.userId },
            ],
          },
        }),
      ]);

      const callerType = teacher ? "TEACHER" : "HEAD";
      const callerId = teacher?.id || employee?.id;

      if (!callerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User must be either a teacher or employee to create feedback",
        });
      }

      const feedback = await ctx.db.courtesyCallFeedback.create({
        data: {
          studentId: input.studentId,
          callerId,
          callerType,
          purpose: input.purpose,
          feedback: input.feedback,
          followUp: input.followUp,
          isPrivate: callerType === "HEAD" ? true : input.isPrivate, // Head feedback is always private
          callDate: input.callDate || new Date(),
          branchId: student.branchId,
        },
        include: {
          student: {
            include: {
              parent: true,
              section: {
                include: {
                  class: true,
                },
              },
            },
          },
          teacher: true,
          employee: true,
        },
      });

      return feedback;
    }),

  // Update existing feedback
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        purpose: z.string().optional(),
        feedback: z.string().min(1, "Feedback is required").optional(),
        followUp: z.string().optional(),
        isPrivate: z.boolean().optional(),
        callDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if user is super admin first
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);

      if (!isSuperAdmin) {
        // Check permission for non-super admins
        const canEdit = await rbacService.hasPermission(
          ctx.userId,
          Permission.EDIT_COURTESY_CALL_FEEDBACK
        );

        if (!canEdit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to edit courtesy call feedback",
          });
        }
      }

      // Get existing feedback
      const existingFeedback = await ctx.db.courtesyCallFeedback.findUnique({
        where: { id },
      });

      if (!existingFeedback) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feedback not found",
        });
      }

      // Get current user's teacher/employee ID to determine caller type
      const [teacher, employee] = await Promise.all([
        ctx.db.teacher.findFirst({
          where: {
            OR: [
              { userId: ctx.userId },
              { clerkId: ctx.userId },
            ],
          },
        }),
        ctx.db.employee.findFirst({
          where: {
            OR: [
              { userId: ctx.userId },
              { clerkId: ctx.userId },
            ],
          },
        }),
      ]);

      const userCallerId = teacher?.id || employee?.id;
      const callerType = teacher ? "TEACHER" : "HEAD";

      // Check if user can edit this feedback (own feedback or has all permission or is super admin)
      if (!isSuperAdmin) {
        const canViewAll = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_ALL_COURTESY_CALL_FEEDBACK
        );

        if (!canViewAll && existingFeedback.callerId !== userCallerId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only edit your own feedback",
          });
        }
      }

      // Ensure head feedback is always private
      const finalUpdateData = {
        ...updateData,
        ...(callerType === "HEAD" && updateData.isPrivate !== undefined && {
          isPrivate: true, // Force private for heads
        }),
      };

      const updatedFeedback = await ctx.db.courtesyCallFeedback.update({
        where: { id },
        data: finalUpdateData,
        include: {
          student: {
            include: {
              parent: true,
              section: {
                include: {
                  class: true,
                },
              },
            },
          },
          teacher: true,
          employee: true,
        },
      });

      return updatedFeedback;
    }),

  // Delete feedback
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is super admin first
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);

      if (!isSuperAdmin) {
        // Check permission for non-super admins
        const canDelete = await rbacService.hasPermission(
          ctx.userId,
          Permission.DELETE_COURTESY_CALL_FEEDBACK
        );

        if (!canDelete) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete courtesy call feedback",
          });
        }
      }

      // Get existing feedback
      const existingFeedback = await ctx.db.courtesyCallFeedback.findUnique({
        where: { id: input.id },
      });

      if (!existingFeedback) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feedback not found",
        });
      }

      await ctx.db.courtesyCallFeedback.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get feedback statistics
  getStats: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
        classId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { branchId, fromDate, toDate, classId } = input || {};

      // Check if user is super admin first
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);

      let canViewAll = false;
      let canViewOwn = false;

      if (isSuperAdmin) {
        canViewAll = true; // SuperAdmins can view all feedback statistics
      } else {
        // Check permissions for non-super admins
        canViewAll = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_ALL_COURTESY_CALL_FEEDBACK
        );
        canViewOwn = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_OWN_COURTESY_CALL_FEEDBACK
        );

        if (!canViewAll && !canViewOwn) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view courtesy call feedback statistics",
          });
        }
      }

      // Get current user's teacher/employee ID for filtering
      let userCallerId: string | undefined;
      if (!canViewAll && canViewOwn) {
        try {
          const [teacher, employee] = await Promise.all([
            ctx.db.teacher.findFirst({
              where: {
                OR: [
                  { userId: ctx.userId },
                  { clerkId: ctx.userId },
                ],
              },
            }),
            ctx.db.employee.findFirst({
              where: {
                OR: [
                  { userId: ctx.userId },
                  { clerkId: ctx.userId },
                ],
              },
            }),
          ]);
          userCallerId = teacher?.id || employee?.id;
        } catch (error) {
          console.error("Error fetching user data:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error retrieving user information",
          });
        }
      }

      const whereClause: Prisma.CourtesyCallFeedbackWhereInput = {
        ...(branchId && { branchId }),
        ...(fromDate && { callDate: { gte: fromDate } }),
        ...(toDate && { callDate: { lte: toDate } }),
        ...(classId && {
          student: {
            section: {
              classId,
            },
          },
        }),
        ...(!canViewAll && canViewOwn && userCallerId && { callerId: userCallerId }),
      };

      try {
        const [
          totalFeedback,
          feedbackByType,
          recentFeedback,
        ] = await Promise.all([
          ctx.db.courtesyCallFeedback.count({
            where: whereClause,
          }),
          ctx.db.courtesyCallFeedback.groupBy({
            by: ["callerType"],
            where: whereClause,
            _count: {
              id: true,
            },
          }),
          ctx.db.courtesyCallFeedback.findMany({
            where: whereClause,
            take: 5,
            orderBy: {
              callDate: "desc",
            },
            include: {
              student: {
                include: {
                  section: {
                    include: {
                      class: true,
                    },
                  },
                },
              },
              teacher: true,
              employee: true,
            },
          }),
        ]);

        return {
          totalFeedback,
          feedbackByType: feedbackByType.map((item: any) => ({
            type: item.callerType,
            count: item._count.id,
          })),
          recentFeedback,
        };
      } catch (error) {
        console.error("Error in getStats query:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error retrieving courtesy call statistics",
        });
      }
    }),
}); 