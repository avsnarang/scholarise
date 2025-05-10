import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createStudentUser, createParentUser } from "@/utils/clerk";
import { type Prisma } from "@prisma/client";

export const studentRouter = createTRPCRouter({
  getStats: publicProcedure
    .input(
      z
        .object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      console.log('Getting student stats with input:', input);

      try {
        // Use a single query with Prisma's aggregation to get all counts at once
        // This is much faster than multiple separate count queries
        const [studentCounts, classGroups] = await Promise.all([
          // Get all student counts in a single query with aggregation
          ctx.db.$queryRaw`
            SELECT
              COUNT(DISTINCT s.id) AS "totalStudents",
              SUM(CASE WHEN s."isActive" = true THEN 1 ELSE 0 END) AS "activeStudents",
              SUM(CASE WHEN s."isActive" = false THEN 1 ELSE 0 END) AS "inactiveStudents"
            FROM "Student" s
            WHERE (${input?.branchId}::text IS NULL OR s."branchId" = ${input?.branchId}::text)
            AND (${input?.sessionId}::text IS NULL OR EXISTS (
              SELECT 1 FROM "AcademicRecord" ar 
              WHERE ar."studentId" = s.id 
              AND ar."sessionId" = ${input?.sessionId}::text
            ))
          `,

          // Get class counts in parallel
          ctx.db.student.groupBy({
            by: ["classId"],
            where: {
              branchId: input?.branchId,
              // Only include students with a classId
              classId: { not: null },
              // Filter by session if provided
              ...(input?.sessionId
                ? {
                academicRecords: {
                  some: {
                        sessionId: input.sessionId,
                      },
                    },
                  }
                : {}),
            },
            _count: true,
          }),
        ]);

        console.log('Raw student counts:', studentCounts);

        // Extract counts from the raw query result
        const counts = (studentCounts as unknown[])[0] as {
          totalStudents: bigint;
          activeStudents: bigint;
          inactiveStudents: bigint;
        };

        console.log('Processed counts:', counts);

        // Get class details for the IDs (only if there are classes)
        const classIds = classGroups
          .map((group) => group.classId)
          .filter(Boolean) as string[];

        console.log('Class IDs:', classIds);

        // Only fetch classes if there are class IDs
        const classes =
          classIds.length > 0
          ? await ctx.db.class.findMany({
              where: { id: { in: classIds } },
              // Only select the fields we need
              select: { id: true, name: true, section: true },
            })
          : [];

        console.log('Classes:', classes);

        // Create a map of class counts
        const classCounts: Record<string, number> = {};
        classGroups.forEach((group) => {
          if (group.classId) {
            const classInfo = classes.find((c) => c.id === group.classId);
            if (classInfo) {
              const key = `${classInfo.name}-${classInfo.section}`;
              classCounts[key] = group._count;
            }
          }
        });

        console.log('Class counts:', classCounts);

        const result = {
          totalStudents: Number(counts.totalStudents || 0),
          activeStudents: Number(counts.activeStudents || 0),
          inactiveStudents: Number(counts.inactiveStudents || 0),
          classCounts,
        };

        console.log('Final result:', result);
        return result;
      } catch (error) {
        console.error('Error getting student stats:', error);
        throw error;
      }
    }),
  getAll: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional().nullable(),
        classId: z.string().optional().nullable(),
        search: z.string().optional().nullable(),
        sessionId: z.string().optional().nullable(),
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.string().nullish(),
        filters: z.record(z.string(), z.any()).nullish(),
      }).optional(),
    )
    .query(async ({ ctx, input = {} }) => {
      const limit = input.limit ?? 50;
      const { cursor, filters } = input;

      // Base filters
      const baseWhere: any = {
        AND: [
          input.branchId ? { branchId: input.branchId } : {},
          input.classId ? { classId: input.classId } : {},
          input.search
            ? {
                OR: [
                  { firstName: { contains: input.search } },
                  { lastName: { contains: input.search } },
                  { admissionNumber: { contains: input.search } },
                  {
                    parent: {
                      OR: [
                        { fatherName: { contains: input.search } },
                        { motherName: { contains: input.search } },
                        { guardianName: { contains: input.search } },
                      ],
                    },
                  },
                ],
              }
            : {},
        ],
      };

      // Apply additional filters if provided
      if (filters) {
        // Add any custom filters from the filters object
        Object.entries(filters).forEach(([key, value]) => {
          // Skip null/undefined values
          if (value === null || value === undefined) return;
          
          // Handle special cases
          if (key === 'isActive') {
            baseWhere.AND.push({ isActive: value === 'true' || value === true });
          } 
          // Add more special cases as needed
          else if (value) {
            // For simple equality filters
            baseWhere.AND.push({ [key]: value });
        }
        });
      }

      const items = await ctx.db.student.findMany({
        take: limit + 1,
        where: baseWhere,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          firstName: "asc",
        },
        include: {
          class: true,
          parent: true,
          academicRecords: input.sessionId
            ? {
            where: {
                  sessionId: input.sessionId,
                },
            }
            : undefined,
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(
      z.object({
      id: z.string(),
        branchId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: {
          id: input.id,
          // Only return students from the current branch if branchId is provided
          ...(input.branchId ? { branchId: input.branchId } : {}),
        },
        include: {
          class: true,
          parent: true,
        },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      return student;
    }),

  create: publicProcedure
    .input(
      z.object({
        admissionNumber: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        dateOfBirth: z.date(),
        dateOfAdmission: z.date(),
        gender: z.enum(["Male", "Female", "Other"]),
        email: z.string().email().nullish(),
        personalEmail: z.string().email().nullish(),
        branchId: z.string(),
        classId: z.string(),
        siblings: z.array(z.string()).optional(),
        isActive: z.boolean().default(true),
        address: z.string().optional(),
        // Authentication credentials
        username: z.string().optional(),
        password: z.string().optional(),
        parentUsername: z.string().optional(),
        parentPassword: z.string().optional(),
        // Optional parent details
        fatherName: z.string().nullish(),
        fatherDob: z.date().nullish(),
        fatherOccupation: z.string().nullish(),
        fatherMobile: z.string().nullish(),
        fatherEmail: z.string().email().nullish(),
        motherName: z.string().nullish(),
        motherDob: z.date().nullish(),
        motherOccupation: z.string().nullish(),
        motherMobile: z.string().nullish(),
        motherEmail: z.string().email().nullish(),
        guardianName: z.string().nullish(),
        guardianDob: z.date().nullish(),
        guardianOccupation: z.string().nullish(),
        guardianMobile: z.string().nullish(),
        guardianEmail: z.string().email().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        siblings,
        username,
        password,
        parentUsername,
        parentPassword,
        fatherName,
        fatherDob,
        fatherOccupation,
        fatherMobile,
        fatherEmail,
        motherName,
        motherDob,
        motherOccupation,
        motherMobile,
        motherEmail,
        guardianName,
        guardianDob,
        guardianOccupation,
        guardianMobile,
        guardianEmail,
        ...studentData
      } = input;

      // Get branch code for Clerk user creation
      const branch = await ctx.db.branch.findUnique({
        where: { id: input.branchId },
        select: { code: true }
      });

      if (!branch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Branch not found",
        });
      }

      // Create Clerk user accounts if credentials are provided
      let clerkStudentId = null;
      let clerkParentId = null;

      if (username && password) {
        try {
          const studentUser = await createStudentUser({
          firstName: input.firstName,
          lastName: input.lastName,
            username,
            password,
            branchCode: branch.code,
          branchId: input.branchId,
          });
          clerkStudentId = studentUser.id;
          console.log("Created Clerk user for student:", clerkStudentId);
        } catch (error) {
          console.error("Error creating Clerk user for student:", error);
          // Continue without Clerk user if it fails
        }
      }

      // Create parent record with required fields
      const parentData = await ctx.db.parent.create({
        data: {
          // Father information
          fatherName: fatherName ?? null,
          fatherDob: fatherDob ?? null,
          fatherOccupation: fatherOccupation ?? null,
          fatherMobile: fatherMobile ?? null,
          fatherEmail: fatherEmail ?? null,
          // Mother information
          motherName: motherName ?? null,
          motherDob: motherDob ?? null,
          motherOccupation: motherOccupation ?? null,
          motherMobile: motherMobile ?? null,
          motherEmail: motherEmail ?? null,
          // Guardian information
          guardianName: guardianName ?? null,
          guardianDob: guardianDob ?? null,
          guardianOccupation: guardianOccupation ?? null,
          guardianMobile: guardianMobile ?? null,
          guardianEmail: guardianEmail ?? null,
          // Additional information
          parentAnniversary: null,
          monthlyIncome: null,
        } as Prisma.ParentCreateInput,
      });

      // Create Clerk user for parent if credentials are provided
      if (parentUsername && parentPassword) {
        try {
          const parentUser = await createParentUser({
            firstName: fatherName || motherName || guardianName || input.firstName,
            lastName: input.lastName,
            username: parentUsername,
            password: parentPassword,
            email: fatherEmail || motherEmail || guardianEmail || undefined,
            branchId: input.branchId,
          });
          clerkParentId = parentUser.id;
          console.log("Created Clerk user for parent:", clerkParentId);
        } catch (error) {
          console.error("Error creating Clerk user for parent:", error);
          // Continue without Clerk user if it fails
        }
      }

      // Create student with parent reference
      const student = await ctx.db.student.create({
        data: {
          ...studentData,
          parentId: parentData.id,
          username,
          password,
          ...(clerkStudentId ? { clerkId: clerkStudentId } : {}),
          ...(siblings?.length ? {
            siblings: {
              connect: siblings.map(id => ({ id })),
            },
          } : {}),
        },
        include: {
          class: true,
          parent: true,
        },
      });

      // Update parent with clerk ID if created
      if (clerkParentId) {
        await ctx.db.parent.update({
          where: { id: parentData.id },
          data: { 
            clerkId: clerkParentId 
          } as Prisma.ParentUpdateInput
        });
      }

      return student;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        // Basic student information
        admissionNumber: z.string().min(1).optional(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        dateOfBirth: z.string().optional().transform(val => val ? new Date(val) : undefined),
        gender: z.enum(["Male", "Female", "Other"]).optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().nullable(),
        personalEmail: z.string().email().optional().nullable(),
        bloodGroup: z.string().optional(),
        religion: z.string().optional(),
        nationality: z.string().optional(),
        caste: z.string().optional(),
        aadharNumber: z.string().optional(),
        udiseId: z.string().optional(),
        cbse10RollNumber: z.string().optional(),
        cbse12RollNumber: z.string().optional(),
        classId: z.string().optional(),
        parentId: z.string().optional(),
        dateOfAdmission: z.string().optional().transform(val => val ? new Date(val) : undefined),
        isActive: z.boolean().default(true),
        // Address fields
        permanentAddress: z.string().optional(),
        permanentCity: z.string().optional(),
        permanentState: z.string().optional(),
        permanentCountry: z.string().optional(),
        permanentZipCode: z.string().optional(),
        correspondenceAddress: z.string().optional(),
        correspondenceCity: z.string().optional(),
        correspondenceState: z.string().optional(),
        correspondenceCountry: z.string().optional(),
        correspondenceZipCode: z.string().optional(),
        // Previous school information
        previousSchool: z.string().optional(),
        lastClassAttended: z.string().optional(),
        mediumOfInstruction: z.string().optional(),
        recognisedByStateBoard: z.boolean().optional(),
        schoolCity: z.string().optional(),
        schoolState: z.string().optional(),
        reasonForLeaving: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if student exists
      const student = await ctx.db.student.findUnique({
        where: { id },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      // Check if admission number is already used by another student
      if (data.admissionNumber) {
        const existingStudent = await ctx.db.student.findFirst({
          where: {
            admissionNumber: data.admissionNumber,
            branchId: student.branchId,
            id: { not: id },
          },
        });

        if (existingStudent) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Admission number already exists",
          });
        }
      }

      return ctx.db.student.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if student exists
      const student = await ctx.db.student.findUnique({
        where: { id: input.id },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      return ctx.db.student.delete({
        where: { id: input.id },
      });
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      // Check if students exist
      const students = await ctx.db.student.findMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });

      if (students.length !== input.ids.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some students not found",
        });
      }

      return ctx.db.student.deleteMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });
    }),

  bulkUpdateClass: protectedProcedure
    .input(
      z.object({
      ids: z.array(z.string()),
      classId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if class exists
      const classExists = await ctx.db.class.findUnique({
        where: { id: input.classId },
      });

      if (!classExists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Class not found",
        });
      }

      return ctx.db.student.updateMany({
        where: {
          id: {
            in: input.ids,
          },
        },
        data: {
          classId: input.classId,
        },
      });
    }),

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
      ids: z.array(z.string()),
      isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.student.updateMany({
        where: {
          id: {
            in: input.ids,
          },
        },
        data: {
          isActive: input.isActive,
        },
      });
    }),

  // Fuzzy search for students - used by global search
  fuzzySearchStudents: publicProcedure
    .input(
      z.object({
      searchTerm: z.string().min(1),
      excludeStudentId: z.string().optional(),
      branchId: z.string().optional(),
      limit: z.number().min(1).max(10).optional().default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { searchTerm, excludeStudentId, branchId, limit } = input;

      // If search term is empty, return empty array
      if (!searchTerm.trim()) {
        return [];
      }

      // Build the where clause for fuzzy search
      const whereClause: Prisma.StudentWhereInput = {
        OR: [
          { admissionNumber: { contains: searchTerm, mode: "insensitive" } },
          { firstName: { contains: searchTerm, mode: "insensitive" } },
          { lastName: { contains: searchTerm, mode: "insensitive" } },
        ],
        // Exclude the current student if provided
        ...(excludeStudentId ? { NOT: { id: excludeStudentId } } : {}),
        // Only return students from the current branch if branchId is provided
        ...(branchId ? { branchId } : {}),
        // Only return active students
        isActive: true,
      };

      // Find matching students
      const students = await ctx.db.student.findMany({
        where: whereClause,
        take: limit,
        include: {
          class: true,
        },
        orderBy: [
          // Prioritize matches by admission number
          { admissionNumber: "asc" },
          // Then by name
          { firstName: "asc" },
        ],
      });

      return students;
    }),

  toggleStatus: protectedProcedure
    .input(
      z.object({
      id: z.string(),
      isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if student exists
      const student = await ctx.db.student.findUnique({
        where: { id: input.id },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      return ctx.db.student.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  updateRollNumber: protectedProcedure
    .input(
      z.object({
        students: z.array(
          z.object({
        id: z.string(),
        rollNumber: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { students } = input;

      // Update roll numbers in a transaction
      const results = await ctx.db.$transaction(
        students.map((student) =>
          ctx.db.student.update({
            where: { id: student.id },
            data: { 
              rollNumber: student.rollNumber || undefined,
            } as Prisma.StudentUpdateInput,
          }),
        ),
      );

      return { count: results.length };
    }),

  bulkImport: protectedProcedure
    .input(
      z.object({
        students: z.array(
          z.object({
        // Required fields
            admissionNumber: z.string().min(1),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
            gender: z.enum(["Male", "Female", "Other"]),
        dateOfBirth: z.string(),
            branchCode: z.string().min(1), // PS, JUN, MAJ, etc.

        // Basic information
        dateOfAdmission: z.string().optional(),
        email: z.string().email().optional().nullable(),
        personalEmail: z.string().email().optional().nullable(),
        phone: z.string().optional(),
        bloodGroup: z.string().optional(),
        religion: z.string().optional(),
        nationality: z.string().optional(),
        caste: z.string().optional(),
        aadharNumber: z.string().optional(),
        udiseId: z.string().optional(),
        cbse10RollNumber: z.string().optional(),
        cbse12RollNumber: z.string().optional(),
        username: z.string().optional(),
        password: z.string().optional(),

        // Address information
        permanentAddress: z.string().optional(),
        permanentCity: z.string().optional(),
        permanentState: z.string().optional(),
        permanentCountry: z.string().optional(),
        permanentZipCode: z.string().optional(),
        correspondenceAddress: z.string().optional(),
        correspondenceCity: z.string().optional(),
        correspondenceState: z.string().optional(),
        correspondenceCountry: z.string().optional(),
        correspondenceZipCode: z.string().optional(),

        // Previous school information
        previousSchool: z.string().optional(),
        lastClassAttended: z.string().optional(),
        mediumOfInstruction: z.string().optional(),
            recognisedByStateBoard: z
              .union([z.string(), z.boolean()])
              .optional(),
        schoolCity: z.string().optional(),
        schoolState: z.string().optional(),
        reasonForLeaving: z.string().optional(),

        // Father's information
        fatherName: z.string().optional(),
        fatherDob: z.string().optional(),
        fatherEducation: z.string().optional(),
        fatherOccupation: z.string().optional(),
        fatherMobile: z.string().optional(),
        fatherEmail: z.string().email().optional().nullable(),

        // Mother's information
        motherName: z.string().optional(),
        motherDob: z.string().optional(),
        motherEducation: z.string().optional(),
        motherOccupation: z.string().optional(),
        motherMobile: z.string().optional(),
        motherEmail: z.string().email().optional().nullable(),

        // Guardian's information
        guardianName: z.string().optional(),
        guardianDob: z.string().optional(),
        guardianEducation: z.string().optional(),
        guardianOccupation: z.string().optional(),
        guardianMobile: z.string().optional(),
        guardianEmail: z.string().email().optional().nullable(),

        // Additional parent information
        parentAnniversary: z.string().optional(),
        monthlyIncome: z.string().optional(),
        parentUsername: z.string().optional(),
        parentPassword: z.string().optional(),

        // Sibling information
        siblingAdmissionNumber: z.string().optional(),
        siblingRelationshipType: z.string().optional(),
          }),
        ),
      branchId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { students, branchId } = input;

      if (!branchId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Branch ID is required for bulk import",
        });
      }

      // Get the branch to determine admission number prefix
      const branch = await ctx.db.branch.findUnique({
        where: { id: branchId },
      });

      if (!branch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Branch not found",
        });
      }

      // Get all branches for branch code lookup
      const branches = await ctx.db.branch.findMany();
      const branchCodeMap = new Map(branches.map((b) => [b.code, b.id]));

      // Get the highest admission number for this branch
      const highestAdmissionNumber = await ctx.db.student.findFirst({
        where: { branchId },
        orderBy: { admissionNumber: "desc" },
        select: { admissionNumber: true },
      });

      // Determine the starting admission number
      let startingNumber = 1000; // Default starting number
      if (branch.code === "PS") {
        startingNumber = 1000;
      } else if (branch.code === "JUN") {
        startingNumber = 2000;
      } else if (branch.code === "MAJ") {
        startingNumber = 3000;
      }

      // If there's an existing highest number, use that as the base
      if (highestAdmissionNumber) {
        const currentHighest = parseInt(
          highestAdmissionNumber.admissionNumber.replace(/\D/g, ""),
        );
        if (!isNaN(currentHighest) && currentHighest >= startingNumber) {
          startingNumber = currentHighest;
        }
      }

      // Create students in a transaction
      const createdStudents = await ctx.db.$transaction(async (prisma) => {
        const results = [];

        for (let i = 0; i < students.length; i++) {
          const student = students[i];
          if (!student) continue; // Skip if student is undefined

          // Handle branch code if provided
          let studentBranchId = branchId;
          if (student.branchCode) {
            const mappedBranchId = branchCodeMap.get(student.branchCode);
            if (mappedBranchId) {
              studentBranchId = mappedBranchId;
            } else {
              console.warn(
                `Branch code ${student.branchCode} not found, using default branch`,
              );
            }
          }

          // Get the branch information for email domain generation
          const studentBranch = branches.find((b) => b.id === studentBranchId);
          if (!studentBranch) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Branch not found for student",
            });
          }

          // Generate or use provided admission number
          let admissionNumber: string;
          if (student.admissionNumber) {
            // Check if admission number already exists
            const existingStudent = await prisma.student.findFirst({
              where: { admissionNumber: student.admissionNumber },
            });

            if (existingStudent) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Admission number ${student.admissionNumber} already exists`,
              });
            }

            admissionNumber = student.admissionNumber;
          } else {
            // Generate admission number based on branch
            const branchCode =
              branches.find((b) => b.id === studentBranchId)?.code ||
              branch.code;
            let prefixNumber = 1000; // Default

            if (branchCode === "PS") {
              prefixNumber = 1000;
            } else if (branchCode === "JUN") {
              prefixNumber = 2000;
            } else if (branchCode === "MAJ") {
              prefixNumber = 3000;
            }

            // Get the highest admission number for this specific branch
            const branchHighestAdmissionNumber = await prisma.student.findFirst(
              {
              where: { branchId: studentBranchId },
              orderBy: { admissionNumber: "desc" },
              select: { admissionNumber: true },
              },
            );

            let branchStartingNumber = prefixNumber;
            if (branchHighestAdmissionNumber) {
              const currentHighest = parseInt(
                branchHighestAdmissionNumber.admissionNumber.replace(/\D/g, ""),
              );
              if (!isNaN(currentHighest) && currentHighest >= prefixNumber) {
                branchStartingNumber = currentHighest;
              }
            }

            admissionNumber = `${branchStartingNumber + i + 1}`;
          }

          // Convert date string to Date object
          let dateOfBirth: Date;
          try {
            dateOfBirth = new Date(student.dateOfBirth);
            if (isNaN(dateOfBirth.getTime())) {
              throw new Error(`Invalid date format for student ${i + 1}`);
            }
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid date format for student ${i + 1}`,
            });
          }

          // Convert dateOfAdmission if provided
          let dateOfAdmission: Date | undefined;
          if (student.dateOfAdmission) {
            try {
              dateOfAdmission = new Date(student.dateOfAdmission);
              if (isNaN(dateOfAdmission.getTime())) {
                dateOfAdmission = undefined;
              }
            } catch (error) {
              // Ignore invalid date format
              dateOfAdmission = undefined;
            }
          }

          // Convert recognisedByStateBoard to boolean if it's a string
          let recognisedByStateBoard: boolean | undefined;
          if (typeof student.recognisedByStateBoard === "string") {
            recognisedByStateBoard =
              student.recognisedByStateBoard.toLowerCase() === "yes" ||
              student.recognisedByStateBoard.toLowerCase() === "true";
          } else {
            recognisedByStateBoard = student.recognisedByStateBoard;
          }

          let clerkStudentId = null;
          let clerkParentId = null;

          // Create Clerk user for student if username and password are provided
          if (student.username && student.password) {
            try {
              const studentUser = await createStudentUser({
                firstName: student.firstName,
                lastName: student.lastName,
                username: student.username,
                password: student.password,
                branchCode: studentBranch.code,
                branchId: studentBranchId,
              });
              clerkStudentId = studentUser.id;
            } catch (error) {
              console.error("Error creating Clerk user for student:", error);
              // Continue without Clerk user if it fails
            }
          }

          // Create parent record if parent information is provided
          let parentId: string | undefined = undefined;
          if (
            student.fatherName ||
            student.motherName ||
            student.guardianName
          ) {
            try {
              // Convert parent date fields
              let fatherDob: Date | undefined;
              if (student.fatherDob) {
                try {
                  fatherDob = new Date(student.fatherDob);
                  if (isNaN(fatherDob.getTime())) fatherDob = undefined;
                } catch (error) {
                  fatherDob = undefined;
                }
              }

              let motherDob: Date | undefined;
              if (student.motherDob) {
                try {
                  motherDob = new Date(student.motherDob);
                  if (isNaN(motherDob.getTime())) motherDob = undefined;
                } catch (error) {
                  motherDob = undefined;
                }
              }

              let guardianDob: Date | undefined;
              if (student.guardianDob) {
                try {
                  guardianDob = new Date(student.guardianDob);
                  if (isNaN(guardianDob.getTime())) guardianDob = undefined;
                } catch (error) {
                  guardianDob = undefined;
                }
              }

              let parentAnniversary: Date | undefined;
              if (student.parentAnniversary) {
                try {
                  parentAnniversary = new Date(student.parentAnniversary);
                  if (isNaN(parentAnniversary.getTime()))
                    parentAnniversary = undefined;
                } catch (error) {
                  parentAnniversary = undefined;
                }
              }

              // Create parent user in Clerk if parent credentials are provided
              let parentUserId: string | undefined = undefined;
              if (student.parentUsername && student.parentPassword) {
                try {
                  const parentUser = await createParentUser({
                    firstName:
                      student.fatherName ||
                      student.motherName ||
                      student.guardianName ||
                      student.firstName,
                    lastName: student.lastName,
                    username: student.parentUsername,
                    password: student.parentPassword,
                    email:
                      student.fatherEmail ||
                      student.motherEmail ||
                      student.guardianEmail ||
                      "",
                    branchId: studentBranchId,
                  });
                  parentUserId = parentUser.id;
                } catch (error) {
                  console.error("Error creating Clerk user for parent:", error);
                  // Continue without Clerk user if it fails
                }
              }

              // Create parent record
              const parentData = await prisma.parent.create({
                data: {
                  // Father information
                  fatherName: student.fatherName ?? null,
                  fatherDob: student.fatherDob ? new Date(student.fatherDob) : null,
                  fatherEducation: student.fatherEducation ?? null,
                  fatherOccupation: student.fatherOccupation ?? null,
                  fatherMobile: student.fatherMobile ?? null,
                  fatherEmail: student.fatherEmail ?? null,
                  // Mother information
                  motherName: student.motherName ?? null,
                  motherDob: student.motherDob ? new Date(student.motherDob) : null,
                  motherEducation: student.motherEducation ?? null,
                  motherOccupation: student.motherOccupation ?? null,
                  motherMobile: student.motherMobile ?? null,
                  motherEmail: student.motherEmail ?? null,
                  // Guardian information
                  guardianName: student.guardianName ?? null,
                  guardianDob: student.guardianDob ? new Date(student.guardianDob) : null,
                  guardianEducation: student.guardianEducation ?? null,
                  guardianOccupation: student.guardianOccupation ?? null,
                  guardianMobile: student.guardianMobile ?? null,
                  guardianEmail: student.guardianEmail ?? null,
                  // Additional information
                  parentAnniversary: student.parentAnniversary ? new Date(student.parentAnniversary) : null,
                  monthlyIncome: student.monthlyIncome ?? null
                } as Prisma.ParentCreateInput,
              });

              parentId = parentData.id;
            } catch (error) {
              console.error("Error creating parent:", error);
              // Continue with student creation even if parent creation fails
            }
          }

          // Create the student
          const createdStudent = await prisma.student.create({
            data: {
              // Basic information
              admissionNumber,
              firstName: student.firstName,
              lastName: student.lastName,
              gender: student.gender,
              dateOfBirth,
              email: student.email,
              personalEmail: student.personalEmail,
              phone: student.phone,
              bloodGroup: student.bloodGroup,
              religion: student.religion,
              nationality: student.nationality,
              caste: student.caste,
              aadharNumber: student.aadharNumber,
              udiseId: student.udiseId,
              cbse10RollNumber: student.cbse10RollNumber,
              cbse12RollNumber: student.cbse12RollNumber,
              branchId: studentBranchId,
              isActive: true,
              joinDate: new Date(),
              dateOfAdmission,
              username: student.username,
              password: student.password,
              parentId,

              // Address information
              permanentAddress: student.permanentAddress,
              permanentCity: student.permanentCity,
              permanentState: student.permanentState,
              permanentCountry: student.permanentCountry,
              permanentZipCode: student.permanentZipCode,
              correspondenceAddress: student.correspondenceAddress,
              correspondenceCity: student.correspondenceCity,
              correspondenceState: student.correspondenceState,
              correspondenceCountry: student.correspondenceCountry,
              correspondenceZipCode: student.correspondenceZipCode,

              // Previous school information
              previousSchool: student.previousSchool,
              lastClassAttended: student.lastClassAttended,
              mediumOfInstruction: student.mediumOfInstruction,
              recognisedByStateBoard,
              schoolCity: student.schoolCity,
              schoolState: student.schoolState,
              reasonForLeaving: student.reasonForLeaving,
            },
          });

          // Add sibling relationship if provided
          if (
            student.siblingAdmissionNumber &&
            student.siblingRelationshipType
          ) {
            try {
              // Find the sibling by admission number
              const sibling = await prisma.student.findFirst({
                where: {
                  admissionNumber: student.siblingAdmissionNumber,
                  branchId, // Only look for siblings in the same branch
                },
              });

              if (sibling) {
                // Create bidirectional sibling relationship
                await prisma.studentSibling.create({
                  data: {
                    studentId: createdStudent.id,
                    siblingId: sibling.id,
                    relationshipType: student.siblingRelationshipType,
                  },
                });

                await prisma.studentSibling.create({
                  data: {
                    studentId: sibling.id,
                    siblingId: createdStudent.id,
                    relationshipType: student.siblingRelationshipType,
                  },
                });
              }
            } catch (error) {
              console.error("Error creating sibling relationship:", error);
              // Continue even if sibling relationship creation fails
            }
          }

          results.push(createdStudent);
        }

        return results;
      });

      return { count: createdStudents.length };
    }),

  // Get student by admission number
  getByAdmissionNumber: publicProcedure
    .input(
      z.object({
      admissionNumber: z.string(),
      branchId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: {
          admissionNumber: input.admissionNumber,
          // Only return students from the current branch if branchId is provided
          ...(input.branchId ? { branchId: input.branchId } : {}),
        },
        include: {
          class: true,
        },
      });

      if (!student) {
        return null;
      }

      return student;
    }),

  // Get siblings for a student
  getSiblings: publicProcedure
    .input(
      z.object({
      studentId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get all siblings for the student using the Prisma model
      const siblingRelationships = await ctx.db.studentSibling.findMany({
        where: {
          studentId: input.studentId,
        },
        include: {
          sibling: {
            include: {
              class: true,
            },
          },
        },
      });

      // Transform the data to match the expected format
      const siblings = siblingRelationships.map((relationship) => ({
        relationshipId: relationship.id,
        relationshipType: relationship.relationshipType,
        id: relationship.sibling.id,
        firstName: relationship.sibling.firstName,
        lastName: relationship.sibling.lastName,
        admissionNumber: relationship.sibling.admissionNumber,
        isActive: relationship.sibling.isActive,
        className: relationship.sibling.class?.name || null,
        classSection: relationship.sibling.class?.section || null,
      }));

      return siblings;
    }),

  // Add a sibling relationship
  addSibling: protectedProcedure
    .input(
      z.object({
      studentId: z.string(),
      siblingId: z.string(),
      relationshipType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if both students exist
      const student = await ctx.db.student.findUnique({
        where: { id: input.studentId },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      const sibling = await ctx.db.student.findUnique({
        where: { id: input.siblingId },
      });

      if (!sibling) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sibling not found",
        });
      }

      // Check if relationship already exists
      const existingRelationship = await ctx.db.studentSibling.findFirst({
        where: {
          OR: [
            {
              studentId: input.studentId,
              siblingId: input.siblingId,
            },
            {
              studentId: input.siblingId,
              siblingId: input.studentId,
            },
          ],
        },
      });

      if (existingRelationship) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sibling relationship already exists",
        });
      }

      // Add sibling relationship
      await ctx.db.studentSibling.create({
        data: {
          studentId: input.studentId,
          siblingId: input.siblingId,
          relationshipType: input.relationshipType,
        },
      });

      // Add the reverse relationship as well
      await ctx.db.studentSibling.create({
        data: {
          studentId: input.siblingId,
          siblingId: input.studentId,
          relationshipType: input.relationshipType,
        },
      });

      return { success: true };
    }),

  // Remove a sibling relationship
  removeSibling: protectedProcedure
    .input(
      z.object({
      relationshipId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the relationship to find both sides
      const relationship = await ctx.db.studentSibling.findUnique({
        where: { id: input.relationshipId },
      });

      if (!relationship) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sibling relationship not found",
        });
      }

      // Delete the relationship and its reverse
      await ctx.db.studentSibling.deleteMany({
        where: {
          OR: [
            {
              studentId: relationship.studentId,
              siblingId: relationship.siblingId,
            },
            {
              studentId: relationship.siblingId,
              siblingId: relationship.studentId,
            },
          ],
        },
      });

      return { success: true };
    }),
});

async function generateAdmissionNumber(ctx: any, branchCode: string) {
  // Get current timestamp as part of admission number for uniqueness
  const timestamp = new Date().getTime().toString().slice(-6);
  return `${branchCode}-${timestamp}`;
}
