import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { withBranchFilter } from "@/utils/branch-filter";

// Validation schemas
const busSchema = z.object({
  busNumber: z.string().min(1, "Bus number is required"),
  registrationNo: z.string().optional(),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  purchaseDate: z.date().optional(),
  model: z.string().optional(),
  fuelType: z.enum(["Diesel", "Petrol", "CNG", "Electric"]).default("Diesel"),
  branchId: z.string(),
  
  // Insurance Details
  insuranceNumber: z.string().optional(),
  insuranceExpiry: z.date().optional(),
  pollutionCert: z.string().optional(),
  pollutionExpiry: z.date().optional(),
  fitnessExpiry: z.date().optional(),
  
  // Financial Details
  loanAmount: z.number().optional(),
  loanEmi: z.number().optional(),
  loanStartDate: z.date().optional(),
  loanFulfillmentDate: z.date().optional(),
  loanProvider: z.string().optional(),
  
  // Tax Details
  lastTaxSubmissionDate: z.date().optional(),
  nextTaxDueDate: z.date().optional(),
  taxType: z.string().optional(),
  taxAmount: z.number().optional(),
  taxSubmissionFrequency: z.enum(["Monthly", "Quarterly", "Yearly"]).optional(),
  
  // Permit Details
  permitType: z.string().optional(),
  permitNumber: z.string().optional(),
  permitIssueDate: z.date().optional(),
  permitExpiryDate: z.date().optional(),
  permitIssuedBy: z.string().optional(),
});

const routeSchema = z.object({
  name: z.string().min(1, "Route name is required"),
  description: z.string().optional(),
  startLocation: z.string().optional(),
  endLocation: z.string().optional(),
  totalDistance: z.number().min(0).optional(),
  estimatedTime: z.number().min(0).optional(),
  branchId: z.string(),
});

const stopSchema = z.object({
  name: z.string().min(1, "Stop name is required"),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  distance: z.number().min(0).optional(),
  sequence: z.number().min(1, "Sequence must be at least 1"),
  pickupTime: z.string().optional(),
  dropTime: z.string().optional(),
  routeId: z.string(),
});

const feeStructureSchema = z.object({
  name: z.string().min(1, "Fee structure name is required"),
  description: z.string().optional(),
  feeType: z.enum(["ROUTE_WISE", "STOP_WISE", "DISTANCE_BASED", "FLAT_RATE"]),
  amount: z.number().min(0, "Amount must be non-negative"),
  sessionId: z.string(),
  branchId: z.string(),
  routeId: z.string().optional(),
  stopId: z.string().optional(),
  applicableFrom: z.date().optional(),
  applicableUntil: z.date().optional(),
});

const assignmentSchema = z.object({
  studentId: z.string(),
  routeId: z.string().optional(),
  stopId: z.string().optional(),
  feeStructureId: z.string().optional(),
  assignmentType: z.enum(["ROUTE_ONLY", "STOP_ONLY", "ROUTE_STOP"]),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  notes: z.string().optional(),
});

const fuelLogSchema = z.object({
  busId: z.string(),
  fuelDate: z.date(),
  fuelQuantity: z.number().min(0, "Fuel quantity must be non-negative"),
  pricePerLiter: z.number().min(0, "Price per liter must be non-negative"),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  odometerReading: z.number().optional(),
  fuelStation: z.string().optional(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
});

const maintenanceLogSchema = z.object({
  busId: z.string(),
  maintenanceDate: z.date(),
  maintenanceType: z.enum(["Regular", "Repair", "Emergency"]),
  description: z.string().min(1, "Description is required"),
  cost: z.number().min(0).optional(),
  serviceProvider: z.string().optional(),
  odometerReading: z.number().optional(),
  nextServiceDue: z.date().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
});

// New schemas for enhanced features
const transportStaffSchema = z.object({
  employeeCode: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  staffType: z.enum(["DRIVER", "CONDUCTOR"]),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "SUSPENDED"]).default("ACTIVE"),
  dateOfJoining: z.date().optional(),
  dateOfLeaving: z.date().optional(),
  
  // License Details
  licenseNumber: z.string().optional(),
  licenseType: z.string().optional(),
  licenseIssueDate: z.date().optional(),
  licenseExpiryDate: z.date().optional(),
  licenseIssuedBy: z.string().optional(),
  
  // Medical Details
  medicalCertNumber: z.string().optional(),
  medicalIssueDate: z.date().optional(),
  medicalExpiryDate: z.date().optional(),
  medicalIssuedBy: z.string().optional(),
  bloodGroup: z.string().optional(),
  medicalConditions: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  
  // Employment Details
  salary: z.number().optional(),
  allowances: z.number().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  ifscCode: z.string().optional(),
  
  branchId: z.string(),
});

const staffAssignmentSchema = z.object({
  busId: z.string(),
  staffId: z.string(),
  staffType: z.enum(["DRIVER", "CONDUCTOR"]),
  isPrimary: z.boolean().default(true),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  notes: z.string().optional(),
});

const tripSchema = z.object({
  busId: z.string(),
  routeId: z.string().optional(),
  driverId: z.string().optional(),
  conductorId: z.string().optional(),
  tripDate: z.date(),
  startTime: z.date(),
  endTime: z.date().optional(),
  startKilometerReading: z.number().min(0),
  endKilometerReading: z.number().min(0).optional(),
  numberOfStudents: z.number().min(0).optional(),
  fuelConsumed: z.number().min(0).optional(),
  tripType: z.enum(["Regular", "Emergency", "Maintenance"]).default("Regular"),
  notes: z.string().optional(),
});

