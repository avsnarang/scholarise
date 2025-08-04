import { z } from "zod";
import { customAlphabet } from "nanoid";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

const nanoid = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);

export const shortUrlRouter = createTRPCRouter({
  createShortUrl: publicProcedure
    .input(
      z.object({
        originalUrl: z.string().url("Invalid URL provided"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shortId = nanoid();
      
      try {
        const newShortUrl = await ctx.db.shortUrl.create({
          data: {
            shortId,
            originalUrl: input.originalUrl,
          },
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        return {
          shortUrl: `${baseUrl}/r/${newShortUrl.shortId}`,
        };
      } catch (error) {
        console.error("Failed to create short URL:", error);

        let errorMessage = "Could not create short URL.";
        if (process.env.NODE_ENV !== "production" && error instanceof Error) {
          errorMessage = `Could not create short URL: ${error.message}`;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMessage,
        });
      }
    }),

  getUrl: publicProcedure
    .input(
      z.object({
        shortId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!input.shortId) {
        return { originalUrl: null };
      }
      
      const urlMapping = await ctx.db.shortUrl.findUnique({
        where: {
          shortId: input.shortId,
        },
      });

      if (urlMapping) {
        // Don't await this, just fire and forget
        ctx.db.shortUrl.update({
            where: { id: urlMapping.id },
            data: { clicks: { increment: 1 } },
        }).catch(console.error);
      }

      return {
        originalUrl: urlMapping?.originalUrl || null,
      };
    }),
});
