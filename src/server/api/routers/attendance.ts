import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { AttendanceStatus } from "@prisma/client";

// Input schema for creating a new attendance location
const createLocationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().int().min(10, "Radius must be at least 10 meters").max(1000, "Radius must be at most 1000 meters"),
  branchId: z.string(),
  isActive: z.boolean().default(true),
});

// Input schema for updating an attendance location
const updateLocationSchema = createLocationSchema.partial().extend({
  id: z.string(),
});

// Input schema for recording attendance
const recordAttendanceSchema = z.object({
  locationId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  distance: z.number().int().min(0),
  isWithinAllowedArea: z.boolean(),
  notes: z.string().optional(),
  // Only one of these should be provided
  teacherId: z.string().optional(),
  employeeId: z.string().optional(),
}).refine(data => (data.teacherId && !data.employeeId) || (!data.teacherId && data.employeeId), {
  message: "Either teacherId or employeeId must be provided, but not both",
});

// Input schema for querying attendance records
const queryAttendanceSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  locationId: z.string().optional(),
  teacherId: z.string().optional(),
  employeeId: z.string().optional(),
  branchId: z.string().optional(),
});

// Schema for student attendance status
const studentAttendanceStatusSchema = z.nativeEnum(AttendanceStatus);

// Schema for marking student attendance
const markStudentAttendanceSchema = z.object({
  studentId: z.string(),
  classId: z.string(),
  date: z.date().default(() => new Date()),
  status: studentAttendanceStatusSchema.default(AttendanceStatus.PRESENT),
  reason: z.string().optional(),
  notes: z.string().optional(),
  markedById: z.string().optional(),
});

// Schema for bulk marking student attendance
const bulkMarkStudentAttendanceSchema = z.object({
  classId: z.string(),
  date: z.date().default(() => new Date()),
  attendance: z.array(z.object({
    studentId: z.string(),
    status: studentAttendanceStatusSchema,
    reason: z.string().optional(),
    notes: z.string().optional(),
  })),
  markedById: z.string().optional(),
});

// Schema for querying student attendance
const queryStudentAttendanceSchema = z.object({
  studentId: z.string().optional(),
  classId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: studentAttendanceStatusSchema.optional(),
});

