import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { env } from "@/env.js";
import crypto from "crypto";
import { templateEventEmitter } from "@/utils/template-events";

// Meta WhatsApp webhook payload interfaces
interface MetaWhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product?: string;
      metadata?: {
        display_phone_number: string;
        phone_number_id: string;
      };
      // Template status update fields
      event?: string; // APPROVED, REJECTED, PENDING, FLAGGED, PAUSED
      message_template_id?: string;
      message_template_name?: string;
      message_template_language?: string;
      reason?: string; // Rejection reason
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        text?: {
          body: string;
        };
        image?: {
          caption?: string;
          mime_type: string;
          sha256: string;
          id: string;
        };
        audio?: {
          mime_type: string;
          sha256: string;
          id: string;
          voice: boolean;
        };
        video?: {
          caption?: string;
          mime_type: string;
          sha256: string;
          id: string;
        };
        document?: {
          caption?: string;
          filename?: string;
          mime_type: string;
          sha256: string;
          id: string;
        };
        type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'interactive' | 'order' | 'sticker' | 'system' | 'unknown';
        context?: {
          from: string;
          id: string;
        };
      }>;
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
        conversation?: {
          id: string;
          expiration_timestamp?: string;
          origin: {
            type: string;
          };
        };
        pricing?: {
          billable: boolean;
          pricing_model: string;
          category: string;
        };
        errors?: Array<{
          code: number;
          title: string;
          message: string;
          error_data?: {
            details: string;
          };
        }>;
      }>;
    };
    field: string;
  }>;
}

interface MetaWhatsAppWebhookPayload {
  object: string;
  entry: MetaWhatsAppWebhookEntry[];
}

// Enhanced webhook signature verification for Meta WhatsApp Cloud API
// Implements Meta's security requirements: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
function validateMetaWebhookSignature(body: string, signature: string): boolean {
  if (!env.META_WHATSAPP_APP_SECRET) {
    console.warn('🔓 Meta app secret not configured, skipping signature validation');
    // In production, this should be a hard failure for security
    if (env.NODE_ENV === 'production') {
      console.error('🚨 CRITICAL: Meta app secret missing in production environment');
      return false;
    }
    return true; // Allow in development
  }
  
  if (!signature) {
    console.error('❌ No signature provided in webhook request');
    return false;
  }
  
  try {
    console.log('🔐 Validating Meta webhook signature...');
    
    // Extract the signature hash from the header (format: "sha256=hash")
    const signatureParts = signature.split('=');
    if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256' || !signatureParts[1]) {
      console.error('❌ Invalid signature format. Expected "sha256=hash", got:', signature.substring(0, 20) + '...');
      return false;
    }
    
    const providedSignature = signatureParts[1];
    
    // Generate expected signature using Meta's algorithm
    const expectedSignature = crypto
      .createHmac('sha256', env.META_WHATSAPP_APP_SECRET)
      .update(body, 'utf8')
      .digest('hex');
    
    console.log('📋 Signature validation details:', {
      providedSignatureLength: providedSignature.length,
      expectedSignatureLength: expectedSignature.length,
      signaturePrefix: signature.substring(0, 15) + '...',
      bodySizeBytes: body.length
    });
    
    // Use timing-safe comparison to prevent timing attacks
    if (expectedSignature.length !== providedSignature.length) {
      console.error('❌ Signature length mismatch');
      return false;
    }
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
    
    if (isValid) {
      console.log('✅ Meta webhook signature validated successfully');
    } else {
      console.error('❌ Meta webhook signature validation failed');
      // Only log signature details in development for security
      if (env.NODE_ENV === 'development') {
        console.debug('Expected signature:', expectedSignature);
        console.debug('Provided signature:', providedSignature);
      }
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ Meta webhook signature validation error:', error);
    return false;
  }
}

