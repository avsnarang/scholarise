import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const salaryRouter = createTRPCRouter({
  // Salary Structure Management
  createSalaryStructure: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      basicSalary: z.number().positive(),
      daPercentage: z.number().min(0).max(100),
      pfPercentage: z.number().min(0).max(100),
      esiPercentage: z.number().min(0).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.salaryStructure.create({
        data: input,
      });
    }),

  updateSalaryStructure: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      basicSalary: z.number().positive(),
      daPercentage: z.number().min(0).max(100),
      pfPercentage: z.number().min(0).max(100),
      esiPercentage: z.number().min(0).max(100),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.salaryStructure.update({
        where: { id },
        data,
      });
    }),

  getSalaryStructures: protectedProcedure
    .input(z.object({
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.salaryStructure.findMany({
        where: {
          isActive: input?.isActive,
        },
        orderBy: { name: "asc" },
      });
    }),

  // Employee Salary Assignment
  assignEmployeeSalary: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      structureId: z.string(),
      customBasicSalary: z.number().positive().optional(),
      customDaPercentage: z.number().min(0).max(100).optional(),
      customPfPercentage: z.number().min(0).max(100).optional(),
      customEsiPercentage: z.number().min(0).max(100).optional(),
      additionalAllowances: z.number().min(0).optional(),
      startDate: z.date(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if the employee exists
      const employee = await ctx.db.employee.findUnique({
        where: { id: input.employeeId },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      // Check if the salary structure exists
      const structure = await ctx.db.salaryStructure.findUnique({
        where: { id: input.structureId },
      });

      if (!structure) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Salary structure not found",
        });
      }

      // Deactivate any existing active salary assignments for this employee
      await ctx.db.employeeSalary.updateMany({
        where: {
          employeeId: input.employeeId,
          isActive: true,
        },
        data: {
          isActive: false,
          endDate: input.startDate,
        },
      });

      // Create the new salary assignment
      return ctx.db.employeeSalary.create({
        data: input,
      });
    }),

  // Teacher Salary Assignment
  assignTeacherSalary: protectedProcedure
    .input(z.object({
      teacherId: z.string(),
      structureId: z.string(),
      customBasicSalary: z.number().positive().optional(),
      customDaPercentage: z.number().min(0).max(100).optional(),
      customPfPercentage: z.number().min(0).max(100).optional(),
      customEsiPercentage: z.number().min(0).max(100).optional(),
      additionalAllowances: z.number().min(0).optional(),
      startDate: z.date(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if the teacher exists
      const teacher = await ctx.db.teacher.findUnique({
        where: { id: input.teacherId },
      });

      if (!teacher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Teacher not found",
        });
      }

      // Check if the salary structure exists
      const structure = await ctx.db.salaryStructure.findUnique({
        where: { id: input.structureId },
      });

      if (!structure) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Salary structure not found",
        });
      }

      // Deactivate any existing active salary assignments for this teacher
      await ctx.db.teacherSalary.updateMany({
        where: {
          teacherId: input.teacherId,
          isActive: true,
        },
        data: {
          isActive: false,
          endDate: input.startDate,
        },
      });

      // Create the new salary assignment
      return ctx.db.teacherSalary.create({
        data: input,
      });
    }),

  // Get staff salary details
  getEmployeeSalaryDetails: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.employeeSalary.findMany({
        where: { employeeId: input.employeeId },
        include: { structure: true },
        orderBy: { startDate: "desc" },
      });
    }),

  getTeacherSalaryDetails: protectedProcedure
    .input(z.object({
      teacherId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.teacherSalary.findMany({
        where: { teacherId: input.teacherId },
        include: { structure: true },
        orderBy: { startDate: "desc" },
      });
    }),

  // Salary payment processing
  processEmployeeSalary: protectedProcedure
    .input(z.object({
      employeeSalaryId: z.string(),
      month: z.number().min(1).max(12),
      year: z.number().int().positive(),
      otherDeductions: z.number().min(0).optional(),
      otherAdditions: z.number().min(0).optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { employeeSalaryId, month, year, otherDeductions = 0, otherAdditions = 0, remarks } = input;

      // Check if a payment already exists for this month and year
      const existingPayment = await ctx.db.salaryPayment.findFirst({
        where: {
          employeeSalaryId,
          month,
          year,
        },
      });

      if (existingPayment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A salary payment for this month and year already exists",
        });
      }

      // Get the employee salary details
      const employeeSalary = await ctx.db.employeeSalary.findUnique({
        where: { id: employeeSalaryId },
        include: {
          structure: true,
          employee: true,
        },
      });

      if (!employeeSalary) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee salary record not found",
        });
      }

      // Calculate leave deductions for the month
      const leaveDeductions = await calculateLeaveDeductions(
        ctx,
        month,
        year,
        null,
        employeeSalary.employee.id
      );

      // Calculate salary components
      const basicSalary = employeeSalary.customBasicSalary ?? employeeSalary.structure.basicSalary;
      const daPercentage = employeeSalary.customDaPercentage ?? employeeSalary.structure.daPercentage;
      const pfPercentage = employeeSalary.customPfPercentage ?? employeeSalary.structure.pfPercentage;
      const esiPercentage = employeeSalary.customEsiPercentage ?? employeeSalary.structure.esiPercentage;

      const daAmount = (basicSalary * daPercentage) / 100;
      const pfDeduction = (basicSalary * pfPercentage) / 100;
      const esiDeduction = (basicSalary * esiPercentage) / 100;
      const employerPfContribution = pfDeduction; // Equal contribution
      const employerEsiContribution = esiDeduction; // Equal contribution

      const totalEarnings = basicSalary + daAmount + employeeSalary.additionalAllowances + otherAdditions;
      const totalDeductions = pfDeduction + esiDeduction + leaveDeductions + otherDeductions;
      const netPayable = totalEarnings - totalDeductions;

      // Create the salary payment record
      return ctx.db.salaryPayment.create({
        data: {
          employeeSalaryId,
          month,
          year,
          basicSalary,
          daAmount,
          pfDeduction,
          esiDeduction,
          employerPfContribution,
          employerEsiContribution,
          additionalAllowances: employeeSalary.additionalAllowances,
          leaveDeductions,
          otherDeductions,
          otherAdditions,
          totalEarnings,
          totalDeductions,
          netPayable,
          remarks,
        },
      });
    }),

  processTeacherSalary: protectedProcedure
    .input(z.object({
      teacherSalaryId: z.string(),
      month: z.number().min(1).max(12),
      year: z.number().int().positive(),
      otherDeductions: z.number().min(0).optional(),
      otherAdditions: z.number().min(0).optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { teacherSalaryId, month, year, otherDeductions = 0, otherAdditions = 0, remarks } = input;

      // Check if a payment already exists for this month and year
      const existingPayment = await ctx.db.salaryPayment.findFirst({
        where: {
          teacherSalaryId,
          month,
          year,
        },
      });

      if (existingPayment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A salary payment for this month and year already exists",
        });
      }

      // Get the teacher salary details
      const teacherSalary = await ctx.db.teacherSalary.findUnique({
        where: { id: teacherSalaryId },
        include: {
          structure: true,
          teacher: true,
        },
      });

      if (!teacherSalary) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Teacher salary record not found",
        });
      }

      // Calculate leave deductions for the month
      const leaveDeductions = await calculateLeaveDeductions(
        ctx,
        month,
        year,
        teacherSalary.teacher.id,
        null
      );

      // Calculate salary components
      const basicSalary = teacherSalary.customBasicSalary ?? teacherSalary.structure.basicSalary;
      const daPercentage = teacherSalary.customDaPercentage ?? teacherSalary.structure.daPercentage;
      const pfPercentage = teacherSalary.customPfPercentage ?? teacherSalary.structure.pfPercentage;
      const esiPercentage = teacherSalary.customEsiPercentage ?? teacherSalary.structure.esiPercentage;

      const daAmount = (basicSalary * daPercentage) / 100;
      const pfDeduction = (basicSalary * pfPercentage) / 100;
      const esiDeduction = (basicSalary * esiPercentage) / 100;
      const employerPfContribution = pfDeduction; // Equal contribution
      const employerEsiContribution = esiDeduction; // Equal contribution

      const totalEarnings = basicSalary + daAmount + teacherSalary.additionalAllowances + otherAdditions;
      const totalDeductions = pfDeduction + esiDeduction + leaveDeductions + otherDeductions;
      const netPayable = totalEarnings - totalDeductions;

      // Create the salary payment record
      return ctx.db.salaryPayment.create({
        data: {
          teacherSalaryId,
          month,
          year,
          basicSalary,
          daAmount,
          pfDeduction,
          esiDeduction,
          employerPfContribution,
          employerEsiContribution,
          additionalAllowances: teacherSalary.additionalAllowances,
          leaveDeductions,
          otherDeductions,
          otherAdditions,
          totalEarnings,
          totalDeductions,
          netPayable,
          remarks,
        },
      });
    }),

  // Get salary payments
  getEmployeeSalaryPayments: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      year: z.number().int().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { employeeId, year } = input;

      // First get all salary assignments for this employee
      const salaryAssignments = await ctx.db.employeeSalary.findMany({
        where: { employeeId },
        select: { id: true },
      });

      const salaryAssignmentIds = salaryAssignments.map(sa => sa.id);

      // Then get all payments for these assignments
      return ctx.db.salaryPayment.findMany({
        where: {
          employeeSalaryId: { in: salaryAssignmentIds },
          ...(year ? { year } : {}),
        },
        orderBy: [
          { year: "desc" },
          { month: "desc" },
        ],
      });
    }),

  getTeacherSalaryPayments: protectedProcedure
    .input(z.object({
      teacherId: z.string(),
      year: z.number().int().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { teacherId, year } = input;

      // First get all salary assignments for this teacher
      const salaryAssignments = await ctx.db.teacherSalary.findMany({
        where: { teacherId },
        select: { id: true },
      });

      const salaryAssignmentIds = salaryAssignments.map(sa => sa.id);

      // Then get all payments for these assignments
      return ctx.db.salaryPayment.findMany({
        where: {
          teacherSalaryId: { in: salaryAssignmentIds },
          ...(year ? { year } : {}),
        },
        orderBy: [
          { year: "desc" },
          { month: "desc" },
        ],
      });
    }),

  // Update payment status
  updatePaymentStatus: protectedProcedure
    .input(z.object({
      paymentId: z.string(),
      status: z.enum(["PENDING", "PAID", "CANCELLED"]),
      paymentDate: z.date().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { paymentId, status, paymentDate, remarks } = input;

      // Update payment status
      return ctx.db.salaryPayment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: status,
          ...(status === "PAID" ? { paymentDate: paymentDate ?? new Date() } : {}),
          ...(remarks ? { remarks } : {}),
        },
      });
    }),

  // Salary increment for teachers
  incrementTeacherSalary: protectedProcedure
    .input(z.object({
      teacherId: z.string(),
      incrementAmount: z.number().optional(),
      incrementPercentage: z.number().optional(),
      effectiveDate: z.date(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { teacherId, incrementAmount, incrementPercentage, effectiveDate, remarks } = input;
      
      // Make sure at least one increment method is provided
      if (incrementAmount === undefined && incrementPercentage === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either increment amount or percentage must be provided",
        });
      }
      
      // Get the current active salary assignment for the teacher
      const currentSalary = await ctx.db.teacherSalary.findFirst({
        where: { 
          teacherId,
          isActive: true,
        },
        include: {
          structure: true,
        },
      });
      
      if (!currentSalary) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active salary found for this teacher",
        });
      }
      
      // Calculate the new basic salary
      const currentBasicSalary = currentSalary.customBasicSalary ?? currentSalary.structure.basicSalary;
      let newBasicSalary = currentBasicSalary;
      
      if (incrementPercentage) {
        newBasicSalary = currentBasicSalary * (1 + incrementPercentage / 100);
      } else if (incrementAmount) {
        newBasicSalary = currentBasicSalary + incrementAmount;
      }
      
      // Deactivate the current salary
      await ctx.db.teacherSalary.update({
        where: { id: currentSalary.id },
        data: {
          isActive: false,
          endDate: effectiveDate,
        },
      });
      
      // Create a new salary record with the incremented amount
      const newSalary = await ctx.db.teacherSalary.create({
        data: {
          teacherId,
          structureId: currentSalary.structureId,
          customBasicSalary: newBasicSalary,
          customDaPercentage: currentSalary.customDaPercentage,
          customPfPercentage: currentSalary.customPfPercentage,
          customEsiPercentage: currentSalary.customEsiPercentage,
          additionalAllowances: currentSalary.additionalAllowances,
          startDate: effectiveDate,
          isActive: true,
        },
        include: {
          structure: true,
          teacher: true,
        },
      });
      
      // We'll implement the SalaryIncrement table recording once the migration is successfully run
      
      return newSalary;
    }),
});

