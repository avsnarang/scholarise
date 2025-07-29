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
        // Detailed parent information
        motherName: z.string().optional(),
        motherMobile: z.string().optional(),
        motherEmail: z.string().email().optional().or(z.literal("")),
        // Detailed address information
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        // Previous school information
        classLastAttended: z.string().optional(),
        schoolLastAttended: z.string().optional(),
        percentageObtained: z.string().optional(),
        // Registration source tracking
        isInternalRegistration: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get branch and session information for registration number
      const branch = await ctx.db.branch.findUnique({
        where: { id: input.branchId },
        select: { code: true },
      });

      const session = input.sessionId ? await ctx.db.academicSession.findUnique({
        where: { id: input.sessionId },
        select: { name: true },
      }) : null;

      if (!branch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Branch not found",
        });
      }

      // Generate registration number in format: TSH{Branch Code}-{Session Name}-0001
      const branchCode = branch.code;
      const sessionName = session?.name || new Date().getFullYear().toString();
      
      // Get the count of existing inquiries for this branch and session (excluding archived)
      const existingCount = await ctx.db.admissionInquiry.count({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          NOT: {
            status: "ARCHIVED" as any, // Exclude archived inquiries
          },
          registrationNumber: {
            startsWith: `TSH${branchCode}-${sessionName}-`,
            not: {
              contains: "(Archived)",
            },
          },
        },
      });

      const nextNumber = (existingCount + 1).toString().padStart(4, '0');
      const registrationNumber = `TSH${branchCode}-${sessionName}-${nextNumber}`;

      // Extract isInternalRegistration from input (it's not a database field)
      const { isInternalRegistration, ...dbInput } = input;

      // Determine registration source and get registrant name if internal
      let registrationSource = "ONLINE";
      let registeredByName: string | undefined = undefined;

      if (isInternalRegistration && ctx.userId) {
        registrationSource = "OFFLINE";
        
        // Try to get employee name first
        const employee = await ctx.db.employee.findFirst({
          where: { 
            OR: [
              { clerkId: ctx.userId },
              { userId: ctx.userId }
            ]
          },
          select: { firstName: true, lastName: true }
        });

        if (employee) {
          registeredByName = `${employee.firstName} ${employee.lastName}`;
        } else {
          // Try to get teacher name
          const teacher = await ctx.db.teacher.findFirst({
            where: { 
              OR: [
                { clerkId: ctx.userId },
                { userId: ctx.userId }
              ]
            },
            select: { firstName: true, lastName: true }
          });

          if (teacher) {
            registeredByName = `${teacher.firstName} ${teacher.lastName}`;
          } else {
            // Fallback to a generic name if user not found in employee/teacher tables
            registeredByName = "Staff Member";
          }
        }
      }

      return ctx.db.admissionInquiry.create({
        data: {
          ...dbInput,
          registrationNumber,
          status: InquiryStatus.NEW,
          registrationSource,
          registeredByName,
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

      // Filter out archived inquiries in application code (until database migration is run)
      const filteredInquiries = inquiries.filter(inquiry => inquiry.status !== ("ARCHIVED" as any));

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (filteredInquiries.length > input.limit) {
        const nextItem = filteredInquiries.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items: filteredInquiries,
        nextCursor,
      };
    }),

  // Get single inquiry by ID
  getInquiry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const inquiry = await ctx.db.admissionInquiry.findUnique({
        where: { id: input.id },
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
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!inquiry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inquiry not found",
        });
      }

      return inquiry;
    }),

  // Update inquiry status
  updateInquiry: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        // Student information
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        dateOfBirth: z.date().optional(),
        gender: z.string().optional(),
        classApplying: z.string().optional(),
        address: z.string().optional(),
        // Parent information
        parentName: z.string().optional(),
        parentPhone: z.string().optional(),
        parentEmail: z.string().email().optional().or(z.literal("")),
        // Mother's information
        motherName: z.string().optional(),
        motherMobile: z.string().optional(),
        motherEmail: z.string().email().optional().or(z.literal("")),
        // Address breakdown
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        // Previous school information
        classLastAttended: z.string().optional(),
        schoolLastAttended: z.string().optional(),
        percentageObtained: z.string().optional(),
        // Workflow fields (for backward compatibility)
        status: z.nativeEnum(InquiryStatus).optional(),
        notes: z.string().optional(),
        assignedToId: z.string().optional(),
        followUpDate: z.date().optional(),
        source: z.string().optional(),
        contactMethod: z.enum(["CALL", "EMAIL", "WHATSAPP"]).nullable().optional(),
        contactNotes: z.string().optional(),
        visitScheduledDate: z.date().optional(),
        interviewScheduledDate: z.date().optional(),
        interviewMode: z.enum(["ONLINE", "OFFLINE"]).nullable().optional(),
        interviewNotes: z.string().optional(),
        interviewRemarks: z.string().optional(),
        interviewMarks: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.admissionInquiry.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    }),

  // Mark as contacted
  markAsContacted: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        contactMethod: z.enum(["CALL", "EMAIL", "WHATSAPP"]),
        contactNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.admissionInquiry.update({
        where: { id: input.id },
        data: {
          status: InquiryStatus.CONTACTED,
          contactMethod: input.contactMethod,
          contactNotes: input.contactNotes,
          updatedAt: new Date(),
        },
      });
    }),

  // Schedule visit
  scheduleVisit: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        visitScheduledDate: z.date(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.admissionInquiry.update({
        where: { id: input.id },
        data: {
          status: InquiryStatus.VISIT_SCHEDULED,
          visitScheduledDate: input.visitScheduledDate,
          notes: input.notes,
          updatedAt: new Date(),
        },
      });
    }),

  // Schedule interview/test
  scheduleInterview: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        interviewScheduledDate: z.date(),
        interviewMode: z.enum(["ONLINE", "OFFLINE"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.admissionInquiry.update({
        where: { id: input.id },
        data: {
          status: InquiryStatus.INTERVIEW_SCHEDULED,
          interviewScheduledDate: input.interviewScheduledDate,
          interviewMode: input.interviewMode,
          notes: input.notes,
          updatedAt: new Date(),
        },
      });
    }),

  // Conclude interview/test
  concludeInterview: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        interviewNotes: z.string().optional(),
        interviewRemarks: z.string().optional(),
        interviewMarks: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.admissionInquiry.update({
        where: { id: input.id },
        data: {
          status: InquiryStatus.INTERVIEW_CONCLUDED,
          interviewNotes: input.interviewNotes,
          interviewRemarks: input.interviewRemarks,
          interviewMarks: input.interviewMarks,
          updatedAt: new Date(),
        },
      });
    }),

  // Confirm admission (triggers admission form)
  confirmAdmission: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.admissionInquiry.update({
        where: { id: input.id },
        data: {
          status: InquiryStatus.ADMITTED,
          notes: input.notes,
          updatedAt: new Date(),
        },
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
        // Note: Will filter archived inquiries after query until migration is run
        ...(input.fromDate && input.toDate ? {
          createdAt: {
            gte: input.fromDate,
            lte: input.toDate,
          },
        } : {}),
      };

      // Get all inquiries first, then filter out archived ones
      const [
        allInquiries,
        newInquiries,
        contactedInquiries,
        visitedInquiries,
        admittedInquiries,
      ] = await Promise.all([
        ctx.db.admissionInquiry.findMany({ where: baseWhere, select: { id: true, status: true } }),
        ctx.db.admissionInquiry.findMany({ where: { ...baseWhere, status: InquiryStatus.NEW }, select: { id: true, status: true } }),
        ctx.db.admissionInquiry.findMany({ where: { ...baseWhere, status: InquiryStatus.CONTACTED }, select: { id: true, status: true } }),
        ctx.db.admissionInquiry.findMany({ where: { ...baseWhere, status: InquiryStatus.VISITED }, select: { id: true, status: true } }),
        ctx.db.admissionInquiry.findMany({ where: { ...baseWhere, status: InquiryStatus.ADMITTED }, select: { id: true, status: true } }),
      ]);

      // Filter out archived inquiries
      const totalInquiries = allInquiries.filter(i => i.status !== ("ARCHIVED" as any)).length;
      const newCount = newInquiries.filter(i => i.status !== ("ARCHIVED" as any)).length;
      const contactedCount = contactedInquiries.filter(i => i.status !== ("ARCHIVED" as any)).length;
      const visitedCount = visitedInquiries.filter(i => i.status !== ("ARCHIVED" as any)).length;
      const admittedCount = admittedInquiries.filter(i => i.status !== ("ARCHIVED" as any)).length;

      const conversionRate = totalInquiries > 0 ? Math.round((admittedCount / totalInquiries) * 100) : 0;

      return {
        totalInquiries,
        newInquiries: newCount,
        contactedInquiries: contactedCount,
        visitedInquiries: visitedCount,
        admittedInquiries: admittedCount,
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
      const inquiries = await ctx.db.admissionInquiry.findMany({
        take: input.limit * 2, // Get more records to account for filtering
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          // Note: Will filter archived inquiries after query until migration is run
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

      // Filter out archived inquiries and limit to requested amount
      const filteredInquiries = inquiries
        .filter(inquiry => inquiry.status !== ("ARCHIVED" as any))
        .slice(0, input.limit);

      return filteredInquiries;
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

  // Archive inquiry (soft delete)
  deleteInquiry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if inquiry exists and is not already archived
      const inquiry = await ctx.db.admissionInquiry.findUnique({
        where: { id: input.id },
        include: {
          branch: { select: { code: true } },
          session: { select: { name: true } },
        },
      });

      if (!inquiry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inquiry not found",
        });
      }

      if (inquiry.status === ("ARCHIVED" as any)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Inquiry is already archived",
        });
      }

      // Generate new archived registration number
      const branchCode = inquiry.branch.code;
      const sessionName = inquiry.session?.name || new Date().getFullYear().toString();
      
      // Get the count of existing inquiries for this branch and session (excluding archived)
      const existingCount = await ctx.db.admissionInquiry.count({
        where: {
          branchId: inquiry.branchId,
          sessionId: inquiry.sessionId,
          NOT: {
            status: "ARCHIVED" as any, // Exclude archived inquiries
          },
          registrationNumber: {
            startsWith: `TSH${branchCode}-${sessionName}-`,
            not: {
              contains: "(Archived)",
            },
          },
        },
      });

      // This will now be available for new inquiries
      const availableNumber = existingCount.toString().padStart(4, '0');
      const archivedRegistrationNumber = `TSH${branchCode}-${sessionName}-${availableNumber} (Archived)`;

      // Archive the inquiry instead of deleting
      await ctx.db.admissionInquiry.update({
        where: { id: input.id },
        data: {
          status: "ARCHIVED" as any, // Set status to archived
          registrationNumber: archivedRegistrationNumber,
        },
      });

      return { success: true, message: "Inquiry has been archived" };
    }),
}); 