import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permission } from "@/types/permissions";

// Lazy import Twilio utilities to prevent client-side bundling
const getTwilioUtils = async () => {
  const { 
    getDefaultTwilioClient, 
    formatTemplateVariables, 
    createBroadcastName,
    resetDefaultTwilioClient
  } = await import("@/utils/twilio-api");
  
  return {
    getDefaultTwilioClient,
    formatTemplateVariables,
    createBroadcastName,
    resetDefaultTwilioClient
  };
};

// Input validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  twilioContentSid: z.string().min(1, "Twilio content SID is required"),
  templateBody: z.string().min(1, "Template body is required"),
  templateVariables: z.array(z.string()).default([]),
  category: z.string().default("utility"),
  language: z.string().default("en"),
  branchId: z.string().min(1, "Branch ID is required"),
});

const sendMessageSchema = z.object({
  title: z.string().min(1, "Message title is required"),
  templateId: z.string().optional(),
  customMessage: z.string().optional(),
  recipientType: z.enum([
    "INDIVIDUAL_STUDENTS",
    "ENTIRE_CLASS", 
    "SPECIFIC_SECTION",
    "MULTIPLE_CLASSES",
    "ALL_TEACHERS",
    "SPECIFIC_TEACHERS", 
    "ALL_EMPLOYEES",
    "SPECIFIC_EMPLOYEES",
    "PARENTS",
    "CUSTOM_GROUP"
  ]),
  recipients: z.array(z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string(),
    type: z.string(),
  })),
  templateParameters: z.record(z.string()).optional(),
  scheduledAt: z.date().optional(),
  branchId: z.string().min(1, "Branch ID is required"),
});