// Utility functions from existing Twilio webhook
async function determineBranch(phoneNumberId: string) {
  try {
    // Try to find branch by Meta phone number ID
    const communicationSettings = await db.communicationSettings.findFirst({
      where: {
        metaPhoneNumberId: phoneNumberId,
        metaIsActive: true,
      },
      include: {
        branch: true,
      },
    });

    if (communicationSettings?.branch) {
      console.log(`✅ Found branch: ${communicationSettings.branch.name} for phone number ID: ${phoneNumberId}`);
      return communicationSettings.branch;
    }

    // Fallback: use default branch or first branch
    const defaultBranch = await db.branch.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (defaultBranch) {
      console.log(`⚠️ Using default branch: ${defaultBranch.name} for phone number ID: ${phoneNumberId}`);
      return defaultBranch;
    }

    console.error(`❌ No branch found for phone number ID: ${phoneNumberId}`);
    return null;
  } catch (error) {
    console.error('Error determining branch:', error);
    return null;
  }
}

// Phone number matching helper
function phoneNumbersMatch(phone1: string, phone2: string): boolean {
  if (!phone1 || !phone2) return false;
  
  // Clean both numbers - remove all non-digit characters
  const clean1 = phone1.replace(/[^\d]/g, '');
  const clean2 = phone2.replace(/[^\d]/g, '');
  
  // If either is empty after cleaning, no match
  if (!clean1 || !clean2) return false;
  
  // Check if one is a suffix of the other (handles country codes)
  const minLength = Math.min(clean1.length, clean2.length);
  if (minLength >= 10) { // At least 10 digits to be meaningful
    const suffix1 = clean1.slice(-10);
    const suffix2 = clean2.slice(-10);
    return suffix1 === suffix2;
  }
  
  // For shorter numbers, require exact match
  return clean1 === clean2;
}

