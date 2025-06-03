import { z } from "zod";
import { protectedProcedure, publicProcedure, createTRPCRouter } from "../trpc";
import { TRPCError } from "@trpc/server";

const moneyCollectionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  branchId: z.string(),
  classIds: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
});

const moneyCollectionItemSchema = z.object({
  moneyCollectionId: z.string(),
  studentId: z.string(),
  amount: z.number(),
  notes: z.string().optional(),
});

export const moneyCollectionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(moneyCollectionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate the branch ID
        if (!input.branchId || typeof input.branchId !== 'string') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Valid branch ID is required',
          });
        }
        
        // Log all input data for debugging
        console.log("Money collection input received:", JSON.stringify(input, null, 2));
        
        // Create transaction to ensure all operations complete together
        return await ctx.db.$transaction(async (prisma) => {
          // 1. Create the money collection
          const moneyCollection = await prisma.moneyCollection.create({
            data: {
              title: input.title,
              description: input.description || '',
              branchId: input.branchId,
              ...(input.sessionId ? { sessionId: input.sessionId } : {}),
            },
          });
          
          console.log("Money collection created successfully with ID:", moneyCollection.id);
          
          // 2. If classIds are provided, create class associations
          if (input.classIds && input.classIds.length > 0) {
            console.log(`Creating ${input.classIds.length} class associations`);
            
            // Create MoneyCollectionClass entries for each class
            for (const classId of input.classIds) {
              await prisma.moneyCollectionClass.create({
                data: {
                  moneyCollectionId: moneyCollection.id,
                  classId,
                }
              });
            }
            
            console.log(`Created ${input.classIds.length} class associations`);
          }
          
          // 3. Return the created money collection with all relationships
          const result = await prisma.moneyCollection.findUnique({
            where: { id: moneyCollection.id },
            include: {
              branch: true,
              classes: {
                include: {
                  class: true,
                },
              },
              session: true,
            },
          });
          
          console.log("Complete money collection with relationships:", JSON.stringify(result, null, 2));
          return result;
        });
      } catch (error) {
        console.error("Error creating money collection:", error);
        throw error;
      }
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.moneyCollection.findMany({
      include: {
        branch: true,
        classes: {
          include: {
            class: true,
          },
        },
        session: true,
        items: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const moneyCollection = await ctx.db.moneyCollection.findUnique({
        where: { id: input.id },
        include: {
          branch: true,
          session: true,
          classes: {
            include: {
              class: true,
            },
          },
          items: {
            include: {
              student: true,
            },
          },
        },
      });

      if (!moneyCollection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Money collection not found",
        });
      }

      return moneyCollection;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.moneyCollection.delete({
        where: { id: input.id },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: moneyCollectionSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.$transaction(async (prisma) => {
          const { classIds, ...restData } = input.data;
          
          // 1. Update the money collection basic data
          const updatedCollection = await prisma.moneyCollection.update({
            where: { id: input.id },
            data: {
              ...restData,
            },
          });
          
          // 2. If classIds are provided, update class associations
          if (classIds !== undefined) {
            // First, remove all existing class associations
            await prisma.moneyCollectionClass.deleteMany({
              where: {
                moneyCollectionId: input.id,
              },
            });
            
            // Then create new class associations if there are any classes selected
            if (classIds.length > 0) {
              for (const classId of classIds) {
                await prisma.moneyCollectionClass.create({
                  data: {
                    moneyCollectionId: input.id,
                    classId,
                  }
                });
              }
            }
          }
          
          // 3. Return the updated collection with all relationships
          return prisma.moneyCollection.findUnique({
            where: { id: input.id },
            include: {
              branch: true,
              classes: {
                include: {
                  class: true,
                },
              },
              session: true,
            },
          });
        });
      } catch (error) {
        console.error("Error updating money collection:", error);
        throw error;
      }
    }),

  addItem: protectedProcedure
    .input(moneyCollectionItemSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.moneyCollectionItem.create({
        data: {
          moneyCollectionId: input.moneyCollectionId,
          studentId: input.studentId,
          amount: input.amount,
          notes: input.notes,
        },
      });
    }),

  updateItem: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: moneyCollectionItemSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.moneyCollectionItem.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.moneyCollectionItem.delete({
        where: { id: input.id },
      });
    }),

  getStudentsByClass: publicProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.student.findMany({
        where: {
          sectionId: input.classId,
          isActive: true,
        },
        orderBy: {
          firstName: "asc",
        },
      });
    }),

  getDetailedStudentsByClass: publicProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      // First fetch all students for the class
      const students = await ctx.db.student.findMany({
        where: {
          sectionId: input.classId,
          isActive: true,
        },
        include: {
          section: true,
        },
        orderBy: [
          { firstName: "asc" }, // Secondary sort by name
        ],
      });
      
      // Then sort the students with numeric roll number sorting
      return students.sort((a, b) => {
        // If either roll number is missing, put those at the end
        if (!a.rollNumber) return 1;
        if (!b.rollNumber) return -1;
        
        // Use roll numbers directly since they are already numbers
        const rollA = a.rollNumber || 0;
        const rollB = b.rollNumber || 0;
        
        return rollA - rollB;
      });
    }),
}); 