const notificationSchema = z.object({
  type: z.enum([
    "INSURANCE_EXPIRY", "POLLUTION_EXPIRY", "FITNESS_EXPIRY", 
    "LICENSE_EXPIRY", "MEDICAL_EXPIRY", "TAX_DUE", "PERMIT_EXPIRY", 
    "MAINTENANCE_DUE", "FUEL_ALERT", "LOAN_DUE"
  ]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  targetDate: z.date(),
  reminderDays: z.number().min(0).default(7),
  method: z.enum(["EMAIL", "WHATSAPP", "BOTH"]).default("EMAIL"),
  busId: z.string().optional(),
  staffId: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
  scheduledDate: z.date(),
  branchId: z.string(),
});

const notificationConfigSchema = z.object({
  type: z.enum([
    "INSURANCE_EXPIRY", "POLLUTION_EXPIRY", "FITNESS_EXPIRY", 
    "LICENSE_EXPIRY", "MEDICAL_EXPIRY", "TAX_DUE", "PERMIT_EXPIRY", 
    "MAINTENANCE_DUE", "FUEL_ALERT", "LOAN_DUE"
  ]),
  isEnabled: z.boolean().default(true),
  reminderDays: z.number().min(0).default(7),
  method: z.enum(["EMAIL", "WHATSAPP", "BOTH"]).default("EMAIL"),
  emailTemplate: z.string().optional(),
  emailSubject: z.string().optional(),
  whatsappTemplate: z.string().optional(),
  maxRetries: z.number().min(0).default(3),
  retryIntervalHours: z.number().min(1).default(24),
  isRecurring: z.boolean().default(false),
  recurringFrequencyDays: z.number().min(1).optional(),
  branchId: z.string(),
});

const inspectionSchema = z.object({
  busId: z.string(),
  inspectionDate: z.date().optional(),
  inspectionType: z.enum(["Regular", "Pre-Trip", "Post-Trip", "Quarterly", "Annual"]).default("Regular"),
  inspectorName: z.string().min(1, "Inspector name is required"),
  inspectorEmployeeId: z.string().optional(),
  odometerReading: z.number().min(0).optional(),
  fuelLevel: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  recommendations: z.string().optional(),
  nextInspectionDue: z.date().optional(),
  branchId: z.string(),
});

const inspectionItemSchema = z.object({
  inspectionId: z.string(),
  templateItemId: z.string().optional(),
  itemName: z.string().min(1, "Item name is required"),
  category: z.enum(["SAFETY", "MECHANICAL", "ELECTRICAL", "INTERIOR", "EXTERIOR", "DOCUMENTATION"]),
  description: z.string().optional(),
  isChecked: z.boolean().default(false),
  hasProblem: z.boolean().default(false),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  problemDescription: z.string().optional(),
  recommendations: z.string().optional(),
  photoUrls: z.array(z.string()).default([]),
  isRequired: z.boolean().default(true),
  sequence: z.number().default(0),
});

const inspectionTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  category: z.enum(["SAFETY", "MECHANICAL", "ELECTRICAL", "INTERIOR", "EXTERIOR", "DOCUMENTATION"]),
  checklistItems: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    required: z.boolean().default(true),
  })),
  isRequired: z.boolean().default(true),
  branchId: z.string(),
});

