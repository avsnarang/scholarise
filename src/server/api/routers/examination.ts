import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Input schemas for validation
const examTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});

const examConfigurationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  examTypeId: z.string().min(1, "Exam type is required"),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional(),
  subjectId: z.string().min(1, "Subject is required"),
  maxMarks: z.number().min(1, "Max marks must be positive"),
  passingMarks: z.number().min(0, "Passing marks cannot be negative"),
  weightage: z.number().min(0).max(1).default(1),
  isActive: z.boolean().default(true),
});

const examScheduleSchema = z.object({
  examConfigId: z.string().min(1, "Exam configuration is required"),
  examTypeId: z.string().min(1, "Exam type is required"),
  examDate: z.date(),
  startTime: z.date(),
  endTime: z.date(),
  room: z.string().optional(),
  invigilator: z.string().optional(),
  instructions: z.string().optional(),
  isActive: z.boolean().default(true),
});

const seatingPlanSchema = z.object({
  examScheduleId: z.string().min(1, "Exam schedule is required"),
  studentId: z.string().min(1, "Student is required"),
  seatNumber: z.string().min(1, "Seat number is required"),
  room: z.string().min(1, "Room is required"),
  row: z.number().optional(),
  column: z.number().optional(),
  notes: z.string().optional(),
});

const marksEntrySchema = z.object({
  examConfigId: z.string().min(1, "Exam configuration is required"),
  studentId: z.string().min(1, "Student is required"),
  marksObtained: z.number().min(0).optional(),
  isAbsent: z.boolean().default(false),
  remarks: z.string().optional(),
});

const assessmentCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  maxMarks: z.number().min(1, "Max marks must be positive"),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});

const assessmentConfigurationSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional(),
  subjectId: z.string().min(1, "Subject is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  maxMarks: z.number().min(1, "Max marks must be positive"),
  dueDate: z.date().optional(),
  isActive: z.boolean().default(true),
});

const assessmentMarksSchema = z.object({
  assessmentConfigId: z.string().min(1, "Assessment configuration is required"),
  studentId: z.string().min(1, "Student is required"),
  marksObtained: z.number().min(0).optional(),
  comments: z.string().optional(),
  submissionDate: z.date().optional(),
});

const gradeScaleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const gradeRangeSchema = z.object({
  gradeScaleId: z.string().min(1, "Grade scale is required"),
  grade: z.string().min(1, "Grade is required"),
  minPercentage: z.number().min(0).max(100),
  maxPercentage: z.number().min(0).max(100),
  description: z.string().optional(),
  points: z.number().optional(),
});

