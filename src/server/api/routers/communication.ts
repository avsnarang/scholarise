import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permission } from "@/types/permissions";

// Lazy import Twilio utilities to prevent client-side bundling
const getWhatsAppUtils = async () => {
  const { 
    getDefaultWhatsAppClient,
    formatTemplateVariables
  } = await import("@/utils/whatsapp-api");
  
  return {
    getDefaultWhatsAppClient,
    formatTemplateVariables
  };
};

// Input validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  // Meta WhatsApp template fields
  metaTemplateName: z.string().min(1, "Meta template name is required"),
  metaTemplateLanguage: z.string().default("en"),
  metaTemplateStatus: z.string().optional(),
  metaTemplateId: z.string().optional(),
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
    "ALL_STUDENTS",
    "INDIVIDUAL_STUDENTS",
    "ENTIRE_CLASS",
    "INDIVIDUAL_SECTION",
    "TEACHERS",
    "EMPLOYEES",
  ]),
  recipients: z.array(z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string(),
    type: z.string(),
  })),
  contactType: z.array(z.enum(["STUDENT", "FATHER", "MOTHER"])).optional(), // For student-related selections
  selectedTeachers: z.array(z.string()).optional(), // For individual teacher selection
  selectedEmployees: z.array(z.string()).optional(), // For individual employee selection
  templateParameters: z.record(z.string()).optional(),
  templateDataMappings: z.record(z.object({
    dataField: z.string(),
    fallbackValue: z.string()
  })).optional(),
  scheduledAt: z.date().optional(),
  branchId: z.string().min(1, "Branch ID is required"),
});

