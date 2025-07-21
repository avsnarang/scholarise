import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { createEmployeeUser, updateUserMetadata, deleteUser, getUserById } from "@/utils/supabase-auth";

// RBAC Permissions
const RBAC_PERMISSIONS = {
  // Employee Management
  EMPLOYEE_CREATE: 'employee.create',
  EMPLOYEE_READ: 'employee.read',
  EMPLOYEE_UPDATE: 'employee.update',
  EMPLOYEE_DELETE: 'employee.delete',
  // Employee Multi-Branch Access
  EMPLOYEE_MULTI_BRANCH_ACCESS: 'employee.multi_branch_access',
} as const;

// Define types for raw query results
interface EmployeeCounts {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  departmentCount: number;
}

interface BranchAccess {
  branchId: string;
}

// Clerk client is imported above and ready to use

export const employeeRouter = createTRPCRouter({
  getStats: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Use a single query with Prisma's aggregation to get all counts at once
      const countsRaw = await ctx.db.$queryRaw`
        SELECT 
          COUNT(*) as "totalEmployees",
          COUNT(CASE WHEN "isActive" = true THEN 1 END) as "activeEmployees",
          COUNT(CASE WHEN "isActive" = false THEN 1 END) as "inactiveEmployees",
          COUNT(DISTINCT "department") as "departmentCount"
        FROM "Employee"
        WHERE ${input?.branchId ? Prisma.sql`"branchId" = ${input.branchId}` : Prisma.sql`1=1`}
      `;

      const counts = countsRaw as EmployeeCounts[];

      // Convert BigInt to Number since JSON doesn't support BigInt
      const activeEmployeesCount = Number(counts[0]?.activeEmployees || 0);

      return {
        totalEmployees: Number(counts[0]?.totalEmployees || 0),
        activeEmployees: activeEmployeesCount,
        inactiveEmployees: Number(counts[0]?.inactiveEmployees || 0),
        departmentCount: Number(counts[0]?.departmentCount || 0),
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
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;

      // Build the where clause
      const whereClause = {
        branchId: input?.branchId,
        isActive: input?.isActive,
        OR: input?.search
          ? [
              { firstName: { contains: input.search, mode: "insensitive" as const } },
              { lastName: { contains: input.search, mode: "insensitive" as const } },
              { designation: { contains: input.search, mode: "insensitive" as const } },
              { department: { contains: input.search, mode: "insensitive" as const } },
            ]
          : undefined,
      };

      const employees = await ctx.db.employee.findMany({
        take: limit + 1,
        where: whereClause,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { lastName: "asc" },
      });

      let nextCursor: string | undefined = undefined;
      if (employees.length > limit) {
        const nextItem = employees.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: employees,
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(
      z.object({
        id: z.string(),
        branchId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const employee = await ctx.db.employee.findFirst({
        where: {
          id: input.id,
          // Only return employees from the current branch if branchId is provided
          ...(input.branchId ? { branchId: input.branchId } : {}),
        },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      // If employee has a userId, fetch user role information
      let userRoles: any[] = [];
      if (employee.userId) {
        try {
          // Get user role information using the userId field
          userRoles = await ctx.db.userRole.findMany({
            where: {
              userId: employee.userId,
              employeeId: employee.id,
            },
            include: {
              role: true,
            },
          });
        } catch (error) {
          console.error("Error fetching user role info:", error);
        }
      }

      return {
        ...employee,
        userRoles, // Include userRoles like in teacher implementation
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        // Personal Info
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        middleName: z.string().optional(),
        dateOfBirth: z.date().optional(),
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
        designation: z.string(),
        department: z.string().optional(),
        joinDate: z.date().optional(),
        reportingManager: z.string().optional(),
        employeeType: z.string().optional(),
        previousExperience: z.string().optional(),
        previousEmployer: z.string().optional(),
        confirmationDate: z.date().optional(),
        branchAccess: z.array(z.string()).min(1),
        isActive: z.boolean().default(true),
        
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
        clerkId: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Employee create mutation called with input:", {
          ...input,
          password: input.password ? "********" : undefined, // Mask password for security
        });
        
        // Get the primary branch (first in the branchAccess array)
        if (!input.branchAccess.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "At least one branch must be selected",
          });
        }
        
        // Use non-null assertion to ensure TypeScript recognizes this can't be undefined
        const primaryBranchId = input.branchAccess[0]!;
        
        // Create a Supabase user account (always required for employees)
        let supabaseUserId = null;
        if (input.createUser && input.email && input.password) {
          console.log("Attempting to create Supabase user for employee");
          try {
            // Generate a username from the email
            const email = input.email || '';
            
            // Extract part before @ from email or use 'employee' as fallback
            const emailBase = email.includes('@') 
              ? email.substring(0, email.indexOf('@'))
              : 'employee';
            
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
            
            // Create employee user in Supabase
            console.log("Calling createEmployeeUser with:", {
              firstName: input.firstName,
              lastName: input.lastName,
              email: input.email,
              username: username,
              branchId: primaryBranchId,
              roleId: input.roleId,
              roleName: roleName,
            });
            
            try {
              const employeeUser = await createEmployeeUser({
                firstName: input.firstName,
                lastName: input.lastName,
                email: input.email || '',
                password: input.password || '',
                branchId: primaryBranchId,
                username: username,
                roleId: input.roleId,
                roleName: roleName,
              });

              supabaseUserId = employeeUser.id;
              console.log("Created Supabase user for employee:", supabaseUserId);

              // Also create the User record in our database
              try {
                await ctx.db.user.create({
                  data: {
                    id: employeeUser.id,
                    authIdentifier: input.email,
                    email: input.email,
                    firstName: input.firstName,
                    lastName: input.lastName,
                    userType: 'employee',
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
            console.error("Error creating Supabase user for employee:", error);
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
          console.log("Skipping Supabase user creation as required fields not provided:", {
            createUser: input.createUser,
            hasEmail: !!input.email,
            hasPassword: !!input.password,
          });
        }

        console.log("Creating employee record in database, supabaseUserId:", supabaseUserId);
        
        // Prepare employee data
        const employeeData: any = {
          // Personal Info
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth,
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
          designation: input.designation,
          department: input.department,
          joinDate: input.joinDate ?? new Date(),
          reportingManager: input.reportingManager,
          employeeType: input.employeeType,
          previousExperience: input.previousExperience,
          previousEmployer: input.previousEmployer,
          confirmationDate: input.confirmationDate,
          // Using explicit branch relation instead of direct ID
          branch: {
            connect: {
              id: primaryBranchId
            }
          },
          isActive: input.isActive ?? true,
          
          // Salary & Banking Details
          salaryStructure: input.salaryStructure,
          pfNumber: input.pfNumber,
          esiNumber: input.esiNumber,
          uanNumber: input.uanNumber,
          bankName: input.bankName,
          accountNumber: input.accountNumber,
          ifscCode: input.ifscCode,
          
          // IT & Asset Allocation
          officialEmail: input.email || input.officialEmail,
          deviceIssued: input.deviceIssued,
          accessCardId: input.accessCardId,
          softwareLicenses: input.softwareLicenses,
          assetReturnStatus: input.assetReturnStatus,
        };

        // Connect to User record if we have one
        if (supabaseUserId) {
          employeeData.user = {
            connect: { id: supabaseUserId }
          };
        }

        // Create employee record with primary branch
        const employee = await ctx.db.employee.create({
          data: employeeData,
        });

        // Assign role to the user if a Supabase user was created and roleId is provided
        if (supabaseUserId && input.roleId) {
          console.log("Assigning role to employee:", input.roleId);
          try {
            await ctx.db.userRole.create({
              data: {
                userId: supabaseUserId,
                roleId: input.roleId,
                employeeId: employee.id,
              },
            });
            
            // Sync permissions to Supabase metadata
            const { syncUserPermissions } = await import('@/utils/sync-user-permissions');
            await syncUserPermissions(supabaseUserId);
            console.log("Successfully assigned role and synced permissions for employee:", supabaseUserId);
          } catch (error) {
            console.error("Error assigning role to employee:", error);
          }
        }

        // Create branch access records for all selected branches
        if (input.branchAccess.length > 0) {
          console.log("Setting up branch access for employee");
          
          // Create access records for each selected branch
          await Promise.all(
            input.branchAccess.map(async (branchId) => {
              try {
                await ctx.db.$executeRaw`
                  INSERT INTO "EmployeeBranchAccess" ("id", "employeeId", "branchId", "createdAt", "updatedAt")
                  VALUES (gen_random_uuid(), ${employee.id}, ${branchId}, NOW(), NOW())
                `;
              } catch (error) {
                console.error(`Error creating branch access for branch ${branchId}:`, error);
              }
            })
          );
          
          console.log("Branch access setup complete");
        }

        return employee;
      } catch (error) {
        console.error("Error creating employee:", error);
        
        // If it's already a TRPCError, just rethrow it
        if (error instanceof TRPCError) {
          throw error;
        }
        
        // Otherwise wrap it as an INTERNAL_SERVER_ERROR
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create employee: ${error instanceof Error ? error.message : String(error)}`,
          cause: error,
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        // Personal Info
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        middleName: z.string().optional(),
        dateOfBirth: z.date().optional(),
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
        designation: z.string(),
        department: z.string().optional(),
        joinDate: z.date().optional(),
        reportingManager: z.string().optional(),
        employeeType: z.string().optional(),
        previousExperience: z.string().optional(),
        previousEmployer: z.string().optional(),
        confirmationDate: z.date().optional(),
        branchAccess: z.array(z.string()).min(1),
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
        
        // User account
        roleId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if employee exists
      const existingEmployee = await ctx.db.employee.findUnique({
        where: { id: input.id },
      });

      if (!existingEmployee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      // Get current user role if employee has a userId
      let currentUserRole = null;
      if (existingEmployee.userId) {
        currentUserRole = await ctx.db.userRole.findFirst({
          where: {
            userId: existingEmployee.userId,
            employeeId: existingEmployee.id,
          },
          include: {
            role: true,
          },
        });
      }

      // Check if role has been updated
      const roleChanged = input.roleId !== undefined && input.roleId !== currentUserRole?.roleId;
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

      // If employee has a Supabase account, update the user metadata
      if (existingEmployee.userId) {
        try {
          // Update the Supabase user metadata
          await updateUserMetadata(existingEmployee.userId, {
            firstName: input.firstName,
            lastName: input.lastName,
            isActive: input.isActive,
            roleId: input.roleId,
            roleName: roleName
          });
          
          console.log(`Updated Supabase user ${existingEmployee.userId} with new information`);
        } catch (error) {
          console.error("Error updating Supabase user:", error);
          // Don't throw here, just log the error and continue
        }
      }

      // Get the primary branch (first in the branchAccess array)
      if (!input.branchAccess.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one branch must be selected",
        });
      }
      
      const primaryBranchId = input.branchAccess[0]!;
      
      // Get current branch access records
      const currentBranchAccessRaw = await ctx.db.$queryRaw`
        SELECT "branchId" FROM "EmployeeBranchAccess"
        WHERE "employeeId" = ${input.id}
      `;
      
      const currentBranchAccess = currentBranchAccessRaw as BranchAccess[];
      const currentBranchIds = currentBranchAccess.map((b: any) => b.branchId);
      
      // Determine branches to add and remove
      const branchesToAdd = input.branchAccess.filter((b: any) => !currentBranchIds.includes(b));
      const branchesToRemove = currentBranchIds.filter((b: any) => !input.branchAccess.includes(b));
      
      // Update branch access
      // 1. Remove branches that are no longer needed
      if (branchesToRemove.length) {
        await ctx.db.$executeRaw`
          DELETE FROM "EmployeeBranchAccess"
          WHERE "employeeId" = ${input.id}
          AND "branchId" IN (${Prisma.join(branchesToRemove)})
        `;
      }
      
      // 2. Add new branches
      await Promise.all(
        branchesToAdd.map(async (branchId) => {
          try {
            await ctx.db.$executeRaw`
              INSERT INTO "EmployeeBranchAccess" ("id", "employeeId", "branchId", "createdAt", "updatedAt")
              VALUES (gen_random_uuid(), ${input.id}, ${branchId}, NOW(), NOW())
            `;
          } catch (error) {
            console.error(`Error creating branch access for branch ${branchId}:`, error);
          }
        })
      );

      // Build the update data object
      const updateData = {
        // Personal Info
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
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
        designation: input.designation,
        department: input.department,
        joinDate: input.joinDate,
        reportingManager: input.reportingManager,
        employeeType: input.employeeType,
        previousExperience: input.previousExperience,
        previousEmployer: input.previousEmployer,
        confirmationDate: input.confirmationDate,
        branch: {
          connect: {
            id: primaryBranchId
          }
        },
        isActive: input.isActive,
        
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
      };
      
      // Update the employee data
      const employee = await ctx.db.employee.update({
        where: { id: input.id },
        data: updateData,
      });

      // Handle role assignment through UserRole if there's a user and role has changed
      if (existingEmployee.userId && roleChanged) {
        try {
          // Remove existing role assignment for this employee
          if (currentUserRole) {
            await ctx.db.userRole.delete({
              where: { id: currentUserRole.id },
            });
          }

          // Add new role assignment if a role is specified
          if (input.roleId) {
            await ctx.db.userRole.create({
              data: {
                userId: existingEmployee.userId,
                roleId: input.roleId,
                employeeId: existingEmployee.id,
              },
            });
            console.log(`Assigned role ${input.roleId} to employee ${existingEmployee.id}`);
            
            // Sync permissions to Supabase metadata
            const { syncUserPermissions } = await import('@/utils/sync-user-permissions');
            await syncUserPermissions(existingEmployee.userId);
            console.log(`Successfully synced permissions for employee ${existingEmployee.id}`);
          }
        } catch (error) {
          console.error("Error updating employee role assignment:", error);
        }
      }

      return employee;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if employee exists
      const employee = await ctx.db.employee.findUnique({
        where: { id: input.id },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      // If employee has a Supabase account, delete it
      if (employee.userId) {
        try {
          console.log(`Deleting Supabase user for employee ${employee.id} (${employee.userId})`);
          await deleteUser(employee.userId);
        } catch (error) {
          console.error("Error deleting Supabase user:", error);
          // Don't throw here, just log the error and continue
        }
      }

      // Delete employee
      await ctx.db.employee.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      // Check if employees exist and get their User IDs
      const employees = await ctx.db.employee.findMany({
        where: {
          id: {
            in: input.ids,
          },
        },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
        },
      });

      if (employees.length !== input.ids.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more employees not found",
        });
      }

      // Delete Supabase users for employees that have them
      for (const employee of employees) {
        if (employee.userId) {
          try {
            console.log(`Deleting Supabase user for employee ${employee.firstName} ${employee.lastName} (${employee.userId})`);
            await deleteUser(employee.userId);
          } catch (error) {
            console.error(`Error deleting Supabase user for employee ${employee.id}:`, error);
            // Don't throw here, just log the error and continue
          }
        }
      }

      // Delete employees from database
      await ctx.db.employee.deleteMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });

      return { success: true };
    }),

  // Search for employees - used by global search
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
          { designation: { contains: search, mode: 'insensitive' as const } },
        ],
        // Only return employees from the current branch if branchId is provided
        ...(branchId ? { branchId } : {}),
        // Only return active employees
        isActive: true,
      };
      
      return ctx.db.employee.findMany({
        where: whereClause,
        take: limit,
        orderBy: [
          { lastName: 'asc' as const },
          { firstName: 'asc' as const },
        ],
      });
    }),

  getByUserId: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      console.log("Looking for employee with userId:", input.userId);
      
      if (!input.userId || input.userId.trim() === "") {
        console.log("Invalid userId provided:", input.userId);
        return null;
      }

      try {
        // First try to find by userId field
        let employee = await ctx.db.employee.findFirst({
          where: {
            userId: input.userId,
          },
        });

        if (!employee) {
          console.log("Employee not found by userId, attempting raw query...");
          // As a fallback, try a raw query to see if there's any employee with this userId
          const employees = await ctx.db.$queryRaw`
             SELECT * FROM "Employee" 
             WHERE "userId" = ${input.userId}
             LIMIT 1
           `;
           
           employee = Array.isArray(employees) && employees.length > 0 ? employees[0] : null;
        }
        
        console.log("Employee lookup result:", employee ? "Found" : "Not found");
        return employee;
      } catch (error) {
        console.error("Error finding employee by userId:", error);
        return null;
      }
    }),

  toggleStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if employee exists
      const employee = await ctx.db.employee.findUnique({
        where: { id: input.id },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      return ctx.db.employee.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  bulkImport: protectedProcedure
    .input(z.object({
      employees: z.array(z.object({
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
        designation: z.string(),
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
      const { employees, branchId, batchSize } = input;
      
      if (!employees || employees.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No employees provided for import",
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

      // Process employees in batches
      const batches = [];
      for (let i = 0; i < employees.length; i += batchSize) {
        batches.push(employees.slice(i, i + batchSize));
      }

      importMessages.push(`[INFO] Processing ${employees.length} employees in ${batches.length} batches of ${batchSize} each`);

      for (const [batchIndex, batch] of batches.entries()) {
        importMessages.push(`[INFO] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} employees)`);

        try {
          // Process each employee in the batch
          const batchResults = await ctx.db.$transaction(async (prisma) => {
            const processedEmployees = [];

            for (const [index, employeeData] of batch.entries()) {
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

                const dateOfBirth = parseDate(employeeData.dateOfBirth || '');
                const joinDate = parseDate(employeeData.joinDate || '') || new Date();
                const confirmationDate = parseDate(employeeData.confirmationDate || '');

                // Check for duplicate employee code
                if (employeeData.employeeCode) {
                  const existingEmployee = await prisma.employee.findFirst({
                    where: {
                      employeeCode: employeeData.employeeCode,
                      branchId,
                    },
                  });

                  if (existingEmployee) {
                    importMessages.push(`[ERROR] Row ${rowNum}: Employee with employee code '${employeeData.employeeCode}' already exists`);
                    errorCount++;
                    continue;
                  }
                }

                // Create Supabase user if requested
                let supabaseUserId: string | null = null;
                if (employeeData.createUser && employeeData.email && employeeData.password) {
                  try {
                    const supabaseUser = await createEmployeeUser({
                      firstName: employeeData.firstName,
                      lastName: employeeData.lastName,
                      email: employeeData.email,
                      password: employeeData.password,
                      branchId: ctx.user?.branchId || '1',
                    });
                    supabaseUserId = supabaseUser.id;
                    importMessages.push(`[INFO] Row ${rowNum}: Created Supabase user for ${employeeData.firstName} ${employeeData.lastName}`);

                    // Also create the User record in our database
                    try {
                      await prisma.user.create({
                        data: {
                          id: supabaseUser.id,
                          authIdentifier: employeeData.email,
                          email: employeeData.email,
                          firstName: employeeData.firstName,
                          lastName: employeeData.lastName,
                          userType: 'employee',
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

                // Create employee record
                const employee = await prisma.employee.create({
                  data: {
                    // Personal Info
                    firstName: employeeData.firstName,
                    lastName: employeeData.lastName,
                    middleName: employeeData.middleName,
                    dateOfBirth: dateOfBirth,
                    gender: employeeData.gender,
                    bloodGroup: employeeData.bloodGroup,
                    maritalStatus: employeeData.maritalStatus,
                    nationality: employeeData.nationality,
                    religion: employeeData.religion,
                    panNumber: employeeData.panNumber,
                    aadharNumber: employeeData.aadharNumber,
                    
                    // Contact Information
                    address: employeeData.address,
                    city: employeeData.city,
                    state: employeeData.state,
                    country: employeeData.country,
                    pincode: employeeData.pincode,
                    permanentAddress: employeeData.permanentAddress,
                    permanentCity: employeeData.permanentCity,
                    permanentState: employeeData.permanentState,
                    permanentCountry: employeeData.permanentCountry,
                    permanentPincode: employeeData.permanentPincode,
                    phone: employeeData.phone,
                    alternatePhone: employeeData.alternatePhone,
                    personalEmail: employeeData.personalEmail,
                    emergencyContactName: employeeData.emergencyContactName,
                    emergencyContactPhone: employeeData.emergencyContactPhone,
                    emergencyContactRelation: employeeData.emergencyContactRelation,
                    
                    // Educational Qualifications
                    qualification: employeeData.qualification,
                    specialization: employeeData.specialization,
                    professionalQualifications: employeeData.professionalQualifications,
                    specialCertifications: employeeData.specialCertifications,
                    yearOfCompletion: employeeData.yearOfCompletion,
                    institution: employeeData.institution,
                    experience: employeeData.experience,
                    bio: employeeData.bio,
                    
                    // Employment Details
                    employeeCode: employeeData.employeeCode,
                    designation: employeeData.designation,
                    department: employeeData.department,
                    joinDate: joinDate,
                    reportingManager: employeeData.reportingManager,
                    employeeType: employeeData.employeeType,
                    previousExperience: employeeData.previousExperience,
                    previousEmployer: employeeData.previousEmployer,
                    confirmationDate: confirmationDate,
                    isActive: employeeData.isActive ?? true,
                    
                    // Salary & Banking Details
                    salaryStructure: employeeData.salaryStructure,
                    pfNumber: employeeData.pfNumber,
                    esiNumber: employeeData.esiNumber,
                    uanNumber: employeeData.uanNumber,
                    bankName: employeeData.bankName,
                    accountNumber: employeeData.accountNumber,
                    ifscCode: employeeData.ifscCode,
                    
                    // IT & Asset Allocation
                    officialEmail: employeeData.email || employeeData.officialEmail,
                    deviceIssued: employeeData.deviceIssued,
                    accessCardId: employeeData.accessCardId,
                    softwareLicenses: employeeData.softwareLicenses,
                    assetReturnStatus: employeeData.assetReturnStatus,
                    
                    // Branch and User ID
                    branchId: branchId,
                    userId: supabaseUserId,
                  },
                });

                processedEmployees.push(employee);
                successCount++;
                importMessages.push(`[SUCCESS] Row ${rowNum}: Successfully imported ${employeeData.firstName} ${employeeData.lastName}`);

              } catch (error) {
                errorCount++;
                importMessages.push(`[ERROR] Row ${rowNum}: Failed to import employee - ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }

            return processedEmployees;
          });

          importMessages.push(`[INFO] Batch ${batchIndex + 1} completed: ${batchResults.length} employees processed`);

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
});