export const attendanceRouter = createTRPCRouter({
  // Location management
  createLocation: protectedProcedure
    .input(createLocationSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.attendanceLocation.create({
        data: input,
      });
    }),

  updateLocation: protectedProcedure
    .input(updateLocationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.attendanceLocation.update({
        where: { id },
        data,
      });
    }),

  deleteLocation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if there are any attendance records using this location
      const attendanceCount = await ctx.db.staffAttendance.count({
        where: { locationId: input.id },
      });

      if (attendanceCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete this location because it has ${attendanceCount} attendance records. Please consider setting it to inactive instead.`,
        });
      }

      return ctx.db.attendanceLocation.delete({
        where: { id: input.id },
      });
    }),

  toggleLocationStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      isActive: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.attendanceLocation.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  getLocations: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      includeInactive: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const { branchId, includeInactive } = input;

      const whereClause = {
        ...(branchId ? { branchId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      };

      return ctx.db.attendanceLocation.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
      });
    }),

  getLocationById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const location = await ctx.db.attendanceLocation.findUnique({
        where: { id: input.id },
      });

      if (!location) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Location not found",
        });
      }

      return location;
    }),

  // Attendance records
  recordAttendance: protectedProcedure
    .input(recordAttendanceSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the location exists
      const location = await ctx.db.attendanceLocation.findUnique({
        where: { id: input.locationId },
      });

      if (!location) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attendance location not found",
        });
      }

      // Verify teacher/employee exists
      if (input.teacherId) {
        const teacher = await ctx.db.teacher.findUnique({
          where: { id: input.teacherId },
        });

        if (!teacher) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Teacher not found",
          });
        }
      } else if (input.employeeId) {
        const employee = await ctx.db.employee.findUnique({
          where: { id: input.employeeId },
        });

        if (!employee) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Employee not found",
          });
        }
      }

      // Create attendance record
      return ctx.db.staffAttendance.create({
        data: input,
      });
    }),

  getAttendanceRecords: protectedProcedure
    .input(queryAttendanceSchema)
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, locationId, teacherId, employeeId, branchId } = input;

      // Build where clause based on input filters
      const where: any = {};

      if (startDate) {
        where.timestamp = {
          ...where.timestamp,
          gte: startDate,
        };
      }

      if (endDate) {
        where.timestamp = {
          ...where.timestamp,
          lte: endDate,
        };
      }

      if (locationId) {
        where.locationId = locationId;
      }

      if (teacherId) {
        where.teacherId = teacherId;
      }

      if (employeeId) {
        where.employeeId = employeeId;
      }

      // For branch filtering, we need to handle it differently as it's not directly on the attendance record
      const locationFilter = branchId ? {
        branchId: branchId
      } : undefined;

      return ctx.db.staffAttendance.findMany({
        where,
        include: {
          location: {
            where: locationFilter
          },
          teacher: true,
          employee: true,
        },
        orderBy: {
          timestamp: "desc",
        },
      });
    }),

  // Get attendance summary for a specific teacher or employee
  getStaffAttendanceSummary: protectedProcedure
    .input(z.object({
      teacherId: z.string().optional(),
      employeeId: z.string().optional(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      if (!input.teacherId && !input.employeeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either teacherId or employeeId must be provided",
        });
      }

      const where: any = {
        timestamp: {
          gte: input.startDate,
          lte: input.endDate,
        },
      };

      if (input.teacherId) {
        where.teacherId = input.teacherId;
      } else {
        where.employeeId = input.employeeId;
      }

      // Count total attendance records
      const totalAttendance = await ctx.db.staffAttendance.count({
        where,
      });

      // Count on-time attendance records (within allowed area)
      const validAttendance = await ctx.db.staffAttendance.count({
        where: {
          ...where,
          isWithinAllowedArea: true,
        },
      });

      return {
        totalDays: totalAttendance,
        validDays: validAttendance,
        attendanceRate: totalAttendance > 0 ? (validAttendance / totalAttendance) * 100 : 0,
      };
    }),

  // Record attendance
  recordAttendance: protectedProcedure
    .input(z.object({
      locationId: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      distance: z.number(),
      teacherId: z.string().optional(),
      employeeId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if attendance already recorded today
      const existingAttendance = await ctx.db.staffAttendance.findFirst({
        where: {
          OR: [
            { teacherId: input.teacherId },
            { employeeId: input.employeeId },
          ],
          timestamp: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (existingAttendance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Attendance already marked for today",
        });
      }

      // Verify the location
      const location = await ctx.db.attendanceLocation.findUnique({
        where: { id: input.locationId },
      });

      if (!location) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attendance location not found",
        });
      }

      if (!location.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This attendance location is not currently active",
        });
      }

      // Check if user is within the allowed radius
      if (input.distance > location.radius) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You are too far from the attendance location. Maximum allowed distance is ${location.radius}m, but you are ${Math.round(input.distance)}m away.`,
        });
      }

      // Record attendance
      return await ctx.db.staffAttendance.create({
        data: input,
      });
    }),

  // Get attendance by date
  getAttendanceByDate: protectedProcedure
    .input(z.object({
      date: z.date(),
      teacherId: z.string().optional(),
      employeeId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      return await ctx.db.staffAttendance.findFirst({
        where: {
          OR: [
            { teacherId: input.teacherId },
            { employeeId: input.employeeId },
          ],
          timestamp: {
            gte: startDate,
            lt: endDate,
          },
        },
        include: {
          location: true,
        },
      });
    }),

  // Get attendance for a month
  getAttendanceByMonth: protectedProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number(),
      teacherId: z.string().optional(),
      employeeId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);
      endDate.setHours(23, 59, 59, 999);

      return await ctx.db.staffAttendance.findMany({
        where: {
          OR: [
            { teacherId: input.teacherId },
            { employeeId: input.employeeId },
          ],
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          location: true,
        },
        orderBy: {
          timestamp: "desc",
        },
      });
    }),

  // Student attendance endpoints

  // Mark attendance for a single student
  markStudentAttendance: protectedProcedure
    .input(markStudentAttendanceSchema)
    .mutation(async ({ ctx, input }) => {
      const { studentId, classId, date, status, reason, notes, markedById } = input;

      // Verify the student exists and is in the given class
      const student = await ctx.db.student.findUnique({
        where: { id: studentId },
        include: { class: true },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      if (student.classId !== classId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student does not belong to the specified class",
        });
      }

      // Check if attendance already exists for this date
      const existingAttendance = await ctx.db.studentAttendance.findUnique({
        where: {
          studentId_date: {
            studentId,
            date: new Date(date.setHours(0, 0, 0, 0)),
          },
        },
      });

      if (existingAttendance) {
        // Update existing attendance
        return ctx.db.studentAttendance.update({
          where: { id: existingAttendance.id },
          data: { status, reason, notes, markedById },
        });
      } else {
        // Create new attendance record
        return ctx.db.studentAttendance.create({
          data: {
            student: { connect: { id: studentId } },
            class: { connect: { id: classId } },
            date: new Date(date.setHours(0, 0, 0, 0)),
            status,
            reason,
            notes,
            markedById,
          },
        });
      }
    }),

  // Bulk mark attendance for multiple students in a class
  bulkMarkStudentAttendance: protectedProcedure
    .input(bulkMarkStudentAttendanceSchema)
    .mutation(async ({ ctx, input }) => {
      const { classId, date, attendance, markedById } = input;

      // Verify the class exists
      const classEntity = await ctx.db.class.findUnique({
        where: { id: classId },
        include: { students: true },
      });

      if (!classEntity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // Get all student IDs in the class
      const classStudentIds = classEntity.students.map(student => student.id);

      // Validate that all provided student IDs belong to the class
      for (const record of attendance) {
        if (!classStudentIds.includes(record.studentId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Student with ID ${record.studentId} does not belong to the specified class`,
          });
        }
      }

      // Normalize date - set to start of day
      const normalizedDate = new Date(date.setHours(0, 0, 0, 0));

      // Create or update attendance records for each student
      const results = await Promise.all(
        attendance.map(async (record) => {
          const { studentId, status, reason, notes } = record;

          // Check if attendance already exists for this date and student
          const existingAttendance = await ctx.db.studentAttendance.findUnique({
            where: {
              studentId_date: {
                studentId,
                date: normalizedDate,
              },
            },
          });

          if (existingAttendance) {
            // Update existing record
            return ctx.db.studentAttendance.update({
              where: { id: existingAttendance.id },
              data: { status, reason, notes, markedById },
            });
          } else {
            // Create new record
            return ctx.db.studentAttendance.create({
              data: {
                student: { connect: { id: studentId } },
                class: { connect: { id: classId } },
                date: normalizedDate,
                status,
                reason,
                notes,
                markedById,
              },
            });
          }
        })
      );

      return {
        success: true,
        count: results.length,
        date: normalizedDate,
        classId,
      };
    }),

  // Get student attendance records
  getStudentAttendance: protectedProcedure
    .input(queryStudentAttendanceSchema)
    .query(async ({ ctx, input }) => {
      const { studentId, classId, startDate, endDate, status } = input;

      if (!studentId && !classId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either studentId or classId must be provided",
        });
      }

      // Build where clause
      const where: any = {};

      if (studentId) {
        where.studentId = studentId;
      }

      if (classId) {
        where.classId = classId;
      }

      if (startDate || endDate) {
        where.date = {};

        if (startDate) {
          where.date.gte = new Date(startDate.setHours(0, 0, 0, 0));
        }

        if (endDate) {
          where.date.lte = new Date(endDate.setHours(23, 59, 59, 999));
        }
      }

      if (status) {
        where.status = status;
      }

      return ctx.db.studentAttendance.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              rollNumber: true,
              admissionNumber: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              section: true,
            },
          },
        },
        orderBy: [
          { date: "desc" },
          { student: { firstName: "asc" } },
        ],
      });
    }),

  // Get student attendance by date for a specific class
  getClassAttendanceByDate: protectedProcedure
    .input(z.object({
      classId: z.string(),
      date: z.date().default(() => new Date()),
    }))
    .query(async ({ ctx, input }) => {
      const { classId, date } = input;
      const normalizedDate = new Date(date.setHours(0, 0, 0, 0));

      // Get all students in the class
      const classEntity = await ctx.db.class.findUnique({
        where: { id: classId },
        include: {
          students: {
            where: { isActive: true },
            orderBy: { firstName: "asc" },
          },
        },
      });

      if (!classEntity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // Get existing attendance records for the given date
      const attendanceRecords = await ctx.db.studentAttendance.findMany({
        where: {
          classId,
          date: normalizedDate,
        },
      });

      // Create a map of student IDs to their attendance records
      const attendanceMap = new Map();
      attendanceRecords.forEach(record => {
        attendanceMap.set(record.studentId, record);
      });

      // Combine student data with attendance data
      const studentAttendance = classEntity.students.map(student => {
        const attendanceRecord = attendanceMap.get(student.id);

        return {
          student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            rollNumber: student.rollNumber,
            admissionNumber: student.admissionNumber,
          },
          attendance: attendanceRecord ? {
            id: attendanceRecord.id,
            status: attendanceRecord.status,
            reason: attendanceRecord.reason,
            notes: attendanceRecord.notes,
          } : {
            status: AttendanceStatus.PRESENT,
            reason: null,
            notes: null,
          },
        };
      });

      return {
        class: {
          id: classEntity.id,
          name: classEntity.name,
          section: classEntity.section,
        },
        date: normalizedDate,
        students: studentAttendance,
        totalStudents: studentAttendance.length,
        presentCount: attendanceRecords.filter(a => a.status === AttendanceStatus.PRESENT).length,
        absentCount: attendanceRecords.filter(a => a.status === AttendanceStatus.ABSENT).length,
        lateCount: attendanceRecords.filter(a => a.status === AttendanceStatus.LATE).length,
      };
    }),

  // Get attendance summary for a student
  getStudentAttendanceSummary: protectedProcedure
    .input(z.object({
      studentId: z.string(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const { studentId, startDate, endDate } = input;

      // Normalize dates
      const normalizedStartDate = new Date(startDate.setHours(0, 0, 0, 0));
      const normalizedEndDate = new Date(endDate.setHours(23, 59, 59, 999));

      // Get all attendance records for the student in the given date range
      const attendanceRecords = await ctx.db.studentAttendance.findMany({
        where: {
          studentId,
          date: {
            gte: normalizedStartDate,
            lte: normalizedEndDate,
          },
        },
      });

      // Count total school days in the period (this could be refined based on your school calendar)
      const totalDays = Math.ceil((normalizedEndDate.getTime() - normalizedStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Count days by status
      const presentDays = attendanceRecords.filter(a => a.status === AttendanceStatus.PRESENT).length;
      const absentDays = attendanceRecords.filter(a => a.status === AttendanceStatus.ABSENT).length;
      const lateDays = attendanceRecords.filter(a => a.status === AttendanceStatus.LATE).length;
      const halfDays = attendanceRecords.filter(a => a.status === AttendanceStatus.HALF_DAY).length;
      const excusedDays = attendanceRecords.filter(a => a.status === AttendanceStatus.EXCUSED).length;

      // Calculate attendance rate
      const attendedDays = presentDays + (lateDays * 0.75) + (halfDays * 0.5);
      const attendanceRate = (attendedDays / totalDays) * 100;

      return {
        studentId,
        period: {
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
          totalDays,
        },
        attendance: {
          present: presentDays,
          absent: absentDays,
          late: lateDays,
          halfDay: halfDays,
          excused: excusedDays,
        },
        attendanceRate: Number(attendanceRate.toFixed(2)),
      };
    }),

  // Delete a student attendance record
  deleteStudentAttendance: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.studentAttendance.delete({
        where: { id: input.id },
      });
    }),
});