// Helper function to calculate leave deductions
async function calculateLeaveDeductions(
  ctx: any,
  month: number,
  year: number,
  teacherId: string | null,
  employeeId: string | null
) {
  // Get the staff's active salary record
  let basicSalary = 0;
  if (teacherId) {
    const teacherSalary = await ctx.db.teacherSalary.findFirst({
      where: {
        teacherId,
        isActive: true,
      },
      include: {
        structure: true,
      },
    });
    
    if (teacherSalary) {
      basicSalary = teacherSalary.customBasicSalary ?? teacherSalary.structure.basicSalary;
    }
  } else if (employeeId) {
    const employeeSalary = await ctx.db.employeeSalary.findFirst({
      where: {
        employeeId,
        isActive: true,
      },
      include: {
        structure: true,
      },
    });
    
    if (employeeSalary) {
      basicSalary = employeeSalary.customBasicSalary ?? employeeSalary.structure.basicSalary;
    }
  }

  if (basicSalary === 0) {
    return 0; // Can't calculate deductions without a basic salary
  }

  // Get the leave applications for this month
  const startDate = new Date(year, month - 1, 1); // Month is 0-indexed in JS Date
  const endDate = new Date(year, month, 0); // Last day of the month

  const leaveApplications = await ctx.db.leaveApplication.findMany({
    where: {
      ...(teacherId ? { teacherId } : {}),
      ...(employeeId ? { employeeId } : {}),
      OR: [
        {
          // Leave starts in this month
          startDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          // Leave ends in this month
          endDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          // Leave spans the entire month
          startDate: {
            lt: startDate,
          },
          endDate: {
            gt: endDate,
          },
        },
      ],
    },
    include: {
      policy: true,
    },
  });

  // Calculate deductions for unapproved leaves or unpaid leaves
  const dailySalary = basicSalary / 30; // Assuming 30 days in a month
  let totalDeduction = 0;

  for (const leave of leaveApplications) {
    if (leave.status === "REJECTED" || !leave.policy.isPaid) {
      // Calculate days in this month
      const leaveStartDate = leave.startDate < startDate ? startDate : leave.startDate;
      const leaveEndDate = leave.endDate > endDate ? endDate : leave.endDate;
      
      // Calculate number of days
      const leaveDays = Math.ceil((leaveEndDate.getTime() - leaveStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalDeduction += leaveDays * dailySalary;
    }
  }

  return totalDeduction;
} 