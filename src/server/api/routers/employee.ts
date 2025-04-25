import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";

export const employeeRouter = createTRPCRouter({
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
      let whereClause = {
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
        include: {
          user: true,
        },
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
});
