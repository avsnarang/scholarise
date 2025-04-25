import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// NOTICE: This router is currently inactive because the required models
// (page, permission, userPermission, rolePermission, groupPermission, userRole, userGroup)
// no longer exist in the Prisma schema. Keep this file for reference or delete it if not needed.

// Either delete this file or uncomment and update the router when the models are added to the schema
export const permissionRouter = createTRPCRouter({});

/* Original router code removed due to missing models in schema
export const permissionRouter = createTRPCRouter({
  getForResource: protectedProcedure
    .input(
      z.object({
        resourceType: z.string(),
        resourceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // ... content omitted for brevity ...
    }),

  // ... other procedures omitted for brevity ...
});
*/