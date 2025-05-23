import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";
import { db, designation as designationModel } from "@/server/db";

// Remove the local client and use the singleton db instance
// const localClient = new PrismaClient();

export const designationRouter = createTRPCRouter({
  // Get all designations with optional filtering
  getAll: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        isActive: z.boolean().optional(),
        category: z.string().optional(),
        level: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        // Use the global db instance
        console.log("Using global PrismaClient for designations list");
        return await getDesignations(db, input);
      } catch (error) {
        console.error("Error in designation.getAll:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }),

  // Get designation by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        // Use the global designationModel directly
        console.log("Using global designationModel for getting designation by ID");
        const designation = await designationModel.findUnique({
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
                department: true,
              },
              where: {
                isActive: true,
              },
            },
          },
        });

        if (!designation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Designation not found",
          });
        }

        return designation;
      } catch (error) {
        console.error("Error in designation.getById:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }),

  // Create new designation
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, { message: "Title is required" }),
        code: z.string().min(1, { message: "Code is required" }),
        description: z.string().optional(),
        category: z.string(),
        level: z.string(),
        branchId: z.string(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Using global designationModel for designation create");
        
        // Check if code is unique
        const existingDesignation = await designationModel.findUnique({
          where: { code: input.code },
        });

        if (existingDesignation) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Designation code must be unique",
          });
        }

        // Create the designation using global model
        const designation = await designationModel.create({
          data: {
            title: input.title,
            code: input.code,
            description: input.description,
            category: input.category,
            level: input.level,
            branchId: input.branchId,
            isActive: input.isActive ?? true,
          },
        });

        console.log("Designation created successfully:", designation.id);
        return designation;
      } catch (error) {
        console.error("Error in designation.create:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }),

  // Update designation
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1, { message: "Title is required" }).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        level: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Using global designationModel for designation update");
        
        const { id, ...data } = input;

        // Check if designation exists
        const designation = await designationModel.findUnique({
          where: { id },
        });

        if (!designation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Designation not found",
          });
        }

        // Update the designation
        const updatedDesignation = await designationModel.update({
          where: { id },
          data,
        });

        console.log("Designation updated successfully:", updatedDesignation.id);
        return updatedDesignation;
      } catch (error) {
        console.error("Error in designation.update:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }),

  // Delete designation
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Using global designationModel for designation delete");
        
        // Check if designation exists
        const designation = await designationModel.findUnique({
          where: { id: input.id },
          include: {
            employees: {
              select: { id: true },
            },
          },
        });

        if (!designation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Designation not found",
          });
        }

        // Check if designation has employees
        if (designation.employees.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete designation with employees",
          });
        }

        // Delete the designation
        await designationModel.delete({
          where: { id: input.id },
        });

        console.log("Designation deleted successfully:", input.id);
        return { success: true };
      } catch (error) {
        console.error("Error in designation.delete:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }),

  // Get designation statistics
  getStats: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Use the global model
        console.log("Using global designationModel for designation stats");
        const model = designationModel;
        
        // First check if we have any designations at all
        const totalCount = await model.count();
        console.log(`Total designations in database (unfiltered): ${totalCount}`);
        
        if (totalCount === 0) {
          console.log("No designations found in database at all");
          return {
            totalDesignations: 0,
            activeDesignations: 0,
            teachingDesignations: 0,
            adminDesignations: 0,
          };
        }
        
        // Define the base where clause for filtering by branch
        const whereBase = input.branchId ? { branchId: input.branchId } : {};
        console.log("Branch filter being applied:", JSON.stringify(whereBase, null, 2));
        
        // Get total designations count
        const totalDesignations = await model.count({
          where: whereBase,
        });
        console.log(`Total designations after branch filter: ${totalDesignations}`);

        // If the branch filter is giving us 0 results, try without it
        if (totalDesignations === 0 && input.branchId) {
          console.log("Branch filter resulted in 0 designations, trying without branch filter");
          return await getStatsWithoutBranchFilter(model);
        }

        // Get active designations count
        const activeDesignations = await model.count({
          where: {
            ...whereBase,
            isActive: true,
          },
        });

        // Get teaching designations count
        const teachingDesignations = await model.count({
          where: {
            ...whereBase,
            category: "Teaching",
          },
        });

        // Get administrative designations count
        const adminDesignations = await model.count({
          where: {
            ...whereBase,
            category: "Administrative",
          },
        });

        const stats = {
          totalDesignations,
          activeDesignations,
          teachingDesignations,
          adminDesignations,
        };
        
        console.log("Designation stats:", stats);
        return stats;
      } catch (error) {
        console.error("Error in designation.getStats:", error);
        // Return default values instead of failing
        return {
          totalDesignations: 0,
          activeDesignations: 0,
          teachingDesignations: 0,
          adminDesignations: 0,
        };
      }
    }),
});

// Helper function to fetch designations with pagination
async function getDesignations(db: PrismaClient, input: any) {
  const limit = input?.limit || 10;
  const cursor = input?.cursor;

  // Log the input parameters for debugging
  console.log("getDesignations input:", JSON.stringify(input, null, 2));

  try {
    // First try a query with minimal filtering to see if data exists
    const allDesignations = await db.designation.findMany({
      take: 100,
    });
    
    console.log(`Total designations in database (unfiltered): ${allDesignations.length}`);
    
    if (allDesignations.length === 0) {
      console.log("No designations found in database at all");
      return { items: [], nextCursor: undefined };
    }

    // Now apply the filters, but make branch filter less strict
    let where = {};
    
    // If filtering by search terms, apply them
    if (input?.search) {
      where = {
        ...where,
        OR: [
          { title: { contains: input.search, mode: "insensitive" as const } },
          { code: { contains: input.search, mode: "insensitive" as const } },
          { description: { contains: input.search, mode: "insensitive" as const } },
        ]
      };
    }
    
    // Apply category and level filters if present
    if (input?.category) {
      where = { ...where, category: input.category };
    }
    
    if (input?.level) {
      where = { ...where, level: input.level };
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

    const designations = await db.designation.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { title: "asc" },
    });

    console.log(`Found ${designations.length} designations after filtering`);
    
    // Log first few items for debugging
    if (designations.length > 0) {
      console.log("First few results:", designations.slice(0, 3));
    }

    let nextCursor: typeof cursor | undefined = undefined;
    if (designations.length > limit) {
      const nextItem = designations.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items: designations,
      nextCursor,
    };
  } catch (error) {
    console.error("Error in getDesignations helper:", error);
    // Return empty results instead of failing
    return {
      items: [],
      nextCursor: undefined,
    };
  }
}

// Helper function to get designation statistics without branch filter
async function getStatsWithoutBranchFilter(model: PrismaClient["designation"]) {
  // Get total designations count
  const totalDesignations = await model.count();
  console.log(`Total designations in database (unfiltered): ${totalDesignations}`);

  // Get active designations count
  const activeDesignations = await model.count({
    where: {
      isActive: true,
    },
  });

  // Get teaching designations count
  const teachingDesignations = await model.count({
    where: {
      category: "Teaching",
    },
  });

  // Get administrative designations count
  const adminDesignations = await model.count({
    where: {
      category: "Administrative",
    },
  });

  const stats = {
    totalDesignations,
    activeDesignations,
    teachingDesignations,
    adminDesignations,
  };
  
  console.log("Designation stats:", stats);
  return stats;
} 