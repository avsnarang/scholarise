import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";

// Define the schema for class creation and updates
const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  grade: z.number().int().min(1).max(12).optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  branchId: z.string().min(1, "Branch is required"),
  sessionId: z.string().min(1, "Academic session is required"),
  displayOrder: z.number().int().optional().default(0),
});

export const classRouter = createTRPCRouter({
  getStats: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Get total classes
      const totalClasses = await ctx.db.class.count({
        where: {
          branchId: input?.branchId,
          sessionId: input?.sessionId,
        },
      });

      // Get active classes
      const activeClasses = await ctx.db.class.count({
        where: {
          branchId: input?.branchId,
          sessionId: input?.sessionId,
          isActive: true,
        },
      });

      // Get inactive classes
      const inactiveClasses = await ctx.db.class.count({
        where: {
          branchId: input?.branchId,
          sessionId: input?.sessionId,
          isActive: false,
        },
      });

      // Get total sections across all classes
      const totalSections = await ctx.db.section.count({
        where: {
          class: {
            branchId: input?.branchId,
            sessionId: input?.sessionId,
          },
        },
      });

      // Get total students across all sections
      const totalStudents = await ctx.db.student.count({
        where: {
          branchId: input?.branchId,
          section: {
            class: input?.sessionId
              ? {
                  sessionId: input.sessionId,
                }
              : undefined,
          },
        },
      });

      return {
        totalClasses,
        activeClasses,
        inactiveClasses,
        totalSections,
        totalStudents,
      };
    }),

  getAll: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
        isActive: z.boolean().optional(),
        search: z.string().optional(),
        includeSections: z.boolean().optional().default(false),
        includeSectionCount: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Build the where clause
      const where: Prisma.ClassWhereInput = {
        branchId: input?.branchId,
        sessionId: input?.sessionId,
        isActive: input?.isActive,
      };

      // Add search filter if provided
      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { description: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      // Get classes with optional includes
      const classes = await ctx.db.class.findMany({
        where,
        orderBy: [
          { displayOrder: "asc" },
          { name: "asc" },
        ],
        include: {
          branch: true,
          session: true,
          sections: input?.includeSections ? {
            orderBy: [
              { displayOrder: "asc" },
              { name: "asc" },
            ],
            include: {
              teacher: true,
              _count: { select: { students: true } },
            },
          } : false,
          ...(input?.includeSectionCount ? { _count: { select: { sections: true } } } : {}),
        },
      });

      // If section count is requested, transform the result
      if (input?.includeSectionCount) {
        return classes;
      }

      return classes;
    }),

  getById: publicProcedure
    .input(z.object({
      id: z.string(),
      includeSections: z.boolean().optional().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const classData = await ctx.db.class.findUnique({
        where: { id: input.id },
        include: {
          branch: true,
          session: true,
          sections: input.includeSections ? {
            orderBy: [
              { displayOrder: "asc" },
              { name: "asc" },
            ],
            include: {
              teacher: true,
              _count: { select: { students: true } },
            },
          } : false,
        },
      });

      if (!classData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      return classData;
    }),

  create: protectedProcedure
    .input(classSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Creating class with input:", input);

      // Check if a class with the same name already exists for this session and branch
      const existingClass = await ctx.db.class.findFirst({
        where: {
          name: input.name,
          branchId: input.branchId,
          sessionId: input.sessionId,
        },
      });

      if (existingClass) {
        console.log("Duplicate class found:", existingClass);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `A class with name "${input.name}" already exists for this session and branch.`,
        });
      }

      try {
        // Create the class
        const newClass = await ctx.db.class.create({
          data: input,
        });
        console.log("Class created successfully:", newClass);
        return newClass;
      } catch (error) {
        console.error("Error creating class:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create class: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Class name is required").optional(),
        grade: z.number().int().min(1).max(12).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Get the current class
      const currentClass = await ctx.db.class.findUnique({
        where: { id },
      });

      if (!currentClass) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // Check if updating name would create a duplicate
      if (data.name) {
        const existingClass = await ctx.db.class.findFirst({
          where: {
            id: { not: id },
            name: data.name,
            branchId: currentClass.branchId,
            sessionId: currentClass.sessionId,
          },
        });

        if (existingClass) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `A class with name "${data.name}" already exists for this session and branch.`,
          });
        }
      }

      // Update the class
      return ctx.db.class.update({
        where: { id },
        data,
      });
    }),

  updateOrder: protectedProcedure
    .input(z.object({
      updates: z.array(z.object({
        id: z.string(),
        displayOrder: z.number()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Log input for debugging
        console.log("Received class order update request with updates:", input.updates);
        
        // Validate that all class IDs exist
        const classIds = input.updates.map(update => update.id);
        const existingClasses = await ctx.db.class.findMany({
          where: {
            id: {
              in: classIds
            }
          },
          select: {
            id: true,
            name: true,
            displayOrder: true
          }
        });
        
        console.log("Existing classes (before update):", existingClasses);
        
        if (existingClasses.length !== classIds.length) {
          const missingIds = classIds.filter(id => !existingClasses.find(c => c.id === id));
          console.error("Not all class IDs exist. Missing IDs:", missingIds);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more classes do not exist"
          });
        }
        
        const updateResults = [];
        
        // Process updates sequentially
        for (const update of input.updates) {
          console.log(`Updating class ID ${update.id} to displayOrder ${update.displayOrder}`);
          
          try {
            const result = await ctx.db.class.update({
              where: { id: update.id },
              data: { 
                displayOrder: update.displayOrder 
              },
              select: {
                id: true,
                name: true,
                displayOrder: true
              }
            });
            
            updateResults.push(result);
            console.log(`Successfully updated class: ${result.name} - Display order: ${result.displayOrder}`);
          } catch (err) {
            console.error(`Error updating class ${update.id}:`, err);
          }
        }
        
        // Verify the updates were successful
        const verifyClasses = await ctx.db.class.findMany({
          where: {
            id: {
              in: classIds
            }
          },
          select: {
            id: true,
            name: true,
            displayOrder: true
          },
          orderBy: {
            displayOrder: 'asc'
          }
        });
        
        console.log("Verification - classes after update:", verifyClasses);
        
        return { 
          success: true, 
          updatedCount: updateResults.length,
          results: verifyClasses
        };
      } catch (error) {
        console.error("Error updating class order:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update class order: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if there are any sections in this class
      const sectionCount = await ctx.db.section.count({
        where: { classId: input.id },
      });

      if (sectionCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete this class because it has ${sectionCount} sections. Please delete the sections first.`,
        });
      }

      // Delete the class
      return ctx.db.class.delete({
        where: { id: input.id },
      });
    }),

  getSections: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        branchId: z.string(),
        classId: z.string().optional(),
        includeStudentCount: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        class: {
          sessionId: input.sessionId,
          branchId: input.branchId,
        },
      };

      if (input.classId) {
        where.classId = input.classId;
      }

      const sections = await ctx.db.section.findMany({
        where,
        orderBy: [
          { class: { displayOrder: "asc" } },
          { class: { name: "asc" } },
          { displayOrder: "asc" },
          { name: "asc" },
        ],
        include: {
          class: true,
          teacher: true,
          ...(input.includeStudentCount ? { _count: { select: { students: true } } } : {}),
        },
      });

      return sections;
    }),

  // Toggle the active status of a class
  toggleStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if the class exists
      const classData = await ctx.db.class.findUnique({
        where: { id: input.id },
      });

      if (!classData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // If isActive is provided, use it; otherwise toggle the current value
      const newStatus = input.isActive !== undefined ? input.isActive : !classData.isActive;

      // Update the class with the new status
      return ctx.db.class.update({
        where: { id: input.id },
        data: {
          isActive: newStatus,
        },
      });
    }),

  // Get class IDs for import functionality - returns classes with sections for Excel template
  getClassIdsForImport: publicProcedure
    .input(
      z.object({
        branchId: z.string(),
        sessionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const classes = await ctx.db.class.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          isActive: true,
        },
        include: {
          sections: {
            where: { isActive: true },
            orderBy: [
              { displayOrder: "asc" },
              { name: "asc" },
            ],
          },
        },
        orderBy: [
          { displayOrder: "asc" },
          { name: "asc" },
        ],
      });

      // Flatten classes with their sections for Excel import
      const classWithSections = classes.flatMap(cls => 
        cls.sections.map(section => ({
          id: `${cls.id}-${section.id}`, // Make unique by combining class and section IDs
          classId: cls.id, // Keep original class ID for reference
          sectionId: section.id, // Keep original section ID for reference
          name: cls.name,
          section: section.name,
          displayName: `${cls.name}-${section.name}`,
        }))
      );

      return classWithSections;
    }),
});
