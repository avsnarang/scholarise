import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";
import { createTeacherUser } from "@/utils/clerk";

export const teacherRouter = createTRPCRouter({
  getStats: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Use a single query with Prisma's aggregation to get all counts at once
      // This is much faster than multiple separate count queries
      const [teacherCounts, classAssignments] = await Promise.all([
        // Get all teacher counts in a single query with aggregation
        ctx.db.$queryRaw`
          SELECT
            COUNT(*) AS "totalTeachers",
            SUM(CASE WHEN "isActive" = true THEN 1 ELSE 0 END) AS "activeTeachers",
            SUM(CASE WHEN "isActive" = false THEN 1 ELSE 0 END) AS "inactiveTeachers"
          FROM "Teacher"
          WHERE (${input?.branchId}::text IS NULL OR "branchId" = ${input?.branchId}::text)
        ` as unknown as Array<{
          totalTeachers: bigint;
          activeTeachers: bigint;
          inactiveTeachers: bigint;
        }>,

        // Get class assignments in parallel
        ctx.db.class.groupBy({
          by: ['teacherId'],
          where: {
            branchId: input?.branchId,
            teacherId: { not: null },
          },
          _count: true,
        })
      ]);

      // Extract counts from the raw query result
      const counts = teacherCounts[0] || {
        totalTeachers: 0n,
        activeTeachers: 0n,
        inactiveTeachers: 0n
      };

      // Count teachers with classes
      const teachersWithClasses = classAssignments.length;

      // Convert bigint to number and calculate derived stats
      const activeTeachersCount = Number(counts.activeTeachers);

      return {
        totalTeachers: Number(counts.totalTeachers),
        activeTeachers: activeTeachersCount,
        inactiveTeachers: Number(counts.inactiveTeachers),
        teachersWithClasses,
        teachersWithoutClasses: activeTeachersCount - teachersWithClasses,
      };
    }),

  getAll: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        isActive: z.boolean().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        cursor: z.string().optional(),
        // Advanced filters
        advancedFilters: z.object({
          conditions: z.array(
            z.object({
              id: z.string(),
              field: z.string(),
              operator: z.string(),
              value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
            })
          ),
          logicOperator: z.enum(["and", "or"]),
        }).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;

      // Build the where clause dynamically to avoid type issues
      let whereClause: any = {
        branchId: input?.branchId,
        isActive: input?.isActive,
      };

      // Add search conditions if search is provided
      if (input?.search) {
        whereClause.OR = [
          { firstName: { contains: input.search, mode: "insensitive" } },
          { lastName: { contains: input.search, mode: "insensitive" } },
          { qualification: { contains: input.search, mode: "insensitive" } },
          { specialization: { contains: input.search, mode: "insensitive" } },
        ];
      }

      // Handle advanced filters
      if (input?.advancedFilters && input.advancedFilters.conditions.length > 0) {
        const { conditions, logicOperator } = input.advancedFilters;

        // Create filter conditions
        const filterConditions = conditions.map(condition => {
          const { field, operator, value } = condition;

          // Handle different operators
          switch (operator) {
            case "equals":
              return { [field]: value };
            case "not_equals":
              return { [field]: { not: value } };
            case "contains":
              return { [field]: { contains: String(value), mode: "insensitive" } };
            case "not_contains":
              return { [field]: { not: { contains: String(value), mode: "insensitive" } } };
            case "starts_with":
              return { [field]: { startsWith: String(value), mode: "insensitive" } };
            case "ends_with":
              return { [field]: { endsWith: String(value), mode: "insensitive" } };
            case "is_empty":
              return { [field]: null };
            case "is_not_empty":
              return { [field]: { not: null } };
            case "greater_than":
              return { [field]: { gt: value } };
            case "less_than":
              return { [field]: { lt: value } };
            case "greater_than_or_equal":
              return { [field]: { gte: value } };
            case "less_than_or_equal":
              return { [field]: { lte: value } };
            default:
              return {};
          }
        });

        // Add the conditions to the where clause using AND or OR
        if (logicOperator === "and") {
          whereClause.AND = filterConditions;
        } else {
          whereClause.OR = filterConditions;
        }
      }

      const teachers = await ctx.db.teacher.findMany({
        take: limit + 1,
        where: whereClause,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { lastName: "asc" },
        include: {
          classes: true,
          // user model no longer exists, so we don't include it
        },
      });

      let nextCursor: string | undefined = undefined;
      if (teachers.length > limit) {
        const nextItem = teachers.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: teachers,
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(z.object({
      id: z.string(),
      branchId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const teacher = await ctx.db.teacher.findFirst({
        where: {
          id: input.id,
          // Only return teachers from the current branch if branchId is provided
          ...(input.branchId ? { branchId: input.branchId } : {})
        },
        include: {
          classes: true,
          // user model no longer exists, so we don't include it
        },
      });

      if (!teacher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Teacher not found",
        });
      }

      return teacher;
    }),

  getByUserId: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      console.log("Looking for teacher with userId:", input.userId);
      
      if (!input.userId || input.userId.trim() === "") {
        console.log("Invalid userId provided:", input.userId);
        return null;
      }

      try {
        // Use Prisma's findFirst with a raw filter condition
        const teachers = await ctx.db.$queryRaw`
          SELECT * FROM "Teacher" 
          WHERE "clerkId" = ${input.userId}
          LIMIT 1
        `;
        
        const teacher = Array.isArray(teachers) && teachers.length > 0 ? teachers[0] : null;
        
        console.log("Teacher lookup result:", teacher ? "Found" : "Not found");
        
        if (teacher) {
          // Get classes for this teacher
          const classes = await ctx.db.class.findMany({
            where: {
              teacherId: teacher.id
            }
          });
          
          return {
            ...teacher,
            classes
          };
        }
        
        return null;
      } catch (error) {
        console.error("Error finding teacher by userId:", error);
        return null;
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        employeeCode: z.string().optional(),
        qualification: z.string().optional(),
        specialization: z.string().optional(),
        joinDate: z.date().optional(),
        isActive: z.boolean().optional(),
        branchId: z.string(),
        isHQ: z.boolean().optional(),
        userId: z.string().optional(),
        // User credentials (optional)
        createUser: z.boolean().optional(),
        email: z.string().email().optional(),
        password: z.string().min(8).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Teacher create mutation called with input:", {
          ...input,
          password: input.password ? "********" : undefined, // Mask password for security
        });
        
        // Create a Clerk user account if requested
        let clerkUserId = null;
        if (input.createUser && input.email && input.password) {
          console.log("Attempting to create Clerk user for teacher");
          try {
            // Get branch code for Clerk user creation
            const branch = await ctx.db.branch.findUnique({
              where: { id: input.branchId },
              select: { code: true },
            });

            if (!branch) {
              console.error("Branch not found:", input.branchId);
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Branch not found",
              });
            }

            console.log("Found branch:", branch);

            // Generate a username from the email
            const email = input.email || '';
            
            // Extract part before @ from email or use 'teacher' as fallback
            const emailBase = email.includes('@') 
              ? email.substring(0, email.indexOf('@'))
              : 'teacher';
            
            // Clean up the username (remove special chars)
            const cleanedBase = emailBase.replace(/[^a-zA-Z0-9]/g, '');
            const timestamp = Date.now().toString().slice(-6);
            const username = `${cleanedBase}${timestamp}`;
            
            // Create teacher user in Clerk
            console.log("Calling createTeacherUser with:", {
              firstName: input.firstName,
              lastName: input.lastName,
              email: input.email,
              username: username,
              branchId: input.branchId,
              isHQ: input.isHQ || false,
            });
            
            try {
              const teacherUser = await createTeacherUser({
                firstName: input.firstName,
                lastName: input.lastName,
                email: input.email || '',
                password: input.password || '',
                branchId: input.branchId,
                isHQ: input.isHQ || false,
                username: username, // Pass the generated username
              });

              clerkUserId = teacherUser.id;
              console.log("Created Clerk user for teacher:", clerkUserId);
            } catch (clerkError) {
              console.error("Failed to create Clerk user:", clerkError);
              
              // Format the error message to be more user-friendly
              let errorMessage = "Failed to create user account";
              if (clerkError instanceof Error) {
                errorMessage = clerkError.message;
              }
              
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: errorMessage,
                cause: clerkError,
              });
            }
          } catch (error) {
            console.error("Error creating Clerk user for teacher:", error);
            const errorDetails = error instanceof Error ? 
              { message: error.message, stack: error.stack } : 
              String(error);
            console.error("Error details:", errorDetails);
            
            // If it's already a TRPCError, just rethrow it
            if (error instanceof TRPCError) {
              throw error;
            }
            
            // Otherwise wrap it
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to create user account: ${error instanceof Error ? error.message : String(error)}`,
              cause: error,
            });
          }
        } else {
          console.log("Skipping Clerk user creation as conditions not met:", {
            createUser: input.createUser,
            hasEmail: !!input.email,
            hasPassword: !!input.password,
          });
        }

        console.log("Creating teacher record in database, clerkId:", clerkUserId);
        
        // Create teacher record
        try {
          const newTeacher = await ctx.db.teacher.create({
            data: {
              firstName: input.firstName,
              lastName: input.lastName,
              employeeCode: input.employeeCode,
              qualification: input.qualification,
              specialization: input.specialization,
              joinDate: input.joinDate || new Date(),
              isActive: input.isActive ?? true,
              branchId: input.branchId,
              userId: input.userId,
              // Add clerkId if user was created
              ...(clerkUserId ? { clerkId: clerkUserId } : {}),
            },
          });
          
          console.log("Teacher record created successfully:", newTeacher);
          return newTeacher;
        } catch (dbError) {
          console.error("Database error creating teacher:", dbError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create teacher: ${(dbError as Error).message}`,
          });
        }
      } catch (error) {
        console.error("Unhandled error in create teacher mutation:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Unhandled error: ${error instanceof Error ? error.message : String(error)}`,
          cause: error,
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        employeeCode: z.string().optional(),
        qualification: z.string().optional(),
        specialization: z.string().optional(),
        joinDate: z.date().optional(),
        isActive: z.boolean().optional(),
        branchId: z.string(),
        isHQ: z.boolean().optional(),
        userId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if teacher exists
      const teacher = await ctx.db.teacher.findUnique({
        where: { id: input.id },
      });

      if (!teacher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Teacher not found",
        });
      }

      // Update teacher record
      const updatedTeacher = await ctx.db.teacher.update({
        where: { id: input.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          employeeCode: input.employeeCode,
          qualification: input.qualification,
          specialization: input.specialization,
          joinDate: input.joinDate,
          isActive: input.isActive,
          branchId: input.branchId,
          userId: input.userId,
        },
        // Removed user include since it no longer exists
      });

      // The user model no longer exists, so we don't update it
      // If teacher has a user and isHQ is provided, we would update the user's isHQ field
      // But since the model is gone, we skip this part

      return updatedTeacher;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if teacher exists
      const teacher = await ctx.db.teacher.findUnique({
        where: { id: input.id },
      });

      if (!teacher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Teacher not found",
        });
      }

      return ctx.db.teacher.delete({
        where: { id: input.id },
      });
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      // Check if teachers exist
      const teachers = await ctx.db.teacher.findMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });

      if (teachers.length !== input.ids.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some teachers not found",
        });
      }

      return ctx.db.teacher.deleteMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });
    }),

  bulkUpdateStatus: protectedProcedure
    .input(z.object({
      ids: z.array(z.string()),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.teacher.updateMany({
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

  toggleStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if teacher exists
      const teacher = await ctx.db.teacher.findUnique({
        where: { id: input.id },
      });

      if (!teacher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Teacher not found",
        });
      }

      return ctx.db.teacher.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  // Get teachers without clerkId
  getTeachersWithoutClerkId: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Use raw SQL to find teachers without clerkId
        const teachers = await ctx.db.$queryRaw`
          SELECT id, "firstName", "lastName", qualification, specialization, "employeeCode"
          FROM "Teacher" 
          WHERE "clerkId" IS NULL OR "clerkId" = ''
          ORDER BY "lastName" ASC, "firstName" ASC
        `;
        
        return teachers;
      } catch (error) {
        console.error("Error fetching teachers without clerkId:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch teachers without authentication accounts",
        });
      }
    }),
    
  // Update teacher's clerkId
  updateClerkId: protectedProcedure
    .input(z.object({
      teacherId: z.string(),
      clerkId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if teacher exists
        const teacher = await ctx.db.teacher.findUnique({
          where: { id: input.teacherId },
        });

        if (!teacher) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Teacher not found",
          });
        }
        
        // Update teacher's clerkId using raw SQL
        await ctx.db.$executeRaw`
          UPDATE "Teacher"
          SET "clerkId" = ${input.clerkId}
          WHERE id = ${input.teacherId}
        `;
        
        // Retrieve the updated teacher record
        const updatedTeacher = await ctx.db.teacher.findUnique({
          where: { id: input.teacherId },
        });
        
        return updatedTeacher;
      } catch (error) {
        console.error("Error updating teacher clerkId:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update teacher authentication link",
        });
      }
    }),

  // Search for teachers - used by global search
  search: publicProcedure
    .input(z.object({
      search: z.string().min(1),
      limit: z.number().min(1).max(10).optional().default(5),
      branchId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { search, limit, branchId } = input;

      // If search term is empty, return empty array
      if (!search.trim()) {
        return [];
      }

      // Build the where clause for fuzzy search
      const whereClause = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { employeeCode: { contains: search, mode: 'insensitive' as const } },
        ],
        // Only return teachers from the current branch if branchId is provided
        ...(branchId ? { branchId } : {}),
        // Only return active teachers
        isActive: true,
      };

      return ctx.db.teacher.findMany({
        where: whereClause,
        take: limit,
        orderBy: [
          { lastName: 'asc' as const },
          { firstName: 'asc' as const },
        ],
      });
    }),
});
