import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { TRPCError } from "@trpc/server"
import {
  ApplicationStatus,
  AdmissionStatus,
  FollowUpStatus,
  RequirementStatus,
} from "@prisma/client"

export const admissionsRouter = createTRPCRouter({
  // Applications
  getApplications: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(ApplicationStatus).optional(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const applications = await ctx.db.admissionApplication.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        where: {
          status: input.status,
        },
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
          stages: {
            where: { status: "IN_PROGRESS" },
            orderBy: { sequence: "asc" },
            take: 1,
          }
        },
        orderBy: {
          applicationDate: "desc",
        },
      })

      let nextCursor: typeof input.cursor | undefined = undefined
      if (applications.length > input.limit) {
        const nextItem = applications.pop()
        nextCursor = nextItem!.id
      }

      return {
        items: applications,
        nextCursor,
      }
    }),

  createApplication: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        applicationNumber: z.string(),
        documents: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.admissionApplication.create({
        data: {
          applicationNumber: input.applicationNumber,
          lead: { connect: { id: input.leadId } },
          status: ApplicationStatus.SUBMITTED,
          applicationDate: new Date(),
          ...(input.documents && input.documents.length > 0 && {
            requirements: {
              create: input.documents.map((docUrl) => ({
                name: "Submitted Document",
                documentUrl: docUrl,
                status: RequirementStatus.SUBMITTED,
                isRequired: true,
              })),
            },
          }),
        },
      })
    }),

  updateApplicationStatus: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        status: z.nativeEnum(ApplicationStatus),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.admissionApplication.update({
        where: { id: input.applicationId },
        data: {
          status: input.status,
          decisionNotes: input.remarks,
          ...(input.status === ApplicationStatus.OFFERED || input.status === ApplicationStatus.ACCEPTED || input.status === ApplicationStatus.REJECTED ? { decisionDate: new Date() } : {}),
        },
      })
    }),

  // Leads
  getLeads: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(AdmissionStatus).optional(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const leads = await ctx.db.admissionLead.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        where: {
          status: input.status,
        },
        include: {
          source: true,
          interactions: {
            orderBy: {
              date: "desc",
            },
            take: 1,
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      let nextCursor: typeof input.cursor | undefined = undefined
      if (leads.length > input.limit) {
        const nextItem = leads.pop()
        nextCursor = nextItem!.id
      }

      return {
        items: leads,
        nextCursor,
      }
    }),

  createLead: protectedProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        branchId: z.string(),
        sourceId: z.string().optional(),
        notes: z.string().optional(),
        parentName: z.string().optional(),
        gradeApplyingFor: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.admissionLead.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          branchId: input.branchId,
          sourceId: input.sourceId,
          status: AdmissionStatus.NEW,
          notes: input.notes,
          parentName: input.parentName,
          gradeApplyingFor: input.gradeApplyingFor,
        },
      })
    }),

  addLeadInteraction: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        type: z.enum(["CALL", "EMAIL", "MEETING", "SMS", "WHATSAPP", "WALK_IN", "EVENT", "OTHER"]),
        description: z.string(),
        date: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.leadInteraction.create({
        data: {
          leadId: input.leadId,
          type: input.type,
          description: input.description,
          date: input.date,
        },
      })
    }),

  // Admitted Students
  getAdmittedStudents: protectedProcedure
    .input(
      z.object({
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
        branchId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const students = await ctx.db.student.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        where: {
          ...(input.status !== undefined && { isActive: input.status === "ACTIVE" }),
          ...(input.branchId && { branchId: input.branchId }),
        },
        include: {
          section: true,
          branch: true,
        },
        orderBy: {
          dateOfAdmission: "desc",
        },
      })

      let nextCursor: typeof input.cursor | undefined = undefined
      if (students.length > input.limit) {
        const nextItem = students.pop()
        nextCursor = nextItem!.id
      }

      return {
        items: students,
        nextCursor,
      }
    }),

  // Dashboard Stats
  getDashboardStats: protectedProcedure
    .input(z.object({ branchId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30))
      const whereClause = input.branchId ? { lead: { branchId: input.branchId } } : {}
      const leadWhereClause = input.branchId ? { branchId: input.branchId } : {}

      const [
        totalApplications,
        activeLeads,
        admittedStudentsCount,
        lastMonthApplications,
        lastMonthLeads,
        lastMonthAdmitted,
      ] = await Promise.all([
        ctx.db.admissionApplication.count({ where: whereClause }),
        ctx.db.admissionLead.count({
          where: {
            ...leadWhereClause,
            status: {
              in: [
                AdmissionStatus.NEW,
                AdmissionStatus.CONTACTED,
                AdmissionStatus.ENGAGED,
                AdmissionStatus.APPLICATION_SENT,
                AdmissionStatus.TOUR_SCHEDULED,
                AdmissionStatus.TOUR_COMPLETED,
                AdmissionStatus.ASSESSMENT_SCHEDULED,
                AdmissionStatus.INTERVIEW_SCHEDULED,
              ],
            },
          },
        }),
        ctx.db.student.count({
          where: {
            isActive: true,
            ...(input.branchId && { branchId: input.branchId }),
          },
        }),
        ctx.db.admissionApplication.count({
          where: {
            ...whereClause,
            applicationDate: {
              gte: thirtyDaysAgo,
            },
          },
        }),
        ctx.db.admissionLead.count({
          where: {
            ...leadWhereClause,
            createdAt: {
              gte: thirtyDaysAgo,
            },
            status: {
              in: [
                AdmissionStatus.NEW,
                AdmissionStatus.CONTACTED,
                AdmissionStatus.ENGAGED,
                AdmissionStatus.APPLICATION_SENT,
                AdmissionStatus.TOUR_SCHEDULED,
                AdmissionStatus.TOUR_COMPLETED,
                AdmissionStatus.ASSESSMENT_SCHEDULED,
                AdmissionStatus.INTERVIEW_SCHEDULED,
              ],
            },
          },
        }),
        ctx.db.student.count({
          where: {
            isActive: true,
            ...(input.branchId && { branchId: input.branchId }),
            dateOfAdmission: {
              gte: thirtyDaysAgo,
            },
          },
        }),
      ])

      return {
        totalApplications,
        activeLeads,
        admittedStudents: admittedStudentsCount,
        lastMonthApplications,
        lastMonthLeads,
        lastMonthAdmitted,
      }
    }),
}) 