export const communicationRouter = createTRPCRouter({
  // Create or update WhatsApp template
  createTemplate: protectedProcedure
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const template = await ctx.db.whatsAppTemplate.create({
          data: {
            name: input.name,
            description: input.description,
            twilioContentSid: input.twilioContentSid,
            templateBody: input.templateBody,
            templateVariables: input.templateVariables,
            category: input.category.toUpperCase() as any,
            language: input.language,
            status: "APPROVED", // Twilio templates are pre-approved
            branchId: input.branchId,
            createdBy: ctx.userId!,
          }
        });

        return {
          success: true,
          template,
          message: "Template created successfully"
        };
      } catch (error) {
        console.error('Template creation error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Get all templates
  getTemplates: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      isActive: z.boolean().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {};
      
      if (input.branchId) {
        whereConditions.branchId = input.branchId;
      }
      
      if (input.category) {
        whereConditions.category = input.category.toUpperCase();
      }

      const templates = await ctx.db.whatsAppTemplate.findMany({
        where: whereConditions,
        orderBy: { createdAt: "desc" },
      });

      return templates;
    }),

  // Debug endpoint to test Twilio API response
  debugTwilioResponse: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        console.log('Testing Twilio API connection and response format...');
        const { getDefaultTwilioClient } = await getTwilioUtils();
        const twilioClient = getDefaultTwilioClient();
        
        // Make the raw API call to see exactly what we get
        const rawResponse = await twilioClient.testConnection();
        console.log('Test connection result:', rawResponse);
        
        // Now try to get templates and see the raw response
        const templatesResponse = await twilioClient.getTemplates();
        
        console.log('Templates response details:', {
          type: typeof templatesResponse,
          isArray: Array.isArray(templatesResponse),
          length: Array.isArray(templatesResponse) ? templatesResponse.length : 'N/A',
          keys: typeof templatesResponse === 'object' ? Object.keys(templatesResponse) : 'N/A',
          fullResponse: templatesResponse
        });
        
        return {
          success: true,
          connectionTest: rawResponse,
          templatesResponse: {
            type: typeof templatesResponse,
            isArray: Array.isArray(templatesResponse),
            length: Array.isArray(templatesResponse) ? templatesResponse.length : 'N/A',
            keys: typeof templatesResponse === 'object' ? Object.keys(templatesResponse) : 'N/A',
            data: templatesResponse
          }
        };
      } catch (error) {
        console.error('Debug Twilio API error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        };
      }
    }),

  // Sync templates from Twilio API (now global - not branch-specific)
  syncTemplatesFromTwilio: protectedProcedure
    .input(z.object({
      originBranchId: z.string().optional(), // Optional - tracks which branch initiated the sync
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log('Starting Twilio template sync...');
        const { getDefaultTwilioClient } = await getTwilioUtils();
        const twilioClient = getDefaultTwilioClient();
        const twilioTemplates = await twilioClient.getTemplates();
        
        console.log('Twilio API response:', { 
          type: typeof twilioTemplates, 
          isArray: Array.isArray(twilioTemplates),
          length: Array.isArray(twilioTemplates) ? twilioTemplates.length : 'N/A',
          sample: Array.isArray(twilioTemplates) && twilioTemplates.length > 0 ? twilioTemplates[0] : twilioTemplates
        });
        
        // Ensure we have an array
        if (!Array.isArray(twilioTemplates)) {
          throw new Error(`Expected array of templates from Twilio API, got ${typeof twilioTemplates}. Response: ${JSON.stringify(twilioTemplates)}`);
        }
        
        if (twilioTemplates.length === 0) {
          return {
            success: true,
            syncedCount: 0,
            templates: [],
            message: 'No templates found in Twilio API'
          };
        }
        
        // For Twilio, templates that exist in the account are generally usable
        // Unlike WATI, Twilio doesn't use the same approval status system
        const usableTemplates = twilioTemplates.filter((t: any) => 
          t.status === 'approved' || 
          t.status === 'APPROVED' || 
          t.status === undefined || 
          t.status === null ||
          t.status === 'active'
        );
        console.log(`Found ${twilioTemplates.length} total templates, ${usableTemplates.length} usable`);
        
        const syncedTemplates = [];
        
        for (const twilioTemplate of usableTemplates) {
          try {
            // Twilio uses friendly_name and variables
            const templateBody = twilioTemplate.friendly_name || '';
            
            // Extract variables from Twilio template structure
            const variables = Object.keys(twilioTemplate.variables || {});
              
            console.log(`Template ${twilioTemplate.friendly_name} variables:`, variables);
            
            const existingTemplate = await ctx.db.whatsAppTemplate.findUnique({
              where: { twilioContentSid: twilioTemplate.sid }
            });
            
            if (existingTemplate) {
              // Update existing template (keep original branch if it exists)
              const updated = await ctx.db.whatsAppTemplate.update({
                where: { id: existingTemplate.id },
                data: {
                  name: twilioTemplate.friendly_name,
                  templateBody,
                  templateVariables: variables,
                  category: 'UTILITY', // Twilio doesn't have categories like WATI
                  language: twilioTemplate.language || 'en',
                  status: (twilioTemplate.status === 'approved' || twilioTemplate.status === 'APPROVED' || !twilioTemplate.status) ? 'APPROVED' : 'PENDING',
                  updatedAt: new Date(),
                }
              });
              syncedTemplates.push(updated);
            } else {
              // Create new template - assign to origin branch if provided
              const created = await ctx.db.whatsAppTemplate.create({
                data: {
                  name: twilioTemplate.friendly_name,
                  twilioContentSid: twilioTemplate.sid,
                  templateBody,
                  templateVariables: variables,
                  category: 'UTILITY',
                  language: twilioTemplate.language || 'en',
                  status: (twilioTemplate.status === 'approved' || twilioTemplate.status === 'APPROVED' || !twilioTemplate.status) ? 'APPROVED' : 'PENDING',
                  branchId: input.originBranchId || 'default-branch-id', // Use a default or require branch
                  createdBy: ctx.userId!,
                }
              });
              syncedTemplates.push(created);
            }
          } catch (templateError) {
            console.error(`Error syncing template ${twilioTemplate.sid}:`, templateError);
            // Continue with other templates
          }
        }
        
        // Log the sync activity
        await ctx.db.communicationLog.create({
          data: {
            action: "template_sync",
            description: `Synced ${syncedTemplates.length} templates from Twilio`,
            metadata: JSON.parse(JSON.stringify({
                          totalTwilioTemplates: twilioTemplates.length,
            usableTemplates: usableTemplates.length,
              syncedCount: syncedTemplates.length,
              originBranchId: input.originBranchId
            })),
            userId: ctx.userId!,
          }
        });
        
        return {
          success: true,
          syncedCount: syncedTemplates.length,
          templates: syncedTemplates,
          message: `Successfully synced ${syncedTemplates.length} templates from Twilio`
        };
        
      } catch (error) {
        console.error('Template sync error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to sync templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Get recipients based on filters
  getRecipients: protectedProcedure
    .input(z.object({
      recipientType: z.enum([
        "ALL_STUDENTS",
        "INDIVIDUAL_STUDENTS",
        "ENTIRE_CLASS",
        "SPECIFIC_SECTION",
        "ALL_TEACHERS", 
        "INDIVIDUAL_TEACHERS",
        "ALL_EMPLOYEES",
        "INDIVIDUAL_EMPLOYEES",
        "PARENTS",
      ]),
      branchId: z.string().min(1, "Branch ID is required"),
      sessionId: z.string().optional(),
      classIds: z.array(z.string()).optional(),
      sectionIds: z.array(z.string()).optional(),
      searchTerm: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let recipients: Array<{
        id: string;
        name: string;
        phone: string;
        type: string;
        className?: string;
        section?: string;
      }> = [];

      const searchWhere = input.searchTerm ? {
        OR: [
          { name: { contains: input.searchTerm, mode: 'insensitive' as const } },
          { phone: { contains: input.searchTerm, mode: 'insensitive' as const } },
        ]
      } : {};

      switch (input.recipientType) {
        case "ALL_STUDENTS":
        case "INDIVIDUAL_STUDENTS":
        case "ENTIRE_CLASS":
        case "SPECIFIC_SECTION":
          const students = await ctx.db.student.findMany({
            where: {
              branchId: input.branchId,
              ...(input.classIds && input.classIds.length > 0 && { 
                section: { classId: { in: input.classIds } }
              }),
              ...(input.sectionIds && input.sectionIds.length > 0 && { 
                sectionId: { in: input.sectionIds }
              }),
              ...searchWhere
            },
            include: {
              section: { 
                include: { 
                  class: { select: { name: true } } 
                } 
              },
              parent: {
                select: {
                  fatherMobile: true,
                  motherMobile: true,
                  guardianMobile: true
                }
              }
            }
          });
          
          recipients = students.map(student => ({
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            phone: student.phone || 
                   student.parent?.fatherMobile || 
                   student.parent?.motherMobile || 
                   student.parent?.guardianMobile || '',
            type: "student",
            className: student.section?.class?.name,
          })).filter(r => r.phone);
          break;

        case "ALL_TEACHERS":
        case "INDIVIDUAL_TEACHERS":
          const teachers = await ctx.db.teacher.findMany({
            where: {
              branchId: input.branchId,
              ...searchWhere
            }
          });
          
          recipients = teachers.map(teacher => ({
            id: teacher.id,
            name: `${teacher.firstName} ${teacher.lastName}`,
            phone: teacher.phone || '',
            type: "teacher",
          })).filter(r => r.phone);
          break;

        case "ALL_EMPLOYEES":
        case "INDIVIDUAL_EMPLOYEES":
          const employees = await ctx.db.employee.findMany({
            where: {
              branchId: input.branchId,
              ...searchWhere
            }
          });
          
          recipients = employees.map(employee => ({
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            phone: employee.phone || '',
            type: "employee",
          })).filter(r => r.phone);
          break;

        case "PARENTS":
          const parentsFromStudents = await ctx.db.student.findMany({
            where: {
              branchId: input.branchId,
              ...(input.classIds && input.classIds.length > 0 && { 
                section: { classId: { in: input.classIds } }
              }),
              parent: {
                OR: [
                  { fatherMobile: { not: null } },
                  { motherMobile: { not: null } },
                  { guardianMobile: { not: null } }
                ]
              }
            },
            include: {
              section: { 
                include: { 
                  class: { select: { name: true } } 
                } 
              },
              parent: {
                select: {
                  fatherName: true,
                  motherName: true,
                  guardianName: true,
                  fatherMobile: true,
                  motherMobile: true,
                  guardianMobile: true
                }
              }
            }
          });
          
          recipients = [];
          parentsFromStudents.forEach(student => {
            const studentName = `${student.firstName} ${student.lastName}`;
            const className = student.section?.class?.name;
            
            if (student.parent?.fatherMobile) {
              recipients.push({
                id: `father-${student.id}`,
                name: `${student.parent.fatherName || 'Father'} (${studentName})`,
                phone: student.parent.fatherMobile,
                type: "parent",
                className
              });
            }
            
            if (student.parent?.motherMobile) {
              recipients.push({
                id: `mother-${student.id}`,
                name: `${student.parent.motherName || 'Mother'} (${studentName})`,
                phone: student.parent.motherMobile,
                type: "parent",
                className
              });
            }
            
            if (student.parent?.guardianMobile) {
              recipients.push({
                id: `guardian-${student.id}`,
                name: `${student.parent.guardianName || 'Guardian'} (${studentName})`,
                phone: student.parent.guardianMobile,
                type: "parent",
                className
              });
            }
          });
          break;
      }

      return recipients;
    }),

  // Send a communication message
  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate recipients have phone numbers
        const recipientsWithValidPhones = input.recipients.filter(r => r.phone && r.phone.trim() !== '');
        
        if (recipientsWithValidPhones.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No recipients with valid phone numbers found",
          });
        }

        // Create communication message record
        const message = await ctx.db.communicationMessage.create({
          data: {
            title: input.title,
            templateId: input.templateId,
            customMessage: input.customMessage,
            recipientType: input.recipientType,
            totalRecipients: recipientsWithValidPhones.length,
            branchId: input.branchId,
            createdBy: ctx.userId!,
            scheduledAt: input.scheduledAt,
            status: input.scheduledAt ? "SCHEDULED" : "PENDING",
          }
        });

        // If scheduled for future, just create the message and recipients
        if (input.scheduledAt && input.scheduledAt > new Date()) {
          // Create recipient records
          await ctx.db.messageRecipient.createMany({
            data: recipientsWithValidPhones.map(recipient => ({
              messageId: message.id,
              recipientType: recipient.type,
              recipientId: recipient.id,
              recipientName: recipient.name,
              recipientPhone: recipient.phone,
              status: "PENDING"
            }))
          });

          return {
            success: true,
            messageId: message.id,
            scheduled: true,
            scheduledAt: input.scheduledAt,
            totalRecipients: recipientsWithValidPhones.length
          };
        }

        // Send immediately
        const { getDefaultTwilioClient } = await getTwilioUtils();
        const twilioClient = getDefaultTwilioClient();
        let twilioResponse;

        if (input.templateId) {
          // Send using template
          const template = await ctx.db.whatsAppTemplate.findUnique({
            where: { id: input.templateId }
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

          // Use template parameters from input, or empty object
          const parameters = input.templateParameters || {};

          // Send to multiple recipients using bulk method
          twilioResponse = await twilioClient.sendBulkTemplateMessage(
            recipientsWithValidPhones.map(recipient => ({
              phone: recipient.phone,
              name: recipient.name,
              variables: { ...parameters, name: recipient.name }
            })),
            template.twilioContentSid,
            parameters
          );
        } else if (input.customMessage) {
          // For custom messages, send individual text messages
          const results = [];
          let successful = 0;
          let failed = 0;

          for (const recipient of recipientsWithValidPhones) {
            try {
              const response = await twilioClient.sendTextMessage(
                recipient.phone,
                input.customMessage
              );

              if (response.result) {
                results.push({ phone: recipient.phone, success: true, messageId: response.data?.sid });
                successful++;
              } else {
                results.push({ phone: recipient.phone, success: false, error: response.error });
                failed++;
              }
            } catch (error) {
              results.push({ 
                phone: recipient.phone, 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
              });
              failed++;
            }

            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          twilioResponse = {
            result: successful > 0,
            data: { successful, failed, results },
            info: `Sent to ${successful} recipients, ${failed} failed`
          };
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either templateId or customMessage is required",
          });
        }

        // Update message status
        await ctx.db.communicationMessage.update({
          where: { id: message.id },
          data: {
            status: twilioResponse.result ? "SENT" : "FAILED",
            sentAt: twilioResponse.result ? new Date() : undefined,
            successfulSent: twilioResponse.data?.successful || 0,
            failed: twilioResponse.data?.failed || 0,
            twilioMessageId: twilioResponse.data?.results?.[0]?.messageId || undefined,
          }
        });

        // Create recipient records
        await ctx.db.messageRecipient.createMany({
          data: recipientsWithValidPhones.map((recipient, index) => ({
            messageId: message.id,
            recipientType: recipient.type,
            recipientId: recipient.id,
            recipientName: recipient.name,
            recipientPhone: recipient.phone,
            status: twilioResponse.data?.results?.[index]?.success ? "SENT" : "FAILED",
            sentAt: twilioResponse.data?.results?.[index]?.success ? new Date() : undefined,
            twilioMessageId: twilioResponse.data?.results?.[index]?.messageId,
            errorMessage: twilioResponse.data?.results?.[index]?.error,
          }))
        });

        // Log the communication activity
        await ctx.db.communicationLog.create({
          data: {
            messageId: message.id,
            action: "message_sent",
            description: `Message "${input.title}" sent to ${recipientsWithValidPhones.length} recipients`,
            metadata: JSON.parse(JSON.stringify({
              twilioResponse,
              recipientCount: recipientsWithValidPhones.length,
              templateUsed: input.templateId ? true : false
            })),
            userId: ctx.userId!,
          }
        });

        return {
          success: twilioResponse.result,
          messageId: message.id,
          totalRecipients: recipientsWithValidPhones.length,
          successfulSent: twilioResponse.data?.successful || 0,
          failed: twilioResponse.data?.failed || 0,
          info: twilioResponse.info
        };

      } catch (error) {
        // Log the error
        await ctx.db.communicationLog.create({
          data: {
            action: "message_send_failed",
            description: `Failed to send message "${input.title}": ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
            userId: ctx.userId!,
          }
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Get message history
  getMessages: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      status: z.enum(["DRAFT", "PENDING", "SENDING", "SENT", "FAILED", "CANCELLED", "SCHEDULED"]).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {};
      
      if (input.branchId) {
        whereConditions.branchId = input.branchId;
      }
      
      if (input.status) {
        whereConditions.status = input.status;
      }

      const messages = await ctx.db.communicationMessage.findMany({
        where: whereConditions,
        include: {
          template: {
            select: { name: true, category: true }
          },
          branch: {
            select: { name: true, code: true }
          },
          _count: {
            select: { recipients: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        skip: input.offset,
      });

      const total = await ctx.db.communicationMessage.count({
        where: whereConditions,
      });

      return {
        messages,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Get message details with recipients
  getMessageDetails: protectedProcedure
    .input(z.object({
      messageId: z.string().min(1, "Message ID is required"),
    }))
    .query(async ({ ctx, input }) => {
      const message = await ctx.db.communicationMessage.findUnique({
        where: { id: input.messageId },
        include: {
          template: true,
          branch: { select: { name: true, code: true } },
          recipients: {
            orderBy: { createdAt: "asc" }
          },
          logs: {
            orderBy: { createdAt: "desc" },
            take: 10
          }
        }
      });

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      return message;
    }),

  // Debug environment variables
  debugEnvironment: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { env } = await import("@/env.js");
      
      return {
        hasAccountSid: !!env.TWILIO_ACCOUNT_SID,
        hasAuthToken: !!env.TWILIO_AUTH_TOKEN,
        hasWhatsAppFrom: !!env.TWILIO_WHATSAPP_FROM,
        accountSidPreview: env.TWILIO_ACCOUNT_SID ? `${env.TWILIO_ACCOUNT_SID.substring(0, 8)}...` : 'missing',
        whatsAppFrom: env.TWILIO_WHATSAPP_FROM || 'missing'
      };
    }),

  // Refresh Twilio client (useful after environment variable changes)
  refreshTwilioClient: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        console.log('🔄 Refreshing Twilio client...');
        
        // Import the reset function
        const { resetDefaultTwilioClient, getDefaultTwilioClient } = await getTwilioUtils();
        
        // Reset the existing client
        resetDefaultTwilioClient();
        console.log('✅ Default client reset');
        
        // Try to create a new client
        const newClient = getDefaultTwilioClient();
        console.log('✅ New Twilio client created successfully');
        
        // Test the new connection
        const testResult = await newClient.testConnection();
        console.log('📊 New client test result:', testResult);
        
        // Log the refresh
        await ctx.db.communicationLog.create({
          data: {
            action: "twilio_client_refresh",
            description: testResult.result ? "Twilio client refreshed and tested successfully" : `Twilio client refresh failed: ${testResult.error}`,
            metadata: JSON.parse(JSON.stringify({ testResult })),
            userId: ctx.userId!,
          }
        });
        
        return {
          success: testResult.result,
          message: testResult.result ? "Twilio client refreshed successfully" : "Twilio client refresh failed",
          error: testResult.error,
          data: testResult.data
        };
        
      } catch (error) {
        console.error('❌ Failed to refresh Twilio client:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Log the error
        try {
          await ctx.db.communicationLog.create({
            data: {
              action: "twilio_client_refresh",
              description: `Twilio client refresh failed: ${errorMessage}`,
              metadata: { error: errorMessage },
              userId: ctx.userId!,
            }
          });
        } catch (logError) {
          console.error('Failed to log Twilio client refresh error:', logError);
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }
    }),

  // Test Twilio API connection
  testTwilioConnection: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        console.log('🔍 Starting comprehensive Twilio connection test...');
        
        // First check environment variables
        const { env } = await import("@/env.js");
        const envCheck = {
          hasAccountSid: !!env.TWILIO_ACCOUNT_SID,
          hasAuthToken: !!env.TWILIO_AUTH_TOKEN,
          hasWhatsAppFrom: !!env.TWILIO_WHATSAPP_FROM,
          accountSidFormat: env.TWILIO_ACCOUNT_SID ? env.TWILIO_ACCOUNT_SID.startsWith('AC') : false,
          accountSidLength: env.TWILIO_ACCOUNT_SID?.length || 0,
          authTokenLength: env.TWILIO_AUTH_TOKEN?.length || 0,
        };
        
        console.log('📋 Environment variables check:', envCheck);
        
        // Check for common issues
        const issues = [];
        if (!envCheck.hasAccountSid) issues.push('TWILIO_ACCOUNT_SID is missing');
        if (!envCheck.hasAuthToken) issues.push('TWILIO_AUTH_TOKEN is missing');
        if (!envCheck.hasWhatsAppFrom) issues.push('TWILIO_WHATSAPP_FROM is missing');
        if (envCheck.hasAccountSid && !envCheck.accountSidFormat) issues.push('TWILIO_ACCOUNT_SID should start with "AC"');
        if (envCheck.hasAuthToken && envCheck.authTokenLength !== 32) issues.push(`TWILIO_AUTH_TOKEN should be 32 characters (current: ${envCheck.authTokenLength})`);
        
        if (issues.length > 0) {
          console.error('❌ Configuration issues found:', issues);
          return {
            success: false,
            error: `Configuration issues: ${issues.join(', ')}`,
            envCheck,
            issues
          };
        }
        
        // Try to create Twilio client
        const { getDefaultTwilioClient } = await getTwilioUtils();
        console.log('🔧 Creating Twilio client...');
        const twilioClient = getDefaultTwilioClient();
        console.log('✅ Twilio client created successfully');
        
        // Test the connection
        console.log('🌐 Testing connection...');
        const result = await twilioClient.testConnection();
        console.log('📊 Connection test result:', result);
        
        // Log the test
        await ctx.db.communicationLog.create({
          data: {
            action: "twilio_connection_test",
            description: result.result ? "Twilio API connection test successful" : `Twilio API connection test failed: ${result.error}`,
            metadata: { 
              result: result.result,
              envCheck,
              issues: issues.length > 0 ? issues : null 
            },
            userId: ctx.userId!,
          }
        });

        // Convert TwilioApiResponse to consistent format
        return {
          success: result.result,
          error: result.error,
          info: result.info,
          data: result.data,
          envCheck,
          issues: issues.length > 0 ? issues : null
        };
      } catch (error) {
        console.error('❌ Twilio connection test failed:', error);
        
        let errorMessage = 'Unknown error';
        let isConfigurationIssue = false;
        
        if (error instanceof Error) {
          errorMessage = error.message;
          
          // Categorize the error
          if (error.message.includes('Missing:') || 
              error.message.includes('required') || 
              error.message.includes('WhatsApp messaging unavailable') ||
              error.message.includes('Invalid Twilio Account SID format')) {
            isConfigurationIssue = true;
            errorMessage = `Configuration Error: ${error.message}`;
          } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = "Authentication failed: Invalid Twilio credentials. Please verify your Account SID and Auth Token.";
          } else if (error.message.includes('404')) {
            errorMessage = "Twilio API endpoint not found. Please verify your configuration.";
          } else if (error.message.includes('429')) {
            errorMessage = "Rate limit exceeded. Please try again later.";
          }
        }
        
        // Log the error
        try {
          await ctx.db.communicationLog.create({
            data: {
              action: "twilio_connection_test",
              description: `Twilio API connection test failed: ${errorMessage}`,
              metadata: { 
                error: errorMessage, 
                isConfigurationIssue,
                stack: error instanceof Error ? error.stack : undefined 
              },
              userId: ctx.userId!,
            }
          });
        } catch (logError) {
          console.error('Failed to log Twilio connection test error:', logError);
        }
        
        return {
          success: false,
          error: errorMessage,
          isConfigurationIssue
        };
      }
    }),

  // Get communication settings for a branch
  getSettings: protectedProcedure
    .input(z.object({
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .query(async ({ ctx, input }) => {
      const settings = await ctx.db.communicationSettings.findUnique({
        where: { branchId: input.branchId },
      });

      // Return default settings if none exist
      if (!settings) {
        return {
          id: null,
          branchId: input.branchId,
          twilioAccountSid: "",
          twilioAuthToken: "",
          twilioWhatsAppFrom: "",
          twilioIsActive: false,
          templateAutoSyncEnabled: true,
          templateSyncInterval: 24,
          templateDefaultCategory: "UTILITY",
          templateDefaultLanguage: "en",
          messageEnableScheduling: true,
          messageMaxRecipientsPerMessage: 1000,
          messageRetryFailedMessages: true,
          messageMaxRetryAttempts: 3,
          messageRetryDelay: 30,
          notificationEmailEnabled: false,
          notificationEmail: "",
          notifyOnFailures: true,
          notifyOnSuccess: false,
          notificationDailySummary: true,
          isActive: true,
        };
      }

      return settings;
    }),

  // Save communication settings
  saveSettings: protectedProcedure
    .input(z.object({
      branchId: z.string().min(1, "Branch ID is required"),
      twilioAccountSid: z.string().optional(),
      twilioAuthToken: z.string().optional(),
      twilioWhatsAppFrom: z.string().optional(),
      twilioIsActive: z.boolean().default(false),
      templateAutoSyncEnabled: z.boolean().default(true),
      templateSyncInterval: z.number().min(1).max(72).default(24),
      templateDefaultCategory: z.string().optional(),
      templateDefaultLanguage: z.string().default("en"),
      messageEnableScheduling: z.boolean().default(true),
      messageMaxRecipientsPerMessage: z.number().min(1).max(10000).default(1000),
      messageRetryFailedMessages: z.boolean().default(true),
      messageMaxRetryAttempts: z.number().min(0).max(10).default(3),
      messageRetryDelay: z.number().min(5).max(300).default(30),
      notificationEmailEnabled: z.boolean().default(false),
      notificationEmail: z.string().optional(),
      notifyOnFailures: z.boolean().default(true),
      notifyOnSuccess: z.boolean().default(false),
      notificationDailySummary: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, ...settingsData } = input;

      const settings = await ctx.db.communicationSettings.upsert({
        where: { branchId },
        update: {
          ...settingsData,
          updatedBy: ctx.userId!,
        },
        create: {
          branchId,
          ...settingsData,
          createdBy: ctx.userId!,
          updatedBy: ctx.userId!,
        },
      });

      // Log the settings change
      await ctx.db.communicationLog.create({
        data: {
          action: "settings_updated",
          description: `Communication settings updated for branch ${branchId}`,
          metadata: { settingsId: settings.id, updatedFields: Object.keys(settingsData) },
          userId: ctx.userId!,
        }
      });

      return settings;
    }),

  // Get statistics
  getStats: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {};
      
      if (input.branchId) {
        whereConditions.branchId = input.branchId;
      }
      
      if (input.dateFrom || input.dateTo) {
        whereConditions.createdAt = {};
        if (input.dateFrom) {
          whereConditions.createdAt.gte = input.dateFrom;
        }
        if (input.dateTo) {
          whereConditions.createdAt.lte = input.dateTo;
        }
      }

      const [
        totalMessages,
        sentMessages,
        failedMessages,
        scheduledMessages,
        totalRecipients,
        successfulDeliveries
      ] = await Promise.all([
        ctx.db.communicationMessage.count({ where: whereConditions }),
        ctx.db.communicationMessage.count({ where: { ...whereConditions, status: "SENT" } }),
        ctx.db.communicationMessage.count({ where: { ...whereConditions, status: "FAILED" } }),
        ctx.db.communicationMessage.count({ where: { ...whereConditions, status: "SCHEDULED" } }),
        ctx.db.messageRecipient.count({
          where: {
            message: whereConditions
          }
        }),
        ctx.db.messageRecipient.count({
          where: {
            message: whereConditions,
            status: { in: ["SENT", "DELIVERED"] }
          }
        })
      ]);

      return {
        totalMessages,
        sentMessages,
        failedMessages,
        scheduledMessages,
        totalRecipients,
        successfulDeliveries,
        deliveryRate: totalRecipients > 0 ? (successfulDeliveries / totalRecipients) * 100 : 0
      };
    })
}); 