export const transportationRouter = createTRPCRouter({
  // ========== BUS MANAGEMENT ==========
  getBuses: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where = withBranchFilter(input?.branchId, {
        ...(input?.includeInactive ? {} : { isActive: true }),
      });

      return ctx.db.transportBus.findMany({
        where,
        include: {
          branch: true,
          routes: {
            include: {
              route: true,
            },
            where: { isActive: true },
          },
          fuelLogs: {
            orderBy: { fuelDate: "desc" },
            take: 5,
          },
          maintenanceLogs: {
            orderBy: { maintenanceDate: "desc" },
            take: 5,
          },
          _count: {
            select: {
              fuelLogs: true,
              maintenanceLogs: true,
            },
          },
        },
        orderBy: { busNumber: "asc" },
      });
    }),

  getBusById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const bus = await ctx.db.transportBus.findUnique({
        where: { id: input.id },
        include: {
          branch: true,
          routes: {
            include: {
              route: {
                include: {
                  stops: { orderBy: { sequence: "asc" } },
                },
              },
            },
          },
          fuelLogs: {
            orderBy: { fuelDate: "desc" },
          },
          maintenanceLogs: {
            orderBy: { maintenanceDate: "desc" },
          },
        },
      });

      if (!bus) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bus not found",
        });
      }

      return bus;
    }),

  createBus: protectedProcedure
    .input(busSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate bus number
      const existing = await ctx.db.transportBus.findUnique({
        where: { busNumber: input.busNumber },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A bus with this number already exists",
        });
      }

      return ctx.db.transportBus.create({
        data: input,
        include: {
          branch: true,
        },
      });
    }),

  updateBus: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: busSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const bus = await ctx.db.transportBus.findUnique({
        where: { id: input.id },
      });

      if (!bus) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bus not found",
        });
      }

      // Check for duplicate bus number if changing
      if (input.data.busNumber && input.data.busNumber !== bus.busNumber) {
        const existing = await ctx.db.transportBus.findUnique({
          where: { busNumber: input.data.busNumber },
        });

        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A bus with this number already exists",
          });
        }
      }

      return ctx.db.transportBus.update({
        where: { id: input.id },
        data: input.data,
        include: {
          branch: true,
        },
      });
    }),

  deleteBus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const bus = await ctx.db.transportBus.findUnique({
        where: { id: input.id },
        include: {
          routes: true,
        },
      });

      if (!bus) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bus not found",
        });
      }

      // Check if bus has active routes
      if (bus.routes.some(route => route.isActive)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete bus with active route assignments",
        });
      }

      return ctx.db.transportBus.delete({
        where: { id: input.id },
      });
    }),

  // ========== ROUTE MANAGEMENT ==========
  getRoutes: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where = withBranchFilter(input?.branchId, {
        ...(input?.includeInactive ? {} : { isActive: true }),
      });

      return ctx.db.transportRoute.findMany({
        where,
        include: {
          branch: true,
          stops: {
            orderBy: { sequence: "asc" },
            where: { isActive: true },
          },
          buses: {
            include: {
              bus: true,
            },
            where: { isActive: true },
          },
          assignments: {
            include: {
              student: true,
            },
            where: { isActive: true },
          },
          feeStructures: {
            where: { isActive: true },
          },
          _count: {
            select: {
              stops: true,
              assignments: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  getRouteById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const route = await ctx.db.transportRoute.findUnique({
        where: { id: input.id },
        include: {
          branch: true,
          stops: {
            orderBy: { sequence: "asc" },
            include: {
              assignments: {
                include: {
                  student: true,
                },
                where: { isActive: true },
              },
            },
          },
          buses: {
            include: {
              bus: true,
            },
          },
          feeStructures: {
            where: { isActive: true },
          },
          assignments: {
            include: {
              student: true,
              stop: true,
            },
            where: { isActive: true },
          },
        },
      });

      if (!route) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Route not found",
        });
      }

      return route;
    }),

  createRoute: protectedProcedure
    .input(routeSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportRoute.create({
        data: input,
        include: {
          branch: true,
        },
      });
    }),

  updateRoute: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: routeSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const route = await ctx.db.transportRoute.findUnique({
        where: { id: input.id },
      });

      if (!route) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Route not found",
        });
      }

      return ctx.db.transportRoute.update({
        where: { id: input.id },
        data: input.data,
        include: {
          branch: true,
        },
      });
    }),

  deleteRoute: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const route = await ctx.db.transportRoute.findUnique({
        where: { id: input.id },
        include: {
          assignments: { where: { isActive: true } },
        },
      });

      if (!route) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Route not found",
        });
      }

      // Check if route has active assignments
      if (route.assignments.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete route with active student assignments",
        });
      }

      return ctx.db.transportRoute.delete({
        where: { id: input.id },
      });
    }),

  // ========== STOP MANAGEMENT ==========
  getStops: publicProcedure
    .input(z.object({
      routeId: z.string().optional(),
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = {
        ...(input?.includeInactive ? {} : { isActive: true }),
        ...(input?.routeId && { routeId: input.routeId }),
      };

      return ctx.db.transportStop.findMany({
        where,
        include: {
          route: true,
          assignments: {
            include: {
              student: true,
            },
            where: { isActive: true },
          },
          feeStructures: {
            where: { isActive: true },
          },
          _count: {
            select: {
              assignments: true,
            },
          },
        },
        orderBy: [
          { routeId: "asc" },
          { sequence: "asc" },
        ],
      });
    }),

  createStop: protectedProcedure
    .input(stopSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate sequence in the same route
      const existing = await ctx.db.transportStop.findFirst({
        where: {
          routeId: input.routeId,
          sequence: input.sequence,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A stop with this sequence already exists in the route",
        });
      }

      return ctx.db.transportStop.create({
        data: input,
        include: {
          route: true,
        },
      });
    }),

  updateStop: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: stopSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const stop = await ctx.db.transportStop.findUnique({
        where: { id: input.id },
      });

      if (!stop) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Stop not found",
        });
      }

      // Check for duplicate sequence if changing
      if (input.data.sequence && input.data.sequence !== stop.sequence) {
        const existing = await ctx.db.transportStop.findFirst({
          where: {
            routeId: input.data.routeId || stop.routeId,
            sequence: input.data.sequence,
            id: { not: input.id },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A stop with this sequence already exists in the route",
          });
        }
      }

      return ctx.db.transportStop.update({
        where: { id: input.id },
        data: input.data,
        include: {
          route: true,
        },
      });
    }),

  deleteStop: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const stop = await ctx.db.transportStop.findUnique({
        where: { id: input.id },
        include: {
          assignments: { where: { isActive: true } },
        },
      });

      if (!stop) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Stop not found",
        });
      }

      // Check if stop has active assignments
      if (stop.assignments.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete stop with active student assignments",
        });
      }

      return ctx.db.transportStop.delete({
        where: { id: input.id },
      });
    }),

  // ========== FEE STRUCTURE MANAGEMENT ==========
  getFeeStructures: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      sessionId: z.string().optional(),
      feeType: z.enum(["ROUTE_WISE", "STOP_WISE", "DISTANCE_BASED", "FLAT_RATE"]).optional(),
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where = withBranchFilter(input?.branchId, {
        ...(input?.sessionId && { sessionId: input.sessionId }),
        ...(input?.feeType && { feeType: input.feeType }),
        ...(input?.includeInactive ? {} : { isActive: true }),
      });

      return ctx.db.transportFeeStructure.findMany({
        where,
        include: {
          branch: true,
          session: true,
          route: true,
          stop: {
            include: {
              route: true,
            },
          },
          assignments: {
            include: {
              student: true,
            },
            where: { isActive: true },
          },
          _count: {
            select: {
              assignments: true,
            },
          },
        },
        orderBy: [
          { feeType: "asc" },
          { name: "asc" },
        ],
      });
    }),

  createFeeStructure: protectedProcedure
    .input(feeStructureSchema)
    .mutation(async ({ ctx, input }) => {
      // Validation based on fee type
      if (input.feeType === "ROUTE_WISE" && !input.routeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Route ID is required for route-wise fee structure",
        });
      }

      if (input.feeType === "STOP_WISE" && !input.stopId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Stop ID is required for stop-wise fee structure",
        });
      }

      return ctx.db.transportFeeStructure.create({
        data: input,
        include: {
          branch: true,
          session: true,
          route: true,
          stop: true,
        },
      });
    }),

  updateFeeStructure: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: feeStructureSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const feeStructure = await ctx.db.transportFeeStructure.findUnique({
        where: { id: input.id },
      });

      if (!feeStructure) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fee structure not found",
        });
      }

      return ctx.db.transportFeeStructure.update({
        where: { id: input.id },
        data: input.data,
        include: {
          branch: true,
          session: true,
          route: true,
          stop: true,
        },
      });
    }),

  deleteFeeStructure: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feeStructure = await ctx.db.transportFeeStructure.findUnique({
        where: { id: input.id },
        include: {
          assignments: { where: { isActive: true } },
        },
      });

      if (!feeStructure) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fee structure not found",
        });
      }

      // Check if fee structure has active assignments
      if (feeStructure.assignments.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete fee structure with active student assignments",
        });
      }

      return ctx.db.transportFeeStructure.delete({
        where: { id: input.id },
      });
    }),

  // ========== STUDENT ASSIGNMENT MANAGEMENT ==========
  getAssignments: publicProcedure
    .input(z.object({
      studentId: z.string().optional(),
      routeId: z.string().optional(),
      stopId: z.string().optional(),
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = {
        ...(input?.includeInactive ? {} : { isActive: true }),
        ...(input?.studentId && { studentId: input.studentId }),
        ...(input?.routeId && { routeId: input.routeId }),
        ...(input?.stopId && { stopId: input.stopId }),
      };

      return ctx.db.transportAssignment.findMany({
        where,
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
          route: true,
          stop: {
            include: {
              route: true,
            },
          },
          feeStructure: true,
        },
        orderBy: [
          { student: { firstName: "asc" } },
          { student: { lastName: "asc" } },
        ],
      });
    }),

  createAssignment: protectedProcedure
    .input(assignmentSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for existing active assignment for the student
      const existing = await ctx.db.transportAssignment.findFirst({
        where: {
          studentId: input.studentId,
          isActive: true,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student already has an active transport assignment",
        });
      }

      // Validation based on assignment type
      if (input.assignmentType === "ROUTE_ONLY" && !input.routeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Route ID is required for route-only assignment",
        });
      }

      if (input.assignmentType === "STOP_ONLY" && !input.stopId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Stop ID is required for stop-only assignment",
        });
      }

      if (input.assignmentType === "ROUTE_STOP" && (!input.routeId || !input.stopId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Both route ID and stop ID are required for route-stop assignment",
        });
      }

      return ctx.db.transportAssignment.create({
        data: input,
        include: {
          student: true,
          route: true,
          stop: true,
          feeStructure: true,
        },
      });
    }),

  updateAssignment: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: assignmentSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.transportAssignment.findUnique({
        where: { id: input.id },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found",
        });
      }

      return ctx.db.transportAssignment.update({
        where: { id: input.id },
        data: input.data,
        include: {
          student: true,
          route: true,
          stop: true,
          feeStructure: true,
        },
      });
    }),

  deleteAssignment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.transportAssignment.findUnique({
        where: { id: input.id },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found",
        });
      }

      return ctx.db.transportAssignment.delete({
        where: { id: input.id },
      });
    }),

  // ========== FUEL LOG MANAGEMENT ==========
  getFuelLogs: publicProcedure
    .input(z.object({
      busId: z.string().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = {
        ...(input?.busId && { busId: input.busId }),
        ...(input?.dateFrom && input?.dateTo && {
          fuelDate: {
            gte: input.dateFrom,
            lte: input.dateTo,
          },
        }),
      };

      return ctx.db.transportFuelLog.findMany({
        where,
        include: {
          bus: true,
        },
        orderBy: { fuelDate: "desc" },
      });
    }),

  createFuelLog: protectedProcedure
    .input(fuelLogSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportFuelLog.create({
        data: input,
        include: {
          bus: true,
        },
      });
    }),

  updateFuelLog: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: fuelLogSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportFuelLog.update({
        where: { id: input.id },
        data: input.data,
        include: {
          bus: true,
        },
      });
    }),

  deleteFuelLog: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportFuelLog.delete({
        where: { id: input.id },
      });
    }),

  // ========== MAINTENANCE LOG MANAGEMENT ==========
  getMaintenanceLogs: publicProcedure
    .input(z.object({
      busId: z.string().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = {
        ...(input?.busId && { busId: input.busId }),
        ...(input?.dateFrom && input?.dateTo && {
          maintenanceDate: {
            gte: input.dateFrom,
            lte: input.dateTo,
          },
        }),
      };

      return ctx.db.transportMaintenanceLog.findMany({
        where,
        include: {
          bus: true,
        },
        orderBy: { maintenanceDate: "desc" },
      });
    }),

  createMaintenanceLog: protectedProcedure
    .input(maintenanceLogSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportMaintenanceLog.create({
        data: input,
        include: {
          bus: true,
        },
      });
    }),

  updateMaintenanceLog: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: maintenanceLogSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportMaintenanceLog.update({
        where: { id: input.id },
        data: input.data,
        include: {
          bus: true,
        },
      });
    }),

  deleteMaintenanceLog: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportMaintenanceLog.delete({
        where: { id: input.id },
      });
    }),

  // ========== CONFIGURATION MANAGEMENT ==========
  getConfiguration: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const config = await ctx.db.transportConfiguration.findUnique({
        where: { branchId: input.branchId },
        include: {
          branch: true,
          session: true,
        },
      });

      // Return default configuration if none exists
      if (!config) {
        return {
          id: "",
          branchId: input.branchId,
          sessionId: input.sessionId,
          feeCalculationMethod: "ROUTE_WISE" as const,
          allowStopWiseFees: true,
          allowRouteWiseFees: true,
          defaultFuelType: "Diesel",
          autoCalculateDistances: true,
          requireDriverDetails: true,
          requireConductorDetails: false,
          enableFuelTracking: true,
          enableMaintenanceTracking: true,
          maxCapacityPerBus: 50,
          fuelAlertThreshold: 10.0,
          maintenanceAlertDays: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
          branch: null,
          session: null,
        };
      }

      return config;
    }),

  updateConfiguration: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      feeCalculationMethod: z.enum(["ROUTE_WISE", "STOP_WISE", "DISTANCE_BASED", "FLAT_RATE"]).optional(),
      allowStopWiseFees: z.boolean().optional(),
      allowRouteWiseFees: z.boolean().optional(),
      defaultFuelType: z.string().optional(),
      autoCalculateDistances: z.boolean().optional(),
      requireDriverDetails: z.boolean().optional(),
      requireConductorDetails: z.boolean().optional(),
      enableFuelTracking: z.boolean().optional(),
      enableMaintenanceTracking: z.boolean().optional(),
      maxCapacityPerBus: z.number().min(1).optional(),
      fuelAlertThreshold: z.number().min(0).optional(),
      maintenanceAlertDays: z.number().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, sessionId, ...updateData } = input;

      return ctx.db.transportConfiguration.upsert({
        where: { branchId },
        update: updateData,
        create: {
          branchId,
          sessionId,
          ...updateData,
        },
        include: {
          branch: true,
          session: true,
        },
      });
    }),

  // ========== DASHBOARD AND ANALYTICS ==========
  getDashboardStats: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const [
        totalBuses,
        activeBuses,
        totalRoutes,
        activeRoutes,
        totalStudents,
        activeStudents,
        totalStops,
        recentFuelLogs,
        upcomingMaintenance,
      ] = await Promise.all([
        ctx.db.transportBus.count({
          where: { branchId: input.branchId },
        }),
        ctx.db.transportBus.count({
          where: { branchId: input.branchId, isActive: true },
        }),
        ctx.db.transportRoute.count({
          where: { branchId: input.branchId },
        }),
        ctx.db.transportRoute.count({
          where: { branchId: input.branchId, isActive: true },
        }),
        ctx.db.transportAssignment.count(),
        ctx.db.transportAssignment.count({
          where: { isActive: true },
        }),
        ctx.db.transportStop.count({
          where: {
            route: { branchId: input.branchId },
            isActive: true,
          },
        }),
        ctx.db.transportFuelLog.findMany({
          where: {
            bus: { branchId: input.branchId },
          },
          include: {
            bus: true,
          },
          orderBy: { fuelDate: "desc" },
          take: 10,
        }),
        ctx.db.transportMaintenanceLog.findMany({
          where: {
            bus: { branchId: input.branchId },
            nextServiceDue: {
              gte: new Date(),
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
            },
          },
          include: {
            bus: true,
          },
          orderBy: { nextServiceDue: "asc" },
        }),
      ]);

      // Calculate fuel efficiency and costs
      const fuelStats = recentFuelLogs.reduce(
        (acc, log) => {
          acc.totalCost += log.totalAmount;
          acc.totalFuel += log.fuelQuantity;
          return acc;
        },
        { totalCost: 0, totalFuel: 0 }
      );

      return {
        buses: {
          total: totalBuses,
          active: activeBuses,
          inactive: totalBuses - activeBuses,
        },
        routes: {
          total: totalRoutes,
          active: activeRoutes,
          inactive: totalRoutes - activeRoutes,
        },
        students: {
          total: totalStudents,
          active: activeStudents,
          inactive: totalStudents - activeStudents,
        },
        stops: {
          total: totalStops,
        },
        fuel: {
          totalCost: fuelStats.totalCost,
          totalFuel: fuelStats.totalFuel,
          averagePrice: fuelStats.totalFuel > 0 ? fuelStats.totalCost / fuelStats.totalFuel : 0,
          recentLogs: recentFuelLogs,
        },
        maintenance: {
          upcoming: upcomingMaintenance,
        },
      };
    }),

  // ========== BULK OPERATIONS ==========
  bulkAssignStudents: protectedProcedure
    .input(z.object({
      studentIds: z.array(z.string()),
      routeId: z.string().optional(),
      stopId: z.string().optional(),
      feeStructureId: z.string().optional(),
      assignmentType: z.enum(["ROUTE_ONLY", "STOP_ONLY", "ROUTE_STOP"]),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      notes: z.string().optional(),
      assignedBy: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { studentIds, ...assignmentData } = input;

      // Check for existing assignments
      const existingAssignments = await ctx.db.transportAssignment.findMany({
        where: {
          studentId: { in: studentIds },
          isActive: true,
        },
      });

      if (existingAssignments.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${existingAssignments.length} student(s) already have active transport assignments`,
        });
      }

      // Create assignments for all students
      const assignments = studentIds.map(studentId => ({
        ...assignmentData,
        studentId,
      }));

      await ctx.db.transportAssignment.createMany({
        data: assignments,
      });

      return {
        message: `Successfully created ${studentIds.length} transport assignments`,
        count: studentIds.length,
      };
    }),

  bulkUnassignStudents: protectedProcedure
    .input(z.object({
      studentIds: z.array(z.string()),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const endDate = input.endDate || new Date();

      const result = await ctx.db.transportAssignment.updateMany({
        where: {
          studentId: { in: input.studentIds },
          isActive: true,
        },
        data: {
          isActive: false,
          endDate,
        },
      });

      return {
        message: `Successfully deactivated ${result.count} transport assignments`,
        count: result.count,
      };
    }),

  // ========== STAFF MANAGEMENT ==========
  getStaff: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      staffType: z.enum(["DRIVER", "CONDUCTOR"]).optional(),
      status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "SUSPENDED"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.transportStaff.findMany({
        where: {
          branchId: input.branchId,
          ...(input.staffType && { staffType: input.staffType }),
          ...(input.status && { status: input.status }),
        },
        include: {
          busAssignments: {
            where: { isActive: true },
            include: { bus: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getStaffById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.transportStaff.findUnique({
        where: { id: input.id },
        include: {
          busAssignments: {
            include: { bus: true },
          },
        },
      });
    }),

  createStaff: protectedProcedure
    .input(transportStaffSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate employee code
      if (input.employeeCode) {
        const existing = await ctx.db.transportStaff.findUnique({
          where: { employeeCode: input.employeeCode },
        });

        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A staff member with this employee code already exists",
          });
        }
      }

      return ctx.db.transportStaff.create({
        data: input,
        include: {
          busAssignments: {
            include: { bus: true },
          },
        },
      });
    }),

  updateStaff: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: transportStaffSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportStaff.update({
        where: { id: input.id },
        data: input.data,
        include: {
          busAssignments: {
            include: { bus: true },
          },
        },
      });
    }),

  deleteStaff: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if staff has active assignments
      const activeAssignments = await ctx.db.transportStaffAssignment.findMany({
        where: { staffId: input.id, isActive: true },
      });

      if (activeAssignments.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete staff member with active bus assignments",
        });
      }

      return ctx.db.transportStaff.delete({
        where: { id: input.id },
      });
    }),

  // ========== STAFF ASSIGNMENTS ==========
  getStaffAssignments: protectedProcedure
    .input(z.object({
      busId: z.string().optional(),
      staffId: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.transportStaffAssignment.findMany({
        where: {
          ...(input.busId && { busId: input.busId }),
          ...(input.staffId && { staffId: input.staffId }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
        include: {
          bus: true,
          staff: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  createStaffAssignment: protectedProcedure
    .input(staffAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if this would create a duplicate assignment
      const existing = await ctx.db.transportStaffAssignment.findFirst({
        where: {
          busId: input.busId,
          staffId: input.staffId,
          staffType: input.staffType,
          isActive: true,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This staff member is already assigned to this bus",
        });
      }

      return ctx.db.transportStaffAssignment.create({
        data: {
          ...input,
          startDate: input.startDate || new Date(),
        },
        include: {
          bus: true,
          staff: true,
        },
      });
    }),

  updateStaffAssignment: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: staffAssignmentSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportStaffAssignment.update({
        where: { id: input.id },
        data: input.data,
        include: {
          bus: true,
          staff: true,
        },
      });
    }),

  deleteStaffAssignment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportStaffAssignment.delete({
        where: { id: input.id },
      });
    }),

  // ========== TRIP MANAGEMENT ==========
  getTrips: protectedProcedure
    .input(z.object({
      busId: z.string().optional(),
      routeId: z.string().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      isCompleted: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.transportTrip.findMany({
        where: {
          ...(input.busId && { busId: input.busId }),
          ...(input.routeId && { routeId: input.routeId }),
          ...(input.isCompleted !== undefined && { isCompleted: input.isCompleted }),
          ...(input.dateFrom && input.dateTo && {
            tripDate: {
              gte: input.dateFrom,
              lte: input.dateTo,
            },
          }),
        },
        include: {
          bus: true,
          route: true,
        },
        orderBy: { tripDate: "desc" },
      });
    }),

  createTrip: protectedProcedure
    .input(tripSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportTrip.create({
        data: input,
        include: {
          bus: true,
          route: true,
        },
      });
    }),

  updateTrip: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: tripSchema.partial().extend({
        isCompleted: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Calculate total distance if end reading is provided
      const updateData: any = { ...input.data };
      
      if (input.data.endKilometerReading) {
        const trip = await ctx.db.transportTrip.findUnique({
          where: { id: input.id },
        });
        
        if (trip) {
          updateData.totalDistance = input.data.endKilometerReading - trip.startKilometerReading;
          
          // Auto-create fuel log entry if trip is completed with fuel consumption data
          if (input.data.fuelConsumed && updateData.totalDistance > 0) {
            const efficiency = updateData.totalDistance / input.data.fuelConsumed;
            
            // Create a fuel log entry
            await ctx.db.transportFuelLog.create({
              data: {
                busId: trip.busId,
                fuelDate: new Date(),
                fuelQuantity: input.data.fuelConsumed,
                pricePerLiter: 0, // Will need to be updated manually
                totalAmount: 0, // Will need to be updated manually
                odometerReading: input.data.endKilometerReading,
                notes: `Auto-generated from trip completion. Efficiency: ${efficiency.toFixed(2)} km/L`,
                createdBy: "SYSTEM",
              },
            });
          }
        }
      }

      return ctx.db.transportTrip.update({
        where: { id: input.id },
        data: updateData,
        include: {
          bus: true,
          route: true,
        },
      });
    }),

  deleteTrip: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportTrip.delete({
        where: { id: input.id },
      });
    }),

  // ========== NOTIFICATION SYSTEM ==========
  getNotifications: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      type: z.enum([
        "INSURANCE_EXPIRY", "POLLUTION_EXPIRY", "FITNESS_EXPIRY", 
        "LICENSE_EXPIRY", "MEDICAL_EXPIRY", "TAX_DUE", "PERMIT_EXPIRY", 
        "MAINTENANCE_DUE", "FUEL_ALERT", "LOAN_DUE"
      ]).optional(),
      status: z.enum(["PENDING", "SENT", "FAILED", "READ"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.transportNotification.findMany({
        where: {
          branchId: input.branchId,
          ...(input.type && { type: input.type }),
          ...(input.status && { status: input.status }),
        },
        include: {
          bus: true,
          staff: true,
        },
        orderBy: { scheduledDate: "asc" },
      });
    }),

  createNotification: protectedProcedure
    .input(notificationSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportNotification.create({
        data: input,
        include: {
          bus: true,
          staff: true,
        },
      });
    }),

  updateNotificationStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["PENDING", "SENT", "FAILED", "READ"]),
      sentDate: z.date().optional(),
      readDate: z.date().optional(),
      errorMessage: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportNotification.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.sentDate && { sentDate: input.sentDate }),
          ...(input.readDate && { readDate: input.readDate }),
          ...(input.errorMessage && { errorMessage: input.errorMessage }),
        },
      });
    }),

  // ========== NOTIFICATION CONFIGURATION ==========
  getNotificationConfigs: protectedProcedure
    .input(z.object({ branchId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.transportNotificationConfig.findMany({
        where: { branchId: input.branchId },
        orderBy: { type: "asc" },
      });
    }),

  updateNotificationConfig: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      type: z.enum([
        "INSURANCE_EXPIRY", "POLLUTION_EXPIRY", "FITNESS_EXPIRY", 
        "LICENSE_EXPIRY", "MEDICAL_EXPIRY", "TAX_DUE", "PERMIT_EXPIRY", 
        "MAINTENANCE_DUE", "FUEL_ALERT", "LOAN_DUE"
      ]),
      data: notificationConfigSchema.omit({ branchId: true, type: true }),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportNotificationConfig.upsert({
        where: {
          branchId_type: {
            branchId: input.branchId,
            type: input.type,
          },
        },
        create: {
          branchId: input.branchId,
          type: input.type,
          ...input.data,
        },
        update: input.data,
      });
    }),

  // ========== UTILITY FUNCTIONS ==========
  generateNotifications: protectedProcedure
    .input(z.object({ branchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const configs = await ctx.db.transportNotificationConfig.findMany({
        where: { branchId: input.branchId, isEnabled: true },
      });

      const buses = await ctx.db.transportBus.findMany({
        where: { branchId: input.branchId, isActive: true },
      });

      const staff = await ctx.db.transportStaff.findMany({
        where: { branchId: input.branchId, status: "ACTIVE" },
      });

      const notifications = [];
      const now = new Date();

      for (const config of configs) {
        // Generate notifications based on type
        if (config.type === "INSURANCE_EXPIRY") {
          for (const bus of buses) {
            if (bus.insuranceExpiry) {
              const reminderDate = new Date(bus.insuranceExpiry);
              reminderDate.setDate(reminderDate.getDate() - config.reminderDays);
              
              if (reminderDate <= now && bus.insuranceExpiry > now) {
                notifications.push({
                  type: config.type,
                  title: `Insurance Expiring - ${bus.busNumber}`,
                  message: `Insurance for bus ${bus.busNumber} expires on ${bus.insuranceExpiry.toLocaleDateString()}`,
                  targetDate: bus.insuranceExpiry,
                  reminderDays: config.reminderDays,
                  method: config.method,
                  busId: bus.id,
                  scheduledDate: reminderDate,
                  branchId: input.branchId,
                });
              }
            }
          }
        }

        // Add similar logic for other notification types...
        // This is a simplified example - you would implement all notification types
      }

      // Create notifications
      if (notifications.length > 0) {
        await ctx.db.transportNotification.createMany({
          data: notifications,
          skipDuplicates: true,
        });
      }

      return {
        message: `Generated ${notifications.length} notifications`,
        count: notifications.length,
      };
    }),

  // ========== INSPECTION MANAGEMENT ==========
  getInspections: protectedProcedure
    .input(z.object({
      busId: z.string().optional(),
      branchId: z.string().optional(),
      status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"]).optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.transportBusInspection.findMany({
        where: {
          ...(input.busId && { busId: input.busId }),
          ...(input.branchId && { branchId: input.branchId }),
          ...(input.status && { status: input.status }),
          ...(input.dateFrom && input.dateTo && {
            inspectionDate: {
              gte: input.dateFrom,
              lte: input.dateTo,
            },
          }),
        },
        include: {
          bus: true,
          items: {
            orderBy: { sequence: "asc" },
          },
          photos: true,
          _count: {
            select: {
              items: true,
              photos: true,
            },
          },
        },
        orderBy: { inspectionDate: "desc" },
      });
    }),

  getInspectionById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const inspection = await ctx.db.transportBusInspection.findUnique({
        where: { id: input.id },
        include: {
          bus: true,
          branch: true,
          items: {
            orderBy: { sequence: "asc" },
            include: {
              photos: true,
            },
          },
          photos: true,
        },
      });

      if (!inspection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inspection not found",
        });
      }

      return inspection;
    }),

  createInspection: protectedProcedure
    .input(inspectionSchema)
    .mutation(async ({ ctx, input }) => {
      // Get inspection templates for the branch
      const templates = await ctx.db.transportInspectionTemplate.findMany({
        where: {
          branchId: input.branchId,
          isActive: true,
        },
      });

      // Create inspection
      const inspection = await ctx.db.transportBusInspection.create({
        data: {
          ...input,
          inspectionDate: input.inspectionDate || new Date(),
        },
        include: {
          bus: true,
        },
      });

      // Create inspection items from templates
      for (const template of templates) {
        const items = template.checklistItems as any[];
        if (Array.isArray(items)) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await ctx.db.transportInspectionItem.create({
              data: {
                inspectionId: inspection.id,
                itemName: item.name,
                description: item.description,
                category: template.category,
                isRequired: item.required !== false,
                sequence: i,
              },
            });
          }
        }
      }

      return inspection;
    }),

  updateInspection: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: inspectionSchema.partial().extend({
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"]).optional(),
        overallRating: z.enum(["Excellent", "Good", "Fair", "Poor", "Failed"]).optional(),
        isCompleted: z.boolean().optional(),
        completedAt: z.date().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Calculate totals from inspection items
      const items = await ctx.db.transportInspectionItem.findMany({
        where: { inspectionId: input.id },
      });

      const totalIssues = items.filter(item => item.hasProblem).length;
      const criticalIssues = items.filter(item => 
        item.hasProblem && item.severity === "CRITICAL"
      ).length;

      const updateData = {
        ...input.data,
        totalIssues,
        criticalIssues,
        ...(input.data.isCompleted && !input.data.completedAt && {
          completedAt: new Date(),
        }),
      };

      return ctx.db.transportBusInspection.update({
        where: { id: input.id },
        data: updateData,
        include: {
          bus: true,
          items: true,
        },
      });
    }),

  deleteInspection: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportBusInspection.delete({
        where: { id: input.id },
      });
    }),

  // ========== INSPECTION ITEMS MANAGEMENT ==========
  updateInspectionItem: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: inspectionItemSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.transportInspectionItem.update({
        where: { id: input.id },
        data: input.data,
      });

      // Update parent inspection totals
      const inspection = await ctx.db.transportBusInspection.findUnique({
        where: { id: item.inspectionId },
        include: {
          items: true,
        },
      });

      if (inspection) {
        const totalIssues = inspection.items.filter(item => item.hasProblem).length;
        const criticalIssues = inspection.items.filter(item => 
          item.hasProblem && item.severity === "CRITICAL"
        ).length;

        await ctx.db.transportBusInspection.update({
          where: { id: item.inspectionId },
          data: {
            totalIssues,
            criticalIssues,
          },
        });
      }

      return item;
    }),

  bulkUpdateInspectionItems: protectedProcedure
    .input(z.object({
      inspectionId: z.string(),
      items: z.array(z.object({
        id: z.string(),
        data: inspectionItemSchema.partial(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update all items
      for (const item of input.items) {
        await ctx.db.transportInspectionItem.update({
          where: { id: item.id },
          data: item.data,
        });
      }

      // Recalculate inspection totals
      const items = await ctx.db.transportInspectionItem.findMany({
        where: { inspectionId: input.inspectionId },
      });

      const totalIssues = items.filter(item => item.hasProblem).length;
      const criticalIssues = items.filter(item => 
        item.hasProblem && item.severity === "CRITICAL"
      ).length;

      // Update inspection
      return ctx.db.transportBusInspection.update({
        where: { id: input.inspectionId },
        data: {
          totalIssues,
          criticalIssues,
        },
        include: {
          items: true,
          bus: true,
        },
      });
    }),

  // ========== INSPECTION TEMPLATES MANAGEMENT ==========
  getInspectionTemplates: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      category: z.enum(["SAFETY", "MECHANICAL", "ELECTRICAL", "INTERIOR", "EXTERIOR", "DOCUMENTATION"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.transportInspectionTemplate.findMany({
        where: {
          branchId: input.branchId,
          isActive: true,
          ...(input.category && { category: input.category }),
        },
        orderBy: { name: "asc" },
      });
    }),

  createInspectionTemplate: protectedProcedure
    .input(inspectionTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportInspectionTemplate.create({
        data: input,
      });
    }),

  updateInspectionTemplate: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: inspectionTemplateSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportInspectionTemplate.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteInspectionTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transportInspectionTemplate.delete({
        where: { id: input.id },
      });
    }),

  // ========== INSPECTION ANALYTICS ==========
  getInspectionAnalytics: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const dateFilter = input.dateFrom && input.dateTo ? {
        inspectionDate: {
          gte: input.dateFrom,
          lte: input.dateTo,
        },
      } : {};

      const inspections = await ctx.db.transportBusInspection.findMany({
        where: {
          branchId: input.branchId,
          ...dateFilter,
        },
        include: {
          bus: true,
          items: true,
        },
      });

      const analytics = {
        totalInspections: inspections.length,
        completedInspections: inspections.filter(i => i.isCompleted).length,
        pendingInspections: inspections.filter(i => !i.isCompleted).length,
        inspectionsWithIssues: inspections.filter(i => i.totalIssues > 0).length,
        inspectionsWithCriticalIssues: inspections.filter(i => i.criticalIssues > 0).length,
        averageIssuesPerInspection: inspections.length > 0 
          ? inspections.reduce((sum, i) => sum + i.totalIssues, 0) / inspections.length 
          : 0,
        inspectionsByStatus: {
          PENDING: inspections.filter(i => i.status === "PENDING").length,
          IN_PROGRESS: inspections.filter(i => i.status === "IN_PROGRESS").length,
          COMPLETED: inspections.filter(i => i.status === "COMPLETED").length,
          FAILED: inspections.filter(i => i.status === "FAILED").length,
        },
        inspectionsByRating: {
          Excellent: inspections.filter(i => i.overallRating === "Excellent").length,
          Good: inspections.filter(i => i.overallRating === "Good").length,
          Fair: inspections.filter(i => i.overallRating === "Fair").length,
          Poor: inspections.filter(i => i.overallRating === "Poor").length,
          Failed: inspections.filter(i => i.overallRating === "Failed").length,
        },
        busesByInspectionStatus: inspections.reduce((acc, inspection) => {
          const busNumber = inspection.bus.busNumber;
          if (!acc[busNumber]) {
            acc[busNumber] = {
              busNumber,
              totalInspections: 0,
              passedInspections: 0,
              failedInspections: 0,
              lastInspection: null,
            };
          }
          acc[busNumber].totalInspections++;
          if (inspection.status === "COMPLETED" && inspection.overallRating !== "Failed") {
            acc[busNumber].passedInspections++;
          } else if (inspection.status === "FAILED" || inspection.overallRating === "Failed") {
            acc[busNumber].failedInspections++;
          }
          if (!acc[busNumber].lastInspection || 
              new Date(inspection.inspectionDate) > new Date(acc[busNumber].lastInspection)) {
            acc[busNumber].lastInspection = inspection.inspectionDate;
          }
          return acc;
        }, {} as Record<string, any>),
      };

      return analytics;
    }),
}); 