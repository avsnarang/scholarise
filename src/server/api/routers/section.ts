import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";

// Define the schema for section creation and updates
const sectionSchema = z.object({
  name: z.string().min(1, "Section name is required"),
  capacity: z.number().int().min(1, "Capacity must be at least 1").default(30),
  isActive: z.boolean().default(true),
  classId: z.string().min(1, "Class is required"),
  teacherId: z.string().optional().nullable(),
  displayOrder: z.number().int().optional().default(0),
});

export const sectionRouter = createTRPCRouter({
  getStats: publicProcedure
    .input(
      z.object({
        classId: z.string().optional(),
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Build where clause for sections
      const where: Prisma.SectionWhereInput = {
        classId: input?.classId,
        class: {
          branchId: input?.branchId,
          sessionId: input?.sessionId,
        },
      };

      // Get total sections
      const totalSections = await ctx.db.section.count({ where });

      // Get active sections
      const activeSections = await ctx.db.section.count({
        where: { ...where, isActive: true },
      });

      // Get inactive sections
      const inactiveSections = await ctx.db.section.count({
        where: { ...where, isActive: false },
      });

      // Get sections with teachers assigned
      const sectionsWithTeachers = await ctx.db.section.count({
        where: { ...where, teacherId: { not: null } },
      });

      // Get total students in all sections
      const totalStudents = await ctx.db.student.count({
        where: {
          sectionId: { not: null },
          section: {
            classId: input?.classId,
            class: {
              branchId: input?.branchId,
              sessionId: input?.sessionId,
            },
          },
        },
      });

      return {
        totalSections,
        activeSections,
        inactiveSections,
        sectionsWithTeachers,
        totalStudents,
      };
    }),

  getAll: publicProcedure
    .input(
      z.object({
        classId: z.string().optional(),
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
        isActive: z.boolean().optional(),
        search: z.string().optional(),
        includeClass: z.boolean().optional().default(false),
        includeTeacher: z.boolean().optional().default(false),
        includeStudentCount: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Build the where clause
      const where: Prisma.SectionWhereInput = {
        classId: input?.classId,
        isActive: input?.isActive,
        class: {
          branchId: input?.branchId,
          sessionId: input?.sessionId,
        },
      };

      // Add search filter if provided
      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { class: { name: { contains: input.search, mode: 'insensitive' } } },
        ];
      }

      // Get sections with optional includes
      const sections = await ctx.db.section.findMany({
        where,
        orderBy: [
          { class: { displayOrder: "asc" } },
          { class: { name: "asc" } },
          { displayOrder: "asc" },
          { name: "asc" },
        ],
        include: {
          class: input?.includeClass ? {
            include: {
              branch: true,
              session: true,
            },
          } : true,
          teacher: input?.includeTeacher,
          ...(input?.includeStudentCount ? { _count: { select: { students: true } } } : {}),
        },
      });

      // If student count is requested, transform the result
      if (input?.includeStudentCount) {
        return sections.map(section => ({
          ...section,
          studentCount: (section as any)._count?.students || 0,
          _count: undefined,
        }));
      }

      return sections;
    }),

  // Get sections for a specific class (simple format for dropdowns)
  getByClass: publicProcedure
    .input(z.object({
      classId: z.string(),
      isActive: z.boolean().optional().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const sections = await ctx.db.section.findMany({
        where: {
          classId: input.classId,
          isActive: input.isActive,
        },
        select: {
          id: true,
          name: true,
          capacity: true,
          class: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              students: true,
            },
          },
        },
        orderBy: [
          { displayOrder: 'asc' },
          { name: 'asc' },
        ],
      });

      return sections.map(section => ({
        id: section.id,
        name: section.name,
        capacity: section.capacity,
        studentCount: section._count.students,
        className: section.class.name,
        displayName: `${section.class.name} - ${section.name}`,
        availableSpots: section.capacity - section._count.students,
      }));
    }),

  // Get all sections across all classes for dropdowns - OPTIMIZED VERSION
  getSectionsForImport: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      console.log("🚀 Optimized getSectionsForImport query started");
      const startTime = Date.now();

      // Single optimized query with minimal JOINs
      const sections = await ctx.db.section.findMany({
        where: {
          isActive: true,
          class: {
            branchId: input?.branchId,
            sessionId: input?.sessionId,
            isActive: true,
          },
        },
        select: {
          id: true,
          name: true,
          capacity: true,
          displayOrder: true,
          class: {
            select: {
              name: true,
              displayOrder: true,
            },
          },
          // Use a more efficient count query
          students: {
            select: {
              id: true,
            },
            where: {
              isActive: true, // Only count active students
            },
          },
        },
        orderBy: [
          { class: { displayOrder: 'asc' } },
          { class: { name: 'asc' } },
          { displayOrder: 'asc' },
          { name: 'asc' },
        ],
      });

      const result = sections.map(section => {
        const studentCount = section.students.length;
        return {
          id: section.id,
          name: section.name,
          capacity: section.capacity,
          studentCount,
          className: section.class.name,
          displayName: `${section.class.name} - ${section.name}`,
          availableSpots: section.capacity - studentCount,
        };
      });

      const endTime = Date.now();
      console.log(`✅ getSectionsForImport completed in ${endTime - startTime}ms, returned ${result.length} sections`);
      
      return result;
    }),

  getById: publicProcedure
    .input(z.object({
      id: z.string(),
      includeStudents: z.boolean().optional().default(false),
      includeTeacher: z.boolean().optional().default(true),
      includeClass: z.boolean().optional().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const sectionData = await ctx.db.section.findUnique({
        where: { id: input.id },
        include: {
          students: input.includeStudents,
          teacher: input.includeTeacher,
          class: input.includeClass ? {
            include: {
              branch: true,
              session: true,
            },
          } : false,
        },
      });

      if (!sectionData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found",
        });
      }

      return sectionData;
    }),

  create: protectedProcedure
    .input(sectionSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Creating section with input:", input);

      // Check if the class exists
      const classData = await ctx.db.class.findUnique({
        where: { id: input.classId },
      });

      if (!classData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // Check if a section with the same name already exists for this class
      const existingSection = await ctx.db.section.findFirst({
        where: {
          name: input.name,
          classId: input.classId,
        },
      });

      if (existingSection) {
        console.log("Duplicate section found:", existingSection);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `A section with name "${input.name}" already exists for this class.`,
        });
      }

      // If teacherId is provided, check if the teacher exists and is from the same branch
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

        if (teacher.branchId !== classData.branchId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Teacher must be from the same branch as the class",
          });
        }
      }

      try {
        // Create the section
        const newSection = await ctx.db.section.create({
          data: input,
          include: {
            class: true,
            teacher: true,
          },
        });
        console.log("Section created successfully:", newSection);
        return newSection;
      } catch (error) {
        console.error("Error creating section:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create section: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Section name is required").optional(),
        capacity: z.number().int().min(1, "Capacity must be at least 1").optional(),
        isActive: z.boolean().optional(),
        teacherId: z.string().optional().nullable(),
        displayOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Get the current section
      const currentSection = await ctx.db.section.findUnique({
        where: { id },
        include: { class: true },
      });

      if (!currentSection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found",
        });
      }

      // Check if updating name would create a duplicate
      if (data.name) {
        const existingSection = await ctx.db.section.findFirst({
          where: {
            id: { not: id },
            name: data.name,
            classId: currentSection.classId,
          },
        });

        if (existingSection) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `A section with name "${data.name}" already exists for this class.`,
          });
        }
      }

      // If teacherId is being updated, validate the teacher
      if (data.teacherId !== undefined && data.teacherId) {
        const teacher = await ctx.db.teacher.findUnique({
          where: { id: data.teacherId },
        });

        if (!teacher) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Teacher not found",
          });
        }

        if (teacher.branchId !== currentSection.class.branchId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Teacher must be from the same branch as the class",
          });
        }
      }

      // Update the section
      return ctx.db.section.update({
        where: { id },
        data,
        include: {
          class: true,
          teacher: true,
        },
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
        console.log("Received section order update request with updates:", input.updates);
        
        // Validate that all section IDs exist
        const sectionIds = input.updates.map(update => update.id);
        const existingSections = await ctx.db.section.findMany({
          where: {
            id: {
              in: sectionIds
            }
          },
          select: {
            id: true,
            name: true,
            displayOrder: true,
            class: {
              select: {
                name: true,
              },
            },
          }
        });
        
        console.log("Existing sections (before update):", existingSections);
        
        if (existingSections.length !== sectionIds.length) {
          const missingIds = sectionIds.filter(id => !existingSections.find(s => s.id === id));
          console.error("Not all section IDs exist. Missing IDs:", missingIds);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more sections do not exist"
          });
        }
        
        const updateResults = [];
        
        // Process updates sequentially
        for (const update of input.updates) {
          console.log(`Updating section ID ${update.id} to displayOrder ${update.displayOrder}`);
          
          try {
            const result = await ctx.db.section.update({
              where: { id: update.id },
              data: { 
                displayOrder: update.displayOrder 
              },
              select: {
                id: true,
                name: true,
                displayOrder: true,
                class: {
                  select: {
                    name: true,
                  },
                },
              }
            });
            
            updateResults.push(result);
            console.log(`Successfully updated section: ${result.class.name} - ${result.name} - Display order: ${result.displayOrder}`);
          } catch (err) {
            console.error(`Error updating section ${update.id}:`, err);
          }
        }
        
        // Verify the updates were successful
        const verifySections = await ctx.db.section.findMany({
          where: {
            id: {
              in: sectionIds
            }
          },
          select: {
            id: true,
            name: true,
            displayOrder: true,
            class: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            displayOrder: 'asc'
          }
        });
        
        console.log("Verification - sections after update:", verifySections);
        
        return { 
          success: true, 
          updatedCount: updateResults.length,
          results: verifySections
        };
      } catch (error) {
        console.error("Error updating section order:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update section order: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if there are any students in this section
      const studentCount = await ctx.db.student.count({
        where: { sectionId: input.id },
      });

      if (studentCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete this section because it has ${studentCount} students. Please reassign or remove these students first.`,
        });
      }

      // Delete the section
      return ctx.db.section.delete({
        where: { id: input.id },
      });
    }),

  // Get students in a section
  getStudents: publicProcedure
    .input(z.object({
      sectionId: z.string(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { sectionId, isActive } = input;
      
      console.log(`Getting students for section ${sectionId}`);
      
      const students = await ctx.db.student.findMany({
        where: {
          sectionId,
          ...(isActive !== undefined ? { isActive } : {})
        },
        orderBy: [
          { firstName: "asc" },
          { lastName: "asc" },
        ],
        include: {
          section: {
            include: {
              class: true,
            },
          },
        },
      });
      
      console.log(`Returning ${students.length} students in section ${sectionId}`);
      return students;
    }),

  // Assign a teacher to a section
  assignTeacher: protectedProcedure
    .input(z.object({
      sectionId: z.string(),
      teacherId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if the section exists
      const sectionData = await ctx.db.section.findUnique({
        where: { id: input.sectionId },
        include: { class: true },
      });

      if (!sectionData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found",
        });
      }

      // If teacherId is provided, check if the teacher exists
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

        // Check if teacher is from the same branch as the section's class
        if (teacher.branchId !== sectionData.class.branchId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Teacher must be from the same branch as the section's class",
          });
        }
      }

      // Update the section with the new teacher
      return ctx.db.section.update({
        where: { id: input.sectionId },
        data: {
          teacherId: input.teacherId,
        },
        include: {
          teacher: true,
          class: true,
        },
      });
    }),

  // Toggle the active status of a section
  toggleStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if the section exists
      const sectionData = await ctx.db.section.findUnique({
        where: { id: input.id },
      });

      if (!sectionData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found",
        });
      }

      // If isActive is provided, use it; otherwise toggle the current value
      const newStatus = input.isActive !== undefined ? input.isActive : !sectionData.isActive;

      // Update the section with the new status
      return ctx.db.section.update({
        where: { id: input.id },
        data: {
          isActive: newStatus,
        },
      });
    }),
}); 