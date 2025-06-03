import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";

// Define enums manually instead of importing from Prisma
export enum AdmissionStatus {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  ENGAGED = "ENGAGED",
  TOUR_SCHEDULED = "TOUR_SCHEDULED",
  TOUR_COMPLETED = "TOUR_COMPLETED",
  APPLICATION_SENT = "APPLICATION_SENT",
  APPLICATION_RECEIVED = "APPLICATION_RECEIVED",
  ASSESSMENT_SCHEDULED = "ASSESSMENT_SCHEDULED",
  ASSESSMENT_COMPLETED = "ASSESSMENT_COMPLETED",
  INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED",
  INTERVIEW_COMPLETED = "INTERVIEW_COMPLETED",
  DECISION_PENDING = "DECISION_PENDING",
  OFFERED = "OFFERED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  WAITLISTED = "WAITLISTED",
  ENROLLED = "ENROLLED",
  CLOSED_LOST = "CLOSED_LOST",
  FEE_PAID = "FEE_PAID",
  ARCHIVE = "ARCHIVE"
}

export enum ApplicationStatus {
  SUBMITTED = "SUBMITTED",
  IN_REVIEW = "IN_REVIEW",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  WAITLISTED = "WAITLISTED",
  ENROLLED = "ENROLLED",
  WITHDRAWN = "WITHDRAWN"
}

export enum FollowUpStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

export enum RequirementStatus {
  PENDING = "PENDING",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export enum StageStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  SKIPPED = "SKIPPED"
}

export enum PaymentMethod {
  ONLINE = "ONLINE",
  POS = "POS",
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH = "CASH",
  CHECK = "CHECK"
}

export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED"
}

export enum PaymentType {
  REGISTRATION = "REGISTRATION",
  ADMISSION_CONFIRMATION = "ADMISSION_CONFIRMATION",
  TUITION = "TUITION",
  MISCELLANEOUS = "MISCELLANEOUS"
}

export enum AssessmentType {
  EXAM = "EXAM",
  INTERVIEW = "INTERVIEW",
  PLACEMENT_TEST = "PLACEMENT_TEST"
}

export enum AssessmentStatus {
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  MISSED = "MISSED",
  RESCHEDULED = "RESCHEDULED",
  CANCELLED = "CANCELLED"
}

export enum AssessmentResult {
  PASS = "PASS",
  FAIL = "FAIL",
  CONDITIONAL = "CONDITIONAL"
}

export enum OfferStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  EXPIRED = "EXPIRED"
}

// Type extension for PrismaClient to handle custom models
type ExtendedPrismaClient = PrismaClient & {
  leadSource: any;
  admissionLead: any;
  leadInteraction: any;
  leadDocument: any;
  followUp: any;
  admissionApplication: any;
  applicationStage: any;
  applicationRequirement: any;
  admissionStaff: any;
  paymentTransaction: any;
  assessment: any;
  admissionOffer: any;
}

