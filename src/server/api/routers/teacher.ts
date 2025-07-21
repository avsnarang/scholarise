import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";
import { createTeacherUser, updateUserMetadata, deleteUser } from "@/utils/supabase-auth";

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
      const [teacherCounts, sectionAssignments] = await Promise.all([
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

        // Get section assignments in parallel
        ctx.db.section.groupBy({
          by: ['teacherId'],
          where: {
            class: {
              branchId: input?.branchId,
            },
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

      // Count teachers with sections
      const teachersWithSections = sectionAssignments.length;

      // Convert bigint to number and calculate derived stats
      const activeTeachersCount = Number(counts.activeTeachers);

      return {
        totalTeachers: Number(counts.totalTeachers),
        activeTeachers: activeTeachersCount,
        inactiveTeachers: Number(counts.inactiveTeachers),
        teachersWithClasses: teachersWithSections,
        teachersWithoutClasses: activeTeachersCount - teachersWithSections,
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
      const whereClause: any = {};

      // Only add filters if they have values
      if (input?.branchId) {
        whereClause.branchId = input.branchId;
      }
      if (input?.isActive !== undefined) {
        whereClause.isActive = input.isActive;
      }

      // Collect all conditions that need to be combined
      const allConditions: any[] = [];

      // Add search conditions if search is provided
      if (input?.search) {
        allConditions.push({
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" } },
            { lastName: { contains: input.search, mode: "insensitive" } },
            { qualification: { contains: input.search, mode: "insensitive" } },
            { specialization: { contains: input.search, mode: "insensitive" } },
          ]
        });
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
        }).filter(condition => Object.keys(condition).length > 0);

        // Add the filter conditions as a group
        if (filterConditions.length > 0) {
          if (logicOperator === "and") {
            allConditions.push({ AND: filterConditions });
          } else {
            allConditions.push({ OR: filterConditions });
          }
        }
      }

      // Combine all conditions with AND if there are multiple condition groups
      if (allConditions.length > 0) {
        if (allConditions.length === 1) {
          Object.assign(whereClause, allConditions[0]);
        } else {
          whereClause.AND = allConditions;
        }
      }

      const teachers = await ctx.db.teacher.findMany({
        take: limit + 1,
        where: whereClause,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { lastName: "asc" },
        include: {
          sections: true,
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
          sections: true,
          userRoles: {
            include: {
              role: true
            }
          }
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
          // Get sections for this teacher
          const sections = await ctx.db.section.findMany({
            where: {
              teacherId: teacher.id
            },
            include: {
              class: true
            }
          });
          
          return {
            ...teacher,
            sections
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
        // Personal Info
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        middleName: z.string().optional(),
        dateOfBirth: z.string().optional(),
        gender: z.enum(["Male", "Female", "Other"]).optional(),
        bloodGroup: z.string().optional(),
        maritalStatus: z.string().optional(),
        nationality: z.string().optional(),
        religion: z.string().optional(),
        panNumber: z.string().optional(),
        aadharNumber: z.string().optional(),
        
        // Contact Information
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        pincode: z.string().optional(),
        permanentAddress: z.string().optional(),
        permanentCity: z.string().optional(),
        permanentState: z.string().optional(),
        permanentCountry: z.string().optional(),
        permanentPincode: z.string().optional(),
        phone: z.string().optional(),
        alternatePhone: z.string().optional(),
        personalEmail: z.string().optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        emergencyContactRelation: z.string().optional(),
        
        // Educational Qualifications
        qualification: z.string().optional(),
        specialization: z.string().optional(),
        professionalQualifications: z.string().optional(),
        specialCertifications: z.string().optional(),
        yearOfCompletion: z.string().optional(),
        institution: z.string().optional(),
        experience: z.string().optional(),
        bio: z.string().optional(),
        
        // Employment Details
        employeeCode: z.string().optional(),
        joinDate: z.date().optional(),
        designation: z.string().optional(),
        department: z.string().optional(),
        reportingManager: z.string().optional(),
        employeeType: z.string().optional(),
        previousExperience: z.string().optional(),
        previousEmployer: z.string().optional(),
        confirmationDate: z.string().optional(),
        isActive: z.boolean().optional(),
        
        // Branch Information
        branchId: z.string(),
        isHQ: z.boolean().optional(),
        
        // Salary & Banking Details
        salaryStructure: z.string().optional(),
        pfNumber: z.string().optional(),
        esiNumber: z.string().optional(),
        uanNumber: z.string().optional(),
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        ifscCode: z.string().optional(),
        
        // IT & Asset Allocation
        officialEmail: z.string().optional(),
        deviceIssued: z.string().optional(),
        accessCardId: z.string().optional(),
        softwareLicenses: z.string().optional(),
        assetReturnStatus: z.string().optional(),
        
        // User credentials (optional)
        userId: z.string().optional(),
        createUser: z.boolean().optional(),
        email: z.string().email().optional(),
        password: z.string().min(8).optional(),
        roleId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Teacher create mutation called with input:", {
          ...input,
          password: input.password ? "********" : undefined, // Mask password for security
        });
        
        // Create a Supabase user account if requested
        let supabaseUserId = null;
        if (
          input.createUser &&
          input.officialEmail &&
          input.password
        ) {
          console.log("Attempting to create Supabase user for teacher using official email");
          try {
            // Get branch code for Supabase user creation
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

            // Generate a username from the official email
            const email = input.officialEmail;
            
            // Extract part before @ from email or use 'teacher' as fallback
            const emailBase = email.includes('@') 
              ? email.substring(0, email.indexOf('@'))
              : 'teacher';
            
            // Clean up the username (remove special chars)
            const cleanedBase = emailBase.replace(/[^a-zA-Z0-9]/g, '');
            const timestamp = Date.now().toString().slice(-6);
            const username = `${cleanedBase}${timestamp}`;
            
            // Get role details if roleId provided
            let roleName = undefined;
            if (input.roleId) {
              const role = await ctx.db.rbacRole.findUnique({
                where: { id: input.roleId },
                select: { name: true }
              });
              roleName = role?.name;
            }
            
            console.log("Found role:", roleName);

            try {
              const teacherUser = await createTeacherUser({
                firstName: input.firstName,
                lastName: input.lastName,
                email: input.officialEmail, // Use official email for account creation
                password: input.password || '',
                branchId: input.branchId,
                isHQ: input.isHQ || false,
                username: username, // Pass the generated username
                roleId: input.roleId, // Pass the role ID
                roleName: roleName, // Pass the role name
              });

              supabaseUserId = teacherUser.id;
              console.log("Created Supabase user for teacher:", supabaseUserId);

              // Also create the User record in our database
              try {
                await ctx.db.user.create({
                  data: {
                    id: teacherUser.id,
                    authIdentifier: input.officialEmail,
                    email: input.officialEmail,
                    firstName: input.firstName,
                    lastName: input.lastName,
                    userType: 'teacher',
                    isActive: true,
                  },
                });
                console.log("Created User record in database");
              } catch (userError) {
                console.error("Failed to create User record (user may already exist):", userError);
                // Don't throw error here as Supabase user was created successfully
              }
            } catch (supabaseError) {
              console.error("Failed to create Supabase user:", supabaseError);
              
              // Format the error message to be more user-friendly
              let errorMessage = "Failed to create user account";
              if (supabaseError instanceof Error) {
                errorMessage = supabaseError.message;
              }
              
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: errorMessage,
                cause: supabaseError,
              });
            }
          } catch (error) {
            console.error("Error creating Supabase user for teacher:", error);
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
          console.log("Skipping Supabase user creation as conditions not met:", {
            createUser: input.createUser,
            hasOfficialEmail: !!input.officialEmail,
            hasPassword: !!input.password,
          });
        }

        console.log("Creating teacher record in database, supabaseUserId:", supabaseUserId);
        
        // Create teacher record
        try {
          const newTeacher = await ctx.db.teacher.create({
            data: {
              // Personal Info
              firstName: input.firstName,
              lastName: input.lastName,
              middleName: input.middleName,
              // Convert dateOfBirth from string to Date if provided
              ...(input.dateOfBirth ? { dateOfBirth: new Date(input.dateOfBirth) } : {}),
              gender: input.gender,
              bloodGroup: input.bloodGroup,
              maritalStatus: input.maritalStatus,
              nationality: input.nationality,
              religion: input.religion,
              panNumber: input.panNumber,
              aadharNumber: input.aadharNumber,
              
              // Contact Information
              address: input.address,
              city: input.city,
              state: input.state,
              country: input.country,
              pincode: input.pincode,
              permanentAddress: input.permanentAddress,
              permanentCity: input.permanentCity,
              permanentState: input.permanentState,
              permanentCountry: input.permanentCountry,
              permanentPincode: input.permanentPincode,
              phone: input.phone,
              alternatePhone: input.alternatePhone,
              personalEmail: input.personalEmail,
              emergencyContactName: input.emergencyContactName,
              emergencyContactPhone: input.emergencyContactPhone,
              emergencyContactRelation: input.emergencyContactRelation,
              
              // Educational Qualifications
              qualification: input.qualification,
              specialization: input.specialization,
              professionalQualifications: input.professionalQualifications,
              specialCertifications: input.specialCertifications,
              yearOfCompletion: input.yearOfCompletion,
              institution: input.institution,
              experience: input.experience,
              bio: input.bio,
              
              // Employment Details
              employeeCode: input.employeeCode,
              joinDate: input.joinDate || new Date(),
              designation: input.designation,
              department: input.department,
              reportingManager: input.reportingManager,
              employeeType: input.employeeType,
              previousExperience: input.previousExperience,
              previousEmployer: input.previousEmployer,
              // Convert confirmationDate from string to Date if provided
              ...(input.confirmationDate ? { confirmationDate: new Date(input.confirmationDate) } : {}),
              isActive: input.isActive ?? true,
              
              // Branch Information
              branchId: input.branchId,
              
              // Salary & Banking Details
              salaryStructure: input.salaryStructure,
              pfNumber: input.pfNumber,
              esiNumber: input.esiNumber,
              uanNumber: input.uanNumber,
              bankName: input.bankName,
              accountNumber: input.accountNumber,
              ifscCode: input.ifscCode,
              
              // IT & Asset Allocation
              officialEmail: input.officialEmail,
              deviceIssued: input.deviceIssued,
              accessCardId: input.accessCardId,
              softwareLicenses: input.softwareLicenses,
              assetReturnStatus: input.assetReturnStatus,
              
              // User-related fields
              userId: input.userId,
              // Add clerkId and userId if user was created
              ...(supabaseUserId ? { 
                clerkId: supabaseUserId, 
                userId: supabaseUserId
              } : {}),
            },
          });
          
          console.log("Teacher record created successfully:", newTeacher);
          
          // Create UserRole record if roleId is provided and user was created
          if (supabaseUserId && input.roleId) {
            try {
              await ctx.db.userRole.create({
                data: {
                  userId: supabaseUserId,
                  roleId: input.roleId,
                  teacherId: newTeacher.id,
                },
              });
              console.log("UserRole record created successfully for teacher");
              
              // Sync permissions to Supabase metadata
              const { syncUserPermissions } = await import('@/utils/sync-user-permissions');
              await syncUserPermissions(supabaseUserId);
              console.log("Successfully synced permissions for teacher:", supabaseUserId);
            } catch (roleError) {
              console.error("Error creating UserRole record:", roleError);
              // Don't throw here as the teacher has been created successfully
            }
          }
          
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
        // Personal Info
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        middleName: z.string().optional(),
        dateOfBirth: z.string().optional(),
        gender: z.enum(["Male", "Female", "Other"]).optional(),
        bloodGroup: z.string().optional(),
        maritalStatus: z.string().optional(),
        nationality: z.string().optional(),
        religion: z.string().optional(),
        panNumber: z.string().optional(),
        aadharNumber: z.string().optional(),
        
        // Contact Information
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        pincode: z.string().optional(),
        permanentAddress: z.string().optional(),
        permanentCity: z.string().optional(),
        permanentState: z.string().optional(),
        permanentCountry: z.string().optional(),
        permanentPincode: z.string().optional(),
        phone: z.string().optional(),
        alternatePhone: z.string().optional(),
        personalEmail: z.string().optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        emergencyContactRelation: z.string().optional(),
        
        // Educational Qualifications
        qualification: z.string().optional(),
        specialization: z.string().optional(),
        professionalQualifications: z.string().optional(),
        specialCertifications: z.string().optional(),
        yearOfCompletion: z.string().optional(),
        institution: z.string().optional(),
        experience: z.string().optional(),
        bio: z.string().optional(),
        
        // Employment Details
        employeeCode: z.string().optional(),
        joinDate: z.date().optional(),
        designation: z.string().optional(),
        department: z.string().optional(),
        reportingManager: z.string().optional(),
        employeeType: z.string().optional(),
        previousExperience: z.string().optional(),
        previousEmployer: z.string().optional(),
        confirmationDate: z.string().optional(),
        isActive: z.boolean().optional(),
        
        // Branch Information
        branchId: z.string(),
        isHQ: z.boolean().optional(),
        
        // Salary & Banking Details
        salaryStructure: z.string().optional(),
        pfNumber: z.string().optional(),
        esiNumber: z.string().optional(),
        uanNumber: z.string().optional(),
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        ifscCode: z.string().optional(),
        
        // IT & Asset Allocation
        officialEmail: z.string().optional(),
        deviceIssued: z.string().optional(),
        accessCardId: z.string().optional(),
        softwareLicenses: z.string().optional(),
        assetReturnStatus: z.string().optional(),
        
        // User-related fields
        userId: z.string().optional(),
        roleId: z.string().optional(),
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
      
      // Check if role has been updated by comparing with existing UserRole
      let currentRoleId: string | undefined = undefined;
      if (teacher.clerkId) {
        const existingUserRole = await ctx.db.userRole.findFirst({
          where: {
            teacherId: input.id,
            isActive: true,
          },
        });
        currentRoleId = existingUserRole?.roleId;
      }
      
      const roleChanged = input.roleId !== undefined && input.roleId !== currentRoleId;
      let roleName = undefined;
      
      // Get the role name if roleId is provided and it's different from the current one
      if (roleChanged && input.roleId) {
        try {
          const role = await ctx.db.rbacRole.findUnique({
            where: { id: input.roleId },
            select: { name: true }
          });
          roleName = role?.name;
          console.log(`Role changed to: ${roleName} (${input.roleId})`);
        } catch (error) {
          console.error("Error fetching role details:", error);
        }
      }
      
      // If teacher has a Supabase account, update the user metadata
      if (teacher.clerkId) {
        try {
          // Update the Supabase user metadata
          await updateUserMetadata(teacher.clerkId, {
            firstName: input.firstName,
            lastName: input.lastName,
            isActive: input.isActive,
            roleId: input.roleId,
            roleName: roleName
          });
          
          console.log(`Updated Supabase user ${teacher.clerkId} with new information`);
        } catch (error) {
          console.error("Error updating Supabase user:", error);
          // Don't throw here, just log the error and continue
        }
      }

      // Build the update data object
      const updateData = {
        // Personal Info
        firstName: input.firstName,
        lastName: input.lastName,
        middleName: input.middleName,
        // Convert dateOfBirth from string to Date if provided
        ...(input.dateOfBirth ? { dateOfBirth: new Date(input.dateOfBirth) } : {}),
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        maritalStatus: input.maritalStatus,
        nationality: input.nationality,
        religion: input.religion,
        panNumber: input.panNumber,
        aadharNumber: input.aadharNumber,
        
        // Contact Information
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        pincode: input.pincode,
        permanentAddress: input.permanentAddress,
        permanentCity: input.permanentCity,
        permanentState: input.permanentState,
        permanentCountry: input.permanentCountry,
        permanentPincode: input.permanentPincode,
        phone: input.phone,
        alternatePhone: input.alternatePhone,
        personalEmail: input.personalEmail,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        emergencyContactRelation: input.emergencyContactRelation,
        
        // Educational Qualifications
        qualification: input.qualification,
        specialization: input.specialization,
        professionalQualifications: input.professionalQualifications,
        specialCertifications: input.specialCertifications,
        yearOfCompletion: input.yearOfCompletion,
        institution: input.institution,
        experience: input.experience,
        bio: input.bio,
        
        // Employment Details
        employeeCode: input.employeeCode,
        joinDate: input.joinDate,
        designation: input.designation,
        department: input.department,
        reportingManager: input.reportingManager,
        employeeType: input.employeeType,
        previousExperience: input.previousExperience,
        previousEmployer: input.previousEmployer,
        // Convert confirmationDate from string to Date if provided
        ...(input.confirmationDate ? { confirmationDate: new Date(input.confirmationDate) } : {}),
        isActive: input.isActive,
        
        // Branch Information
        branchId: input.branchId,
        
        // Salary & Banking Details
        salaryStructure: input.salaryStructure,
        pfNumber: input.pfNumber,
        esiNumber: input.esiNumber,
        uanNumber: input.uanNumber,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        ifscCode: input.ifscCode,
        
        // IT & Asset Allocation
        officialEmail: input.officialEmail,
        deviceIssued: input.deviceIssued,
        accessCardId: input.accessCardId,
        softwareLicenses: input.softwareLicenses,
        assetReturnStatus: input.assetReturnStatus,
        
        // User-related fields
        userId: input.userId,
      };

      // Update teacher data
      const updatedTeacher = await ctx.db.teacher.update({
        where: { id: input.id },
        data: updateData,
      });

      // Handle role update through UserRole relationship if roleId is provided
      if (input.roleId !== undefined && updatedTeacher.clerkId) {
        try {
          // Remove existing user role assignments for this teacher
          await ctx.db.userRole.deleteMany({
            where: {
              teacherId: input.id,
            },
          });

          // Add new role assignment if roleId is provided (not null)
          if (input.roleId) {
            await ctx.db.userRole.create({
              data: {
                userId: updatedTeacher.clerkId,
                teacherId: input.id,
                roleId: input.roleId,
              },
            });
            console.log(`Assigned role ${input.roleId} to teacher ${input.id}`);
          }
          
          // Sync permissions to Supabase metadata
          const { syncUserPermissions } = await import('@/utils/sync-user-permissions');
          await syncUserPermissions(updatedTeacher.clerkId);
          console.log(`Successfully synced permissions for teacher ${input.id}`);
        } catch (error) {
          console.error("Error updating teacher role assignment:", error);
        }
      }

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
      
      // If teacher has a Supabase account, delete it
      if (teacher.clerkId) {
        try {
          console.log(`Deleting Supabase user for teacher ${teacher.id} (${teacher.clerkId})`);
          await deleteUser(teacher.clerkId);
        } catch (error) {
          console.error("Error deleting Supabase user:", error);
          // Don't throw here, just log the error and continue
        }
      }

      return ctx.db.teacher.delete({
        where: { id: input.id },
      });
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      // Check if teachers exist and get their Clerk IDs
      const teachers = await ctx.db.teacher.findMany({
        where: {
          id: {
            in: input.ids,
          },
        },
        select: {
          id: true,
          clerkId: true,
          firstName: true,
          lastName: true,
        },
      });

      if (teachers.length !== input.ids.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more teachers not found",
        });
      }

      // Delete Clerk users for teachers that have them
      for (const teacher of teachers) {
        if (teacher.clerkId) {
          try {
            console.log(`Deleting Supabase user for teacher ${teacher.firstName} ${teacher.lastName} (${teacher.clerkId})`);
            await deleteUser(teacher.clerkId);
          } catch (error) {
            console.error(`Error deleting Supabase user for teacher ${teacher.id}:`, error);
            // Don't throw here, just log the error and continue
          }
        }
      }

      // Delete teachers from database
      await ctx.db.teacher.deleteMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });

      return { success: true };
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

  bulkImport: protectedProcedure
    .input(z.object({
      teachers: z.array(z.object({
        // Personal Info
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        middleName: z.string().optional(),
        dateOfBirth: z.string().optional(),
        gender: z.enum(["Male", "Female", "Other"]).optional(),
        bloodGroup: z.string().optional(),
        maritalStatus: z.string().optional(),
        nationality: z.string().optional(),
        religion: z.string().optional(),
        panNumber: z.string().optional(),
        aadharNumber: z.string().optional(),
        
        // Contact Information
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        pincode: z.string().optional(),
        permanentAddress: z.string().optional(),
        permanentCity: z.string().optional(),
        permanentState: z.string().optional(),
        permanentCountry: z.string().optional(),
        permanentPincode: z.string().optional(),
        phone: z.string().optional(),
        alternatePhone: z.string().optional(),
        personalEmail: z.string().optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        emergencyContactRelation: z.string().optional(),
        
        // Educational Qualifications
        qualification: z.string().optional(),
        specialization: z.string().optional(),
        professionalQualifications: z.string().optional(),
        specialCertifications: z.string().optional(),
        yearOfCompletion: z.string().optional(),
        institution: z.string().optional(),
        experience: z.string().optional(),
        bio: z.string().optional(),
        
        // Employment Details
        employeeCode: z.string().optional(),
        designation: z.string().optional(),
        department: z.string().optional(),
        joinDate: z.string().optional(),
        reportingManager: z.string().optional(),
        employeeType: z.string().optional(),
        previousExperience: z.string().optional(),
        previousEmployer: z.string().optional(),
        confirmationDate: z.string().optional(),
        isActive: z.boolean().optional(),
        
        // Salary & Banking Details
        salaryStructure: z.string().optional(),
        pfNumber: z.string().optional(),
        esiNumber: z.string().optional(),
        uanNumber: z.string().optional(),
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        ifscCode: z.string().optional(),
        
        // IT & Asset Allocation
        officialEmail: z.string().optional(),
        deviceIssued: z.string().optional(),
        accessCardId: z.string().optional(),
        softwareLicenses: z.string().optional(),
        assetReturnStatus: z.string().optional(),
        
        // User Account
        createUser: z.boolean().optional(),
        email: z.string().optional(),
        password: z.string().optional(),
        roleId: z.string().optional(),
      })),
      branchId: z.string(),
      batchSize: z.number().default(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const { teachers, branchId, batchSize } = input;
      
      if (!teachers || teachers.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No teachers provided for import",
        });
      }

      // Get branch code for reference
      const branch = await ctx.db.branch.findUnique({
        where: { id: branchId },
        select: { code: true }
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

      // Process teachers in batches
      const batches = [];
      for (let i = 0; i < teachers.length; i += batchSize) {
        batches.push(teachers.slice(i, i + batchSize));
      }

      importMessages.push(`[INFO] Processing ${teachers.length} teachers in ${batches.length} batches of ${batchSize} each`);

      for (const [batchIndex, batch] of batches.entries()) {
        importMessages.push(`[INFO] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} teachers)`);

        try {
          // Process each teacher in the batch
          const batchResults = await ctx.db.$transaction(async (prisma) => {
            const processedTeachers: any[] = [];

            for (const [index, teacherData] of batch.entries()) {
              const globalIndex = batchIndex * batchSize + index;
              const rowNum = globalIndex + 1;

              try {
                // Parse dates
                const parseDate = (dateStr: string) => {
                  if (!dateStr) return null;
                  const parts = dateStr.split('/');
                  if (parts.length === 3) {
                    const day = parseInt(parts[0]!, 10);
                    const month = parseInt(parts[1]!, 10) - 1;
                    const year = parseInt(parts[2]!, 10);
                    return new Date(year, month, day);
                  }
                  return null;
                };

                const dateOfBirth = parseDate(teacherData.dateOfBirth || '');
                const joinDate = parseDate(teacherData.joinDate || '') || new Date();
                const confirmationDate = parseDate(teacherData.confirmationDate || '');

                // Check for duplicate employee code
                if (teacherData.employeeCode) {
                  const existingTeacher = await prisma.teacher.findFirst({
                    where: {
                      employeeCode: teacherData.employeeCode,
                      branchId,
                    },
                  });

                  if (existingTeacher) {
                    importMessages.push(`[ERROR] Row ${rowNum}: Teacher with employee code '${teacherData.employeeCode}' already exists`);
                    errorCount++;
                    continue;
                  }
                }

                // Create Supabase user if requested
                let supabaseUserId: string | null = null;
                if (teacherData.createUser && teacherData.email && teacherData.password) {
                  try {
                    const supabaseUser = await createTeacherUser({
                      firstName: teacherData.firstName,
                      lastName: teacherData.lastName,
                      email: teacherData.email,
                      password: teacherData.password,
                      branchId: ctx.user?.branchId || '1',
                    });
                    supabaseUserId = supabaseUser.id;
                    importMessages.push(`[INFO] Row ${rowNum}: Created Supabase user for ${teacherData.firstName} ${teacherData.lastName}`);

                    // Also create the User record in our database
                    try {
                      await prisma.user.create({
                        data: {
                          id: supabaseUser.id,
                          authIdentifier: teacherData.email,
                          email: teacherData.email,
                          firstName: teacherData.firstName,
                          lastName: teacherData.lastName,
                          userType: 'teacher',
                          isActive: true,
                        },
                      });
                    } catch (userError) {
                      // User might already exist, don't fail the import
                      importMessages.push(`[WARN] Row ${rowNum}: User record may already exist`);
                    }
                  } catch (error) {
                    importMessages.push(`[ERROR] Row ${rowNum}: Failed to create Supabase user: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    // Continue without Supabase user
                  }
                }

                // Create teacher record
                const teacher = await prisma.teacher.create({
                  data: {
                    // Personal Info
                    firstName: teacherData.firstName,
                    lastName: teacherData.lastName,
                    middleName: teacherData.middleName,
                    dateOfBirth: dateOfBirth,
                    gender: teacherData.gender,
                    bloodGroup: teacherData.bloodGroup,
                    maritalStatus: teacherData.maritalStatus,
                    nationality: teacherData.nationality,
                    religion: teacherData.religion,
                    panNumber: teacherData.panNumber,
                    aadharNumber: teacherData.aadharNumber,
                    
                    // Contact Information
                    address: teacherData.address,
                    city: teacherData.city,
                    state: teacherData.state,
                    country: teacherData.country,
                    pincode: teacherData.pincode,
                    permanentAddress: teacherData.permanentAddress,
                    permanentCity: teacherData.permanentCity,
                    permanentState: teacherData.permanentState,
                    permanentCountry: teacherData.permanentCountry,
                    permanentPincode: teacherData.permanentPincode,
                    phone: teacherData.phone,
                    alternatePhone: teacherData.alternatePhone,
                    personalEmail: teacherData.personalEmail,
                    emergencyContactName: teacherData.emergencyContactName,
                    emergencyContactPhone: teacherData.emergencyContactPhone,
                    emergencyContactRelation: teacherData.emergencyContactRelation,
                    
                    // Educational Qualifications
                    qualification: teacherData.qualification,
                    specialization: teacherData.specialization,
                    professionalQualifications: teacherData.professionalQualifications,
                    specialCertifications: teacherData.specialCertifications,
                    yearOfCompletion: teacherData.yearOfCompletion,
                    institution: teacherData.institution,
                    experience: teacherData.experience,
                    bio: teacherData.bio,
                    
                    // Employment Details
                    employeeCode: teacherData.employeeCode,
                    designation: teacherData.designation,
                    department: teacherData.department,
                    joinDate: joinDate,
                    reportingManager: teacherData.reportingManager,
                    employeeType: teacherData.employeeType,
                    previousExperience: teacherData.previousExperience,
                    previousEmployer: teacherData.previousEmployer,
                    confirmationDate: confirmationDate,
                    isActive: teacherData.isActive ?? true,
                    
                    // Salary & Banking Details
                    salaryStructure: teacherData.salaryStructure,
                    pfNumber: teacherData.pfNumber,
                    esiNumber: teacherData.esiNumber,
                    uanNumber: teacherData.uanNumber,
                    bankName: teacherData.bankName,
                    accountNumber: teacherData.accountNumber,
                    ifscCode: teacherData.ifscCode,
                    
                    // IT & Asset Allocation
                    officialEmail: teacherData.officialEmail,
                    deviceIssued: teacherData.deviceIssued,
                    accessCardId: teacherData.accessCardId,
                    softwareLicenses: teacherData.softwareLicenses,
                    assetReturnStatus: teacherData.assetReturnStatus,
                    
                    // Branch and Supabase ID
                    branchId: branchId,
                    clerkId: supabaseUserId,
                  },
                });

                processedTeachers.push(teacher);
                successCount++;
                importMessages.push(`[SUCCESS] Row ${rowNum}: Successfully imported ${teacherData.firstName} ${teacherData.lastName}`);

              } catch (error) {
                errorCount++;
                importMessages.push(`[ERROR] Row ${rowNum}: Failed to import teacher - ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }

            return processedTeachers;
          });

          importMessages.push(`[INFO] Batch ${batchIndex + 1} completed: ${batchResults.length} teachers processed`);

        } catch (error) {
          importMessages.push(`[ERROR] Batch ${batchIndex + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      importMessages.push(`[SUMMARY] Import completed: ${successCount} successful, ${errorCount} failed`);

      return {
        count: successCount,
        importMessages,
      };
    }),

  // Get teacher dashboard data
  getDashboardData: publicProcedure
    .input(z.object({
      teacherId: z.string(),
      sessionId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Get teacher details with sections and classes
        const teacher: any = await ctx.db.teacher.findUnique({
          where: { id: input.teacherId },
          include: {
            sections: {
              include: {
                class: true,
                _count: {
                  select: {
                    students: true
                  }
                }
              }
            },
            SubjectTeacher: {
              include: {
                subject: true,
                class: true,
                section: true
              }
            },
            leaveApplications: {
              where: {
                createdAt: {
                  gte: new Date(new Date().getFullYear(), 0, 1) // Current year
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 5
            },
            leaveBalances: {
              where: {
                year: new Date().getFullYear()
              }
            }
          }
        });

        if (!teacher) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Teacher not found",
          });
        }

        // Get today's attendance status
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        const todayAttendance = await ctx.db.staffAttendance.findFirst({
          where: {
            teacherId: input.teacherId,
            timestamp: {
              gte: today,
              lte: todayEnd
            }
          },
          orderBy: { timestamp: 'desc' }
        });

        // Get this week's attendance count
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        
        const weekAttendanceCount = await ctx.db.staffAttendance.count({
          where: {
            teacherId: input.teacherId,
            timestamp: {
              gte: weekStart,
              lte: todayEnd
            }
          }
        });

        // Get recent student attendance summary for teacher's sections
        const sectionIds = teacher.sections.map((section: any) => section.id);
        let studentAttendanceSummary = null;
        
        if (sectionIds.length > 0) {
          const recentStudentAttendance = await ctx.db.studentAttendance.groupBy({
            by: ['status'],
            where: {
              sectionId: { in: sectionIds },
              date: {
                gte: today,
                lte: todayEnd
              }
            },
            _count: true
          });

          studentAttendanceSummary = recentStudentAttendance.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {} as Record<string, number>);
        }

        // Calculate class statistics
        const totalStudents = teacher.sections.reduce((sum: any, section: any) => sum + section._count.students, 0);
        const totalClasses = teacher.sections.length;
        
        // Get subject assignments count
        const totalSubjects = teacher.SubjectTeacher.length;

        // Calculate leave statistics
        const totalLeaveBalance = teacher.leaveBalances.reduce((sum: any, balance: any) => sum + balance.totalDays, 0);
        const usedLeave = teacher.leaveBalances.reduce((sum: any, balance: any) => sum + balance.usedDays, 0);
        const pendingApplications = teacher.leaveApplications.filter((app: any) => app.status === 'PENDING').length;

        return {
          teacher: {
            id: teacher.id,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            designation: teacher.designation,
            subjects: teacher.subjects || [],
            employeeCode: teacher.employeeCode
          },
          stats: {
            totalStudents,
            totalClasses,
            totalSubjects,
            weekAttendanceCount,
            todayAttendanceMarked: !!todayAttendance,
            totalLeaveBalance,
            usedLeave,
            pendingApplications
          },
          sections: teacher.sections.map((section: any) => ({
            id: section.id,
            name: section.name,
            className: section.class.name,
            studentCount: section._count.students
          })),
          subjectAssignments: teacher.SubjectTeacher.map((assignment: any) => ({
            id: assignment.id,
            subjectName: assignment.subject.name,
            className: assignment.class.name,
            sectionName: assignment.section?.name || 'All Sections'
          })),
          recentLeaveApplications: teacher.leaveApplications.map((app: any) => ({
            id: app.id,
            startDate: app.startDate,
            endDate: app.endDate,
            reason: app.reason,
            status: app.status,
            createdAt: app.createdAt
          })),
          studentAttendanceSummary,
          todayAttendance: todayAttendance ? {
            timestamp: todayAttendance.timestamp,
            type: todayAttendance.type,
            location: todayAttendance.locationId
          } : null
        };
      } catch (error) {
        console.error("Error fetching teacher dashboard data:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch teacher dashboard data",
        });
      }
    }),
});