async function identifyParticipant(phoneNumber: string, branchId: string) {
  try {
    console.log(`🔍 Identifying participant for phone: ${phoneNumber} in branch: ${branchId}`);
    
    // Try to find in students first (via all possible phone numbers)
    const students = await db.student.findMany({
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
        console.log(`✅ Found student: ${student.firstName} ${student.lastName} (Student Phone)`);
        return {
          type: 'student',
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          metadata: {
            class: student.section?.class?.name,
            section: student.section?.name,
            rollNumber: student.rollNumber,
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
        console.log(`✅ Found parent: ${student.parent.fatherName} (Father of ${student.firstName})`);
        return {
          type: 'student',
          id: student.id,
          name: `${student.parent.fatherName || 'Father'} (${student.firstName} ${student.lastName})`,
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
        console.log(`✅ Found parent: ${student.parent.motherName} (Mother of ${student.firstName})`);
        return {
          type: 'student',
          id: student.id,
          name: `${student.parent.motherName || 'Mother'} (${student.firstName} ${student.lastName})`,
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
        console.log(`✅ Found parent: ${student.parent.guardianName} (Guardian of ${student.firstName})`);
        return {
          type: 'student',
          id: student.id,
          name: `${student.parent.guardianName || 'Guardian'} (${student.firstName} ${student.lastName})`,
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
    const teachers = await db.teacher.findMany({
      where: { branchId }
    });

    for (const teacher of teachers) {
      if (teacher.phone && phoneNumbersMatch(phoneNumber, teacher.phone)) {
        console.log(`✅ Found teacher: ${teacher.firstName} ${teacher.lastName}`);
        return {
          type: 'teacher',
          id: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
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
    const employees = await db.employee.findMany({
      where: { branchId },
      include: {
        designationRef: true,
        departmentRef: true
      }
    });

    for (const employee of employees) {
      if (employee.phone && phoneNumbersMatch(phoneNumber, employee.phone)) {
        console.log(`✅ Found employee: ${employee.firstName} ${employee.lastName}`);
        return {
          type: 'employee',
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
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
    console.log(`❌ No match found for phone: ${phoneNumber}`);
    return {
      type: 'unknown',
      id: 'unknown',
      name: 'Unknown Contact',
      metadata: {
        phoneNumber: phoneNumber,
        contactDetails: {
          contactType: 'Unknown Contact',
          displayName: 'Unknown Contact',
          phoneUsed: phoneNumber
        }
      }
    };
  } catch (error: any) {
    console.error(`❌ Error identifying participant for ${phoneNumber}:`, error);
    return {
      type: 'unknown',
      id: 'unknown',
      name: 'Unknown Contact',
      metadata: {
        phoneNumber: phoneNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        contactDetails: {
          contactType: 'Unknown Contact',
          displayName: 'Unknown Contact',
          phoneUsed: phoneNumber
        }
      }
    };
  }
}

// Webhook verification for Meta (GET request)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  console.log('📞 Meta webhook verification request:', { mode, token: !!token, challenge: !!challenge });

  // Verify the webhook
  if (mode === 'subscribe' && token === env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Meta webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error('❌ Meta webhook verification failed');
    return new NextResponse('Forbidden', { status: 403 });
  }
}

async function processTemplateStatusUpdate(value: any, businessAccountId: string) {
  const updateId = `update_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  try {
    console.log(`📄 Processing template status update [${updateId}]:`, {
      event: value.event,
      templateName: value.message_template_name,
      templateId: value.message_template_id,
      language: value.message_template_language,
      reason: value.reason,
      businessAccountId
    });
    
    const {
      event,
      message_template_id,
      message_template_name,
      message_template_language,
      reason
    } = value;

    if (!message_template_name) {
      console.error(`❌ Missing template name in status update [${updateId}]`);
      return;
    }

    // Enhanced template lookup with detailed logging
    console.log(`🔍 Looking up template [${updateId}]:`, {
      primarySearch: { metaTemplateName: message_template_name, metaTemplateLanguage: message_template_language || 'en' },
      hasTemplateId: !!message_template_id
    });

    // Find the template in our database using multiple strategies
    let template = await db.whatsAppTemplate.findFirst({
      where: {
        metaTemplateName: message_template_name,
        metaTemplateLanguage: message_template_language || 'en'
      }
    });

    if (template) {
      console.log(`✅ Template found by metaTemplateName [${updateId}]:`, {
        id: template.id,
        name: template.name,
        metaTemplateName: template.metaTemplateName,
        currentStatus: template.metaTemplateStatus
      });
    } else {
      console.log(`❌ Template not found by metaTemplateName [${updateId}]`);
      
      // Fallback: try to find by Meta template ID if available
      if (message_template_id) {
        console.log(`🔍 Fallback: searching by metaTemplateId [${updateId}]:`, message_template_id);
        template = await db.whatsAppTemplate.findFirst({
          where: {
            metaTemplateId: message_template_id,
          }
        });
        
        if (template) {
          console.log(`✅ Template found by metaTemplateId [${updateId}]:`, {
            id: template.id,
            name: template.name,
            metaTemplateId: template.metaTemplateId
          });
        }
      }

      // Fallback: try to find by name (in case of sanitized vs original name mismatch)
      if (!template) {
        console.log(`🔍 Fallback: searching by name variations [${updateId}]`);
        template = await db.whatsAppTemplate.findFirst({
          where: {
            OR: [
              { name: message_template_name },
              { 
                name: {
                  // Try to match original name by converting sanitized name back
                  contains: message_template_name.replace(/_/g, ' '),
                  mode: 'insensitive'
                }
              }
            ],
            metaTemplateLanguage: message_template_language || 'en'
          }
        });
        
        if (template) {
          console.log(`✅ Template found by name variation [${updateId}]:`, {
            id: template.id,
            name: template.name,
            searchedName: message_template_name
          });
        }
      }
    }

    if (!template) {
      console.error(`❌ Template not found after all search attempts [${updateId}]:`, {
        searchedName: message_template_name,
        searchedLanguage: message_template_language || 'en',
        searchedId: message_template_id
      });
      
      // Log available templates for debugging
      const availableTemplates = await db.whatsAppTemplate.findMany({
        select: {
          id: true,
          name: true,
          metaTemplateName: true,
          metaTemplateId: true,
          metaTemplateLanguage: true,
        },
        take: 10
      });
      console.log(`📋 Available templates for reference [${updateId}]:`, availableTemplates);
      return;
    }

    // Map Meta status to our status
    let status = event;
    let rejectionReason = null;
    let approvedAt = null;

    if (event === 'APPROVED') {
      status = 'APPROVED';
      approvedAt = new Date();
      console.log(`✅ Template approved: ${message_template_name}`);
    } else if (event === 'REJECTED') {
      status = 'REJECTED';
      rejectionReason = reason || 'No reason provided';
      console.log(`❌ Template rejected: ${message_template_name}, Reason: ${rejectionReason}`);
    } else if (event === 'PENDING') {
      status = 'PENDING';
      console.log(`⏳ Template pending review: ${message_template_name}`);
    } else if (event === 'FLAGGED') {
      status = 'FLAGGED';
      console.log(`⚠️ Template flagged: ${message_template_name}`);
    } else if (event === 'PAUSED') {
      status = 'PAUSED';
      console.log(`⏸️ Template paused: ${message_template_name}`);
    }

    // Store previous status for comparison
    const previousStatus = template.metaTemplateStatus;
    const previousData = {
      status: template.metaTemplateStatus,
      rejectionReason: template.metaRejectionReason,
      approvedAt: template.metaApprovedAt,
      templateId: template.metaTemplateId
    };

    console.log(`🔄 Updating template [${updateId}]:`, {
      templateId: template.id,
      templateName: template.name,
      previousStatus,
      newStatus: status,
      statusChanged: previousStatus !== status,
      rejectionReason,
      approvedAt
    });

    // Update template in database
    const updatedTemplate = await db.whatsAppTemplate.update({
      where: { id: template.id },
      data: {
        metaTemplateStatus: status,
        metaTemplateId: message_template_id || template.metaTemplateId,
        metaRejectionReason: rejectionReason,
        metaApprovedAt: approvedAt,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Template updated in database [${updateId}]:`, {
      templateId: updatedTemplate.id,
      newStatus: updatedTemplate.metaTemplateStatus,
      newTemplateId: updatedTemplate.metaTemplateId,
      updatedAt: updatedTemplate.updatedAt
    });

    // Log the activity with enhanced metadata
    const logEntry = await db.communicationLog.create({
      data: {
        action: "template_status_update",
        description: `Template "${message_template_name}" status changed from ${previousStatus || 'UNKNOWN'} to ${status}${rejectionReason ? ` - ${rejectionReason}` : ''}`,
        metadata: JSON.parse(JSON.stringify({
          updateId,
          templateId: template.id,
          metaTemplateId: message_template_id,
          templateName: message_template_name,
          previousStatus,
          newStatus: status,
          reason: rejectionReason,
          businessAccountId,
          webhookEvent: event,
          language: message_template_language || 'en',
          timestamp: new Date().toISOString()
        })),
        userId: template.createdBy,
      }
    });

    console.log(`📝 Activity logged [${updateId}]:`, {
      logId: logEntry.id,
      action: logEntry.action,
      description: logEntry.description
    });

    // Emit real-time update event
    templateEventEmitter.emitTemplateStatusUpdate({
      templateId: template.id,
      templateName: message_template_name,
      metaTemplateId: message_template_id,
      status: status,
      previousStatus: previousStatus || undefined,
      rejectionReason: rejectionReason || undefined,
      approvedAt: approvedAt || undefined,
      timestamp: new Date()
    });

    console.log(`🚀 Real-time event emitted [${updateId}] for template: ${message_template_name} -> ${status}`);
    console.log(`✅ Template status update completed successfully [${updateId}]`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`❌ Error processing template status update [${updateId}]:`, {
      error: errorMessage,
      stack: errorStack,
      templateName: value.message_template_name,
      event: value.event,
      templateId: value.message_template_id
    });
    
    // Log the error to database for tracking
    try {
      await db.communicationLog.create({
        data: {
          action: "template_status_update_error",
          description: `Failed to update template "${value.message_template_name || 'unknown'}": ${errorMessage}`,
          metadata: JSON.parse(JSON.stringify({
            updateId,
            error: errorMessage,
            templateName: value.message_template_name,
            event: value.event,
            templateId: value.message_template_id,
            timestamp: new Date().toISOString()
          })),
          userId: 'system',
        }
      });
    } catch (logError) {
      console.error(`❌ Failed to log error [${updateId}]:`, logError);
    }
  }
}

// Main webhook handler for Meta (POST request)
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`🔵 META WEBHOOK STARTED [${webhookId}]:`, new Date().toISOString());
  
  try {
    // Get request headers for debugging
    const headersList = await headers();
    const isDebugRequest = headersList.get('x-debug-request') === 'true';
    const isSimulated = headersList.get('x-simulated-webhook') === 'true';
    
    // Get the raw body for signature verification
    const body = await req.text();
    console.log(`📩 Meta webhook received [${webhookId}]:`, {
      bodyLength: body.length,
      isDebugRequest,
      isSimulated,
      contentType: headersList.get('content-type'),
    });
    
    // Log raw payload in debug mode or for simulated requests
    if (isDebugRequest || isSimulated || env.NODE_ENV === 'development') {
      console.log(`📋 RAW WEBHOOK PAYLOAD [${webhookId}]:`, body);
    }
    
    // Skip signature verification for debug/simulated requests
    if (!isDebugRequest && !isSimulated && env.NODE_ENV === 'production') {
      const metaSignature = headersList.get('x-hub-signature-256');
      
      if (!metaSignature || !validateMetaWebhookSignature(body, metaSignature)) {
        console.error(`❌ Invalid Meta webhook signature [${webhookId}]`);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      console.log(`✅ Meta webhook signature verified [${webhookId}]`);
    } else {
      console.log(`🔓 Signature validation skipped [${webhookId}] (debug=${isDebugRequest}, simulated=${isSimulated}, env=${env.NODE_ENV})`);
    }
    
    const payload: MetaWhatsAppWebhookPayload = JSON.parse(body);
    
    console.log('📋 META WEBHOOK PAYLOAD:', {
      object: payload.object,
      entryCount: payload.entry?.length || 0,
    });

    // Validate payload structure
    if (payload.object !== 'whatsapp_business_account' || !payload.entry?.length) {
      console.error('❌ Invalid Meta webhook payload structure');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Process each entry
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages') {
          const value = change.value;
          
          if (!value.metadata?.phone_number_id) {
            console.error('❌ Missing phone_number_id in messages webhook');
            continue;
          }
          
          const phoneNumberId = value.metadata.phone_number_id;
          
          // Determine which branch this message belongs to
          const branch = await determineBranch(phoneNumberId);
          if (!branch) {
            console.error(`❌ No branch found for phone number ID: ${phoneNumberId}`);
            continue;
          }

          // Process incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              await processIncomingMessage(message, value, branch);
            }
          }

          // Process message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              await processMessageStatus(status, value, branch);
            }
          }
        } else if (change.field === 'message_template_status_update') {
          // Process template status updates
          console.log(`📄 Processing template status update: ${change.value.event}`);
          await processTemplateStatusUpdate(change.value, entry.id);
        } else {
          console.log(`⏭️ Skipping unhandled change: ${change.field}`);
        }
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ META WEBHOOK SUCCESS: Processed in ${processingTime}ms`);
    console.log('🟢 META WEBHOOK COMPLETED:', new Date().toISOString());

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`🔴 META WEBHOOK FAILED after ${processingTime}ms:`, error);
    console.error('🔴 META WEBHOOK ERROR COMPLETED:', new Date().toISOString());
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

async function processIncomingMessage(
  message: any,
  value: any,
  branch: any
) {
  try {
    console.log(`📨 Processing incoming message ${message.id} from ${message.from}`);
    
    // Check if message already exists (to prevent duplicates)
    const existingMessage = await db.chatMessage.findFirst({
      where: { metaMessageId: message.id }
    });

    if (existingMessage) {
      console.log(`⏭️ Message ${message.id} already processed - skipping duplicate`);
      return;
    }

    // Format phone number for consistency
    const fromPhone = `whatsapp:+${message.from}`;
    
    // Identify the participant
    const participant = await identifyParticipant(fromPhone, branch.id);

    // Check if conversation already exists
    let conversation = await db.conversation.findUnique({
      where: {
        branchId_participantPhone: {
          branchId: branch.id,
          participantPhone: fromPhone
        }
      }
    });

    // Determine message content and type
    let messageContent = '';
    let messageType = 'TEXT';
    const mediaUrl = null;
    let mediaType = null;

    switch (message.type) {
      case 'text':
        messageContent = message.text?.body || '';
        messageType = 'TEXT';
        break;
      case 'image':
        messageContent = message.image?.caption || '[Image]';
        messageType = 'IMAGE';
        mediaType = message.image?.mime_type;
        // Note: Media URL would need to be fetched from Meta API using media ID
        break;
      case 'audio':
        messageContent = '[Audio]';
        messageType = 'AUDIO';
        mediaType = message.audio?.mime_type;
        break;
      case 'video':
        messageContent = message.video?.caption || '[Video]';
        messageType = 'VIDEO';
        mediaType = message.video?.mime_type;
        break;
      case 'document':
        messageContent = message.document?.caption || `[Document: ${message.document?.filename}]`;
        messageType = 'DOCUMENT';
        mediaType = message.document?.mime_type;
        break;
      default:
        messageContent = `[${message.type}]`;
        messageType = 'TEXT';
    }

    // Create conversation if it doesn't exist
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          branchId: branch.id,
          participantType: participant.type,
          participantId: participant.id,
          participantName: participant.name,
          participantPhone: fromPhone,
          lastMessageAt: new Date(parseInt(message.timestamp) * 1000),
          lastMessageContent: messageContent.substring(0, 100),
          lastMessageFrom: 'INCOMING',
          unreadCount: 1,
          metadata: participant.metadata
        }
      });
    } else {
      // Update existing conversation
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(parseInt(message.timestamp) * 1000),
          lastMessageContent: messageContent.substring(0, 100),
          lastMessageFrom: 'INCOMING',
          unreadCount: { increment: 1 },
          // Update participant info in case it changed
          participantName: participant.name,
          metadata: participant.metadata
        }
      });
    }

    // Create the chat message
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        direction: 'INCOMING',
        content: messageContent,
        messageType: messageType as any,
        metaMessageId: message.id,
        status: 'DELIVERED',
        mediaUrl,
        mediaType,
        metadata: {
          metaPayload: message,
          timestamp: message.timestamp,
          phoneNumberId: value.metadata.phone_number_id
        } as any
      }
    });

    console.log(`✅ Message ${message.id} processed successfully for conversation ${conversation.id}`);
    
  } catch (error) {
    console.error(`❌ Failed to process incoming message ${message.id}:`, error);
  }
}

async function processMessageStatus(
  status: any,
  value: any,
  branch: any
) {
  try {
    console.log(`📊 Processing message status update for ${status.id}: ${status.status}`);
    console.log(`📊 Status details:`, {
      messageId: status.id,
      recipientPhone: status.recipient_id,
      status: status.status,
      timestamp: status.timestamp,
      errors: status.errors
    });
    
    const statusTimestamp = new Date(parseInt(status.timestamp) * 1000);
    
    // Try to find the message in chat messages first
    const chatMessage = await db.chatMessage.findFirst({
      where: { metaMessageId: status.id }
    });

    // Also try to find in bulk message recipients (for template messages)
    let messageRecipient = await db.messageRecipient.findFirst({
      where: { metaMessageId: status.id }
    });

    console.log(`🔍 Message lookup results:`, {
      metaMessageId: status.id,
      foundChatMessage: !!chatMessage,
      foundMessageRecipient: !!messageRecipient,
      recipientDetails: messageRecipient ? {
        id: messageRecipient.id,
        recipientId: messageRecipient.recipientId,
        recipientPhone: messageRecipient.recipientPhone,
        currentStatus: messageRecipient.status
      } : null
    });

    if (!chatMessage && !messageRecipient) {
      console.log(`⚠️ Message ${status.id} not found in chat messages or bulk recipients for status update`);
      
      // Let's check if there are any pending messages without metaMessageId
      const phoneNumber = status.recipient_id ? `+${status.recipient_id}` : null;
      if (phoneNumber) {
        const pendingRecipient = await db.messageRecipient.findFirst({
          where: {
            recipientPhone: {
              contains: phoneNumber.replace('+', '')
            },
            metaMessageId: null,
            status: 'PENDING'
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        if (pendingRecipient) {
          console.log(`🔄 Found pending recipient without metaMessageId, updating...`, {
            recipientId: pendingRecipient.id,
            recipientPhone: pendingRecipient.recipientPhone
          });
          
          // Update this recipient with the metaMessageId
          await db.messageRecipient.update({
            where: { id: pendingRecipient.id },
            data: {
              metaMessageId: status.id,
              status: 'SENT'
            }
          });
          
          // Continue processing with this recipient
          messageRecipient = pendingRecipient;
        }
      }
      
      if (!messageRecipient) {
        return;
      }
    }

    // Map Meta status to our enum values
    let messageStatus: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' = 'SENT';
    let recipientStatus: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' = 'SENT';
    
    switch (status.status) {
      case 'sent':
        messageStatus = 'SENT';
        recipientStatus = 'SENT';
        break;
      case 'delivered':
        messageStatus = 'DELIVERED';
        recipientStatus = 'DELIVERED';
        break;
      case 'read':
        messageStatus = 'READ';
        recipientStatus = 'READ';
        break;
      case 'failed':
        messageStatus = 'FAILED';
        recipientStatus = 'FAILED';
        break;
      default:
        messageStatus = 'SENT';
        recipientStatus = 'SENT';
    }

    // Update chat message if found
    if (chatMessage) {
      const updateData: any = {
        status: messageStatus,
        metadata: {
          ...chatMessage.metadata as any,
          statusUpdate: status,
          statusTimestamp: status.timestamp,
          lastStatusUpdate: new Date().toISOString()
        }
      };

      // Add specific timestamp fields based on status
      switch (status.status) {
        case 'sent':
          updateData.sentAt = statusTimestamp;
          break;
        case 'delivered':
          updateData.deliveredAt = statusTimestamp;
          break;
        case 'read':
          updateData.readAt = statusTimestamp;
          break;
        case 'failed':
          // Don't update timestamps for failed messages
          break;
      }

      await db.chatMessage.update({
        where: { id: chatMessage.id },
        data: updateData
      });

      console.log(`✅ Chat message status updated for ${status.id}: ${status.status} at ${statusTimestamp.toISOString()}`);
    }

    // Update message recipient if found (for bulk/template messages)
    if (messageRecipient) {
      const updateData: any = {
        status: recipientStatus,
        updatedAt: new Date()
      };

      // Add specific timestamp fields
      switch (status.status) {
        case 'sent':
          updateData.sentAt = statusTimestamp;
          break;
        case 'delivered':
          updateData.deliveredAt = statusTimestamp;
          break;
        case 'read':
          updateData.readAt = statusTimestamp;
          break;
        case 'failed':
          updateData.errorMessage = status.errors?.[0]?.message || 'Message delivery failed';
          break;
      }

      await db.messageRecipient.update({
        where: { id: messageRecipient.id },
        data: updateData
      });

      console.log(`✅ Message recipient status updated for ${status.id}: ${status.status}`);

      // Also update the main communication message statistics
      if (messageRecipient.messageId) {
        const allRecipients = await db.messageRecipient.findMany({
          where: { messageId: messageRecipient.messageId }
        });

        const stats = allRecipients.reduce((acc, recipient) => {
          switch (recipient.status) {
            case 'SENT':
            case 'DELIVERED':
            case 'READ':
              acc.successful++;
              break;
            case 'FAILED':
              acc.failed++;
              break;
          }
          return acc;
        }, { successful: 0, failed: 0 });

        await db.communicationMessage.update({
          where: { id: messageRecipient.messageId },
          data: {
            successfulSent: stats.successful,
            failed: stats.failed
          }
        });
      }
    }
    
  } catch (error: any) {
    console.error(`❌ Failed to process status update for message ${status.id}:`, error);
  }
} 