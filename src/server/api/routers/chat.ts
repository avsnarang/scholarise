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
        // WhatsApp window check removed - using Meta API now
        
        // Get the actual last incoming message to properly calculate the 24-hour window
        const lastIncomingMessage = await ctx.db.chatMessage.findFirst({
          where: {
            conversationId: input.conversationId,
            direction: 'INCOMING'
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        });

        // Meta API handles message windows automatically
        // WhatsApp Business API allows sending outside 24h window with approved templates
        const messageWindow = { canSendFreeform: true };

        // Note: Meta API validation happens at the API level

        // Initialize Meta WhatsApp client with better error handling
        let whatsappClient;
        try {
          const { getDefaultWhatsAppClient } = await import("@/utils/whatsapp-api");
          whatsappClient = getDefaultWhatsAppClient();
        } catch (error) {
          console.error('Failed to initialize WhatsApp client for message sending:', error);
          
          // Check if it's a credentials issue
          if (error instanceof Error && (error.message.includes('Missing:') || error.message.includes('required') || error.message.includes('WhatsApp messaging unavailable'))) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "WhatsApp messaging is not properly configured. Please contact your administrator to configure Meta WhatsApp credentials.",
            });
          }
          
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to initialize WhatsApp messaging service",
          });
        }
        
        const whatsappResponse = await whatsappClient.sendTextMessage(
          conversation.participantPhone,
          input.content
        );

        if (!whatsappResponse.result) {
          // Enhanced error handling for common WhatsApp API errors
          let errorMessage = `Failed to send message: ${whatsappResponse.error}`;
          
          if (whatsappResponse.error?.includes('Authenticate') || whatsappResponse.error?.includes('401')) {
            errorMessage = "WhatsApp messaging authentication failed. Please contact your administrator to verify WhatsApp credentials.";
          } else if (whatsappResponse.error?.includes('21211') || whatsappResponse.error?.includes('Invalid phone')) {
            errorMessage = "Invalid phone number format. Please check the recipient's phone number.";
          } else if (whatsappResponse.error?.includes('21408') || whatsappResponse.error?.includes('permissions')) {
            errorMessage = "Permission denied. Please verify your WhatsApp Business account permissions.";
          } else if (whatsappResponse.error?.includes('63016') || whatsappResponse.error?.includes('not registered')) {
            errorMessage = "The phone number is not registered with WhatsApp Business API.";
          }
          
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: errorMessage,
          });
        }

        // Create message record
        const message = await ctx.db.chatMessage.create({
          data: {
            conversationId: input.conversationId,
            direction: 'OUTGOING',
            content: input.content,
            messageType: input.messageType,
            metaMessageId: whatsappResponse.data?.messages?.[0]?.id,
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
          messageId: whatsappResponse.data?.messages?.[0]?.id,
          windowInfo: messageWindow
        };

      } catch (error) {
        console.error('Error sending chat message:', error);
        
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) {
          throw error;
        }
        
        // Handle other errors
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

      // Get the actual last incoming message to properly calculate the 24-hour window
      const lastIncomingMessage = await ctx.db.chatMessage.findFirst({
        where: {
          conversationId: input.conversationId,
          direction: 'INCOMING'
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      });

      // Meta API handles message windows automatically
      const windowInfo = {
        canSendFreeform: true,
        reason: 'Meta API handles message windows',
        lastIncomingMessageAt: lastIncomingMessage?.createdAt || undefined,
        isExpired: false,
        needsTemplate: false
      };

      return {
        ...windowInfo,
        conversationId: input.conversationId,
        participantName: conversation.participantName,
        participantPhone: conversation.participantPhone,
      };
    }),

  // Debug 24-hour window issues
  debugMessageWindow: protectedProcedure
    .input(z.object({
      conversationId: z.string().min(1, "Conversation ID is required"),
    }))
    .query(async ({ ctx, input }) => {
      const conversation = await ctx.db.conversation.findUnique({
        where: { id: input.conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              direction: true,
              content: true,
              createdAt: true,
              twilioMessageId: true,
              status: true
            }
          }
        }
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      // Meta API handles message windows automatically
      
      // Get the actual last incoming message to properly calculate the 24-hour window
      const lastIncomingMessage = await ctx.db.chatMessage.findFirst({
        where: {
          conversationId: input.conversationId,
          direction: 'INCOMING'
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      });

      const windowInfo = {
        canSendFreeform: true,
        reason: 'Meta API handles message windows',
        lastIncomingMessageAt: lastIncomingMessage?.createdAt || undefined,
        isExpired: false,
        needsTemplate: false
      };

      // Additional debugging information
      const lastOutgoingMessage = await ctx.db.chatMessage.findFirst({
        where: {
          conversationId: input.conversationId,
          direction: 'OUTGOING'
        },
        orderBy: { createdAt: 'desc' }
      });

      return {
        conversation: {
          id: conversation.id,
          participantName: conversation.participantName,
          participantPhone: conversation.participantPhone,
          lastMessageAt: conversation.lastMessageAt,
          lastMessageFrom: conversation.lastMessageFrom,
          lastMessageContent: conversation.lastMessageContent
        },
        windowInfo,
        lastIncomingMessage,
        lastOutgoingMessage,
        recentMessages: conversation.messages,
        calculatedWindow: {
          currentTime: new Date(),
          lastMessageAge: conversation.lastMessageAt 
            ? ((new Date().getTime() - new Date(conversation.lastMessageAt).getTime()) / (60 * 60 * 1000)).toFixed(2) + ' hours'
            : 'N/A'
        }
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

        if (!template.metaTemplateName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Template does not have a valid Meta template name",
          });
        }

        // Send template message via Meta WhatsApp client
        const { getDefaultWhatsAppClient } = await import("@/utils/whatsapp-api");
        const whatsappClient = getDefaultWhatsAppClient();
        
        const whatsappResponse = await whatsappClient.sendTemplateMessage({
          to: conversation.participantPhone,
          templateName: template.metaTemplateName,
          templateLanguage: template.metaTemplateLanguage,
          templateVariables: input.templateVariables,
        });

        if (!whatsappResponse.result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to send template message: ${whatsappResponse.error}`,
          });
        }

        // Create message record
        const message = await ctx.db.chatMessage.create({
          data: {
            conversationId: input.conversationId,
            direction: 'OUTGOING',
            content: `[Template: ${template.name}]`, // Placeholder content for template messages
            messageType: 'TEXT',
            metaMessageId: whatsappResponse.data?.messages?.[0]?.id,
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
          messageId: whatsappResponse.data?.messages?.[0]?.id,
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

  // Force refresh contact metadata for all conversations
  refreshContactMetadata: protectedProcedure
    .input(
      z.object({
        branchId: z.string(),
        conversationIds: z.array(z.string()).optional(), // If provided, only refresh specific conversations
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`🔄 Starting contact metadata refresh for branch ${input.branchId}`);
        
        // Get conversations to refresh
        const conversations = await ctx.db.conversation.findMany({
          where: {
            branchId: input.branchId,
            ...(input.conversationIds ? { id: { in: input.conversationIds } } : {}),
            isActive: true
          },
          orderBy: { lastMessageAt: 'desc' }
        });

        console.log(`📋 Found ${conversations.length} conversations to refresh`);

        if (conversations.length === 0) {
          return {
            success: true,
            message: "No conversations found to refresh",
            refreshed: 0,
            errors: []
          };
        }

        // Import the identifyParticipant function logic (replicating from webhook)
        const { phoneNumbersMatch } = await import("@/utils/phone-utils");
        
        const identifyParticipant = async (phoneNumber: string, branchId: string) => {
          // Try to find in students first (via parent phone numbers)
          const students = await ctx.db.student.findMany({
            where: { branchId },
            include: {
              parent: true,
              section: { include: { class: true } }
            }
          });

          // Check each student's phone numbers for exact match
          for (const student of students) {
            // Check student's own phone
            if (student.phone && phoneNumbersMatch(phoneNumber, student.phone)) {
              return {
                type: 'student',
                id: student.id,
                name: `${student.firstName} ${student.lastName}`,
                contactType: 'student',
                metadata: {
                  class: student.section?.class?.name,
                  section: student.section?.name,
                  parentInfo: student.parent,
                  contactDetails: {
                    contactType: 'Student Phone',
                    displayName: `${student.firstName} ${student.lastName} (Student)`,
                    phoneUsed: student.phone
                  }
                }
              };
            }

            // Check father's phone
            if (student.parent?.fatherMobile && phoneNumbersMatch(phoneNumber, student.parent.fatherMobile)) {
              return {
                type: 'student',
                id: student.id,
                name: `${student.parent.fatherName || 'Father'} (${student.firstName} ${student.lastName})`,
                contactType: 'father',
                metadata: {
                  class: student.section?.class?.name,
                  section: student.section?.name,
                  parentInfo: student.parent,
                  contactDetails: {
                    contactType: 'Father Phone',
                    displayName: `${student.parent.fatherName || 'Father'} (${student.firstName}'s Father)`,
                    phoneUsed: student.parent.fatherMobile,
                    studentName: `${student.firstName} ${student.lastName}`
                  }
                }
              };
            }

            // Check mother's phone
            if (student.parent?.motherMobile && phoneNumbersMatch(phoneNumber, student.parent.motherMobile)) {
              return {
                type: 'student',
                id: student.id,
                name: `${student.parent.motherName || 'Mother'} (${student.firstName} ${student.lastName})`,
                contactType: 'mother',
                metadata: {
                  class: student.section?.class?.name,
                  section: student.section?.name,
                  parentInfo: student.parent,
                  contactDetails: {
                    contactType: 'Mother Phone',
                    displayName: `${student.parent.motherName || 'Mother'} (${student.firstName}'s Mother)`,
                    phoneUsed: student.parent.motherMobile,
                    studentName: `${student.firstName} ${student.lastName}`
                  }
                }
              };
            }

            // Check guardian's phone
            if (student.parent?.guardianMobile && phoneNumbersMatch(phoneNumber, student.parent.guardianMobile)) {
              return {
                type: 'student',
                id: student.id,
                name: `${student.parent.guardianName || 'Guardian'} (${student.firstName} ${student.lastName})`,
                contactType: 'guardian',
                metadata: {
                  class: student.section?.class?.name,
                  section: student.section?.name,
                  parentInfo: student.parent,
                  contactDetails: {
                    contactType: 'Guardian Phone',
                    displayName: `${student.parent.guardianName || 'Guardian'} (${student.firstName}'s Guardian)`,
                    phoneUsed: student.parent.guardianMobile,
                    studentName: `${student.firstName} ${student.lastName}`
                  }
                }
              };
            }
          }

          // Try to find in teachers
          const teachers = await ctx.db.teacher.findMany({
            where: { branchId }
          });

          for (const teacher of teachers) {
            if (teacher.phone && phoneNumbersMatch(phoneNumber, teacher.phone)) {
              return {
                type: 'teacher',
                id: teacher.id,
                name: `${teacher.firstName} ${teacher.lastName}`,
                contactType: 'teacher',
                metadata: {
                  employeeCode: teacher.employeeCode,
                  designation: teacher.designation,
                  contactDetails: {
                    contactType: 'Teacher Phone',
                    displayName: `${teacher.firstName} ${teacher.lastName} (Teacher)`,
                    phoneUsed: teacher.phone
                  }
                }
              };
            }
          }

          // Try to find in employees
          const employees = await ctx.db.employee.findMany({
            where: { branchId },
            include: {
              designationRef: true,
              departmentRef: true
            }
          });

          for (const employee of employees) {
            if (employee.phone && phoneNumbersMatch(phoneNumber, employee.phone)) {
              return {
                type: 'employee',
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`,
                contactType: 'employee',
                metadata: {
                  designation: employee.designation,
                  department: employee.departmentRef?.name || employee.designation,
                  contactDetails: {
                    contactType: 'Employee Phone',
                    displayName: `${employee.firstName} ${employee.lastName} (Employee)`,
                    phoneUsed: employee.phone
                  }
                }
              };
            }
          }

          // If no match found, return unknown contact
          return {
            type: 'unknown',
            id: 'unknown',
            name: 'Unknown Contact',
            contactType: 'unknown',
            metadata: {
              phoneNumber: phoneNumber,
              contactDetails: {
                contactType: 'Unknown Contact',
                displayName: 'Unknown Contact',
                phoneUsed: phoneNumber
              }
            }
          };
        };

        // Process conversations in batches to avoid overwhelming the database
        const batchSize = 10;
        let refreshed = 0;
        const errors: string[] = [];

        for (let i = 0; i < conversations.length; i += batchSize) {
          const batch = conversations.slice(i, i + batchSize);
          
          await Promise.all(batch.map(async (conversation) => {
            try {
              // Clean phone number (remove whatsapp: prefix if present)
              const phoneNumber = conversation.participantPhone.replace('whatsapp:', '');
              
              // Re-identify participant
              const participant = await identifyParticipant(phoneNumber, input.branchId);
              
              // Update conversation with fresh metadata
              await ctx.db.conversation.update({
                where: { id: conversation.id },
                data: {
                  participantType: participant.type,
                  participantId: participant.id,
                  participantName: participant.name,
                  metadata: participant.metadata
                }
              });

              refreshed++;
              console.log(`✅ Refreshed metadata for conversation ${conversation.id} (${participant.contactType})`);
              
            } catch (error) {
              const errorMsg = `Failed to refresh conversation ${conversation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              console.error(`❌ ${errorMsg}`);
              errors.push(errorMsg);
            }
          }));

          // Add small delay between batches to be gentle on the database
          if (i + batchSize < conversations.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        console.log(`🎉 Contact metadata refresh completed: ${refreshed} updated, ${errors.length} errors`);

        return {
          success: true,
          message: `Successfully refreshed metadata for ${refreshed} conversations`,
          refreshed,
          total: conversations.length,
          errors: errors.length > 0 ? errors : undefined
        };

      } catch (error) {
        console.error('Error refreshing contact metadata:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to refresh contact metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

}); 