export const communicationRouter = createTRPCRouter({

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

  // Debug endpoint to test Meta WhatsApp API response
  debugWhatsAppResponse: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        console.log('Testing Meta WhatsApp API connection and response format...');
        const { getDefaultWhatsAppClient } = await getWhatsAppUtils();
        const whatsappClient = getDefaultWhatsAppClient();
        
        // Make the raw API call to see exactly what we get
        const rawResponse = await whatsappClient.testConnection();
        console.log('Test connection result:', rawResponse);
        
        // Now try to get templates and see the raw response
        const templatesResponse = await whatsappClient.getTemplates();
        
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
        console.error('Debug Meta WhatsApp API error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        };
      }
    }),

  // Create a new template
  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Template name is required"),
      description: z.string().optional(),
      category: z.enum(["AUTHENTICATION", "MARKETING", "UTILITY"]),
      language: z.string().default("en"),
      templateBody: z.string().min(1, "Template content is required"),
      templateVariables: z.array(z.string()),
      branchId: z.string().optional(),
      metaTemplateName: z.string(),
      metaTemplateLanguage: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if template name already exists
        const existingTemplate = await ctx.db.whatsAppTemplate.findFirst({
          where: {
            name: input.name,
          },
        });

        if (existingTemplate) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A template with this name already exists',
          });
        }

        // Create the template
        const template = await ctx.db.whatsAppTemplate.create({
          data: {
            name: input.name,
            description: input.description,
            category: input.category,
            language: input.language,
            templateBody: input.templateBody,
            templateVariables: input.templateVariables,
            metaTemplateName: input.metaTemplateName,
            metaTemplateLanguage: input.metaTemplateLanguage,
            metaTemplateStatus: null,
            status: 'PENDING',
            isActive: true,
            branchId: input.branchId,
            createdBy: ctx.user?.id || 'system',
          },
        });

        // Log the creation
        await ctx.db.communicationLog.create({
          data: {
            action: "template_created",
            description: `Template "${input.name}" created with ${input.templateVariables.length} variables`,
            metadata: JSON.parse(JSON.stringify({
              templateId: template.id,
              templateName: input.name,
              templateCategory: input.category,
              variableCount: input.templateVariables.length,
              templateVariables: input.templateVariables
            })),
            userId: ctx.user?.id || 'system',
          }
        });

        return {
          id: template.id,
          name: template.name,
          message: 'Template created successfully'
        };

      } catch (error) {
        console.error('Error creating template:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create template',
        });
      }
    }),

  // Submit template to Meta for approval
  submitTemplateToMeta: protectedProcedure
    .input(z.object({
      templateId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Get the template
        const template = await ctx.db.whatsAppTemplate.findUnique({
          where: { id: input.templateId },
        });

        if (!template) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        if (template.metaTemplateStatus === 'APPROVED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Template is already approved',
          });
        }

        // Validate template name for Meta (no spaces, special chars, must be lowercase)
        const metaTemplateName = template.metaTemplateName || template.name;
        const validatedName = metaTemplateName
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/_{2,}/g, '_')
          .replace(/^_+|_+$/g, '');
        
        if (!validatedName || validatedName.length < 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid template name. Template name must contain at least one letter or number.',
          });
        }

        // Convert our template format to Meta API format
        const components = [];
        
        // Parse variables from template body
        let variables = template.templateVariables || [];
        
        // Import template variable parser if variables not stored
        if (!variables || variables.length === 0) {
          const { parseTemplateVariables } = await import("@/utils/template-variables");
          variables = parseTemplateVariables(template.templateBody);
        }
        
        // Convert template body from {{variable_name}} format to {{1}}, {{2}} format for Meta
        let metaTemplateBody = template.templateBody;
        const variableMap: Record<string, number> = {};
        
        if (variables.length > 0) {
          variables.forEach((variable, index) => {
            const variablePattern = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
            const placeholderNumber = index + 1;
            metaTemplateBody = metaTemplateBody.replace(variablePattern, `{{${placeholderNumber}}}`);
            variableMap[variable] = placeholderNumber;
          });
        }
        
        // Add body component
        const bodyComponent: any = {
          type: "BODY",
          text: metaTemplateBody,
        };
        
        // Add examples if there are variables
        if (variables.length > 0) {
          bodyComponent.example = {
            body_text: [variables.map((variable, index) => {
              // Use the variable key or a generic example
              const variableInfo = variable || `Sample ${index + 1}`;
              return typeof variableInfo === 'string' ? variableInfo : `Example ${index + 1}`;
            })]
          };
        }
        
        components.push(bodyComponent);

        console.log('Template submission details:', {
          originalName: template.metaTemplateName || template.name,
          validatedName,
          originalBody: template.templateBody,
          metaBody: metaTemplateBody,
          variables: variables,
          components: JSON.stringify(components, null, 2)
        });

        // Submit to Meta API
        const { getDefaultWhatsAppClient } = await getWhatsAppUtils();
        const client = getDefaultWhatsAppClient();
        const response = await client.submitTemplateForApproval({
          name: validatedName,
          category: (template.category as 'AUTHENTICATION' | 'MARKETING' | 'UTILITY') || 'UTILITY',
          language: template.metaTemplateLanguage || 'en',
          components: components,
          allowCategoryChange: true
        });

        if (!response.result || !response.data) {
          console.error('Meta API submission failed:', response);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: response.error || 'Failed to submit template to Meta',
          });
        }

        // Update template with Meta response and the actual validated name that was sent
        const updatedTemplate = await ctx.db.whatsAppTemplate.update({
          where: { id: input.templateId },
          data: {
            metaTemplateId: response.data.id,
            metaTemplateStatus: response.data.status,
            metaTemplateName: validatedName, // Store the actual name sent to Meta
            updatedAt: new Date()
          }
        });

        // Log the submission
        await ctx.db.communicationLog.create({
          data: {
            action: "template_submitted",
            description: `Template "${template.metaTemplateName}" submitted to Meta for approval`,
            metadata: {
              templateId: template.id,
              metaTemplateId: response.data.id,
              status: response.data.status,
              category: response.data.category
            },
            userId: ctx.user?.id || 'system',
          }
        });

        return {
          success: true,
          templateId: response.data.id,
          status: response.data.status,
          category: response.data.category,
          message: 'Template submitted for approval successfully'
        };

      } catch (error) {
        console.error('Error submitting template to Meta:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to submit template to Meta',
        });
      }
    }),

  // Sync templates from Meta WhatsApp API (now global - not branch-specific)
  syncTemplatesFromWhatsApp: protectedProcedure
    .input(z.object({
      originBranchId: z.string().optional(), // Optional - tracks which branch initiated the sync
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log('Starting Meta WhatsApp template sync...');
        const { getDefaultWhatsAppClient } = await getWhatsAppUtils();
        const whatsappClient = getDefaultWhatsAppClient();
        const templatesResponse = await whatsappClient.getTemplates();
        
        console.log('Meta WhatsApp API response:', templatesResponse);
        
        // Check if the API call was successful
        if (!templatesResponse.result) {
          throw new Error(`Failed to fetch templates from Meta: ${templatesResponse.error || 'Unknown error'}`);
        }
        
        // Extract the templates array from the response
        const whatsappTemplates = templatesResponse.data || [];
        
        if (!Array.isArray(whatsappTemplates)) {
          throw new Error(`Expected array of templates in response data, got ${typeof whatsappTemplates}. Response: ${JSON.stringify(templatesResponse)}`);
        }
        
        if (whatsappTemplates.length === 0) {
          return {
            success: true,
            syncedCount: 0,
            templates: [],
            message: 'No templates found in WhatsApp API'
          };
        }
        
        // For Meta WhatsApp API, filter for approved/active templates
        const usableTemplates = whatsappTemplates.filter((t: any) => 
          t.status === 'approved' || 
          t.status === 'APPROVED' || 
          t.status === undefined || 
          t.status === null ||
          t.status === 'active'
        );
        console.log(`Found ${whatsappTemplates.length} total templates, ${usableTemplates.length} usable`);
        
        const syncedTemplates = [];
        
        for (const whatsappTemplate of usableTemplates) {
          try {
            // Meta WhatsApp API uses 'name' and components structure
            const templateName = whatsappTemplate.name || '';
            
            // Extract template body from components (look for BODY component)
            const bodyComponent = whatsappTemplate.components?.find((c: any) => c.type === 'BODY');
            const templateBody = bodyComponent?.text || '';
            
            // Extract variables from template body (look for {{1}}, {{2}}, etc.)
            const variableMatches = templateBody.match(/\{\{\d+\}\}/g) || [];
            const variables = variableMatches.map((match: string, index: number) => `variable_${index + 1}`);
            
            console.log(`Template ${templateName} body:`, templateBody);
            console.log(`Template ${templateName} variables:`, variables);
            
            // Look for existing template using the compound unique constraint
            const existingTemplate = await ctx.db.whatsAppTemplate.findUnique({
              where: { 
                metaTemplateName_metaTemplateLanguage: {
                  metaTemplateName: templateName,
                  metaTemplateLanguage: whatsappTemplate.language || 'en'
                }
              }
            });
            
            if (existingTemplate) {
              // Update existing template (keep original branch if it exists)
              const updated = await ctx.db.whatsAppTemplate.update({
                where: { id: existingTemplate.id },
                data: {
                  name: templateName,
                  templateBody,
                  templateVariables: variables,
                  category: whatsappTemplate.category || 'UTILITY',
                  language: whatsappTemplate.language || 'en',
                  metaTemplateLanguage: whatsappTemplate.language || 'en',
                  metaTemplateStatus: whatsappTemplate.status || 'APPROVED',
                  metaTemplateId: whatsappTemplate.id,
                  status: (whatsappTemplate.status === 'approved' || whatsappTemplate.status === 'APPROVED' || !whatsappTemplate.status) ? 'APPROVED' : 'PENDING',
                  updatedAt: new Date(),
                }
              });
              syncedTemplates.push(updated);
            } else {
              // Create new template - assign to origin branch if provided
              const created = await ctx.db.whatsAppTemplate.create({
                data: {
                  name: templateName,
                  metaTemplateId: whatsappTemplate.id,
                  metaTemplateName: templateName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                  metaTemplateLanguage: whatsappTemplate.language || 'en',
                  metaTemplateStatus: whatsappTemplate.status || 'APPROVED',
                  templateBody,
                  templateVariables: variables,
                  category: whatsappTemplate.category || 'UTILITY',
                  language: whatsappTemplate.language || 'en',
                  status: (whatsappTemplate.status === 'approved' || whatsappTemplate.status === 'APPROVED' || !whatsappTemplate.status) ? 'APPROVED' : 'PENDING',
                  branchId: input.originBranchId, // Optional - templates are now global
                  createdBy: ctx.userId!,
                }
              });
              syncedTemplates.push(created);
            }
          } catch (templateError) {
            console.error(`Error syncing template ${whatsappTemplate.id}:`, templateError);
            // Continue with other templates
          }
        }
        
        // Log the sync activity
        await ctx.db.communicationLog.create({
          data: {
            action: "template_sync",
            description: `Synced ${syncedTemplates.length} templates from Meta WhatsApp API`,
            metadata: JSON.parse(JSON.stringify({
                          totalWhatsappTemplates: whatsappTemplates.length,
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
          message: `Successfully synced ${syncedTemplates.length} templates from WhatsApp`
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
        "INDIVIDUAL_SECTION",
        "TEACHERS",
        "EMPLOYEES",
      ]),
      branchId: z.string().min(1, "Branch ID is required"),
      sessionId: z.string().optional(),
      classIds: z.array(z.string()).optional(),
      sectionIds: z.array(z.string()).optional(),
      searchTerm: z.string().optional(),
      contactType: z.array(z.enum(["STUDENT", "FATHER", "MOTHER"])).optional(), // For student contact selection
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
        case "INDIVIDUAL_SECTION":
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
          
          // Handle multiple contact types for student-related selections
          const contactTypes = input.contactType || ["STUDENT"];
          
          students.forEach(student => {
            const studentName = `${student.firstName} ${student.lastName}`;
            const className = student.section?.class?.name;
            
            contactTypes.forEach(contactType => {
              let recipientPhone = '';
              let recipientName = studentName;
              let recipientId = student.id;
              
              switch (contactType) {
                case "STUDENT":
                  recipientPhone = student.phone || '';
                  break;
                case "FATHER":
                  recipientPhone = student.parent?.fatherMobile || '';
                  recipientName = `${student.parent?.fatherName || 'Father'} (${studentName})`;
                  recipientId = `father-${student.id}`;
                  break;
                case "MOTHER":
                  recipientPhone = student.parent?.motherMobile || '';
                  recipientName = `${student.parent?.motherName || 'Mother'} (${studentName})`;
                  recipientId = `mother-${student.id}`;
                  break;
              }
              
              if (recipientPhone) {
                recipients.push({
                  id: recipientId,
                  name: recipientName,
                  phone: recipientPhone,
                  type: contactType.toLowerCase(),
                  className,
                });
              }
            });
          });
          break;

        case "TEACHERS":
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

        case "EMPLOYEES":
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
      }

      return recipients;
    }),

  // Send a communication message
  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Get communication settings for phone normalization (defaults if not found)
        const phoneNormalizationConfig = {
          enabled: true,
          defaultCountryCode: '+91',
          organizationCountry: 'IN'
        };

        // Create message record first
        const message = await ctx.db.communicationMessage.create({
          data: {
            title: input.title,
            templateId: input.templateId || undefined,
            customMessage: input.customMessage || undefined,
            recipientType: input.recipientType,
            status: "PENDING",
            branchId: input.branchId,
            createdBy: ctx.user?.id || 'system',
            totalRecipients: input.recipients.length,
            sentAt: undefined,
            successfulSent: 0,
            failed: 0,
          }
        });

        // Filter recipients with valid phone numbers
        const recipientsWithValidPhones = input.recipients.filter(recipient => {
          const phone = recipient.phone?.replace(/\D/g, '') || '';
          return phone && phone.length >= 10;
        });

        if (recipientsWithValidPhones.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No recipients with valid phone numbers found",
          });
        }

        // 🔍 DIAGNOSTIC: Log what we're trying to send
        console.log('📤 SendMessage Debug Info:', {
          messageId: message.id,
          totalRecipients: input.recipients.length,
          validPhoneRecipients: recipientsWithValidPhones.length,
          templateId: input.templateId,
          hasCustomMessage: !!input.customMessage,
          recipientType: input.recipientType,
                     userId: ctx.user?.id || 'system',
          branchId: input.branchId
        });

        // Send immediately
        const { getDefaultWhatsAppClient } = await import("@/utils/whatsapp-api");
        
        // 🔍 DIAGNOSTIC: Test WhatsApp client initialization
        let whatsappClient;
        try {
          whatsappClient = getDefaultWhatsAppClient();
          console.log('✅ WhatsApp client initialized successfully');
        } catch (clientError) {
          console.error('❌ Failed to initialize WhatsApp client:', clientError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `WhatsApp configuration error: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`,
          });
        }

        let whatsappResponse;

        if (input.templateId) {
          // Send using template
          console.log('📋 Attempting to send template message...');
          
          const template = await ctx.db.whatsAppTemplate.findUnique({
            where: { id: input.templateId }
          });

          if (!template) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Template not found",
            });
          }

          // 🔍 DIAGNOSTIC: Log template details
          console.log('📋 Template Details:', {
            id: template.id,
            name: template.name,
            metaTemplateName: template.metaTemplateName,
            metaTemplateStatus: template.metaTemplateStatus,
            metaTemplateLanguage: template.metaTemplateLanguage,
            isActive: template.isActive,
            status: template.status
          });

          // Check if template has Meta template name
          if (!template.metaTemplateName) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Template "${template.name}" does not have a valid Meta template name. Please sync with Meta first.`,
            });
          }

          // Check if template is approved
          if (template.metaTemplateStatus !== 'APPROVED') {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Template "${template.name}" is not approved (status: ${template.metaTemplateStatus}). Only approved templates can be sent.`,
            });
          }

          // Use template parameters from input, or empty object
          const inputParameters = input.templateParameters || {};
          console.log('📋 Input template parameters:', inputParameters);
          console.log('📋 Template variables structure:', template.templateVariables);

          // Validate and prepare template parameters
          const { prepareTemplateParameters } = await import("@/utils/template-validator");
          const { parameters, validation } = prepareTemplateParameters(
            {
              id: template.id,
              name: template.name,
              metaTemplateName: template.metaTemplateName,
              metaTemplateLanguage: template.metaTemplateLanguage,
              templateVariables: template.templateVariables,
              templateBody: template.templateBody
            },
            inputParameters
          );

          console.log('📋 Prepared parameters:', parameters);
          console.log('📋 Validation result:', validation);

          // Log warnings but continue
          if (validation.warnings.length > 0) {
            console.warn('⚠️ Template validation warnings:', validation.warnings);
          }

          // Fail if there are critical errors
          if (!validation.isValid) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Template parameter validation failed: ${validation.errors.join(', ')}. Suggested parameters: ${JSON.stringify(validation.suggestedParameters)}`,
            });
          }

          // Send to multiple recipients using bulk method
          try {
            // Build individual parameters for each recipient if data mappings are provided
            let recipientParameters: Record<string, Record<string, string>> = {};
            
            if (input.templateDataMappings) {
              console.log('📋 Using template data mappings:', input.templateDataMappings);
              
              const { buildTemplateParameters } = await import("@/utils/template-data-mapper");
              const dataMappings = Object.entries(input.templateDataMappings).map(([variableName, mapping]: [string, any]) => ({
                variableName,
                dataField: mapping.dataField,
                fallbackValue: mapping.fallbackValue
              }));
              
              recipientParameters = buildTemplateParameters(recipientsWithValidPhones, dataMappings);
              console.log('📋 Built recipient parameters:', recipientParameters);
            }

                      // Check if template has variables before sending parameters
          const templateHasVariables = template.templateVariables && 
            Array.isArray(template.templateVariables) && 
            template.templateVariables.length > 0;

          console.log('📋 Template variable analysis:', {
            templateName: template.name,
            metaTemplateName: template.metaTemplateName,
            hasVariables: templateHasVariables,
            variableCount: template.templateVariables?.length || 0,
            variables: template.templateVariables
          });

          whatsappResponse = await whatsappClient.sendBulkTemplateMessage(
              recipientsWithValidPhones.map(recipient => {
                // Use individual recipient parameters if available, otherwise use default parameters
                const individualParams = recipientParameters[recipient.id] || parameters;
                
                // Only include the exact variables the template expects - no extra name parameters
                let variables = {};
                if (templateHasVariables) {
                  variables = { 
                    ...individualParams
                    // No extra name parameters - only send what the template actually expects
                  };
                }
                
                return {
                  phone: recipient.phone,
                  name: recipient.name,
                  variables
                };
              }),
              template.metaTemplateName,
              templateHasVariables ? parameters : {}, // Only pass base parameters if template has variables
              template.metaTemplateLanguage || 'en',
              phoneNormalizationConfig.enabled,
              {
                defaultCountryCode: phoneNormalizationConfig.defaultCountryCode,
                organizationCountry: phoneNormalizationConfig.organizationCountry
              }
            );
            
            console.log('✅ Bulk template message response:', {
              result: whatsappResponse.result,
              successful: whatsappResponse.data?.successful,
              failed: whatsappResponse.data?.failed,
              info: whatsappResponse.info
            });
          } catch (sendError) {
            console.error('❌ Failed to send bulk template message:', sendError);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to send template message: ${sendError instanceof Error ? sendError.message : 'Unknown error'}`,
            });
          }
        } else if (input.customMessage) {
          // For custom messages, send individual text messages
          console.log('💬 Attempting to send custom text messages...');
          
          const results = [];
          let successful = 0;
          let failed = 0;

          for (const recipient of recipientsWithValidPhones) {
            try {
              console.log(`📱 Sending to ${recipient.phone}...`);
              
              const response = await whatsappClient.sendTextMessage(
                recipient.phone,
                input.customMessage
              );

              console.log(`📱 Response for ${recipient.phone}:`, {
                result: response.result,
                error: response.error,
                messageId: response.data?.messages?.[0]?.id
              });

              if (response.result) {
                results.push({ phone: recipient.phone, success: true, messageId: response.data?.messages?.[0]?.id || 'unknown' });
                successful++;
              } else {
                results.push({ phone: recipient.phone, success: false, error: response.error });
                failed++;
              }
            } catch (error) {
              console.error(`❌ Error sending to ${recipient.phone}:`, error);
              results.push({ 
                phone: recipient.phone, 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
              });
              failed++;
            }

            // Add delay to avoid rate limiting (Meta API)
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          whatsappResponse = {
            result: successful > 0,
            data: { successful, failed, results },
            info: `Sent to ${successful} recipients, ${failed} failed`,
            provider: 'META'
          };
          
          console.log('✅ Custom message sending completed:', {
            totalSent: successful,
            totalFailed: failed,
            overallSuccess: whatsappResponse.result
          });
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
            status: whatsappResponse.result ? "SENT" : "FAILED",
            sentAt: whatsappResponse.result ? new Date() : undefined,
            successfulSent: whatsappResponse.data?.successful || 0,
            failed: whatsappResponse.data?.failed || 0,
            metaMessageId: whatsappResponse.data?.results?.[0]?.messageId || undefined,
          }
        });

        // Create recipient records for ALL recipients (including those with invalid phones)
        const allRecipientRecords = input.recipients.map((recipient, index) => {
          const hasValidPhone = recipient.phone && recipient.phone.trim() !== '';
          const cleanPhone = recipient.phone?.replace(/\D/g, '') || '';
          const isPhoneValid = cleanPhone.length >= 10;
          
          let status = "FAILED" as any;
          let errorMessage = null;
          let twilioMessageId = null;
          let sentAt = null;
          
          if (!hasValidPhone) {
            errorMessage = "No phone number provided";
          } else if (!isPhoneValid) {
            errorMessage = "Invalid phone number format";
          } else {
            // Find this recipient in the whatsappResponse results
            const validIndex = recipientsWithValidPhones.findIndex(r => r.id === recipient.id);
            if (validIndex !== -1 && whatsappResponse.data?.results?.[validIndex]) {
              const result = whatsappResponse.data.results[validIndex];
              status = result.success ? "SENT" as any : "FAILED" as any;
              twilioMessageId = result.messageId;
              errorMessage = result.success ? null : result.error;
              sentAt = result.success ? new Date() : null;
            }
          }
          
          return {
            messageId: message.id,
            recipientType: recipient.type,
            recipientId: recipient.id,
            recipientName: recipient.name,
            recipientPhone: recipient.phone || "",
            status,
            sentAt,
            metaMessageId: twilioMessageId, // Using Meta API only now
            errorMessage,
          };
        });

        await ctx.db.messageRecipient.createMany({
          data: allRecipientRecords
        });

        // Log the communication activity
        await ctx.db.communicationLog.create({
          data: {
            messageId: message.id,
            action: "message_sent",
            description: `Message "${input.title}" sent to ${recipientsWithValidPhones.length} recipients via Meta WhatsApp`,
            metadata: JSON.parse(JSON.stringify({
              whatsappResponse,
              recipientCount: recipientsWithValidPhones.length,
              templateUsed: input.templateId ? true : false
            })),
            userId: ctx.user?.id || 'system',
          }
        });

        return {
          success: whatsappResponse.result,
          messageId: message.id,
          totalRecipients: recipientsWithValidPhones.length,
          successfulSent: whatsappResponse.data?.successful || 0,
          failed: whatsappResponse.data?.failed || 0,
          info: whatsappResponse.info
        };

      } catch (error) {
        // Log the error
        await ctx.db.communicationLog.create({
          data: {
            action: "message_send_failed",
            description: `Failed to send message "${input.title}": ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
            userId: ctx.user?.id || 'system',
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
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              recipientType: true,
              recipientId: true,
              recipientName: true,
              recipientPhone: true,
              status: true,
              sentAt: true,
              deliveredAt: true,
              readAt: true,
              metaMessageId: true,
              errorMessage: true,
              createdAt: true,
              updatedAt: true
            }
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

      // Add delivery statistics
      const deliveryStats = message.recipients.reduce((acc, recipient) => {
        switch (recipient.status) {
          case 'SENT':
          case 'DELIVERED':
          case 'READ':
            acc.delivered++;
            break;
          case 'FAILED':
            acc.failed++;
            break;
          case 'PENDING':
            acc.pending++;
            break;
        }
        acc.total++;
        return acc;
      }, { delivered: 0, failed: 0, pending: 0, total: 0 });

      return {
        ...message,
        deliveryStats
      };
    }),

  // Debug environment variables for Meta WhatsApp API
  debugEnvironment: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { env } = await import("@/env.js");
      
      return {
        hasAccessToken: !!env.META_WHATSAPP_ACCESS_TOKEN,
        hasPhoneNumberId: !!env.META_WHATSAPP_PHONE_NUMBER_ID,
        hasBusinessAccountId: !!env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
        hasWebhookVerifyToken: !!env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN,
        accessTokenPreview: env.META_WHATSAPP_ACCESS_TOKEN ? `${env.META_WHATSAPP_ACCESS_TOKEN.substring(0, 8)}...` : 'missing',
        phoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID || 'missing',
        apiVersion: env.META_WHATSAPP_API_VERSION || 'v21.0 (default)'
      };
    }),

  // Refresh WhatsApp client (useful after environment variable changes)
  refreshWhatsAppClient: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        console.log('🔄 Refreshing WhatsApp client...');
        
        // Import the WhatsApp client function
        const { getDefaultWhatsAppClient } = await getWhatsAppUtils();
        
        // Try to create a new client
        const newClient = getDefaultWhatsAppClient();
        console.log('✅ New WhatsApp client created successfully');
        
        // Test the new connection
        const testResult = await newClient.testConnection();
        console.log('📊 New client test result:', testResult);
        
        // Log the refresh
        await ctx.db.communicationLog.create({
          data: {
            action: "whatsapp_client_refresh",
            description: testResult.result ? "WhatsApp client refreshed and tested successfully" : `WhatsApp client refresh failed: ${testResult.error}`,
            metadata: JSON.parse(JSON.stringify({ testResult })),
            userId: ctx.userId!,
          }
        });
        
        return {
          success: testResult.result,
          message: testResult.result ? "WhatsApp client refreshed successfully" : "WhatsApp client refresh failed",
          error: testResult.error,
          data: testResult.data
        };
        
      } catch (error) {
        console.error('❌ Failed to refresh WhatsApp client:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Log the error
        try {
          await ctx.db.communicationLog.create({
            data: {
              action: "whatsapp_client_refresh",
              description: `WhatsApp client refresh failed: ${errorMessage}`,
              metadata: { error: errorMessage },
              userId: ctx.userId!,
            }
          });
        } catch (logError) {
          console.error('Failed to log WhatsApp client refresh error:', logError);
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }
    }),

  // Test Meta WhatsApp API connection
  testWhatsAppConnection: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        console.log('🔍 Starting Meta WhatsApp API connection test...');
        
        // First check environment variables
        const { env } = await import("@/env.js");
        const envCheck = {
          hasAccessToken: !!env.META_WHATSAPP_ACCESS_TOKEN,
          hasPhoneNumberId: !!env.META_WHATSAPP_PHONE_NUMBER_ID,
          hasBusinessAccountId: !!env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
          hasWebhookVerifyToken: !!env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN,
          accessTokenLength: env.META_WHATSAPP_ACCESS_TOKEN?.length || 0,
          apiVersion: env.META_WHATSAPP_API_VERSION || 'v21.0'
        };
        
        console.log('📋 Environment variables check:', envCheck);
        
        // Check for common issues
        const issues = [];
        if (!envCheck.hasAccessToken) issues.push('META_WHATSAPP_ACCESS_TOKEN is missing');
        if (!envCheck.hasPhoneNumberId) issues.push('META_WHATSAPP_PHONE_NUMBER_ID is missing');
        if (!envCheck.hasBusinessAccountId) issues.push('META_WHATSAPP_BUSINESS_ACCOUNT_ID is missing');
        if (!envCheck.hasWebhookVerifyToken) issues.push('META_WHATSAPP_WEBHOOK_VERIFY_TOKEN is missing');
        
        if (issues.length > 0) {
          console.error('❌ Configuration issues found:', issues);
          return {
            success: false,
            error: `Configuration issues: ${issues.join(', ')}`,
            envCheck,
            issues
          };
        }
        
        // Try to create WhatsApp client
        const { getDefaultWhatsAppClient } = await getWhatsAppUtils();
        console.log('🔧 Creating WhatsApp client...');
        const whatsappClient = getDefaultWhatsAppClient();
        console.log('✅ WhatsApp client created successfully');
        
        // Test the connection
        console.log('🌐 Testing connection...');
        const result = await whatsappClient.testConnection();
        console.log('📊 Connection test result:', result);
        
        // Log the test
        await ctx.db.communicationLog.create({
          data: {
            action: "whatsapp_connection_test",
            description: result.result ? "Meta WhatsApp API connection test successful" : `Meta WhatsApp API connection test failed: ${result.error}`,
            metadata: { 
              result: result.result,
              envCheck,
              issues: issues.length > 0 ? issues : null 
            },
            userId: ctx.userId!,
          }
        });

        return {
          success: result.result,
          error: result.error,
          info: result.info,
          data: result.data,
          envCheck,
          issues: issues.length > 0 ? issues : null
        };
      } catch (error) {
        console.error('❌ Meta WhatsApp connection test failed:', error);
        
        let errorMessage = 'Unknown error';
        let isConfigurationIssue = false;
        
        if (error instanceof Error) {
          errorMessage = error.message;
          
          // Categorize the error
          if (error.message.includes('Missing:') || 
              error.message.includes('required') || 
              error.message.includes('WhatsApp messaging unavailable')) {
            isConfigurationIssue = true;
            errorMessage = `Configuration Error: ${error.message}`;
          } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = "Authentication failed: Invalid Meta WhatsApp credentials. Please verify your access token.";
          } else if (error.message.includes('404')) {
            errorMessage = "Meta WhatsApp API endpoint not found. Please verify your configuration.";
          } else if (error.message.includes('429')) {
            errorMessage = "Rate limit exceeded. Please try again later.";
          }
        }
        
        // Log the error
        try {
          await ctx.db.communicationLog.create({
            data: {
              action: "whatsapp_connection_test",
              description: `Meta WhatsApp API connection test failed: ${errorMessage}`,
              metadata: { 
                error: errorMessage, 
                isConfigurationIssue,
                stack: error instanceof Error ? error.stack : undefined 
              },
              userId: ctx.userId!,
            }
          });
        } catch (logError) {
          console.error('Failed to log Meta WhatsApp connection test error:', logError);
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
    }),

  // Export detailed delivery log as CSV
  exportDeliveryLog: protectedProcedure
    .input(z.object({
      messageId: z.string().min(1, "Message ID is required"),
    }))
    .query(async ({ ctx, input }) => {
      const messageDetails = await ctx.db.communicationMessage.findUnique({
        where: { id: input.messageId },
        include: {
          recipients: {
            orderBy: { createdAt: "asc" }
          },
          template: true,
          branch: { select: { name: true, code: true } }
        }
      });

      if (!messageDetails) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      // Generate CSV data
      const csvHeaders = [
        "Recipient Name",
        "Recipient Type", 
        "Phone Number",
        "Phone Status",
        "Delivery Status",
        "Sent Time",
        "Delivered Time",
        "Error Message",
        "Twilio Message ID"
      ];

      const csvRows = messageDetails.recipients.map(recipient => {
        const hasValidPhone = recipient.recipientPhone && recipient.recipientPhone.trim() !== '';
        const cleanPhone = recipient.recipientPhone?.replace(/\D/g, '') || '';
        const isPhoneValid = cleanPhone.length >= 10;
        
        let phoneStatus = "Valid";
        if (!hasValidPhone) {
          phoneStatus = "No Phone Number";
        } else if (!isPhoneValid) {
          phoneStatus = "Invalid Format";
        }

        return [
          recipient.recipientName,
          recipient.recipientType.charAt(0).toUpperCase() + recipient.recipientType.slice(1),
          recipient.recipientPhone || "N/A",
          phoneStatus,
          recipient.status,
          recipient.sentAt ? new Date(recipient.sentAt).toLocaleString() : "Not sent",
          "N/A", // deliveredAt - would need webhook integration
          recipient.errorMessage || "N/A",
          recipient.twilioMessageId || "N/A"
        ];
      });

      // Convert to CSV string
      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      return {
        csvContent,
        filename: `delivery-log-${messageDetails.title.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`,
        messageTitle: messageDetails.title,
        totalRecipients: messageDetails.recipients.length
      };
    }),

  // Update template
  updateTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      name: z.string().min(1, "Template name is required"),
      description: z.string().optional(),
      category: z.enum(["AUTHENTICATION", "MARKETING", "UTILITY"]),
      language: z.string().default("en"),
      templateBody: z.string().min(1, "Template content is required"),
      templateVariables: z.array(z.string()),
      metaTemplateName: z.string(),
      metaTemplateLanguage: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if template exists
        const existingTemplate = await ctx.db.whatsAppTemplate.findUnique({
          where: { id: input.templateId },
        });

        if (!existingTemplate) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        // Check if template name is taken by another template
        if (input.name !== existingTemplate.name) {
          const nameConflict = await ctx.db.whatsAppTemplate.findFirst({
            where: {
              name: input.name,
              id: { not: input.templateId }
            },
          });

          if (nameConflict) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'A template with this name already exists',
            });
          }
        }

        // Check if template can be edited (not approved)
        if (existingTemplate.metaTemplateStatus === 'APPROVED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot edit approved templates. Create a new template instead.',
          });
        }

        // Update the template
        const updatedTemplate = await ctx.db.whatsAppTemplate.update({
          where: { id: input.templateId },
          data: {
            name: input.name,
            description: input.description,
            category: input.category,
            language: input.language,
            templateBody: input.templateBody,
            templateVariables: input.templateVariables,
            metaTemplateName: input.metaTemplateName,
            metaTemplateLanguage: input.metaTemplateLanguage,
            // Reset meta status since content changed
            metaTemplateStatus: null,
            metaTemplateId: null,
            updatedAt: new Date()
          },
        });

        // Log the update
        await ctx.db.communicationLog.create({
          data: {
            action: "template_updated",
            description: `Template "${input.name}" updated with ${input.templateVariables.length} variables`,
            metadata: JSON.parse(JSON.stringify({
              templateId: updatedTemplate.id,
              templateName: input.name,
              templateCategory: input.category,
              variableCount: input.templateVariables.length,
              templateVariables: input.templateVariables
            })),
            userId: ctx.user?.id || 'system',
          }
        });

        return {
          id: updatedTemplate.id,
          name: updatedTemplate.name,
          message: 'Template updated successfully'
        };

      } catch (error) {
        console.error('Error updating template:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update template',
        });
      }
    }),



  // Delete template from both local database and Meta
  // This ensures consistency between local templates and Meta's template system
  deleteTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if template exists
        const existingTemplate = await ctx.db.whatsAppTemplate.findUnique({
          where: { id: input.templateId },
        });

        if (!existingTemplate) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        // Check if template is being used in any messages
        const messagesUsingTemplate = await ctx.db.communicationMessage.count({
          where: { templateId: input.templateId },
        });

        if (messagesUsingTemplate > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot delete template. It is being used in ${messagesUsingTemplate} message(s). Please delete those messages first.`,
          });
        }

        // Also delete from Meta if template exists there
        let metaDeletionResult = null;
        if (existingTemplate.metaTemplateId) {
          try {
            console.log(`🗑️ Attempting to delete template ${existingTemplate.metaTemplateId} from Meta...`);
            const { getDefaultWhatsAppClient } = await getWhatsAppUtils();
            const client = getDefaultWhatsAppClient();
            metaDeletionResult = await client.deleteTemplate(existingTemplate.metaTemplateId);
            
            if (metaDeletionResult.result) {
              console.log('✅ Template successfully deleted from Meta');
            } else {
              console.warn('⚠️ Failed to delete template from Meta:', metaDeletionResult.error);
              // Continue with local deletion even if Meta deletion fails
            }
          } catch (error) {
            console.error('❌ Error deleting template from Meta:', error);
            // Continue with local deletion even if Meta deletion fails
          }
        }

        // Delete the template from local database
        await ctx.db.whatsAppTemplate.delete({
          where: { id: input.templateId },
        });

        // Log the deletion with Meta result
        const logDescription = existingTemplate.metaTemplateId 
          ? `Template "${existingTemplate.name}" deleted from local database${metaDeletionResult?.result ? ' and Meta' : ' (Meta deletion failed)'}`
          : `Template "${existingTemplate.name}" deleted from local database (not in Meta)`;

        await ctx.db.communicationLog.create({
          data: {
            action: "template_deleted",
            description: logDescription,
            metadata: JSON.parse(JSON.stringify({
              templateId: input.templateId,
              templateName: existingTemplate.name,
              templateCategory: existingTemplate.category,
              metaTemplateId: existingTemplate.metaTemplateId,
              metaDeletionResult: metaDeletionResult ? {
                success: metaDeletionResult.result,
                error: metaDeletionResult.error,
                info: metaDeletionResult.info
              } : null
            })),
            userId: ctx.user?.id || 'system',
          }
        });

        // Return appropriate message based on deletion results
        let message = 'Template deleted successfully from local database';
        if (existingTemplate.metaTemplateId) {
          if (metaDeletionResult?.result) {
            message = 'Template deleted successfully from both local database and Meta';
          } else {
            message = 'Template deleted from local database, but failed to delete from Meta. You may need to delete it manually from Meta\'s interface.';
          }
        }

        return {
          message,
          localDeletion: true,
          metaDeletion: metaDeletionResult?.result || false,
          metaError: metaDeletionResult?.error || null
        };

      } catch (error) {
        console.error('Error deleting template:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete template',
        });
      }
    }),

  // Get template by ID for editing
  getTemplateById: protectedProcedure
    .input(z.object({
      templateId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const template = await ctx.db.whatsAppTemplate.findUnique({
          where: { id: input.templateId },
        });

        if (!template) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        return template;
      } catch (error) {
        console.error('Error fetching template:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch template',
        });
      }
    }),

  // Delete message and its related data
  deleteMessage: protectedProcedure
    .input(z.object({
      messageId: z.string().min(1, "Message ID is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if message exists
        const existingMessage = await ctx.db.communicationMessage.findUnique({
          where: { id: input.messageId },
          include: {
            recipients: { select: { id: true } },
            logs: { select: { id: true } },
          },
        });

        if (!existingMessage) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Message not found',
          });
        }

        // Delete in transaction to ensure data consistency
        await ctx.db.$transaction(async (tx) => {
          // Delete message recipients
          await tx.messageRecipient.deleteMany({
            where: { messageId: input.messageId },
          });

          // Delete communication logs
          await tx.communicationLog.deleteMany({
            where: { messageId: input.messageId },
          });

          // Delete the message
          await tx.communicationMessage.delete({
            where: { id: input.messageId },
          });
        });

        // Log the deletion
        await ctx.db.communicationLog.create({
          data: {
            action: "message_deleted",
            description: `Message "${existingMessage.title}" deleted with ${existingMessage.recipients.length} recipients and ${existingMessage.logs.length} log entries`,
            metadata: JSON.parse(JSON.stringify({
              messageId: input.messageId,
              messageTitle: existingMessage.title,
              recipientCount: existingMessage.recipients.length,
              logCount: existingMessage.logs.length
            })),
            userId: ctx.user?.id || ctx.userId,
          }
        });

        return {
          message: 'Message deleted successfully',
          deletedRecipients: existingMessage.recipients.length,
          deletedLogs: existingMessage.logs.length
        };

      } catch (error) {
        console.error('Error deleting message:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete message',
        });
      }
    }),
}); 