export const admissionRouter = createTRPCRouter({
  // Lead Sources
  createLeadSource: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.leadSource.create({
        data: input,
      });
    }),

  updateLeadSource: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.leadSource.update({
        where: { id },
        data,
      });
    }),

  getLeadSources: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.leadSource.findMany({
        where: input ? { isActive: input.isActive } : undefined,
        orderBy: { name: "asc" },
      });
    }),

  getLeadSource: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.leadSource.findUnique({
        where: { id: input.id },
      });
    }),

  // Admission Leads
  createLead: protectedProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        parentName: z.string().optional(),
        parentPhone: z.string().optional(),
        parentEmail: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        zipCode: z.string().optional(),
        gradeApplyingFor: z.string().optional(),
        academicSession: z.string().optional(),
        sourceId: z.string().optional(),
        status: z.nativeEnum(AdmissionStatus).default(AdmissionStatus.NEW),
        notes: z.string().optional(),
        assignedToId: z.string().optional(),
        branchId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.admissionLead.create({
        data: input,
      });
    }),

  updateLead: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        parentName: z.string().optional(),
        parentPhone: z.string().optional(),
        parentEmail: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        zipCode: z.string().optional(),
        gradeApplyingFor: z.string().optional(),
        academicSession: z.string().optional(),
        sourceId: z.string().optional(),
        status: z.nativeEnum(AdmissionStatus).optional(),
        notes: z.string().optional(),
        assignedToId: z.string().optional(),
        branchId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.admissionLead.update({
        where: { id },
        data,
      });
    }),

  getLeads: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        status: z.nativeEnum(AdmissionStatus).optional(),
        assignedToId: z.string().optional(),
        sourceId: z.string().optional(),
        gradeApplyingFor: z.string().optional(),
        searchTerm: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, searchTerm, ...filters } = input;
      
      const where: any = { ...filters };
      
      if (searchTerm) {
        where.OR = [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
          { parentName: { contains: searchTerm, mode: 'insensitive' } },
          { parentEmail: { contains: searchTerm, mode: 'insensitive' } },
          { parentPhone: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }
      
      const db = ctx.db as unknown as ExtendedPrismaClient;
      const items = await db.admissionLead.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          source: true,
          assignedTo: true,
          branch: true,
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  getLead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.admissionLead.findUnique({
        where: { id: input.id },
        include: {
          source: true,
          assignedTo: true,
          branch: true,
          interactions: {
            include: {
              conductedBy: true,
            },
            orderBy: { date: "desc" },
          },
          documents: {
            include: {
              uploadedBy: true,
            },
            orderBy: { uploadedAt: "desc" },
          },
          followUps: {
            include: {
              assignedTo: true,
            },
            orderBy: { scheduledDate: "asc" },
          },
          application: {
            include: {
              assignedTo: true,
              stages: {
                orderBy: { sequence: "asc" },
              },
              requirements: true,
            },
          },
        },
      });
    }),

  // Lead Interactions
  createInteraction: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        type: z.string(),
        description: z.string(),
        date: z.date(),
        conductedById: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.leadInteraction.create({
        data: input,
      });
    }),
  
  // Lead Documents
  createDocument: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        name: z.string(),
        type: z.string(),
        url: z.string(),
        uploadedById: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.leadDocument.create({
        data: {
          ...input,
          uploadedAt: new Date(),
        },
      });
    }),

  // Follow Ups
  createFollowUp: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        scheduledDate: z.date(),
        description: z.string(),
        status: z.nativeEnum(FollowUpStatus).default(FollowUpStatus.PENDING),
        assignedToId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.followUp.create({
        data: input,
      });
    }),

  updateFollowUp: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        scheduledDate: z.date().optional(),
        description: z.string().optional(),
        status: z.nativeEnum(FollowUpStatus).optional(),
        completedDate: z.date().optional(),
        assignedToId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.followUp.update({
        where: { id },
        data,
      });
    }),

  // Applications
  createApplication: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        applicationNumber: z.string(),
        status: z.nativeEnum(ApplicationStatus).default(ApplicationStatus.SUBMITTED),
        assignedToId: z.string().optional(),
        stages: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            sequence: z.number(),
          })
        ).optional(),
        requirements: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            isRequired: z.boolean().default(true),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { stages, requirements, ...applicationData } = input;
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      // Check if lead already has an application
      const existingApplication = await db.admissionApplication.findUnique({
        where: { leadId: input.leadId },
      });
      
      if (existingApplication) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This lead already has an application",
        });
      }
      
      return db.admissionApplication.create({
        data: {
          ...applicationData,
          applicationDate: new Date(),
          stages: {
            create: stages,
          },
          requirements: {
            create: requirements,
          },
        },
        include: {
          stages: true,
          requirements: true,
        },
      });
    }),

  getApplications: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        status: z.nativeEnum(ApplicationStatus).optional(),
        assignedToId: z.string().optional(),
        searchTerm: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, searchTerm, ...filters } = input;
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      // Build where clause for direct application filters
      const where: any = { ...filters };
      
      // Build where clause for related lead fields
      const leadWhere: any = {};
      if (input.branchId) {
        leadWhere.branchId = input.branchId;
      }
      
      // Add search terms on lead's name or application number
      if (searchTerm) {
        where.OR = [
          { applicationNumber: { contains: searchTerm, mode: 'insensitive' } },
          {
            lead: {
              OR: [
                { firstName: { contains: searchTerm, mode: 'insensitive' } },
                { lastName: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm, mode: 'insensitive' } },
              ]
            }
          }
        ];
      }
      
      // Add lead where clause if any conditions
      if (Object.keys(leadWhere).length > 0) {
        where.lead = leadWhere;
      }
      
      const items = await db.admissionApplication.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { applicationDate: "desc" },
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
              branchId: true,
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          },
          stages: {
            orderBy: { sequence: "asc" },
            select: {
              id: true,
              name: true,
              sequence: true,
              status: true,
            }
          },
        },
      });
      
      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }
      
      return {
        items,
        nextCursor,
      };
    }),

  updateApplicationStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(ApplicationStatus),
        currentStage: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.admissionApplication.update({
        where: { id },
        data,
      });
    }),

  // Application Stages
  updateStage: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(StageStatus),
        completedDate: z.date().optional(),
        notes: z.string().optional(),
        completedById: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      if (input.status === StageStatus.COMPLETED && !input.completedDate) {
        data.completedDate = new Date();
      }
      
      return db.applicationStage.update({
        where: { id },
        data,
      });
    }),

  // Application Requirements
  updateRequirement: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(RequirementStatus),
        completedDate: z.date().optional(),
        notes: z.string().optional(),
        documentUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      if (input.status === RequirementStatus.APPROVED && !input.completedDate) {
        data.completedDate = new Date();
      }
      
      return db.applicationRequirement.update({
        where: { id },
        data,
      });
    }),

  // Admission Staff
  createStaff: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.string(),
        userId: z.string().optional(),
        clerkId: z.string().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.admissionStaff.create({
        data: input,
      });
    }),

  updateStaff: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.string().optional(),
        userId: z.string().optional(),
        clerkId: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.admissionStaff.update({
        where: { id },
        data,
      });
    }),

  getStaffMembers: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        role: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      return db.admissionStaff.findMany({
        where: input,
        orderBy: { name: "asc" },
      });
    }),

  // Dashboard stats
  getAdmissionStats: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      console.log('getAdmissionStats called with:', JSON.stringify(input || {}, (key, value) => {
        // Handle Date objects for logging
        return value instanceof Date ? value.toISOString() : value;
      }));

      // If input is completely empty, provide some defaults
      if (!input || (Object.keys(input).length === 0)) {
        console.log('No input provided to getAdmissionStats, using defaults');
        input = {
          fromDate: new Date(new Date().setDate(new Date().getDate() - 30)),
          toDate: new Date(),
        };
      }
      
      const where: any = {};
      
      if (input?.branchId) {
        where.branchId = input.branchId;
      }
      
      if (input?.fromDate || input?.toDate) {
        where.createdAt = {};
        if (input?.fromDate) where.createdAt.gte = input.fromDate;
        if (input?.toDate) where.createdAt.lte = input.toDate;
      }

      try {
        const db = ctx.db as unknown as ExtendedPrismaClient;
        const [
          totalLeads,
          newLeads,
          inProgressLeads,
          completedLeads,
          totalApplications,
          pendingApplications,
          acceptedApplications,
          rejectedApplications,
        ] = await Promise.all([
          db.admissionLead.count({ where }),
          db.admissionLead.count({ where: { ...where, status: AdmissionStatus.NEW } }),
          db.admissionLead.count({ 
            where: { 
              ...where, 
              status: { 
                notIn: [AdmissionStatus.NEW, AdmissionStatus.ENROLLED, AdmissionStatus.CLOSED_LOST, AdmissionStatus.REJECTED] 
              } 
            } 
          }),
          db.admissionLead.count({ 
            where: { 
              ...where, 
              status: { 
                in: [AdmissionStatus.ENROLLED, AdmissionStatus.CLOSED_LOST, AdmissionStatus.REJECTED] 
              } 
            } 
          }),
          db.admissionApplication.count({
            where: {
              lead: { ...where }
            }
          }),
          db.admissionApplication.count({
            where: {
              lead: { ...where },
              status: {
                notIn: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED, ApplicationStatus.ENROLLED, ApplicationStatus.WITHDRAWN]
              }
            }
          }),
          db.admissionApplication.count({
            where: {
              lead: { ...where },
              status: {
                in: [ApplicationStatus.ACCEPTED, ApplicationStatus.ENROLLED]
              }
            }
          }),
          db.admissionApplication.count({
            where: {
              lead: { ...where },
              status: {
                in: [ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN]
              }
            }
          }),
        ]);
        
        return {
          totalLeads,
          newLeads,
          inProgressLeads,
          completedLeads,
          totalApplications,
          pendingApplications,
          acceptedApplications,
          rejectedApplications,
          conversionRate: totalApplications > 0 
            ? Math.round((acceptedApplications / totalApplications) * 100) 
            : 0,
        };
      } catch (error) {
        console.error('Error in getAdmissionStats:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get admission statistics',
          cause: error,
        });
      }
    }),

  // Payment Management
  createPayment: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        amount: z.number().positive(),
        method: z.nativeEnum(PaymentMethod),
        status: z.nativeEnum(PaymentStatus).default(PaymentStatus.COMPLETED),
        type: z.nativeEnum(PaymentType),
        reference: z.string().optional(),
        transactionId: z.string().optional(),
        invoiceNumber: z.string().optional(),
        paymentDate: z.date().default(() => new Date()),
        notes: z.string().optional(),
        processedById: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      // Create the payment
      const payment = await db.paymentTransaction.create({
        data: input,
      });
      
      // If it's a completed registration fee payment, update lead status
      if (input.status === PaymentStatus.COMPLETED && 
          input.type === PaymentType.REGISTRATION) {
        await db.admissionLead.update({
          where: { id: input.leadId },
          data: { status: AdmissionStatus.FEE_PAID }
        });
      }
      
      // If it's a completed admission confirmation fee, update lead status to enrolled
      if (input.status === PaymentStatus.COMPLETED && 
          input.type === PaymentType.ADMISSION_CONFIRMATION) {
        await db.admissionLead.update({
          where: { id: input.leadId },
          data: { status: AdmissionStatus.ENROLLED }
        });
        
        // Also update the offer status if it exists
        await db.admissionOffer.updateMany({
          where: { leadId: input.leadId },
          data: { 
            status: OfferStatus.ACCEPTED,
            confirmedDate: new Date()
          }
        });
      }
      
      return payment;
    }),
    
  getPayments: protectedProcedure
    .input(
      z.object({
        leadId: z.string().optional(),
        type: z.nativeEnum(PaymentType).optional(),
        status: z.nativeEnum(PaymentStatus).optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      const where: any = {};
      
      if (input.leadId) where.leadId = input.leadId;
      if (input.type) where.type = input.type;
      if (input.status) where.status = input.status;
      
      if (input.fromDate || input.toDate) {
        where.paymentDate = {};
        if (input.fromDate) where.paymentDate.gte = input.fromDate;
        if (input.toDate) where.paymentDate.lte = input.toDate;
      }
      
      return db.paymentTransaction.findMany({
        where,
        include: {
          lead: true,
          processedBy: true
        },
        orderBy: { paymentDate: "desc" }
      });
    }),
    
  // Assessment Management
  createAssessment: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        scheduledDate: z.date(),
        assessorId: z.string().optional(),
        type: z.nativeEnum(AssessmentType),
        subject: z.string().optional(),
        status: z.nativeEnum(AssessmentStatus).default(AssessmentStatus.SCHEDULED),
        location: z.string().optional(),
        duration: z.number().optional(), // in minutes
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      // Create the assessment
      const assessment = await db.assessment.create({
        data: input,
      });
      
      // Update lead status
      let leadStatus: AdmissionStatus;
      if (input.type === AssessmentType.EXAM) {
        leadStatus = AdmissionStatus.ASSESSMENT_SCHEDULED;
      } else if (input.type === AssessmentType.INTERVIEW) {
        leadStatus = AdmissionStatus.INTERVIEW_SCHEDULED;
      } else {
        leadStatus = AdmissionStatus.ASSESSMENT_SCHEDULED;
      }
      
      await db.admissionLead.update({
        where: { id: input.leadId },
        data: { status: leadStatus }
      });
      
      return assessment;
    }),
    
  updateAssessment: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        scheduledDate: z.date().optional(),
        actualDate: z.date().optional(),
        assessorId: z.string().optional(),
        type: z.nativeEnum(AssessmentType).optional(),
        subject: z.string().optional(),
        status: z.nativeEnum(AssessmentStatus).optional(),
        score: z.number().optional(),
        maxScore: z.number().optional(),
        result: z.nativeEnum(AssessmentResult).optional(),
        notes: z.string().optional(),
        location: z.string().optional(),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      const { id, ...data } = input;
      
      // Get the assessment to check its previous state
      const assessment = await db.assessment.findUnique({
        where: { id },
        include: { lead: true }
      });
      
      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }
      
      // Update the assessment
      const updatedAssessment = await db.assessment.update({
        where: { id },
        data,
      });
      
      // If status changed to COMPLETED, update lead status accordingly
      if (input.status === AssessmentStatus.COMPLETED && 
          assessment.status !== AssessmentStatus.COMPLETED) {
        let leadStatus: AdmissionStatus;
        if (assessment.type === AssessmentType.EXAM) {
          leadStatus = AdmissionStatus.ASSESSMENT_COMPLETED;
        } else if (assessment.type === AssessmentType.INTERVIEW) {
          leadStatus = AdmissionStatus.INTERVIEW_COMPLETED;
        } else {
          leadStatus = AdmissionStatus.ASSESSMENT_COMPLETED;
        }
        
        await db.admissionLead.update({
          where: { id: assessment.leadId },
          data: { status: leadStatus }
        });
      }
      
      return updatedAssessment;
    }),
    
  getAssessments: protectedProcedure
    .input(
      z.object({
        leadId: z.string().optional(),
        type: z.nativeEnum(AssessmentType).optional(),
        status: z.nativeEnum(AssessmentStatus).optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
        assessorId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      const where: any = {};
      
      if (input.leadId) where.leadId = input.leadId;
      if (input.type) where.type = input.type;
      if (input.status) where.status = input.status;
      if (input.assessorId) where.assessorId = input.assessorId;
      
      if (input.fromDate || input.toDate) {
        where.scheduledDate = {};
        if (input.fromDate) where.scheduledDate.gte = input.fromDate;
        if (input.toDate) where.scheduledDate.lte = input.toDate;
      }
      
      return db.assessment.findMany({
        where,
        include: {
          lead: true,
          assessor: true
        },
        orderBy: { scheduledDate: "asc" }
      });
    }),
    
  // Admission Offer Management
  createOffer: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        expiryDate: z.date(),
        offerLetterUrl: z.string().optional(),
        terms: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      // Check if lead already has an offer
      const existingOffer = await db.admissionOffer.findUnique({
        where: { leadId: input.leadId },
      });
      
      if (existingOffer) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This lead already has an offer",
        });
      }
      
      // Create the offer
      const offer = await db.admissionOffer.create({
        data: {
          ...input,
          status: OfferStatus.PENDING,
          offerDate: new Date(),
        },
      });
      
      // Update lead status to OFFERED
      await db.admissionLead.update({
        where: { id: input.leadId },
        data: { status: AdmissionStatus.OFFERED }
      });
      
      return offer;
    }),
    
  updateOffer: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        expiryDate: z.date().optional(),
        status: z.nativeEnum(OfferStatus).optional(),
        offerLetterUrl: z.string().optional(),
        terms: z.string().optional(),
        confirmedDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      const { id, ...data } = input;
      
      // Get the offer to check lead ID
      const offer = await db.admissionOffer.findUnique({
        where: { id },
      });
      
      if (!offer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Offer not found",
        });
      }
      
      // Update the offer
      const updatedOffer = await db.admissionOffer.update({
        where: { id },
        data,
      });
      
      // If status changed, update lead status
      if (input.status) {
        let leadStatus: AdmissionStatus;
        
        if (input.status === OfferStatus.ACCEPTED) {
          leadStatus = AdmissionStatus.ACCEPTED;
        } else if (input.status === OfferStatus.DECLINED) {
          leadStatus = AdmissionStatus.REJECTED;
        } else if (input.status === OfferStatus.EXPIRED) {
          leadStatus = AdmissionStatus.CLOSED_LOST;
        } else {
          // Don't update lead status for PENDING
          return updatedOffer;
        }
        
        await db.admissionLead.update({
          where: { id: offer.leadId },
          data: { status: leadStatus }
        });
      }
      
      return updatedOffer;
    }),
    
  getOffer: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      return db.admissionOffer.findUnique({
        where: { leadId: input.leadId },
      });
    }),
    
  // Dashboard and Analytics
  getLeadsByStatus: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      const where: any = {};
      
      if (input.branchId) {
        where.branchId = input.branchId;
      }
      
      if (input.fromDate || input.toDate) {
        where.createdAt = {};
        if (input.fromDate) where.createdAt.gte = input.fromDate;
        if (input.toDate) where.createdAt.lte = input.toDate;
      }
      
      const leads = await db.admissionLead.findMany({
        where,
        include: {
          source: true,
          assignedTo: true,
          assessments: true,
          payments: true,
          offer: true,
        },
        orderBy: { updatedAt: "desc" },
      });
      
      // Group leads by status for Kanban view
      const leadsByStatus: Record<string, any[]> = {};
      
      // Initialize all statuses with empty arrays
      Object.values(AdmissionStatus).forEach(status => {
        leadsByStatus[status] = [];
      });
      
      // Populate with leads
      leads.forEach((lead: { status: AdmissionStatus }) => {
        if (leadsByStatus[lead.status]) {
          leadsByStatus[lead.status]?.push(lead);
        }
      });
      
      return leadsByStatus;
    }),
    
  getFunnelStats: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      const where: any = {};
      
      if (input.branchId) {
        where.branchId = input.branchId;
      }
      
      if (input.fromDate || input.toDate) {
        where.createdAt = {};
        if (input.fromDate) where.createdAt.gte = input.fromDate;
        if (input.toDate) where.createdAt.lte = input.toDate;
      }
      
      // Count leads at each major stage of the funnel
      const [
        totalLeads,
        feePaidLeads,
        assessedLeads,
        offeredLeads,
        acceptedLeads,
        enrolledLeads,
      ] = await Promise.all([
        db.admissionLead.count({ where }),
        db.admissionLead.count({ where: { ...where, status: AdmissionStatus.FEE_PAID } }),
        db.admissionLead.count({ 
          where: { 
            ...where, 
            status: { 
              in: [AdmissionStatus.ASSESSMENT_COMPLETED, AdmissionStatus.INTERVIEW_COMPLETED] 
            } 
          } 
        }),
        db.admissionLead.count({ where: { ...where, status: AdmissionStatus.OFFERED } }),
        db.admissionLead.count({ where: { ...where, status: AdmissionStatus.ACCEPTED } }),
        db.admissionLead.count({ where: { ...where, status: AdmissionStatus.ENROLLED } }),
      ]);
      
      // Calculate conversion rates
      const feeConversionRate = totalLeads > 0 ? (feePaidLeads / totalLeads) * 100 : 0;
      const assessmentConversionRate = feePaidLeads > 0 ? (assessedLeads / feePaidLeads) * 100 : 0;
      const offerConversionRate = assessedLeads > 0 ? (offeredLeads / assessedLeads) * 100 : 0;
      const acceptanceRate = offeredLeads > 0 ? (acceptedLeads / offeredLeads) * 100 : 0;
      const enrollmentRate = acceptedLeads > 0 ? (enrolledLeads / acceptedLeads) * 100 : 0;
      const overallConversionRate = totalLeads > 0 ? (enrolledLeads / totalLeads) * 100 : 0;
      
      return {
        totalLeads,
        feePaidLeads,
        assessedLeads,
        offeredLeads,
        acceptedLeads,
        enrolledLeads,
        feeConversionRate,
        assessmentConversionRate,
        offerConversionRate,
        acceptanceRate,
        enrollmentRate,
        overallConversionRate,
      };
    }),
    
  // Lead-to-Student Conversion
  convertLeadToStudent: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        admissionNumber: z.string(),
        classId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as ExtendedPrismaClient;
      
      // Get lead details
      const lead = await db.admissionLead.findUnique({
        where: { id: input.leadId },
      });
      
      if (!lead) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead not found",
        });
      }
      
      // Create parent record if not exists
      let parentId: string | null = null;
      if (lead.parentName || lead.parentEmail || lead.parentPhone) {
        const parent = await db.parent.create({
          data: {
            fatherName: lead.parentName || undefined,
            fatherEmail: lead.parentEmail || undefined,
            fatherMobile: lead.parentPhone || undefined,
          }
        });
        parentId = parent.id;
      }
      
      // Create student record
      const student = await db.student.create({
        data: {
          admissionNumber: input.admissionNumber,
          firstName: lead.firstName,
          lastName: lead.lastName,
          dateOfBirth: lead.birthDate || new Date(),
          gender: lead.gender || "OTHER",
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          address: lead.address || undefined,
          dateOfAdmission: new Date(),
          branchId: lead.branchId,
          parentId: parentId || undefined,
          sectionId: input.classId,
        }
      });
      
      // Update lead status to ENROLLED
      await db.admissionLead.update({
        where: { id: input.leadId },
        data: { status: AdmissionStatus.ENROLLED }
      });
      
      return student;
    }),
}); 