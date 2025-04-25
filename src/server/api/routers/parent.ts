import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";

export const parentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        // Father information
        fatherName: z.string().optional(),
        fatherDob: z.string().optional().transform(val => val ? new Date(val) : undefined),
        fatherEducation: z.string().optional(),
        fatherOccupation: z.string().optional(),
        fatherMobile: z.string().optional(),
        fatherEmail: z.string().email().optional().nullable(),
        // Mother information
        motherName: z.string().optional(),
        motherDob: z.string().optional().transform(val => val ? new Date(val) : undefined),
        motherEducation: z.string().optional(),
        motherOccupation: z.string().optional(),
        motherMobile: z.string().optional(),
        motherEmail: z.string().email().optional().nullable(),
        // Guardian information
        guardianName: z.string().optional(),
        guardianDob: z.string().optional().transform(val => val ? new Date(val) : undefined),
        guardianEducation: z.string().optional(),
        guardianOccupation: z.string().optional(),
        guardianMobile: z.string().optional(),
        guardianEmail: z.string().email().optional().nullable(),
        // Additional information
        parentAnniversary: z.string().optional().transform(val => val ? new Date(val) : undefined),
        monthlyIncome: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create directly using type assertion to bypass TypeScript checking
      // until the database schema and Prisma client are fully in sync
      const data = {
        fatherName: input.fatherName,
        fatherDob: input.fatherDob,
        fatherEducation: input.fatherEducation,
        fatherOccupation: input.fatherOccupation,
        fatherMobile: input.fatherMobile,
        fatherEmail: input.fatherEmail,
        motherName: input.motherName,
        motherDob: input.motherDob,
        motherEducation: input.motherEducation,
        motherOccupation: input.motherOccupation,
        motherMobile: input.motherMobile,
        motherEmail: input.motherEmail,
        guardianName: input.guardianName,
        guardianDob: input.guardianDob,
        guardianEducation: input.guardianEducation,
        guardianOccupation: input.guardianOccupation,
        guardianMobile: input.guardianMobile,
        guardianEmail: input.guardianEmail,
        parentAnniversary: input.parentAnniversary,
        monthlyIncome: input.monthlyIncome,
      } as Prisma.ParentCreateInput;
      
      return ctx.db.parent.create({ data });
    }),
  getAll: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;

      const parents = await ctx.db.parent.findMany({
        take: limit + 1,
        where: {
          OR: input?.search
            ? [
                { fatherName: { contains: input.search, mode: "insensitive" } },
                { motherName: { contains: input.search, mode: "insensitive" } },
                { guardianName: { contains: input.search, mode: "insensitive" } },
              ]
            : undefined,
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: "asc" },
      }).then(results => results.map(parent => ({
        ...parent,
        // Add these for compatibility with compiled code that's expecting them
        firstName: null, 
        lastName: null,
        phone: null,
      })));

      let nextCursor: string | undefined = undefined;
      if (parents.length > limit) {
        const nextItem = parents.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: parents,
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const parent = await ctx.db.parent.findUnique({
        where: { id: input.id },
        include: {
          students: true,
        },
      });

      if (!parent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parent not found",
        });
      }

      // Add compatibility fields
      return {
        ...parent,
        firstName: null,
        lastName: null,
        phone: null,
      };
    }),
});
