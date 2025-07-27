import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { uploadWhatsAppMedia, deleteWhatsAppMedia, validateWhatsAppMedia } from "@/utils/whatsapp-media";

export const mediaRouter = createTRPCRouter({
  // Upload media for WhatsApp templates/chat
  uploadMedia: protectedProcedure
    .input(z.object({
      files: z.array(z.object({
        name: z.string(),
        type: z.string(),
        size: z.number(),
        base64: z.string(), // File content as base64
      })),
      context: z.enum(["TEMPLATE", "CHAT"]).default("TEMPLATE"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          });
        }

        const uploadResults = [];

        for (const fileData of input.files) {
          // Convert base64 to File object
          const buffer = Buffer.from(fileData.base64, 'base64');
          const file = new File([buffer], fileData.name, { type: fileData.type });

          // Validate file
          const validation = validateWhatsAppMedia(file);
          if (!validation.isValid) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `File ${fileData.name} is invalid: ${validation.errors.join(', ')}`,
            });
          }

          // Upload to Supabase
          const result = await uploadWhatsAppMedia(file, userId);
          uploadResults.push(result);
        }

        return {
          success: true,
          media: uploadResults,
        };
      } catch (error) {
        console.error('Media upload error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to upload media',
        });
      }
    }),

  // Get media info
  getMediaInfo: protectedProcedure
    .input(z.object({
      mediaId: z.string(),
      context: z.enum(["TEMPLATE", "CHAT"]).default("TEMPLATE"),
    }))
    .query(async ({ input, ctx }) => {
      try {
        if (input.context === "TEMPLATE") {
          const media = await ctx.db.templateMedia.findUnique({
            where: { id: input.mediaId },
            include: {
              template: {
                select: {
                  name: true,
                  category: true,
                },
              },
            },
          });

          if (!media) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Media not found',
            });
          }

          return media;
        } else {
          const media = await ctx.db.chatMessageMedia.findUnique({
            where: { id: input.mediaId },
            include: {
              message: {
                select: {
                  id: true,
                  content: true,
                },
              },
            },
          });

          if (!media) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Media not found',
            });
          }

          return media;
        }
      } catch (error) {
        console.error('Get media info error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get media info',
        });
      }
    }),

  // Delete media
  deleteMedia: protectedProcedure
    .input(z.object({
      mediaId: z.string(),
      context: z.enum(["TEMPLATE", "CHAT"]).default("TEMPLATE"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        let media;
        
        if (input.context === "TEMPLATE") {
          media = await ctx.db.templateMedia.findUnique({
            where: { id: input.mediaId },
          });

          if (!media) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Media not found',
            });
          }

          // Delete from Supabase Storage
          await deleteWhatsAppMedia(media.supabasePath || '', media.supabaseBucket);

          // Delete from database
          await ctx.db.templateMedia.delete({
            where: { id: input.mediaId },
          });
        } else {
          media = await ctx.db.chatMessageMedia.findUnique({
            where: { id: input.mediaId },
          });

          if (!media) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Media not found',
            });
          }

          // Delete from Supabase Storage
          await deleteWhatsAppMedia(media.supabasePath || '', media.supabaseBucket);

          // Delete from database
          await ctx.db.chatMessageMedia.delete({
            where: { id: input.mediaId },
          });
        }

        return {
          success: true,
          message: 'Media deleted successfully',
        };
      } catch (error) {
        console.error('Delete media error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete media',
        });
      }
    }),

  // Validate media files
  validateFiles: publicProcedure
    .input(z.object({
      files: z.array(z.object({
        name: z.string(),
        type: z.string(),
        size: z.number(),
      })),
    }))
    .query(({ input }) => {
      const results = input.files.map(fileData => {
        // Create a mock File object for validation
        const file = new File([], fileData.name, { type: fileData.type });
        Object.defineProperty(file, 'size', { value: fileData.size });
        
        const validation = validateWhatsAppMedia(file);
        
        return {
          filename: fileData.name,
          isValid: validation.isValid,
          errors: validation.errors,
          type: validation.type,
          // suggestedType: validation.suggestedType, // Removed as not part of current interface
        };
      });

      return {
        results,
        allValid: results.every(r => r.isValid),
      };
    }),

  // Get media usage statistics
  getMediaStats: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      context: z.enum(["TEMPLATE", "CHAT", "ALL"]).default("ALL"),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const stats = {
          totalFiles: 0,
          totalSize: 0,
          byType: {
            IMAGE: { count: 0, size: 0 },
            VIDEO: { count: 0, size: 0 },
            DOCUMENT: { count: 0, size: 0 },
            AUDIO: { count: 0, size: 0 },
          },
        };

        if (input.context === "TEMPLATE" || input.context === "ALL") {
          const templateWhere = input.branchId 
            ? { template: { branchId: input.branchId } }
            : {};

          const templateMedia = await ctx.db.templateMedia.findMany({
            where: templateWhere,
            select: {
              type: true,
              size: true,
            },
          });

          templateMedia.forEach(media => {
            stats.totalFiles++;
            stats.totalSize += media.size || 0;
            const type = media.type as keyof typeof stats.byType;
            if (stats.byType[type]) {
              stats.byType[type].count++;
              stats.byType[type].size += media.size || 0;
            }
          });
        }

        if (input.context === "CHAT" || input.context === "ALL") {
          const chatMedia = await ctx.db.chatMessageMedia.findMany({
            select: {
              type: true,
              size: true,
            },
          });

          chatMedia.forEach(media => {
            stats.totalFiles++;
            stats.totalSize += media.size || 0;
            const type = media.type as keyof typeof stats.byType;
            if (stats.byType[type]) {
              stats.byType[type].count++;
              stats.byType[type].size += media.size || 0;
            }
          });
        }

        return stats;
      } catch (error) {
        console.error('Get media stats error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get media statistics',
        });
      }
    }),
}); 