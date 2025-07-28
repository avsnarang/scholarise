import { z } from "zod"
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc"
import { TRPCError } from "@trpc/server"
import { InquiryStatus } from "@prisma/client"

export const admissionsRouter = createTRPCRouter({
  // Create new admission inquiry (public registration)
  createInquiry: publicProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        parentName: z.string().min(1),
        parentPhone: z.string().min(10),
        parentEmail: z.string().email().optional(),
        classApplying: z.string().min(1),
        dateOfBirth: z.date().optional(),
        gender: z.string().optional(),
        address: z.string().optional(),
        source: z.string().optional(),
        branchId: z.string(),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate registration number
      const year = new Date().getFullYear();
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const registrationNumber = `ADM${year}${randomNum}`;

      return ctx.db.admissionInquiry.create({
        data: {
          ...input,
          registrationNumber,
          status: InquiryStatus.NEW,
        },
      });
    }),

  // Get all inquiries for admin dashboard
  getInquiries: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(InquiryStatus).optional(),
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const inquiries = await ctx.db.admissionInquiry.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        where: {
          status: input.status,
          branchId: input.branchId,
          sessionId: input.sessionId,
        },
        include: {
          branch: {
            select: {
              name: true,
              code: true,
            },
          },
          session: {
            select: {
              name: true,
            },
          },
          student: {
            select: {
              admissionNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          followUps: {
            orderBy: { followUpDate: "desc" },
            take: 1,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (inquiries.length > input.limit) {
        const nextItem = inquiries.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items: inquiries,
        nextCursor,
      };
    }),

  // Update inquiry status
  updateInquiry: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(InquiryStatus).optional(),
        notes: z.string().optional(),
        assignedToId: z.string().optional(),
        followUpDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.admissionInquiry.update({
        where: { id },
        data,
      });
    }),

  // Add follow-up
  addFollowUp: protectedProcedure
    .input(
      z.object({
        inquiryId: z.string(),
        followUpDate: z.date(),
        notes: z.string().optional(),
        contactMethod: z.string().optional(),
        outcome: z.string().optional(),
        nextFollowUpDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.inquiryFollowUp.create({
        data: {
          ...input,
          createdById: ctx.userId,
        },
      });
    }),

  // Get dashboard stats
  getDashboardStats: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const baseWhere = {
        branchId: input.branchId,
        sessionId: input.sessionId,
        ...(input.fromDate && input.toDate ? {
          createdAt: {
            gte: input.fromDate,
            lte: input.toDate,
          },
        } : {}),
      };

      const [
        totalInquiries,
        newInquiries,
        contactedInquiries,
        visitedInquiries,
        admittedInquiries,
      ] = await Promise.all([
        ctx.db.admissionInquiry.count({ where: baseWhere }),
        ctx.db.admissionInquiry.count({ where: { ...baseWhere, status: InquiryStatus.NEW } }),
        ctx.db.admissionInquiry.count({ where: { ...baseWhere, status: InquiryStatus.CONTACTED } }),
        ctx.db.admissionInquiry.count({ where: { ...baseWhere, status: InquiryStatus.VISITED } }),
        ctx.db.admissionInquiry.count({ where: { ...baseWhere, status: InquiryStatus.ADMITTED } }),
      ]);

      const conversionRate = totalInquiries > 0 ? Math.round((admittedInquiries / totalInquiries) * 100) : 0;

      return {
        totalInquiries,
        newInquiries,
        contactedInquiries,
        visitedInquiries,
        admittedInquiries,
        conversionRate,
      };
    }),

  // Get recent activity
  getRecentActivity: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.admissionInquiry.findMany({
        take: input.limit,
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
        },
        include: {
          followUps: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }),

  // Convert inquiry to student admission
  admitStudent: protectedProcedure
    .input(
      z.object({
        inquiryId: z.string(),
        studentData: z.object({
          firstName: z.string(),
          lastName: z.string(),
          dateOfBirth: z.date(),
          gender: z.string(),
          address: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          bloodGroup: z.string().optional(),
          // Add other required student fields
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inquiry = await ctx.db.admissionInquiry.findUnique({
        where: { id: input.inquiryId },
        include: { branch: true },
      });

      if (!inquiry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Admission inquiry not found",
        });
      }

      // Generate admission number
      const year = new Date().getFullYear();
      const branchCode = inquiry.branch.code;
      const count = await ctx.db.student.count({
        where: { branchId: inquiry.branchId },
      });
      const admissionNumber = `${branchCode}${year}${(count + 1).toString().padStart(4, '0')}`;

      // Create student record
      const student = await ctx.db.student.create({
        data: {
          ...input.studentData,
          admissionNumber,
          branchId: inquiry.branchId,
          joinDate: new Date(),
          dateOfAdmission: new Date(),
        },
      });

      // Update inquiry status and link to student
      await ctx.db.admissionInquiry.update({
        where: { id: input.inquiryId },
        data: {
          status: InquiryStatus.ADMITTED,
          studentId: student.id,
        },
      });

      return student;
    }),
}); 