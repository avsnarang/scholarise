import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Input validation schemas
const getConversationsSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  search: z.string().optional(),
  participantType: z.enum(["student", "teacher", "employee", "parent", "unknown"]).optional(),
});

const getConversationSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
});

const getMessagesSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const sendMessageSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  content: z.string().min(1, "Message content is required"),
  messageType: z.enum(["TEXT", "IMAGE", "DOCUMENT", "AUDIO", "VIDEO", "LOCATION"]).default("TEXT"),
});

const markMessagesAsReadSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  messageIds: z.array(z.string()).optional(),
});

const updateConversationSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  isActive: z.boolean().optional(),
});

const checkMessageWindowSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
});

const sendTemplateMessageSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  templateId: z.string().min(1, "Template ID is required"),
  templateVariables: z.record(z.string()).optional(),
});

const getTemplatesSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
});

export const chatRouter = createTRPCRouter({
  
  // Get all conversations for a branch
  getConversations: protectedProcedure
    .input(getConversationsSchema)
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {
        branchId: input.branchId,
      };

      // Add search filter
      if (input.search) {
        whereConditions.OR = [
          { participantName: { contains: input.search, mode: 'insensitive' } },
          { participantPhone: { contains: input.search } },
          { lastMessageContent: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      // Add participant type filter
      if (input.participantType) {
        whereConditions.participantType = input.participantType;
      }

      const conversations = await ctx.db.conversation.findMany({
        where: whereConditions,
        include: {
          _count: {
            select: { messages: true }
          }
        },
        orderBy: [
          { lastMessageAt: 'desc' },
          { createdAt: 'desc' }
        ],
        take: input.limit,
        skip: input.offset,
      });

      const total = await ctx.db.conversation.count({
        where: whereConditions,
      });

      return {
        conversations,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Get a specific conversation
  getConversation: protectedProcedure
    .input(getConversationSchema)
    .query(async ({ ctx, input }) => {
      const conversation = await ctx.db.conversation.findUnique({
        where: { id: input.conversationId },
        include: {
          branch: { select: { name: true, code: true } },
          _count: {
            select: { messages: true }
          }
        }
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      return conversation;
    }),

  // Get messages for a conversation
  getMessages: protectedProcedure
    .input(getMessagesSchema)
    .query(async ({ ctx, input }) => {
      const messages = await ctx.db.chatMessage.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
      });

      const total = await ctx.db.chatMessage.count({
        where: { conversationId: input.conversationId },
      });

      // Return in ascending order for chat display
      return {
        messages: messages.reverse(),
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Send a message (outgoing)
  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Get conversation details
        const conversation = await ctx.db.conversation.findUnique({
          where: { id: input.conversationId },
          include: { branch: true }
        });

        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation not found",
          });
        }

        // Check WhatsApp 24-hour messaging window
        const { checkWhatsAppMessageWindow, getDefaultTwilioClient } = await import("@/utils/twilio-api");
        const messageWindow = checkWhatsAppMessageWindow(
          conversation.lastMessageAt,
          conversation.lastMessageFrom
        );

        // If outside the 24-hour window, prevent sending freeform messages
        if (!messageWindow.canSendFreeform) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot send freeform message: ${messageWindow.reason}`,
            cause: {
              type: 'WHATSAPP_WINDOW_EXPIRED',
              reason: messageWindow.reason,
              lastIncomingMessageAt: messageWindow.lastIncomingMessageAt,
              needsTemplate: true
            }
          });
        }

        // Send message via Twilio
        const twilioClient = getDefaultTwilioClient();
        
        const twilioResponse = await twilioClient.sendTextMessage(
          conversation.participantPhone,
          input.content
        );

        if (!twilioResponse.result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to send message: ${twilioResponse.error}`,
          });
        }

        // Create message record
        const message = await ctx.db.chatMessage.create({
          data: {
            conversationId: input.conversationId,
            direction: 'OUTGOING',
            content: input.content,
            messageType: input.messageType,
            twilioMessageId: twilioResponse.data?.sid,
            status: 'SENT',
            sentBy: ctx.userId!,
          }
        });

        // Update conversation
        await ctx.db.conversation.update({
          where: { id: input.conversationId },
          data: {
            lastMessageAt: new Date(),
            lastMessageContent: input.content.substring(0, 100),
            lastMessageFrom: 'OUTGOING',
          }
        });

        return {
          success: true,
          message,
          twilioMessageId: twilioResponse.data?.sid,
          windowInfo: messageWindow
        };

      } catch (error) {
        console.error('Error sending chat message:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Mark messages as read
  markAsRead: protectedProcedure
    .input(markMessagesAsReadSchema)
    .mutation(async ({ ctx, input }) => {
      const whereConditions: any = {
        conversationId: input.conversationId,
        direction: 'INCOMING',
        readAt: null,
      };

      // If specific message IDs provided, filter by them
      if (input.messageIds && input.messageIds.length > 0) {
        whereConditions.id = { in: input.messageIds };
      }

      // Mark messages as read
      await ctx.db.chatMessage.updateMany({
        where: whereConditions,
        data: {
          readAt: new Date(),
          status: 'READ',
        }
      });

      // Reset unread count for conversation
      await ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: { unreadCount: 0 }
      });

      return { success: true };
    }),

  // Update conversation (archive, etc.)
  updateConversation: protectedProcedure
    .input(updateConversationSchema)
    .mutation(async ({ ctx, input }) => {
      const { conversationId, ...updateData } = input;

      const conversation = await ctx.db.conversation.update({
        where: { id: conversationId },
        data: updateData,
      });

      return conversation;
    }),

  // Get conversation statistics
  getStats: protectedProcedure
    .input(z.object({
      branchId: z.string().min(1, "Branch ID is required"),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {
        branchId: input.branchId,
      };

      if (input.dateFrom && input.dateTo) {
        whereConditions.createdAt = {
          gte: input.dateFrom,
          lte: input.dateTo,
        };
      }

      // Total conversations
      const totalConversations = await ctx.db.conversation.count({
        where: whereConditions,
      });

      // Active conversations (with messages in last 7 days)
      const activeConversations = await ctx.db.conversation.count({
        where: {
          ...whereConditions,
          lastMessageAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          },
        },
      });

      // Total unread messages
      const totalUnreadMessages = await ctx.db.conversation.aggregate({
        where: whereConditions,
        _sum: {
          unreadCount: true,
        },
      });

      // Messages by type
      const messagesByType = await ctx.db.conversation.groupBy({
        by: ['participantType'],
        where: whereConditions,
        _count: {
          id: true,
        },
      });

      // Total messages (incoming and outgoing)
      const totalMessages = await ctx.db.chatMessage.count({
        where: {
          conversation: {
            branchId: input.branchId,
          },
          ...(input.dateFrom && input.dateTo && {
            createdAt: {
              gte: input.dateFrom,
              lte: input.dateTo,
            },
          }),
        },
      });

      // Incoming vs outgoing messages
      const incomingMessages = await ctx.db.chatMessage.count({
        where: {
          conversation: {
            branchId: input.branchId,
          },
          direction: 'INCOMING',
          ...(input.dateFrom && input.dateTo && {
            createdAt: {
              gte: input.dateFrom,
              lte: input.dateTo,
            },
          }),
        },
      });

      const outgoingMessages = totalMessages - incomingMessages;

      return {
        totalConversations,
        activeConversations,
        totalUnreadMessages: totalUnreadMessages._sum.unreadCount || 0,
        totalMessages,
        incomingMessages,
        outgoingMessages,
        messagesByType: messagesByType.reduce((acc, item) => {
          acc[item.participantType] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
      };
    }),

  // Search messages across conversations
  searchMessages: protectedProcedure
    .input(z.object({
      branchId: z.string().min(1, "Branch ID is required"),
      query: z.string().min(1, "Search query is required"),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const messages = await ctx.db.chatMessage.findMany({
        where: {
          conversation: {
            branchId: input.branchId,
          },
          content: {
            contains: input.query,
            mode: 'insensitive',
          },
        },
        include: {
          conversation: {
            select: {
              id: true,
              participantName: true,
              participantType: true,
              participantPhone: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
      });

      const total = await ctx.db.chatMessage.count({
        where: {
          conversation: {
            branchId: input.branchId,
          },
          content: {
            contains: input.query,
            mode: 'insensitive',
          },
        },
      });

      return {
        messages,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Check WhatsApp messaging window status
  checkMessageWindow: protectedProcedure
    .input(checkMessageWindowSchema)
    .query(async ({ ctx, input }) => {
      const conversation = await ctx.db.conversation.findUnique({
        where: { id: input.conversationId },
        select: {
          lastMessageAt: true,
          lastMessageFrom: true,
          participantName: true,
          participantPhone: true,
        }
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      const { checkWhatsAppMessageWindow } = await import("@/utils/twilio-api");
      const windowInfo = checkWhatsAppMessageWindow(
        conversation.lastMessageAt,
        conversation.lastMessageFrom
      );

      return {
        ...windowInfo,
        conversationId: input.conversationId,
        participantName: conversation.participantName,
        participantPhone: conversation.participantPhone,
      };
    }),

  // Get available WhatsApp templates
  getTemplates: protectedProcedure
    .input(getTemplatesSchema)
    .query(async ({ ctx, input }) => {
      const templates = await ctx.db.whatsAppTemplate.findMany({
        where: {
          OR: [
            { branchId: input.branchId },
            { branchId: null }, // Global templates
          ],
          isActive: true,
          status: 'APPROVED',
        },
        select: {
          id: true,
          name: true,
          description: true,
          templateBody: true,
          templateVariables: true,
          category: true,
          language: true,
          twilioContentSid: true,
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
      });

      return templates;
    }),

  // Send a template message (when outside 24-hour window)
  sendTemplateMessage: protectedProcedure
    .input(sendTemplateMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Get conversation details
        const conversation = await ctx.db.conversation.findUnique({
          where: { id: input.conversationId },
          include: { branch: true }
        });

        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation not found",
          });
        }

        // Get template details
        const template = await ctx.db.whatsAppTemplate.findUnique({
          where: { id: input.templateId },
        });

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }

        if (!template.twilioContentSid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Template does not have a valid Twilio Content SID",
          });
        }

        // Send template message via Twilio
        const { getDefaultTwilioClient } = await import("@/utils/twilio-api");
        const twilioClient = getDefaultTwilioClient();
        
        const twilioResponse = await twilioClient.sendTemplateMessage({
          to: conversation.participantPhone,
          contentSid: template.twilioContentSid,
          contentVariables: input.templateVariables ? JSON.stringify(input.templateVariables) : '{}',
        });

        if (!twilioResponse.result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to send template message: ${twilioResponse.error}`,
          });
        }

        // Create message record
        const message = await ctx.db.chatMessage.create({
          data: {
            conversationId: input.conversationId,
            direction: 'OUTGOING',
            content: `[Template: ${template.name}]`, // Placeholder content for template messages
            messageType: 'TEXT',
            twilioMessageId: twilioResponse.data?.sid,
            status: 'SENT',
            sentBy: ctx.userId!,
            metadata: {
              templateId: input.templateId,
              templateName: template.name,
              templateVariables: input.templateVariables,
            } as any,
          }
        });

        // Update conversation
        await ctx.db.conversation.update({
          where: { id: input.conversationId },
          data: {
            lastMessageAt: new Date(),
            lastMessageContent: `Template: ${template.name}`,
            lastMessageFrom: 'OUTGOING',
          }
        });

        return {
          success: true,
          message,
          twilioMessageId: twilioResponse.data?.sid,
          templateUsed: template.name,
        };

      } catch (error) {
        console.error('Error sending template message:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send template message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

}); 