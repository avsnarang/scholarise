import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";

// Define AttendanceStatus as a custom type that matches the schema
const AttendanceStatus = {
  PRESENT: "PRESENT",
  LEAVE: "LEAVE",
  ABSENT: "ABSENT",
  HALF_DAY: "HALF_DAY",
} as const;

// Create a zod schema for this type
const studentAttendanceStatusSchema = z.enum([
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "LEAVE",
]);

// Export the type for use elsewhere
export type AttendanceStatus = typeof studentAttendanceStatusSchema._type;

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
  distance: z.number().min(0),
  isWithinAllowedArea: z.boolean().optional().default(false),
  notes: z.string().optional(),
  type: z.enum(["IN", "OUT", "BRANCH_TRANSFER_OUT", "BRANCH_TRANSFER_IN"]).default("IN"),
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
      console.log("Creating location with input:", input);
      try {
        const result = await ctx.db.attendanceLocation.create({
          data: {
            name: input.name,
            latitude: input.latitude,
            longitude: input.longitude,
            radius: input.radius,
            isActive: input.isActive,
            branchId: input.branchId,
          },
        });
        console.log("Location created successfully:", result);
        return result;
      } catch (error) {
        console.error("Error creating location:", error);
        throw error;
      }
    }),

  updateLocation: protectedProcedure
    .input(updateLocationSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Updating location with input:", input);
      const { id, ...data } = input;
      try {
        const result = await ctx.db.attendanceLocation.update({
          where: { id },
          data: {
            name: data.name,
            latitude: data.latitude,
            longitude: data.longitude,
            radius: data.radius,
            isActive: data.isActive,
            ...(data.branchId ? { branchId: data.branchId } : {}),
          },
        });
        console.log("Location updated successfully:", result);
        return result;
      } catch (error) {
        console.error("Error updating location:", error);
        throw error;
      }
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
        include: {
          branch: true,
        }
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

      // Verify teacher/employee exists
      let userId: string | undefined;
      let userBranchId: string | undefined;

      if (input.teacherId) {
        const teacher = await ctx.db.teacher.findUnique({
          where: { id: input.teacherId },
          include: { branch: true }
        });

        if (!teacher) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Teacher not found",
          });
        }
        userId = input.teacherId;
        userBranchId = teacher.branchId;
      } else if (input.employeeId) {
        const employee = await ctx.db.employee.findUnique({
          where: { id: input.employeeId },
          include: { branch: true }
        });

        if (!employee) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Employee not found",
          });
        }
        userId = input.employeeId;
        userBranchId = employee.branchId;
      }

      // Get the current time
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      // Get the last attendance record for today
      const lastAttendance = await ctx.db.staffAttendance.findFirst({
        where: {
          OR: [
            { teacherId: input.teacherId },
            { employeeId: input.employeeId },
          ],
          timestamp: {
            gte: startOfDay,
          },
        },
        include: {
          location: true,
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      // Validate attendance type based on context
      if (input.type === "IN") {
        // Check if there's already an IN record without an OUT
        if (lastAttendance?.type === "IN" || lastAttendance?.type === "BRANCH_TRANSFER_IN") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot mark IN attendance when previous IN or BRANCH_TRANSFER_IN has no corresponding OUT record",
          });
        }
      } else if (input.type === "OUT") {
        // Check if there's an IN record to match this OUT
        if (!lastAttendance || (lastAttendance.type !== "IN" && lastAttendance.type !== "BRANCH_TRANSFER_IN")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot mark OUT attendance without a corresponding IN record",
          });
        }
      } else if (input.type === "BRANCH_TRANSFER_OUT") {
        // Check if there's an IN or BRANCH_TRANSFER_IN record
        if (!lastAttendance || (lastAttendance.type !== "IN" && lastAttendance.type !== "BRANCH_TRANSFER_IN")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot mark BRANCH_TRANSFER_OUT without a corresponding IN or BRANCH_TRANSFER_IN record",
          });
        }
      } else if (input.type === "BRANCH_TRANSFER_IN") {
        // Check if there's a BRANCH_TRANSFER_OUT record
        if (!lastAttendance || lastAttendance.type !== "BRANCH_TRANSFER_OUT") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot mark BRANCH_TRANSFER_IN without a corresponding BRANCH_TRANSFER_OUT record",
          });
        }
      }

      // Create attendance record
      return ctx.db.staffAttendance.create({
        data: {
          type: input.type,
          latitude: input.latitude,
          longitude: input.longitude,
          distance: input.distance,
          isWithinAllowedArea: input.distance <= location.radius,
          notes: input.notes,
          locationId: input.locationId,
          teacherId: input.teacherId,
          employeeId: input.employeeId,
        },
        include: {
          location: true,
        },
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

      // If branchId is provided, we'll filter attendances by locations that belong to the branch
      if (branchId) {
        // First get all location IDs for this branch
        const locations = await ctx.db.attendanceLocation.findMany({
          where: { branchId },
          select: { id: true }
        });
        
        const locationIds = locations.map((loc: { id: string }) => loc.id);
        
        // Add these to the where clause
        where.locationId = {
          in: locationIds
        };
      }

      return ctx.db.staffAttendance.findMany({
        where,
        include: {
          location: true,
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

  // Get attendance by date
  getAttendanceByDate: protectedProcedure
    .input(z.object({
      date: z.date(),
      teacherId: z.string().optional(),
      employeeId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Ensure we're working with UTC dates to avoid timezone issues
      const startDate = new Date(input.date.toISOString().split('T')[0] + 'T00:00:00.000Z');
      const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours

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
        orderBy: {
          timestamp: 'desc',
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
        include: { section: true },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      if (student.sectionId !== classId) {
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
          data: { status: status as AttendanceStatus, reason, notes, markedById },
        });
      } else {
        // Create new attendance record
        return ctx.db.studentAttendance.create({
          data: {
            student: { connect: { id: studentId } },
            section: { connect: { id: classId } },
            date: new Date(date.setHours(0, 0, 0, 0)),
            status: status as AttendanceStatus,
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

      // Verify the section exists
      const sectionEntity = await ctx.db.section.findUnique({
        where: { id: classId },
        include: { students: true },
      });

      if (!sectionEntity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found",
        });
      }

      // Get all student IDs in the section
      const sectionStudentIds = sectionEntity.students.map((student: any) => student.id);

      // Validate that all provided student IDs belong to the section
      for (const record of attendance) {
        if (!sectionStudentIds.includes(record.studentId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Student with ID ${record.studentId} does not belong to the specified section`,
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
                section: { connect: { id: classId } },
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
          section: {
            select: {
              id: true,
              name: true,
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

      // Verify the section exists
      const sectionEntity = await ctx.db.section.findUnique({
        where: { id: classId },
        include: { students: true },
      });

      if (!sectionEntity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found",
        });
      }

      // Get all student IDs in the section
      const sectionStudentIds = sectionEntity.students.map((student: any) => student.id);

      // Get existing attendance records for the given date
      const attendanceRecords = await ctx.db.studentAttendance.findMany({
        where: {
          sectionId: classId,
          date: normalizedDate,
        },
      });

      // Get unique markedBy user IDs
      const markedByIds = [...new Set(attendanceRecords.map(r => r.markedById).filter((id): id is string => Boolean(id)))];
      

      // Fetch user details for markedBy IDs (try both User and Teacher tables)
      const [markedByUsers, markedByTeachers] = await Promise.all([
        ctx.db.user.findMany({
          where: {
            id: { in: markedByIds },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        }),
        ctx.db.teacher.findMany({
          where: {
            id: { in: markedByIds },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        })
      ]);

      // Combine users and teachers
      const allMarkedByData = [...markedByUsers, ...markedByTeachers];

      // Create a map for quick lookup
      const markedByMap = new Map(allMarkedByData.map(person => [person.id, person]));

      // Create a map of student IDs to their attendance records
      const attendanceMap = new Map<string, typeof attendanceRecords[0]>();
      attendanceRecords.forEach((record: typeof attendanceRecords[0]) => {
        attendanceMap.set(record.studentId, record);
      });

      // Combine student data with attendance data
      const studentAttendance = sectionEntity.students.map(student => {
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
            markedBy: attendanceRecord.markedById ? markedByMap.get(attendanceRecord.markedById) : null,
            createdAt: attendanceRecord.createdAt,
            updatedAt: attendanceRecord.updatedAt,
          } : {
            status: AttendanceStatus.PRESENT,
            reason: null,
            notes: null,
            markedBy: null,
            createdAt: null,
            updatedAt: null,
          },
        };
      });

      return {
        class: {
          id: sectionEntity.id,
          name: sectionEntity.name,
        },
        date: normalizedDate,
        students: studentAttendance,
        totalStudents: studentAttendance.length,
        presentCount: attendanceRecords.filter((a: { status: string }) => a.status === AttendanceStatus.PRESENT).length,
        absentCount: attendanceRecords.filter((a: { status: string }) => a.status === AttendanceStatus.ABSENT).length,
        leaveCount: attendanceRecords.filter((a: { status: string }) => a.status === AttendanceStatus.LEAVE).length,
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
      const presentDays = attendanceRecords.filter((a: { status: string }) => a.status === AttendanceStatus.PRESENT).length;
      const absentDays = attendanceRecords.filter((a: { status: string }) => a.status === AttendanceStatus.ABSENT).length;
      const leaveDays = attendanceRecords.filter((a: { status: string }) => a.status === AttendanceStatus.LEAVE).length;
      const halfDays = attendanceRecords.filter((a: { status: string }) => a.status === AttendanceStatus.HALF_DAY).length;
      const excusedDays = attendanceRecords.filter((a: { status: string }) => a.status === AttendanceStatus.LEAVE).length;

      // Calculate attendance rate
      const attendedDays = presentDays + (leaveDays * 0.75) + (halfDays * 0.5);
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
          leave: leaveDays,
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