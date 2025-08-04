import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createStudentUser, createParentUser, deleteUser } from "@/utils/supabase-auth";
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
      console.log("Getting student stats with input:", input);

      try {
        // Use a single query with Prisma's aggregation to get all counts at once
        const [studentCounts, sectionGroups, genderCounts] = await Promise.all([
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

          // Get section counts in parallel - use sectionId
          ctx.db.student.groupBy({
            by: ["sectionId"],
            where: {
              branchId: input?.branchId,
              sectionId: { not: null },
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

          // Get gender distribution
          ctx.db.student.groupBy({
            by: ["gender"],
            where: {
              branchId: input?.branchId,
              isActive: true,
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

        // Extract counts from the raw query result
        const counts = (studentCounts as unknown[])[0] as {
          totalStudents: bigint;
          activeStudents: bigint;
          inactiveStudents: bigint;
        };

        // Get section details for the IDs
        const sectionIds = sectionGroups
          .map((group) => group.sectionId)
          .filter(Boolean) as string[];

        const sections =
          sectionIds.length > 0
            ? await ctx.db.section.findMany({
                where: { id: { in: sectionIds } },
                select: {
                  id: true,
                  name: true,
                  class: { select: { name: true } },
                },
              })
            : [];

        // Create a map of section counts
        const classCounts: Record<string, number> = {};
        sectionGroups.forEach((group) => {
          if (group.sectionId) {
            const sectionInfo = sections.find((s) => s.id === group.sectionId);
            if (sectionInfo) {
              const key = `${sectionInfo.class.name}-${sectionInfo.name}`;
              classCounts[key] = group._count;
            }
          }
        });

        // Process gender distribution
        const genderDistribution: Record<string, number> = {};
        genderCounts.forEach((group) => {
          if (group.gender) {
            genderDistribution[group.gender] = group._count;
          }
        });

        const result = {
          totalStudents: Number(counts.totalStudents || 0),
          activeStudents: Number(counts.activeStudents || 0),
          inactiveStudents: Number(counts.inactiveStudents || 0),
          classCounts,
          genderDistribution,
        };

        return result;
      } catch (error) {
        console.error("Error getting student stats:", error);
        throw error;
      }
    }),

  getAll: publicProcedure
    .input(
      z
        .object({
          branchId: z.string().optional().nullable(),
          sectionId: z.string().optional().nullable(),
          search: z.string().optional().nullable(),
          sessionId: z.string().optional().nullable(),
          limit: z.number().min(1).max(500).nullish(),
          cursor: z.string().nullish(),
          filters: z.record(z.string(), z.any()).nullish(),
          academicSessionId: z.string().optional(),
          sortBy: z.string().optional().nullable(),
          sortOrder: z.enum(["asc", "desc"]).optional().nullable(),
          fetchAllIds: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input = {} }) => {
      const limit = input.fetchAllIds ? undefined : input.limit;
      const { cursor, filters, sortBy, sortOrder, fetchAllIds } = input;

      const baseWhere: Prisma.StudentWhereInput = {
        AND: [
          input.branchId ? { branchId: input.branchId } : {},
          input.sectionId ? { sectionId: input.sectionId } : {},
          input.sessionId
            ? {
                academicRecords: {
                  some: {
                    sessionId: input.sessionId,
                  },
                },
              }
            : {},
          input.academicSessionId && !input.sessionId
            ? {
                academicRecords: {
                  some: {
                    sessionId: input.academicSessionId,
                  },
                },
              }
            : {},
          input.search
            ? {
                OR: [
                  {
                    firstName: { contains: input.search, mode: "insensitive" },
                  },
                  { lastName: { contains: input.search, mode: "insensitive" } },
                  {
                    admissionNumber: {
                      contains: input.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    parent: {
                      OR: [
                        {
                          fatherName: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                        {
                          motherName: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                        {
                          guardianName: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                ],
              }
            : {},
          ...(filters && Object.keys(filters).length > 0
            ? Object.entries(filters).map(([field, value]) => {
                if (field === "isActive") {
                  // Handle both legacy boolean and new status enum values
                  if (value === "true" || value === true) {
                    return { status: "ACTIVE" as const };
                  } else if (value === "false" || value === false) {
                    return { status: { not: "ACTIVE" as const } };
                  } else if (typeof value === "string" && ["ACTIVE", "INACTIVE", "EXPELLED", "WITHDRAWN", "REPEAT", "TRANSFERRED", "GRADUATED", "SUSPENDED"].includes(value)) {
                    return { status: value as any };
                  } else {
                    return { status: { not: "ACTIVE" as const } };
                  }
                }
                if (typeof value === "string") {
                  return { [field]: { contains: value, mode: "insensitive" } };
                }
                return { [field]: value };
              })
            : []),
        ],
      };

      const orderBy: Prisma.StudentOrderByWithRelationInput[] = [];
      if (sortBy && sortOrder) {
        if (sortBy === "name") {
          orderBy.push({ firstName: sortOrder });
          orderBy.push({ lastName: sortOrder });
        } else if (sortBy === "class") {
          orderBy.push({ section: { class: { displayOrder: sortOrder } } });
          orderBy.push({ section: { class: { name: sortOrder } } });
          orderBy.push({ section: { name: sortOrder } });
        } else {
          orderBy.push({ [sortBy]: sortOrder });
        }
      } else {
        orderBy.push({ section: { class: { displayOrder: "asc" } } });
        orderBy.push({ firstName: "asc" });
      }

      if (fetchAllIds) {
        const studentData = await ctx.db.student.findMany({
          where: baseWhere,
          select: { id: true },
          orderBy: orderBy,
        });
        const studentIds = studentData.map((s) => s.id);
        return {
          itemIds: studentIds,
          totalCount: studentIds.length,
          isIdList: true,
          nextCursor: undefined,
        };
      } else {
        const items = await ctx.db.student.findMany({
          take: limit ? limit + 1 : undefined,
          where: baseWhere,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: orderBy,
          include: {
            section: {
              include: {
                class: true,
              },
            },
            parent: true,
            firstJoinedSession: true,
            academicRecords: {
              where: {
                sessionId:
                  input.sessionId || input.academicSessionId || undefined,
              },
              include: {
                session: true,
              },
            },
            // Include the most recent feedback for each student
            courtesyCallFeedbacks: {
              take: 1,
              orderBy: {
                callDate: "desc",
              },
              select: {
                callDate: true,
              },
            },
          },
        });

        let nextCursor: typeof cursor | undefined = undefined;
        if (limit && items.length > limit) {
          const nextItem = items.pop();
          nextCursor = nextItem!.id;
        }

        const totalCount = await ctx.db.student.count({
          where: baseWhere,
        });

        return {
          items,
          nextCursor,
          totalCount,
        };
      }
    }),

  getById: publicProcedure
    .input(
      z.object({
        id: z.string().min(1, "Student ID is required"),
        branchId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!input.id || input.id.trim().length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Valid Student ID is required",
        });
      }

      try {
        const student = await ctx.db.student.findFirst({
          where: {
            id: input.id.trim(),
            ...(input.branchId ? { branchId: input.branchId } : {}),
          },
          include: {
            section: {
              include: {
                class: true,
              },
            },
            parent: true,
            branch: true,
            academicRecords: {
              include: {
                session: true,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Student with ID "${input.id}" not found. The student may have been deleted or the ID may be incorrect.`,
          });
        }

        return student;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        console.error('Error fetching student by ID:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch student data. Please try again.",
        });
      }
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
        phone: z.string().nullish(),
        branchId: z.string(),
        sectionId: z.string(),
        sessionId: z.string(), // Add sessionId to track first joined session
        siblings: z.array(z.string()).optional(),
        isActive: z.boolean().default(true),
        address: z.string().optional(),
        permanentAddress: z.string().optional().nullish(),
        permanentCity: z.string().optional().nullish(),
        permanentState: z.string().optional().nullish(),
        permanentCountry: z.string().optional().nullish(),
        permanentZipCode: z.string().optional().nullish(),
        correspondenceAddress: z.string().optional().nullish(),
        correspondenceCity: z.string().optional().nullish(),
        correspondenceState: z.string().optional().nullish(),
        correspondenceCountry: z.string().optional().nullish(),
        correspondenceZipCode: z.string().optional().nullish(),
        previousSchool: z.string().optional().nullish(),
        lastClassAttended: z.string().optional().nullish(),
        mediumOfInstruction: z.string().optional().nullish(),
        recognisedByStateBoard: z.boolean().optional(),
        schoolCity: z.string().optional().nullish(),
        schoolState: z.string().optional().nullish(),
        reasonForLeaving: z.string().optional().nullish(),
        bloodGroup: z.string().optional().nullish(),
        username: z.string().optional(),
        password: z.string().optional(),
        parentUsername: z.string().optional(),
        parentPassword: z.string().optional(),
        fatherName: z.string().nullish(),
        fatherDob: z.date().nullish(),
        fatherOccupation: z.string().nullish(),
        fatherMobile: z.string().nullish(),
        fatherEmail: z.string().optional().nullable().refine(
          (val) => !val || val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
          { message: "Invalid email format" }
        ),
        fatherAadharNumber: z.string().nullish(),
        motherName: z.string().nullish(),
        motherDob: z.date().nullish(),
        motherOccupation: z.string().nullish(),
        motherMobile: z.string().nullish(),
        motherEmail: z.string().optional().nullable().refine(
          (val) => !val || val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
          { message: "Invalid email format" }
        ),
        motherAadharNumber: z.string().nullish(),
        guardianName: z.string().nullish(),
        guardianDob: z.date().nullish(),
        guardianOccupation: z.string().nullish(),
        guardianMobile: z.string().nullish(),
        guardianEmail: z.string().optional().nullable().refine(
          (val) => !val || val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
          { message: "Invalid email format" }
        ),
        guardianAadharNumber: z.string().nullish(),
        religion: z.string().optional().nullish(),
        nationality: z.string().optional().nullish(),
        caste: z.string().optional().nullish(),
        aadharNumber: z.string().optional().nullish(),
        udiseId: z.string().optional().nullish(),
        cbse10RollNumber: z.string().optional().nullish(),
        cbse12RollNumber: z.string().optional().nullish(),
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
        fatherAadharNumber,
        motherName,
        motherDob,
        motherOccupation,
        motherMobile,
        motherEmail,
        motherAadharNumber,
        guardianName,
        guardianDob,
        guardianOccupation,
        guardianMobile,
        guardianEmail,
        guardianAadharNumber,
        phone,
        sessionId, // Extract sessionId so it doesn't go into studentData
        ...studentData
      } = input;

      // Get branch code for Clerk user creation
      const branch = await ctx.db.branch.findUnique({
        where: { id: input.branchId },
        select: { code: true },
      });

      if (!branch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Branch not found",
        });
      }

      // Create Clerk user accounts - STUDENT FIRST, THEN PARENT
      let clerkStudentId: string | null = null;
      let clerkParentId: string | null = null;

      // Generate student username and password if not provided
      let finalStudentUsername = username;
      let finalStudentPassword = password;

      if (!finalStudentUsername || !finalStudentPassword) {
        const emailDomain =
          branch.code === "PS"
            ? "ps.tsh.edu.in"
            : branch.code === "JUN"
              ? "jun.tsh.edu.in"
              : branch.code === "MAJ"
                ? "majra.tsh.edu.in"
                : "tsh.edu.in";

        finalStudentUsername =
          finalStudentUsername || `${input.admissionNumber}@${emailDomain}`;
        finalStudentPassword =
          finalStudentPassword ||
          (branch.code === "PS"
            ? "TSHPS@12345"
            : branch.code === "JUN"
              ? "TSHJ@12345"
              : branch.code === "MAJ"
                ? "TSHM@12345"
                : "TSH@12345");

        console.log(
          `Auto-generated STUDENT credentials: username=${finalStudentUsername}`,
        );
      }

      // STEP 1: Create Clerk user for STUDENT
      console.log("=== STEP 1: CREATING STUDENT CLERK USER ===");
      console.log("Student Clerk creation check:", {
        finalStudentUsername,
        hasPassword: !!finalStudentPassword,
        admissionNumber: input.admissionNumber,
        branchCode: branch.code,
        firstName: input.firstName,
        lastName: input.lastName,
      });

      if (finalStudentUsername && finalStudentPassword) {
        try {
          const studentUser = await createStudentUser({
            firstName: input.firstName,
            lastName: input.lastName,
            username: finalStudentUsername,
            password: finalStudentPassword,
            branchCode: branch.code,
            branchId: input.branchId,
          });
          clerkStudentId = studentUser.id;
          console.log(
            "✅ SUCCESS: Created Clerk user for STUDENT:",
            clerkStudentId,
          );
        } catch (error) {
          console.error(
            "❌ ERROR: Failed to create Clerk user for STUDENT:",
            error,
          );
        }
      }

      // Generate parent username and password if not provided
      let finalParentUsername = parentUsername;
      let finalParentPassword = parentPassword;

      if (!finalParentUsername || !finalParentPassword) {
        finalParentUsername =
          finalParentUsername || `P${input.admissionNumber}`;
        finalParentPassword =
          finalParentPassword ||
          (branch.code === "PS"
            ? "TSHPS@12345"
            : branch.code === "JUN"
              ? "TSHJ@12345"
              : branch.code === "MAJ"
                ? "TSHM@12345"
                : "TSH@12345");

        console.log(
          `Auto-generated PARENT credentials: username=${finalParentUsername}`,
        );
      }

      // STEP 2: Create Clerk user for PARENT
      console.log("=== STEP 2: CREATING PARENT CLERK USER ===");
      console.log("Parent Clerk creation check:", {
        finalParentUsername,
        hasPassword: !!finalParentPassword,
        fatherName,
        motherName,
        guardianName,
      });

      if (finalParentUsername && finalParentPassword) {
        try {
          // Extract parent name with proper first/last name splitting
          let parentFirstName = "";
          let parentLastName = input.lastName; // Default to student's last name

          if (fatherName) {
            // Split father's name into first and last parts
            const fatherNameParts = fatherName.trim().split(/\s+/);
            parentFirstName = fatherNameParts[0] || fatherName;
            if (fatherNameParts.length > 1) {
              parentLastName = fatherNameParts.slice(1).join(" ");
            }
          } else if (motherName) {
            // Split mother's name into first and last parts
            const motherNameParts = motherName.trim().split(/\s+/);
            parentFirstName = motherNameParts[0] || motherName;
            if (motherNameParts.length > 1) {
              parentLastName = motherNameParts.slice(1).join(" ");
            }
          } else if (guardianName) {
            // Split guardian's name into first and last parts
            const guardianNameParts = guardianName.trim().split(/\s+/);
            parentFirstName = guardianNameParts[0] || guardianName;
            if (guardianNameParts.length > 1) {
              parentLastName = guardianNameParts.slice(1).join(" ");
            }
          } else {
            // Fallback to student's name if no parent names provided
            parentFirstName = input.firstName;
            parentLastName = input.lastName;
          }

          const parentEmail = fatherEmail || motherEmail || guardianEmail;

          const parentUser = await createParentUser({
            firstName: parentFirstName,
            lastName: parentLastName,
            username: finalParentUsername,
            password: finalParentPassword,
            email: parentEmail || "",
            branchId: input.branchId,
          });
          clerkParentId = parentUser.id;
          console.log(
            "✅ SUCCESS: Created Clerk user for PARENT:",
            clerkParentId,
          );
        } catch (error) {
          console.error(
            "❌ ERROR: Failed to create Clerk user for PARENT:",
            error,
          );
        }
      }

      // Create parent record with required fields
      const parentData = await ctx.db.parent.create({
        data: {
          fatherName: fatherName ?? null,
          fatherDob: fatherDob ?? null,
          fatherOccupation: fatherOccupation ?? null,
          fatherMobile: fatherMobile ?? null,
          fatherEmail: fatherEmail ?? null,
          fatherAadharNumber: fatherAadharNumber ?? null,
          motherName: motherName ?? null,
          motherDob: motherDob ?? null,
          motherOccupation: motherOccupation ?? null,
          motherMobile: motherMobile ?? null,
          motherEmail: motherEmail ?? null,
          motherAadharNumber: motherAadharNumber ?? null,
          guardianName: guardianName ?? null,
          guardianDob: guardianDob ?? null,
          guardianOccupation: guardianOccupation ?? null,
          guardianMobile: guardianMobile ?? null,
          guardianEmail: guardianEmail ?? null,
          guardianAadharNumber: guardianAadharNumber ?? null,
          parentAnniversary: null,
          monthlyIncome: null,
          clerkId: clerkParentId,
        } as Prisma.ParentCreateInput,
      });

      // Create student with parent reference
      const student = await ctx.db.student.create({
        data: {
          ...studentData,
          phone,
          parentId: parentData.id,
          username: finalStudentUsername,
          password: finalStudentPassword,
          clerkId: clerkStudentId,
          firstJoinedSessionId: sessionId, // Set the session they first joined
          ...(siblings?.length
            ? {
                siblings: {
                  connect: siblings.map((id) => ({ id })),
                },
              }
            : {}),
        },
        include: {
          section: {
            include: {
              class: true,
            },
          },
          parent: true,
        },
      });

      // Create Academic Record for the current session if sectionId is provided
      if (student.sectionId) {
        const currentSession = await ctx.db.academicSession.findFirst({
          where: { isActive: true },
        });

        if (currentSession && student.section?.class?.id) {
          try {
            await ctx.db.academicRecord.create({
              data: {
                studentId: student.id,
                sessionId: currentSession.id,
                classId: student.section.class.id,
                status: "ENROLLED",
              },
            });
            console.log(
              `Created AcademicRecord for student ${student.firstName} ${student.lastName}`,
            );
          } catch (error) {
            console.error(`Failed to create AcademicRecord:`, error);
          }
        }
      }

      return student;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        admissionNumber: z.string().min(1).optional(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        dateOfBirth: z
          .string()
          .optional()
          .transform((val) => (val ? new Date(val) : undefined)),
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
        sectionId: z.string().optional(),
        parentId: z.string().optional(),
        dateOfAdmission: z
          .string()
          .optional()
          .transform((val) => (val ? new Date(val) : undefined)),
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
        // Parent information
        fatherName: z.string().optional(),
        fatherDob: z
          .string()
          .optional()
          .transform((val) => (val ? new Date(val) : undefined)),
        fatherEducation: z.string().optional(),
        fatherOccupation: z.string().optional(),
        fatherMobile: z.string().optional(),
        fatherEmail: z.string().optional().nullable().refine(
          (val) => !val || val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
          { message: "Invalid email format" }
        ),
        fatherAadharNumber: z.string().optional(),
        motherName: z.string().optional(),
        motherDob: z
          .string()
          .optional()
          .transform((val) => (val ? new Date(val) : undefined)),
        motherEducation: z.string().optional(),
        motherOccupation: z.string().optional(),
        motherMobile: z.string().optional(),
        motherEmail: z.string().optional().nullable().refine(
          (val) => !val || val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
          { message: "Invalid email format" }
        ),
        motherAadharNumber: z.string().optional(),
        guardianName: z.string().optional(),
        guardianDob: z
          .string()
          .optional()
          .transform((val) => (val ? new Date(val) : undefined)),
        guardianEducation: z.string().optional(),
        guardianOccupation: z.string().optional(),
        guardianMobile: z.string().optional(),
        guardianEmail: z.string().optional().nullable().refine(
          (val) => !val || val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
          { message: "Invalid email format" }
        ),
        guardianAadharNumber: z.string().optional(),
        parentAnniversary: z
          .string()
          .optional()
          .transform((val) => (val ? new Date(val) : undefined)),
        monthlyIncome: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log("🔄 Student update mutation called");
      console.log("📋 Input received:", input);

      const {
        id,
        // Extract parent fields
        fatherName,
        fatherDob,
        fatherEducation,
        fatherOccupation,
        fatherMobile,
        fatherEmail,
        fatherAadharNumber,
        motherName,
        motherDob,
        motherEducation,
        motherOccupation,
        motherMobile,
        motherEmail,
        motherAadharNumber,
        guardianName,
        guardianDob,
        guardianEducation,
        guardianOccupation,
        guardianMobile,
        guardianEmail,
        guardianAadharNumber,
        parentAnniversary,
        monthlyIncome,
        // Rest are student fields
        ...studentData
      } = input;

      console.log("👨‍👩‍👧‍👦 Parent fields extracted:", {
        fatherName,
        motherName,
        guardianName,
        fatherEmail,
        motherEmail,
        guardianEmail,
      });
      console.log("👤 Student data extracted:", studentData);

      const student = await ctx.db.student.findUnique({
        where: { id },
        include: { parent: true },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      console.log("👤 Found student:", {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        parentId: student.parentId,
        hasParent: !!student.parent,
      });

      if (studentData.admissionNumber) {
        const existingStudent = await ctx.db.student.findFirst({
          where: {
            admissionNumber: studentData.admissionNumber,
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

      // Use transaction to update both student and parent
      return ctx.db.$transaction(async (prisma) => {
        console.log("🔄 Starting transaction");

        // Update parent data if parentId exists and parent fields are provided
        if (student.parentId) {
          console.log(
            "👨‍👩‍👧‍👦 Processing parent update for parentId:",
            student.parentId,
          );

          const parentUpdateData: any = {};

          // Only include fields that are provided (not undefined)
          if (fatherName !== undefined)
            parentUpdateData.fatherName = fatherName;
          if (fatherDob !== undefined) parentUpdateData.fatherDob = fatherDob;
          if (fatherEducation !== undefined)
            parentUpdateData.fatherEducation = fatherEducation;
          if (fatherOccupation !== undefined)
            parentUpdateData.fatherOccupation = fatherOccupation;
          if (fatherMobile !== undefined)
            parentUpdateData.fatherMobile = fatherMobile;
          if (fatherEmail !== undefined)
            parentUpdateData.fatherEmail = fatherEmail;
          if (fatherAadharNumber !== undefined)
            parentUpdateData.fatherAadharNumber = fatherAadharNumber;
          if (motherName !== undefined)
            parentUpdateData.motherName = motherName;
          if (motherDob !== undefined) parentUpdateData.motherDob = motherDob;
          if (motherEducation !== undefined)
            parentUpdateData.motherEducation = motherEducation;
          if (motherOccupation !== undefined)
            parentUpdateData.motherOccupation = motherOccupation;
          if (motherMobile !== undefined)
            parentUpdateData.motherMobile = motherMobile;
          if (motherEmail !== undefined)
            parentUpdateData.motherEmail = motherEmail;
          if (motherAadharNumber !== undefined)
            parentUpdateData.motherAadharNumber = motherAadharNumber;
          if (guardianName !== undefined)
            parentUpdateData.guardianName = guardianName;
          if (guardianDob !== undefined)
            parentUpdateData.guardianDob = guardianDob;
          if (guardianEducation !== undefined)
            parentUpdateData.guardianEducation = guardianEducation;
          if (guardianOccupation !== undefined)
            parentUpdateData.guardianOccupation = guardianOccupation;
          if (guardianMobile !== undefined)
            parentUpdateData.guardianMobile = guardianMobile;
          if (guardianEmail !== undefined)
            parentUpdateData.guardianEmail = guardianEmail;
          if (guardianAadharNumber !== undefined)
            parentUpdateData.guardianAadharNumber = guardianAadharNumber;
          if (parentAnniversary !== undefined)
            parentUpdateData.parentAnniversary = parentAnniversary;
          if (monthlyIncome !== undefined)
            parentUpdateData.monthlyIncome = monthlyIncome;

          console.log("📝 Parent update data:", parentUpdateData);
          console.log(
            "📊 Parent fields to update count:",
            Object.keys(parentUpdateData).length,
          );

          // Update parent if there's any parent data to update
          if (Object.keys(parentUpdateData).length > 0) {
            console.log("✅ Updating parent with data:", parentUpdateData);
            await prisma.parent.update({
              where: { id: student.parentId },
              data: parentUpdateData,
            });
            console.log("✅ Parent updated successfully");
          } else {
            console.log("ℹ️ No parent data to update");
          }
        } else {
          console.log("⚠️ Student has no parentId, skipping parent update");
        }

        console.log("👤 Updating student with data:", studentData);
        // Update student data
        const updatedStudent = await prisma.student.update({
          where: { id },
          data: studentData,
        });
        console.log("✅ Student updated successfully");

        return updatedStudent;
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.db.student.findUnique({
        where: { id: input.id },
        include: { parent: true },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      return ctx.db.$transaction(async (prisma) => {
        await prisma.academicRecord.deleteMany({
          where: { studentId: input.id },
        });

        await prisma.studentAttendance.deleteMany({
          where: { studentId: input.id },
        });

        await prisma.moneyCollectionItem.deleteMany({
          where: { studentId: input.id },
        });

        // Delete Supabase users
        if (student.clerkId) {
          try {
            await deleteUser(student.clerkId);
          } catch (error) {
            console.error(`Error deleting Supabase user for student:`, error);
          }
        }

        if (student.parent?.clerkId) {
          try {
            await deleteUser(student.parent.clerkId);
          } catch (error) {
            console.error(`Error deleting Supabase user for parent:`, error);
          }
        }

        if (student.parentId) {
          await prisma.parent.delete({
            where: { id: student.parentId },
          });
        }

        return prisma.student.delete({
          where: { id: input.id },
        });
      });
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      if (!input.ids || input.ids.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No student IDs provided for deletion.",
        });
      }

      const students = await ctx.db.student.findMany({
        where: { id: { in: input.ids } },
        include: { parent: true },
      });

      const foundIds = students.map((s) => s.id);
      const notFoundIds = input.ids.filter((id) => !foundIds.includes(id));

      if (notFoundIds.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Some students not found: ${notFoundIds.join(", ")}`,
        });
      }

      return ctx.db.$transaction(async (prisma) => {
        await prisma.academicRecord.deleteMany({
          where: { studentId: { in: input.ids } },
        });

        await prisma.studentAttendance.deleteMany({
          where: { studentId: { in: input.ids } },
        });

        await prisma.moneyCollectionItem.deleteMany({
          where: { studentId: { in: input.ids } },
        });

        // Delete Clerk users
        for (const student of students) {
          if (student.clerkId) {
            try {
              await deleteUser(student.clerkId);
            } catch (error) {
              console.error(`Error deleting Supabase user for student:`, error);
            }
          }

          if (student.parent?.clerkId) {
            try {
              await deleteUser(student.parent.clerkId);
            } catch (error) {
              console.error(`Error deleting Supabase user for parent:`, error);
            }
          }
        }

        const parentIds = students
          .map((s) => s.parentId)
          .filter(Boolean) as string[];
        if (parentIds.length > 0) {
          await prisma.parent.deleteMany({
            where: { id: { in: parentIds } },
          });
        }

        const deleteResult = await prisma.student.deleteMany({
          where: { id: { in: input.ids } },
        });
        return { count: deleteResult.count };
      });
    }),

  bulkUpdateClass: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        sectionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sectionExists = await ctx.db.section.findUnique({
        where: { id: input.sectionId },
      });

      if (!sectionExists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Section not found",
        });
      }

      return ctx.db.student.updateMany({
        where: { id: { in: input.ids } },
        data: { sectionId: input.sectionId },
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
        where: { id: { in: input.ids } },
        data: { 
          status: input.isActive ? "ACTIVE" : "INACTIVE",
          // Also update legacy field for backward compatibility during transition
          isActive: input.isActive 
        },
      });
    }),

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

      if (!searchTerm.trim()) {
        return [];
      }

      const whereClause: Prisma.StudentWhereInput = {
        OR: [
          { admissionNumber: { contains: searchTerm, mode: "insensitive" } },
          { firstName: { contains: searchTerm, mode: "insensitive" } },
          { lastName: { contains: searchTerm, mode: "insensitive" } },
        ],
        ...(excludeStudentId ? { NOT: { id: excludeStudentId } } : {}),
        ...(branchId ? { branchId } : {}),
        status: "ACTIVE",
      };

      const students = await ctx.db.student.findMany({
        where: whereClause,
        take: limit,
        include: {
          section: {
            include: {
              class: true,
            },
          },
          parent: true,
        },
        orderBy: [{ admissionNumber: "asc" }, { firstName: "asc" }],
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

      const results = await ctx.db.$transaction(
        students.map((student) =>
          ctx.db.student.update({
            where: { id: student.id },
            data: {
              rollNumber: student.rollNumber
                ? parseInt(student.rollNumber)
                : undefined,
            } as Prisma.StudentUpdateInput,
          }),
        ),
      );

      return { count: results.length };
    }),

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
          ...(input.branchId ? { branchId: input.branchId } : {}),
        },
        include: {
          section: {
            include: {
              class: true,
            },
          },
        },
      });

      return student;
    }),

  getSiblings: publicProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const siblingRelationships = await ctx.db.studentSibling.findMany({
        where: { studentId: input.studentId },
        include: {
          sibling: {
            include: {
              section: {
                include: {
                  class: true,
                },
              },
            },
          },
        },
      });

      const siblings = siblingRelationships.map((relationship) => ({
        relationshipId: relationship.id,
        relationshipType: relationship.relationshipType,
        id: relationship.sibling.id,
        firstName: relationship.sibling.firstName,
        lastName: relationship.sibling.lastName,
        admissionNumber: relationship.sibling.admissionNumber,
        isActive: relationship.sibling.isActive,
        className: relationship.sibling.section?.class?.name || null,
        classSection: relationship.sibling.section?.name || null,
      }));

      return siblings;
    }),

  addSibling: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        siblingId: z.string(),
        relationshipType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      const existingRelationship = await ctx.db.studentSibling.findFirst({
        where: {
          OR: [
            { studentId: input.studentId, siblingId: input.siblingId },
            { studentId: input.siblingId, siblingId: input.studentId },
          ],
        },
      });

      if (existingRelationship) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sibling relationship already exists",
        });
      }

      await ctx.db.studentSibling.create({
        data: {
          studentId: input.studentId,
          siblingId: input.siblingId,
          relationshipType: input.relationshipType,
        },
      });

      await ctx.db.studentSibling.create({
        data: {
          studentId: input.siblingId,
          siblingId: input.studentId,
          relationshipType: input.relationshipType,
        },
      });

      return { success: true };
    }),

  removeSibling: protectedProcedure
    .input(z.object({ relationshipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const relationship = await ctx.db.studentSibling.findUnique({
        where: { id: input.relationshipId },
      });

      if (!relationship) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sibling relationship not found",
        });
      }

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

  bulkImport: protectedProcedure
    .input(
      z.object({
        students: z.array(z.record(z.string(), z.any())),
        branchId: z.string(),
        sessionId: z.string(),
        batchSize: z.number().min(1).max(100).optional().default(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { students, branchId, sessionId, batchSize } = input;

      if (!students || students.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No students provided for import",
        });
      }

      // Get branch code for Clerk user creation
      const branch = await ctx.db.branch.findUnique({
        where: { id: branchId },
        select: { code: true },
      });

      if (!branch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Branch not found",
        });
      }

      const importMessages: string[] = [];
      let successCount = 0;
      let errorCount = 0;
      const allProcessedStudents = [];

      // Helper function to create Clerk users outside of database transaction
      const createClerkUsers = async (
        studentData: any,
        studentUsername: string,
        studentPassword: string,
        parentUsername: string,
        parentPassword: string,
      ) => {
        let clerkStudentId: string | null = null;
        let clerkParentId: string | null = null;

        try {
          const studentUser = await createStudentUser({
            firstName: studentData.firstName as string,
            lastName: studentData.lastName as string,
            username: studentUsername,
            password: studentPassword,
            branchCode: branch.code,
            branchId,
          });
          clerkStudentId = studentUser.id;
        } catch (error) {
          // Non-blocking error - continue with import
          console.error(
            `Failed to create Clerk user for student ${studentData.firstName} ${studentData.lastName}:`,
            error,
          );
        }

        try {
          // Extract parent name with proper first/last name splitting
          let parentFirstName = "";
          let parentLastName = studentData.lastName as string;

          if (studentData.fatherName) {
            const fatherNameParts = studentData.fatherName.trim().split(/\s+/);
            parentFirstName = fatherNameParts[0] || studentData.fatherName;
            if (fatherNameParts.length > 1) {
              parentLastName = fatherNameParts.slice(1).join(" ");
            }
          } else if (studentData.motherName) {
            const motherNameParts = studentData.motherName.trim().split(/\s+/);
            parentFirstName = motherNameParts[0] || studentData.motherName;
            if (motherNameParts.length > 1) {
              parentLastName = motherNameParts.slice(1).join(" ");
            }
          } else if (studentData.guardianName) {
            const guardianNameParts = studentData.guardianName
              .trim()
              .split(/\s+/);
            parentFirstName = guardianNameParts[0] || studentData.guardianName;
            if (guardianNameParts.length > 1) {
              parentLastName = guardianNameParts.slice(1).join(" ");
            }
          } else {
            parentFirstName = studentData.firstName as string;
            parentLastName = studentData.lastName as string;
          }

          const parentEmail =
            studentData.fatherEmail ||
            studentData.motherEmail ||
            studentData.guardianEmail;

          const parentUser = await createParentUser({
            firstName: parentFirstName,
            lastName: parentLastName,
            username: parentUsername,
            password: parentPassword,
            email: parentEmail || undefined,
            branchId,
          });
          clerkParentId = parentUser.id;
        } catch (error) {
          // Non-blocking error - continue with import
          console.error(
            `Failed to create Clerk user for parent of ${studentData.firstName} ${studentData.lastName}:`,
            error,
          );
        }

        return { clerkStudentId, clerkParentId };
      };

      // Process students in batches
      const batches = [];
      for (let i = 0; i < students.length; i += batchSize) {
        batches.push(students.slice(i, i + batchSize));
      }

      importMessages.push(
        `[INFO] Processing ${students.length} students in ${batches.length} batches of ${batchSize} each`,
      );

      for (const [batchIndex, batch] of batches.entries()) {
        importMessages.push(
          `[INFO] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} students)`,
        );

        try {
          // Step 1: Pre-process and validate batch data
          const processedBatchData: Array<{
            studentData: any;
            dateOfBirth: Date;
            dateOfAdmission: Date;
            assignedSectionId: string;
            studentUsername: string;
            studentPassword: string;
            parentUsername: string;
            parentPassword: string;
            rowNum: number;
            clerkPromise: Promise<{
              clerkStudentId: string | null;
              clerkParentId: string | null;
            }>;
          }> = [];

          for (const [index, studentData] of batch.entries()) {
            const globalIndex = batchIndex * batchSize + index;
            const rowNum = globalIndex + 1;

            try {
              // Parse dates
              const parseDate = (dateStr: string) => {
                if (!dateStr) return null;
                const parts = dateStr.split("/");
                if (parts.length === 3) {
                  const day = parseInt(parts[0]!, 10);
                  const month = parseInt(parts[1]!, 10) - 1;
                  const year = parseInt(parts[2]!, 10);
                  return new Date(year, month, day);
                }
                return null;
              };

              const dateOfBirth = parseDate(studentData.dateOfBirth as string);
              const dateOfAdmission =
                parseDate(studentData.dateOfAdmission as string) || new Date();

              if (!dateOfBirth) {
                importMessages.push(
                  `[ERROR] Row ${rowNum}: Invalid date of birth format`,
                );
                errorCount++;
                continue;
              }

              // Check for duplicate admission number
              const existingStudent = await ctx.db.student.findFirst({
                where: {
                  admissionNumber: studentData.admissionNumber,
                  branchId,
                },
              });

              if (existingStudent) {
                importMessages.push(
                  `[ERROR] Row ${rowNum}: Student with admission number '${studentData.admissionNumber}' already exists`,
                );
                errorCount++;
                continue;
              }

              // Determine sectionId for the student (same logic as before)
              let assignedSectionId: string | undefined = undefined;

              // Debug: Log the student data for section lookup
              console.log(
                `🔍 DEBUG Row ${rowNum} - ${studentData.firstName} ${studentData.lastName}:`,
                {
                  sectionId: studentData.sectionId,
                  classId: studentData.classId,
                  className: studentData.className,
                  sectionName: studentData.sectionName,
                  branchId: branchId,
                },
              );

              if (studentData.sectionId) {
                console.log(
                  `🔍 Attempting sectionId lookup for: ${studentData.sectionId}`,
                );
                const section = await ctx.db.section.findFirst({
                  where: {
                    id: studentData.sectionId,
                    class: { branchId, isActive: true }, // Removed sessionId requirement
                    isActive: true,
                  },
                });
                console.log(`🔍 Section lookup result:`, section);
                if (section) {
                  assignedSectionId = section.id;
                  console.log(`✅ Found section: ${assignedSectionId}`);
                } else {
                  console.log(
                    `❌ No section found for sectionId: ${studentData.sectionId}`,
                  );
                }
              } else if (studentData.classId) {
                // Workaround: Check if classId is actually a sectionId
                console.log(
                  `🔍 Attempting classId as sectionId lookup for: ${studentData.classId}`,
                );
                const section = await ctx.db.section.findFirst({
                  where: {
                    id: studentData.classId,
                    class: { branchId, isActive: true },
                    isActive: true,
                  },
                });
                console.log(`🔍 ClassId as sectionId lookup result:`, section);
                if (section) {
                  assignedSectionId = section.id;
                  console.log(
                    `✅ Found section using classId: ${assignedSectionId}`,
                  );
                } else {
                  console.log(
                    `❌ ClassId is not a valid sectionId, trying as actual classId...`,
                  );
                  // Original classId logic
                  const sectionByClass = await ctx.db.section.findFirst({
                    where: {
                      classId: studentData.classId,
                      class: { branchId, isActive: true },
                    },
                  });
                  if (sectionByClass) {
                    assignedSectionId = sectionByClass.id;
                    console.log(
                      `✅ Found section by classId: ${assignedSectionId}`,
                    );
                  }
                }
              } else {
                console.log(`❌ No sectionId provided in student data`);
              }

              if (
                !assignedSectionId &&
                studentData.className &&
                studentData.sectionName
              ) {
                const section = await ctx.db.section.findFirst({
                  where: {
                    name: studentData.sectionName,
                    class: {
                      name: studentData.className,
                      branchId,
                      isActive: true,
                    },
                    isActive: true,
                  },
                });
                if (section) {
                  assignedSectionId = section.id;
                }
              }

              if (!assignedSectionId && studentData.className) {
                const section = await ctx.db.section.findFirst({
                  where: {
                    class: {
                      name: studentData.className,
                      branchId,
                      isActive: true,
                    },
                    isActive: true,
                  },
                  orderBy: { name: "asc" },
                });
                if (section) {
                  assignedSectionId = section.id;
                }
              }

              if (!assignedSectionId) {
                importMessages.push(
                  `[ERROR] Row ${rowNum}: Could not determine section for student ${studentData.firstName} ${studentData.lastName}`,
                );
                errorCount++;
                continue;
              }

              // Generate credentials
              const emailDomain =
                branch.code === "PS"
                  ? "ps.tsh.edu.in"
                  : branch.code === "JUN"
                    ? "jun.tsh.edu.in"
                    : branch.code === "MAJ"
                      ? "majra.tsh.edu.in"
                      : "tsh.edu.in";

              const studentUsername =
                studentData.username ||
                `${studentData.admissionNumber}@${emailDomain}`;
              const studentPassword =
                studentData.password ||
                (branch.code === "PS"
                  ? "TSHPS@12345"
                  : branch.code === "JUN"
                    ? "TSHJ@12345"
                    : branch.code === "MAJ"
                      ? "TSHM@12345"
                      : "TSH@12345");

              const parentUsername =
                studentData.parentUsername || `P${studentData.admissionNumber}`;
              const parentPassword =
                studentData.parentPassword || studentPassword;

              // Step 2: Create Clerk users outside transaction (parallel for batch)
              const clerkPromises = createClerkUsers(
                studentData,
                studentUsername,
                studentPassword,
                parentUsername,
                parentPassword,
              );

              processedBatchData.push({
                studentData,
                dateOfBirth,
                dateOfAdmission,
                assignedSectionId,
                studentUsername,
                studentPassword,
                parentUsername,
                parentPassword,
                rowNum,
                clerkPromise: clerkPromises,
              });
            } catch (error) {
              importMessages.push(
                `[ERROR] Row ${rowNum}: Failed to process student data - ${error}`,
              );
              errorCount++;
            }
          }

          // Step 3: Wait for all Clerk user creations to complete
          const clerkResults = await Promise.allSettled(
            processedBatchData.map((item) => item.clerkPromise),
          );

          // Step 4: Process database operations in a transaction with increased timeout
          const batchResults = await ctx.db.$transaction(
            async (prisma) => {
              const processedStudents = [];

              for (const [index, item] of processedBatchData.entries()) {
                try {
                  const clerkResult = clerkResults[index];
                  let clerkStudentId: string | null = null;
                  let clerkParentId: string | null = null;

                  if (clerkResult?.status === "fulfilled") {
                    clerkStudentId = clerkResult.value.clerkStudentId;
                    clerkParentId = clerkResult.value.clerkParentId;
                  }

                  // Create parent record
                  const parentData = await prisma.parent.create({
                    data: {
                      fatherName: item.studentData.fatherName || null,
                      fatherDob: item.studentData.fatherDob
                        ? item.dateOfBirth
                        : null,
                      fatherOccupation:
                        item.studentData.fatherOccupation || null,
                      fatherMobile: item.studentData.fatherMobile || null,
                      fatherEmail: item.studentData.fatherEmail || null,
                      fatherAadharNumber:
                        item.studentData.fatherAadharNumber ?? null,
                      motherName: item.studentData.motherName || null,
                      motherDob: item.studentData.motherDob
                        ? item.dateOfBirth
                        : null,
                      motherOccupation:
                        item.studentData.motherOccupation || null,
                      motherMobile: item.studentData.motherMobile || null,
                      motherEmail: item.studentData.motherEmail || null,
                      motherAadharNumber:
                        item.studentData.motherAadharNumber ?? null,
                      guardianName: item.studentData.guardianName || null,
                      guardianDob: item.studentData.guardianDob
                        ? item.dateOfBirth
                        : null,
                      guardianOccupation:
                        item.studentData.guardianOccupation || null,
                      guardianMobile: item.studentData.guardianMobile || null,
                      guardianEmail: item.studentData.guardianEmail || null,
                      guardianAadharNumber:
                        item.studentData.guardianAadharNumber ?? null,
                      parentAnniversary: null,
                      monthlyIncome: null,
                      clerkId: clerkParentId,
                    },
                  });

                  // Create student record
                  const student = await prisma.student.create({
                    data: {
                      admissionNumber: item.studentData.admissionNumber,
                      firstName: item.studentData.firstName,
                      lastName: item.studentData.lastName,
                      dateOfBirth: item.dateOfBirth,
                      dateOfAdmission: item.dateOfAdmission,
                      gender: item.studentData.gender,
                      email: item.studentData.email || null,
                      personalEmail: item.studentData.personalEmail || null,
                      phone: item.studentData.phone || null,
                      address: item.studentData.address || null,
                      permanentAddress:
                        item.studentData.permanentAddress || null,
                      permanentCity: item.studentData.permanentCity || null,
                      permanentState: item.studentData.permanentState || null,
                      permanentCountry:
                        item.studentData.permanentCountry || null,
                      permanentZipCode:
                        item.studentData.permanentZipCode || null,
                      correspondenceAddress:
                        item.studentData.correspondenceAddress || null,
                      correspondenceCity:
                        item.studentData.correspondenceCity || null,
                      correspondenceState:
                        item.studentData.correspondenceState || null,
                      correspondenceCountry:
                        item.studentData.correspondenceCountry || null,
                      correspondenceZipCode:
                        item.studentData.correspondenceZipCode || null,
                      previousSchool: item.studentData.previousSchool || null,
                      lastClassAttended:
                        item.studentData.lastClassAttended || null,
                      mediumOfInstruction:
                        item.studentData.mediumOfInstruction || null,
                      recognisedByStateBoard:
                        item.studentData.recognisedByStateBoard || false,
                      schoolCity: item.studentData.schoolCity || null,
                      schoolState: item.studentData.schoolState || null,
                      reasonForLeaving:
                        item.studentData.reasonForLeaving || null,
                      bloodGroup: item.studentData.bloodGroup || null,
                      branchId,
                      sectionId: item.assignedSectionId,
                      parentId: parentData.id,
                      username: item.studentUsername,
                      password: item.studentPassword,
                      clerkId: clerkStudentId,
                      firstJoinedSessionId: sessionId, // Set the session they first joined
                      isActive: true,
                      religion: item.studentData.religion || null,
                      nationality: item.studentData.nationality || null,
                      caste: item.studentData.caste || null,
                      aadharNumber: item.studentData.aadharNumber || null,
                      udiseId: item.studentData.udiseId || null,
                      cbse10RollNumber:
                        item.studentData.cbse10RollNumber || null,
                      cbse12RollNumber:
                        item.studentData.cbse12RollNumber || null,
                    },
                    include: {
                      section: {
                        include: {
                          class: true,
                        },
                      },
                    },
                  });

                  // Create Academic Record for the current session
                  if (student.sectionId) {
                    await prisma.academicRecord.create({
                      data: {
                        studentId: student.id,
                        sessionId,
                        classId: student.sectionId,
                        status: "ENROLLED",
                      },
                    });
                  }

                  processedStudents.push(student);
                  successCount++;
                  importMessages.push(
                    `[SUCCESS] Row ${item.rowNum}: Successfully imported ${item.studentData.firstName} ${item.studentData.lastName}`,
                  );
                } catch (error) {
                  importMessages.push(
                    `[ERROR] Row ${item.rowNum}: Failed to import student - ${error}`,
                  );
                  errorCount++;
                }
              }

              return processedStudents;
            },
            {
              maxWait: 30000, // 30 seconds max wait
              timeout: 20000, // 20 seconds timeout per batch
            },
          );

          allProcessedStudents.push(...batchResults);
          importMessages.push(
            `[INFO] Batch ${batchIndex + 1} completed: ${batchResults.length} students processed`,
          );
        } catch (error) {
          importMessages.push(
            `[ERROR] Batch ${batchIndex + 1} failed: ${error}`,
          );
          // Continue with next batch instead of failing entirely
        }
      }

      importMessages.push(
        `[SUMMARY] Import completed: ${successCount} successful, ${errorCount} errors`,
      );

      return {
        count: successCount,
        errors: errorCount,
        importMessages,
        students: allProcessedStudents,
      };
    }),

  getNextAdmissionNumber: publicProcedure
    .input(
      z.object({
        branchId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      console.log(
        "🔍 Getting next admission number for branch:",
        input.branchId,
      );
      const startTime = Date.now();

      // Get branch information
      const branch = await ctx.db.branch.findUnique({
        where: { id: input.branchId },
        select: { code: true, name: true },
      });

      if (!branch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Branch not found",
        });
      }

      console.log("🏢 Branch found:", branch);

      // Generate prefix based on branch code
      let prefix = "";
      if (branch.code === "PS" || branch.name.includes("Paonta Sahib")) {
        prefix = "1000";
      } else if (branch.code === "JUN" || branch.name.includes("Juniors")) {
        prefix = "2000";
      } else if (branch.code === "MAJ" || branch.name.includes("Majra")) {
        prefix = "3000";
      } else {
        // Default prefix if branch doesn't match
        prefix = "4000";
      }

      console.log("🏷️  Generated prefix:", prefix);

      // OPTIMIZED: Use more efficient query with proper indexing
      // Instead of LIKE with startsWith, use >= and < for better index usage
      const lastStudent = await ctx.db.student.findFirst({
        where: {
          branchId: input.branchId,
          admissionNumber: {
            gte: prefix + "0000", // Greater than or equal to prefix + 0000
            lt: prefix + "9999", // Less than prefix + 9999
          },
        },
        orderBy: {
          admissionNumber: "desc",
        },
        select: {
          admissionNumber: true,
        },
      });

      console.log("👥 Last student found:", lastStudent);

      let nextNumber: string;

      if (!lastStudent) {
        // This is the first student, start with prefix + 0001
        nextNumber = `${prefix}0001`;
        console.log("🎯 First student - generated:", nextNumber);
      } else {
        // Extract the numeric part from the last admission number
        const lastNumber = lastStudent.admissionNumber;
        const numericPart = lastNumber.replace(prefix, "");

        // Convert to number, increment, and pad with zeros
        const nextNumericValue = parseInt(numericPart) + 1;
        const paddedNext = nextNumericValue.toString().padStart(4, "0");
        nextNumber = `${prefix}${paddedNext}`;
        console.log("🔢 Incremented from", lastNumber, "to", nextNumber);
      }

      const result = {
        nextAdmissionNumber: nextNumber,
        prefix,
        branchCode: branch.code,
        branchName: branch.name,
      };

      const endTime = Date.now();
      console.log(
        `✅ getNextAdmissionNumber completed in ${endTime - startTime}ms`,
      );
      console.log("✅ Final result:", result);
      return result;
    }),

  getByClassAndSection: publicProcedure
    .input(
      z.object({
        classId: z.string(),
        sectionId: z.string().optional().nullable(),
        branchId: z.string(),
        sessionId: z.string().optional().nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { classId, sectionId, branchId, sessionId } = input;

      const whereClause: Prisma.StudentWhereInput = {
        branchId,
        status: "ACTIVE",
        ...(sectionId && sectionId !== "all" ? { sectionId } : {}),
        ...(sessionId
          ? {
              academicRecords: {
                some: {
                  sessionId,
                  classId,
                },
              },
            }
          : {
              section: {
                classId,
              },
            }),
      };

      const students = await ctx.db.student.findMany({
        where: whereClause,
        include: {
          section: {
            include: {
              class: true,
            },
          },
          academicRecords: {
            include: {
              session: true,
            },
          },
          parent: true,
        },
        orderBy: [{ rollNumber: "asc" }, { firstName: "asc" }],
      });

      return students;
    }),

  getStudentsWithScores: publicProcedure
    .input(
      z.object({
        studentIds: z.array(z.string()),
        termIds: z.array(z.string()),
        branchId: z.string(),
        sessionId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { studentIds, termIds, branchId, sessionId } = input;

      if (studentIds.length === 0) {
        return [];
      }

      // Fetch students with their basic info and parent details
      const students = await ctx.db.student.findMany({
        where: {
          id: { in: studentIds },
          branchId,
          isActive: true,
        },
        include: {
          section: {
            include: {
              class: true,
            },
          },
          parent: {
            select: {
              fatherName: true,
              motherName: true,
              guardianName: true,
            },
          },
          academicRecords: {
            where: {
              sessionId,
            },
            include: {
              session: true,
            },
          },
        },
      });

      // For now, return students with empty assessment scores
      // This can be enhanced later when the assessment schema is better understood
      const studentsWithScores = students.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        fatherName: student.parent?.fatherName,
        motherName: student.parent?.motherName,
        guardianName: student.parent?.guardianName,
        dateOfBirth: student.dateOfBirth,
        assessmentScores: [], // Empty for now - can be populated later
      }));

      return studentsWithScores;
    }),
});

// Helper function to calculate grade based on percentage
function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C+";
  if (percentage >= 40) return "C";
  if (percentage >= 33) return "D";
  return "F";
}