export const examinationRouter = createTRPCRouter({
  // ============ EXAM TYPES ============
  createExamType: protectedProcedure
    .input(examTypeSchema.extend({
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, ...data } = input;

      return ctx.db.examType.create({
        data: {
          ...data,
          branchId,
        },
      });
    }),

  getExamTypes: protectedProcedure
    .input(z.object({ 
      branchId: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const branchId = input?.branchId;
      if (!branchId) {
        return [];
      }

      return ctx.db.examType.findMany({
        where: {
          branchId,
          isActive: input?.isActive,
        },
        orderBy: { order: "asc" },
      });
    }),

  updateExamType: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: examTypeSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.examType.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteExamType: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.examType.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ============ EXAM CONFIGURATIONS ============
  createExamConfiguration: protectedProcedure
    .input(examConfigurationSchema.extend({
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, ...data } = input;

      // Validate that passing marks don't exceed max marks
      if (data.passingMarks > data.maxMarks) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passing marks cannot exceed maximum marks",
        });
      }

      return ctx.db.examConfiguration.create({
        data: {
          ...data,
          branchId,
        },
        include: {
          examType: true,
          class: true,
          section: true,
          subject: true,
        },
      });
    }),

  getExamConfigurations: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      classId: z.string().optional(),
      sectionId: z.string().optional(),
      examTypeId: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const branchId = input?.branchId;
      if (!branchId) {
        return [];
      }

      return ctx.db.examConfiguration.findMany({
        where: {
          branchId,
          classId: input?.classId,
          sectionId: input?.sectionId,
          examTypeId: input?.examTypeId,
          isActive: input?.isActive,
        },
        include: {
          examType: true,
          class: true,
          section: true,
          subject: true,
          _count: {
            select: {
              marksEntries: true,
            },
          },
        },
        orderBy: [
          { class: { displayOrder: "asc" } },
          { subject: { name: "asc" } },
        ],
      });
    }),

  updateExamConfiguration: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: examConfigurationSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate that passing marks don't exceed max marks if both are provided
      if (input.data.passingMarks && input.data.maxMarks && 
          input.data.passingMarks > input.data.maxMarks) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passing marks cannot exceed maximum marks",
        });
      }

      return ctx.db.examConfiguration.update({
        where: { id: input.id },
        data: input.data,
        include: {
          examType: true,
          class: true,
          section: true,
          subject: true,
        },
      });
    }),

  deleteExamConfiguration: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.examConfiguration.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ============ EXAM SCHEDULES ============
  createExamSchedule: protectedProcedure
    .input(examScheduleSchema.extend({
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, ...data } = input;

      // Validate that end time is after start time
      if (data.endTime <= data.startTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }

      return ctx.db.examSchedule.create({
        data: {
          ...data,
          branchId,
        },
        include: {
          examConfig: {
            include: {
              class: true,
              section: true,
              subject: true,
            },
          },
          examType: true,
        },
      });
    }),

  getExamSchedules: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      examConfigId: z.string().optional(),
      examTypeId: z.string().optional(),
      fromDate: z.date().optional(),
      toDate: z.date().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const branchId = input?.branchId;
      if (!branchId) {
        return [];
      }

      return ctx.db.examSchedule.findMany({
        where: {
          branchId,
          examConfigId: input?.examConfigId,
          examTypeId: input?.examTypeId,
          examDate: {
            gte: input?.fromDate,
            lte: input?.toDate,
          },
          isActive: input?.isActive,
        },
        include: {
          examConfig: {
            include: {
              class: true,
              section: true,
              subject: true,
            },
          },
          examType: true,
          _count: {
            select: {
              seatingPlans: true,
            },
          },
        },
        orderBy: [
          { examDate: "asc" },
          { startTime: "asc" },
        ],
      });
    }),

  updateExamSchedule: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: examScheduleSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate that end time is after start time if both are provided
      if (input.data.endTime && input.data.startTime && 
          input.data.endTime <= input.data.startTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }

      return ctx.db.examSchedule.update({
        where: { id: input.id },
        data: input.data,
        include: {
          examConfig: {
            include: {
              class: true,
              section: true,
              subject: true,
            },
          },
          examType: true,
        },
      });
    }),

  deleteExamSchedule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.examSchedule.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ============ SEATING PLANS ============
  createSeatingPlan: protectedProcedure
    .input(seatingPlanSchema.extend({
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, ...data } = input;

      return ctx.db.seatingPlan.create({
        data: {
          ...data,
          branchId,
        },
        include: {
          student: true,
          examSchedule: {
            include: {
              examConfig: {
                include: {
                  class: true,
                  section: true,
                  subject: true,
                },
              },
            },
          },
        },
      });
    }),

  getSeatingPlans: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      examScheduleId: z.string().optional(),
      studentId: z.string().optional(),
      room: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const branchId = input?.branchId;
      if (!branchId) {
        return [];
      }

      return ctx.db.seatingPlan.findMany({
        where: {
          branchId,
          examScheduleId: input?.examScheduleId,
          studentId: input?.studentId,
          room: input?.room,
        },
        include: {
          student: true,
          examSchedule: {
            include: {
              examConfig: {
                include: {
                  class: true,
                  section: true,
                  subject: true,
                },
              },
              examType: true,
            },
          },
        },
        orderBy: [
          { room: "asc" },
          { row: "asc" },
          { column: "asc" },
          { seatNumber: "asc" },
        ],
      });
    }),

  generateSeatingPlan: protectedProcedure
    .input(z.object({
      examScheduleId: z.string(),
      room: z.string(),
      totalSeats: z.number().min(1),
      seatsPerRow: z.number().min(1),
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId } = input;

      // Get exam schedule and configuration
      const examSchedule = await ctx.db.examSchedule.findUnique({
        where: { id: input.examScheduleId },
        include: {
          examConfig: {
            include: {
              class: true,
              section: true,
            },
          },
        },
      });

      if (!examSchedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Exam schedule not found",
        });
      }

      // Get students based on exam configuration
      const students = await ctx.db.student.findMany({
        where: {
          branchId,
          isActive: true,
          ...(examSchedule.examConfig.sectionId ? {
            sectionId: examSchedule.examConfig.sectionId,
          } : {
            section: {
              classId: examSchedule.examConfig.classId,
            },
          }),
        },
        orderBy: [
          { section: { name: "asc" } },
          { rollNumber: "asc" },
          { firstName: "asc" },
        ],
      });

      if (students.length > input.totalSeats) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Not enough seats. Found ${students.length} students but only ${input.totalSeats} seats available.`,
        });
      }

      // Clear existing seating plan for this exam and room
      await ctx.db.seatingPlan.deleteMany({
        where: {
          examScheduleId: input.examScheduleId,
          room: input.room,
        },
      });

      // Generate seat assignments
      const seatingPlans = students.map((student, index) => {
        const seatNumber = `S${(index + 1).toString().padStart(3, '0')}`;
        const row = Math.floor(index / input.seatsPerRow) + 1;
        const column = (index % input.seatsPerRow) + 1;

        return {
          examScheduleId: input.examScheduleId,
          studentId: student.id,
          seatNumber,
          room: input.room,
          row,
          column,
          branchId,
        };
      });

      // Create seating plan entries
      await ctx.db.seatingPlan.createMany({
        data: seatingPlans,
      });

      return {
        studentsCount: students.length,
        seatsUsed: students.length,
        totalSeats: input.totalSeats,
        room: input.room,
      };
    }),

  deleteSeatingPlan: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.seatingPlan.delete({
        where: { id: input.id },
      });
    }),

  // ============ MARKS ENTRY ============
  createMarksEntry: protectedProcedure
    .input(marksEntrySchema.extend({
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, ...data } = input;
      const enteredBy = ctx.userId;
      
      if (!enteredBy) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is required",
        });
      }

      // Get exam configuration to validate marks
      const examConfig = await ctx.db.examConfiguration.findUnique({
        where: { id: data.examConfigId },
      });

      if (!examConfig) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Exam configuration not found",
        });
      }

      // Validate marks don't exceed maximum
      if (data.marksObtained && data.marksObtained > examConfig.maxMarks) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Marks obtained (${data.marksObtained}) cannot exceed maximum marks (${examConfig.maxMarks})`,
        });
      }

      return ctx.db.marksEntry.upsert({
        where: {
          examConfigId_studentId: {
            examConfigId: data.examConfigId,
            studentId: data.studentId,
          },
        },
        update: {
          marksObtained: data.marksObtained,
          isAbsent: data.isAbsent,
          remarks: data.remarks,
          enteredBy,
        },
        create: {
          ...data,
          branchId,
          enteredBy,
        },
        include: {
          student: true,
          examConfig: {
            include: {
              subject: true,
              class: true,
              section: true,
            },
          },
        },
      });
    }),

  getMarksEntries: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      examConfigId: z.string().optional(),
      studentId: z.string().optional(),
      classId: z.string().optional(),
      sectionId: z.string().optional(),
      isSubmitted: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const branchId = input?.branchId;
      if (!branchId) {
        return [];
      }

      return ctx.db.marksEntry.findMany({
        where: {
          branchId,
          examConfigId: input?.examConfigId,
          studentId: input?.studentId,
          isSubmitted: input?.isSubmitted,
          examConfig: {
            classId: input?.classId,
            sectionId: input?.sectionId,
          },
        },
        include: {
          student: true,
          examConfig: {
            include: {
              subject: true,
              class: true,
              section: true,
              examType: true,
            },
          },
        },
        orderBy: [
          { examConfig: { class: { displayOrder: "asc" } } },
          { examConfig: { subject: { name: "asc" } } },
          { student: { rollNumber: "asc" } },
        ],
      });
    }),

  submitMarks: protectedProcedure
    .input(z.object({
      examConfigId: z.string(),
      studentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const submittedAt = new Date();

      return ctx.db.marksEntry.updateMany({
        where: {
          examConfigId: input.examConfigId,
          ...(input.studentIds && { studentId: { in: input.studentIds } }),
        },
        data: {
          isSubmitted: true,
          submittedAt,
        },
      });
    }),

  // ============ ASSESSMENT CATEGORIES ============
  createAssessmentCategory: protectedProcedure
    .input(assessmentCategorySchema.extend({
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, ...data } = input;

      return ctx.db.assessmentCategory.create({
        data: {
          ...data,
          branchId,
        },
      });
    }),

  getAssessmentCategories: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const branchId = input?.branchId;
      if (!branchId) {
        return [];
      }

      return ctx.db.assessmentCategory.findMany({
        where: {
          branchId,
          isActive: input?.isActive,
        },
        include: {
          _count: {
            select: {
              assessmentConfigs: true,
            },
          },
        },
        orderBy: { order: "asc" },
      });
    }),

  updateAssessmentCategory: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: assessmentCategorySchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assessmentCategory.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteAssessmentCategory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assessmentCategory.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ============ ASSESSMENT CONFIGURATIONS ============
  createAssessmentConfiguration: protectedProcedure
    .input(assessmentConfigurationSchema.extend({
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, ...data } = input;

      return ctx.db.assessmentConfiguration.create({
        data: {
          ...data,
          branchId,
        },
        include: {
          category: true,
          class: true,
          section: true,
          subject: true,
        },
      });
    }),

  getAssessmentConfigurations: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      categoryId: z.string().optional(),
      classId: z.string().optional(),
      sectionId: z.string().optional(),
      subjectId: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const branchId = input?.branchId;
      if (!branchId) {
        return [];
      }

      return ctx.db.assessmentConfiguration.findMany({
        where: {
          branchId,
          categoryId: input?.categoryId,
          classId: input?.classId,
          sectionId: input?.sectionId,
          subjectId: input?.subjectId,
          isActive: input?.isActive,
        },
        include: {
          category: true,
          class: true,
          section: true,
          subject: true,
          _count: {
            select: {
              assessmentMarks: true,
            },
          },
        },
        orderBy: [
          { category: { order: "asc" } },
          { class: { displayOrder: "asc" } },
          { dueDate: "asc" },
        ],
      });
    }),

  updateAssessmentConfiguration: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: assessmentConfigurationSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assessmentConfiguration.update({
        where: { id: input.id },
        data: input.data,
        include: {
          category: true,
          class: true,
          section: true,
          subject: true,
        },
      });
    }),

  deleteAssessmentConfiguration: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assessmentConfiguration.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ============ ASSESSMENT MARKS ============
  createAssessmentMarks: protectedProcedure
    .input(assessmentMarksSchema.extend({
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, ...data } = input;
      const enteredBy = ctx.userId;
      
      if (!enteredBy) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is required",
        });
      }

      // Get assessment configuration to validate marks
      const assessmentConfig = await ctx.db.assessmentConfiguration.findUnique({
        where: { id: data.assessmentConfigId },
      });

      if (!assessmentConfig) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment configuration not found",
        });
      }

      // Validate marks don't exceed maximum
      if (data.marksObtained && data.marksObtained > assessmentConfig.maxMarks) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Marks obtained (${data.marksObtained}) cannot exceed maximum marks (${assessmentConfig.maxMarks})`,
        });
      }

      return ctx.db.assessmentMarks.upsert({
        where: {
          assessmentConfigId_studentId: {
            assessmentConfigId: data.assessmentConfigId,
            studentId: data.studentId,
          },
        },
        update: {
          marksObtained: data.marksObtained,
          comments: data.comments,
          submissionDate: data.submissionDate,
          enteredBy,
        },
        create: {
          ...data,
          branchId,
          enteredBy,
        },
        include: {
          student: true,
          assessmentConfig: {
            include: {
              category: true,
              class: true,
              section: true,
              subject: true,
            },
          },
        },
      });
    }),

  getAssessmentMarks: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      assessmentConfigId: z.string().optional(),
      studentId: z.string().optional(),
      categoryId: z.string().optional(),
      classId: z.string().optional(),
      sectionId: z.string().optional(),
      isSubmitted: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const branchId = input?.branchId;
      if (!branchId) {
        return [];
      }

      return ctx.db.assessmentMarks.findMany({
        where: {
          branchId,
          assessmentConfigId: input?.assessmentConfigId,
          studentId: input?.studentId,
          isSubmitted: input?.isSubmitted,
          assessmentConfig: {
            categoryId: input?.categoryId,
            classId: input?.classId,
            sectionId: input?.sectionId,
          },
        },
        include: {
          student: true,
          assessmentConfig: {
            include: {
              category: true,
              class: true,
              section: true,
              subject: true,
            },
          },
        },
        orderBy: [
          { assessmentConfig: { category: { order: "asc" } } },
          { assessmentConfig: { class: { displayOrder: "asc" } } },
          { student: { rollNumber: "asc" } },
        ],
      });
    }),

  submitAssessmentMarks: protectedProcedure
    .input(z.object({
      assessmentConfigId: z.string(),
      studentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const submittedAt = new Date();

      return ctx.db.assessmentMarks.updateMany({
        where: {
          assessmentConfigId: input.assessmentConfigId,
          ...(input.studentIds && { studentId: { in: input.studentIds } }),
        },
        data: {
          isSubmitted: true,
          submittedAt,
        },
      });
    }),

  // ============ GRADE SCALES ============
  createGradeScale: protectedProcedure
    .input(gradeScaleSchema.extend({
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, ...data } = input;

      // If this is set as default, unset other defaults
      if (data.isDefault) {
        await ctx.db.gradeScale.updateMany({
          where: {
            branchId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return ctx.db.gradeScale.create({
        data: {
          ...data,
          branchId,
        },
      });
    }),

  getGradeScales: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const branchId = input?.branchId;
      if (!branchId) {
        return [];
      }

      return ctx.db.gradeScale.findMany({
        where: {
          branchId,
          isActive: input?.isActive,
        },
        include: {
          gradeRanges: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: [
          { isDefault: "desc" },
          { name: "asc" },
        ],
      });
    }),

  updateGradeScale: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: gradeScaleSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      // If this is being set as default, unset other defaults
      if (input.data.isDefault) {
        const gradeScale = await ctx.db.gradeScale.findUnique({
          where: { id: input.id },
        });

        if (gradeScale) {
          await ctx.db.gradeScale.updateMany({
            where: {
              branchId: gradeScale.branchId,
              isDefault: true,
              id: { not: input.id },
            },
            data: {
              isDefault: false,
            },
          });
        }
      }

      return ctx.db.gradeScale.update({
        where: { id: input.id },
        data: input.data,
        include: {
          gradeRanges: {
            orderBy: { order: "asc" },
          },
        },
      });
    }),

  deleteGradeScale: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.gradeScale.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ============ GRADE RANGES ============
  createGradeRange: protectedProcedure
    .input(gradeRangeSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate percentage range
      if (input.minPercentage >= input.maxPercentage) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Minimum percentage must be less than maximum percentage",
        });
      }

      return ctx.db.gradeRange.create({
        data: input,
      });
    }),

  getGradeRanges: protectedProcedure
    .input(z.object({
      gradeScaleId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.gradeRange.findMany({
        where: {
          gradeScaleId: input.gradeScaleId,
        },
        orderBy: { order: "asc" },
      });
    }),

  updateGradeRange: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: gradeRangeSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.gradeRange.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteGradeRange: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.gradeRange.delete({
        where: { id: input.id },
      });
    }),

  // ============ REPORTS & ANALYTICS ============
  getExamReport: protectedProcedure
    .input(z.object({
      examConfigId: z.string(),
      includeAbsentees: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const examConfig = await ctx.db.examConfiguration.findUnique({
        where: { id: input.examConfigId },
        include: {
          examType: true,
          class: true,
          section: true,
          subject: true,
          marksEntries: {
            include: {
              student: true,
            },
            where: input.includeAbsentees ? {} : { isAbsent: false },
            orderBy: { student: { rollNumber: "asc" } },
          },
        },
      });

      if (!examConfig) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Exam configuration not found",
        });
      }

      // Calculate statistics
      const validMarks = examConfig.marksEntries
        .filter(entry => !entry.isAbsent && entry.marksObtained !== null)
        .map(entry => entry.marksObtained!);

      const statistics = {
        totalStudents: examConfig.marksEntries.length,
        appeared: validMarks.length,
        absent: examConfig.marksEntries.filter(entry => entry.isAbsent).length,
        passed: validMarks.filter(mark => mark >= examConfig.passingMarks).length,
        failed: validMarks.filter(mark => mark < examConfig.passingMarks).length,
        highest: validMarks.length > 0 ? Math.max(...validMarks) : 0,
        lowest: validMarks.length > 0 ? Math.min(...validMarks) : 0,
        average: validMarks.length > 0 ? validMarks.reduce((a, b) => a + b, 0) / validMarks.length : 0,
        passPercentage: validMarks.length > 0 ? 
          (validMarks.filter(mark => mark >= examConfig.passingMarks).length / validMarks.length) * 100 : 0,
      };

      return {
        examConfig,
        statistics,
      };
    }),

  getClassPerformance: protectedProcedure
    .input(z.object({
      classId: z.string(),
      sectionId: z.string().optional(),
      examTypeId: z.string().optional(),
      branchId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const branchId = input?.branchId;
      if (!branchId) {
        return [];
      }

      const examConfigs = await ctx.db.examConfiguration.findMany({
        where: {
          branchId,
          classId: input.classId,
          sectionId: input.sectionId,
          examTypeId: input.examTypeId,
          isActive: true,
        },
        include: {
          subject: true,
          examType: true,
          marksEntries: {
            where: { isAbsent: false },
          },
        },
      });

      const performance = examConfigs.map(config => {
        const validMarks = config.marksEntries
          .filter(entry => entry.marksObtained !== null)
          .map(entry => entry.marksObtained!);

        return {
          subject: config.subject.name,
          examType: config.examType.name,
          maxMarks: config.maxMarks,
          passingMarks: config.passingMarks,
          totalStudents: config.marksEntries.length,
          average: validMarks.length > 0 ? 
            validMarks.reduce((a, b) => a + b, 0) / validMarks.length : 0,
          highest: validMarks.length > 0 ? Math.max(...validMarks) : 0,
          lowest: validMarks.length > 0 ? Math.min(...validMarks) : 0,
          passCount: validMarks.filter(mark => mark >= config.passingMarks).length,
          passPercentage: validMarks.length > 0 ? 
            (validMarks.filter(mark => mark >= config.passingMarks).length / validMarks.length) * 100 : 0,
        };
      });

      return performance;
    }),
}); 