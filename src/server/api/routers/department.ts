import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";
import { db, department as departmentModel } from "@/server/db";

// Remove the local client and use the singleton db instance
// const localClient = new PrismaClient();

export const departmentRouter = createTRPCRouter({
  // Get all departments with optional filtering
  getAll: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        isActive: z.boolean().optional(),
        type: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        // Use the global db instance
        console.log("Using global PrismaClient for departments list");
        return await getDepartments(db, input);
      } catch (error) {
        console.error("Error in department.getAll:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }),

  // Get department by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        // Use the global departmentModel directly
        console.log("Using global departmentModel for getting department by ID");
        const department = await departmentModel.findUnique({
          where: { id: input.id },
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              }
            },
            employees: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
              },
              where: {
                isActive: true,
              },
            },
          },
        });

        if (!department) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Department not found",
          });
        }

        return department;
      } catch (error) {
        console.error("Error in department.getById:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }),

  // Create new department
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, { message: "Name is required" }),
        code: z.string().min(1, { message: "Code is required" }),
        description: z.string().optional(),
        type: z.string(),
        branchId: z.string(),
        headId: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Using global departmentModel for department create");
        
        // Check if code is unique
        const existingDepartment = await departmentModel.findUnique({
          where: { code: input.code },
        });

        if (existingDepartment) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Department code must be unique",
          });
        }

        // Create the department
        const department = await departmentModel.create({
          data: {
            name: input.name,
            code: input.code,
            description: input.description,
            type: input.type,
            branchId: input.branchId,
            headId: input.headId,
            isActive: input.isActive ?? true,
          },
        });

        console.log("Department created successfully:", department.id);
        return department;
      } catch (error) {
        console.error("Error in department.create:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }),

  // Update department
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, { message: "Name is required" }).optional(),
        description: z.string().optional(),
        type: z.string().optional(),
        headId: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Using global departmentModel for department update");
        
        const { id, ...data } = input;

        // Check if department exists
        const department = await departmentModel.findUnique({
          where: { id },
        });

        if (!department) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Department not found",
          });
        }

        // Update the department
        const updatedDepartment = await departmentModel.update({
          where: { id },
          data,
        });

        console.log("Department updated successfully:", updatedDepartment.id);
        return updatedDepartment;
      } catch (error) {
        console.error("Error in department.update:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }),

  // Delete department
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Using global departmentModel for department delete");
        
        // Check if department exists
        const department = await departmentModel.findUnique({
          where: { id: input.id },
          include: {
            employees: {
              select: { id: true },
            },
          },
        });

        if (!department) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Department not found",
          });
        }

        // Check if department has employees
        if (department.employees.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete department with employees",
          });
        }

        // Delete the department
        await departmentModel.delete({
          where: { id: input.id },
        });

        console.log("Department deleted successfully:", input.id);
        return { success: true };
      } catch (error) {
        console.error("Error in department.delete:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }),

  // Get department statistics
  getStats: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Use the global model
        console.log("Using global departmentModel for department stats");
        const model = departmentModel;
        
        // First check if we have any departments at all
        const totalCount = await model.count();
        console.log(`Total departments in database (unfiltered): ${totalCount}`);
        
        if (totalCount === 0) {
          console.log("No departments found in database at all");
          return {
            totalDepartments: 0,
            activeDepartments: 0,
            academicDepartments: 0,
            administrativeDepartments: 0,
          };
        }
        
        // Define the base where clause for filtering by branch
        const whereBase = input.branchId ? { branchId: input.branchId } : {};
        console.log("Branch filter being applied:", JSON.stringify(whereBase, null, 2));
        
        // Get total departments count
        const totalDepartments = await model.count({
          where: whereBase,
        });
        console.log(`Total departments after branch filter: ${totalDepartments}`);

        // If the branch filter is giving us 0 results, try without it
        if (totalDepartments === 0 && input.branchId) {
          console.log("Branch filter resulted in 0 departments, trying without branch filter");
          return await getStatsWithoutBranchFilter(model);
        }

        // Get active departments count
        const activeDepartments = await model.count({
          where: {
            ...whereBase,
            isActive: true,
          },
        });

        // Get academic departments count
        const academicDepartments = await model.count({
          where: {
            ...whereBase,
            type: "Academic",
          },
        });

        // Get administrative departments count
        const administrativeDepartments = await model.count({
          where: {
            ...whereBase,
            type: "Administrative",
          },
        });

        const stats = {
          totalDepartments,
          activeDepartments,
          academicDepartments,
          administrativeDepartments,
          branchId: input.branchId
        };
        
        console.log("Department stats:", stats);
        return stats;
      } catch (error) {
        console.error("Error in department.getStats:", error);
        // Return default values instead of failing
        return {
          totalDepartments: 0,
          activeDepartments: 0,
          academicDepartments: 0,
          administrativeDepartments: 0,
        };
      }
    }),
});

// Helper function to fetch departments with pagination
async function getDepartments(db: PrismaClient, input: any) {
  const limit = input?.limit || 10;
  const cursor = input?.cursor;

  // Log the input parameters for debugging
  console.log("getDepartments input:", JSON.stringify(input, null, 2));

  try {
    // First try a query with minimal filtering to see if data exists
    const allDepartments = await db.department.findMany({
      take: 100,
    });
    
    console.log(`Total departments in database (unfiltered): ${allDepartments.length}`);
    
    if (allDepartments.length === 0) {
      console.log("No departments found in database at all");
      return { items: [], nextCursor: undefined };
    }

    // Now apply the filters, but make branch filter less strict
    let where = {};
    
    // If filtering by search terms, apply them
    if (input?.search) {
      where = {
        ...where,
        OR: [
          { name: { contains: input.search, mode: "insensitive" as const } },
          { code: { contains: input.search, mode: "insensitive" as const } },
          { description: { contains: input.search, mode: "insensitive" as const } },
        ]
      };
    }
    
    // Apply type filter if present
    if (input?.type) {
      where = { ...where, type: input.type };
    }
    
    // Apply isActive filter if present
    if (input?.isActive !== undefined) {
      where = { ...where, isActive: input.isActive };
    }
    
    // Apply branch filter if provided
    if (input?.branchId) {
      where = { ...where, branchId: input.branchId };
    }
    
    console.log("Applied where filters:", JSON.stringify(where, null, 2));

    const departments = await db.department.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { name: "asc" },
    });

    console.log(`Found ${departments.length} departments after filtering`);
    
    // Log first few items for debugging
    if (departments.length > 0) {
      console.log("First few results:", departments.slice(0, 3));
    }

    let nextCursor: typeof cursor | undefined = undefined;
    if (departments.length > limit) {
      const nextItem = departments.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items: departments,
      nextCursor,
    };
  } catch (error) {
    console.error("Error in getDepartments helper:", error);
    // Return empty results instead of failing
    return {
      items: [],
      nextCursor: undefined,
    };
  }
}

async function getStatsWithoutBranchFilter(model: PrismaClient['department']) {
  // Get total departments count
  const totalDepartments = await model.count();

  // Get active departments count
  const activeDepartments = await model.count({
    where: {
      isActive: true,
    },
  });

  // Get academic departments count
  const academicDepartments = await model.count({
    where: {
      type: "Academic",
    },
  });

  // Get administrative departments count
  const administrativeDepartments = await model.count({
    where: {
      type: "Administrative",
    },
  });

  return {
    totalDepartments,
    activeDepartments,
    academicDepartments,
    administrativeDepartments,
  };
} 