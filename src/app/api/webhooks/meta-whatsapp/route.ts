import { NextRequest, NextResponse } from "next/server";
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

// Webhook signature verification for Meta
function validateMetaWebhookSignature(body: string, signature: string): boolean {
  if (!env.META_WHATSAPP_APP_SECRET) {
    console.warn('🔓 Meta app secret not configured, skipping signature validation');
    return true; // Allow in development
  }
  
  try {
    console.log('🔐 Validating Meta webhook signature...');
    
    const expectedSignature = crypto
      .createHmac('sha256', env.META_WHATSAPP_APP_SECRET)
      .update(body, 'utf8')
      .digest('hex');
      
    const providedSignature = signature.replace('sha256=', '');
    
    console.log('📋 Signature validation details:', {
      providedSignatureLength: providedSignature.length,
      expectedSignatureLength: expectedSignature.length,
      signaturePrefix: signature.substring(0, 10) + '...',
    });
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
    
    console.log(isValid ? '✅ Signature valid' : '❌ Signature invalid');
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

async function identifyParticipant(phoneNumber: string, branchId: string) {
  try {
    // Clean phone number for comparison
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
    
    // Try to find a student first
    const student = await db.student.findFirst({
      where: {
        branchId,
        phone: {
          contains: cleanPhone.slice(-10), // Last 10 digits
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        rollNumber: true,
        section: {
          select: {
            name: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (student) {
      return {
        type: 'STUDENT',
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        metadata: {
          rollNumber: student.rollNumber,
          class: student.section?.class?.name,
          section: student.section?.name,
          phone: student.phone,
        },
      };
    }

    // Try to find a teacher
    const teacher = await db.teacher.findFirst({
      where: {
        branchId,
        phone: {
          contains: cleanPhone.slice(-10),
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        employeeCode: true,
        subjects: true,
      },
    });

    if (teacher) {
      return {
        type: 'TEACHER',
        id: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        metadata: {
          employeeCode: teacher.employeeCode,
          subjects: teacher.subjects || [],
          phone: teacher.phone,
        },
      };
    }

    // Try to find an employee
    const employee = await db.employee.findFirst({
      where: {
        branchId,
        phone: {
          contains: cleanPhone.slice(-10),
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        employeeCode: true,
        designationRef: {
          select: {
            title: true,
          },
        },
        departmentRef: {
          select: {
            name: true,
          },
        },
      },
    });

    if (employee) {
      return {
        type: 'EMPLOYEE',
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        metadata: {
          employeeCode: employee.employeeCode,
          designation: employee.designationRef?.title,
          department: employee.departmentRef?.name,
          phone: employee.phone,
        },
      };
    }

    // If no specific participant found, create a generic contact
    return {
      type: 'UNKNOWN',
      id: phoneNumber,
      name: `Unknown Contact`,
      metadata: {
        phone: phoneNumber,
        note: 'Contact not found in system',
      },
    };
  } catch (error) {
    console.error('Error identifying participant:', error);
    return {
      type: 'UNKNOWN',
      id: phoneNumber,
      name: `Unknown Contact`,
      metadata: {
        phone: phoneNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
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
  try {
    console.log(`📄 Processing template status update:`, value);
    
    const {
      event,
      message_template_id,
      message_template_name,
      message_template_language,
      reason
    } = value;

    if (!message_template_name) {
      console.error('❌ Missing template name in status update');
      return;
    }

    // Find the template in our database using multiple strategies
    let template = await db.whatsAppTemplate.findFirst({
      where: {
        metaTemplateName: message_template_name,
        metaTemplateLanguage: message_template_language || 'en'
      }
    });

    // Fallback: try to find by Meta template ID if available
    if (!template && message_template_id) {
      template = await db.whatsAppTemplate.findFirst({
        where: {
          metaTemplateId: message_template_id,
        }
      });
    }

    // Fallback: try to find by name (in case of sanitized vs original name mismatch)
    if (!template) {
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
    }

    if (!template) {
      console.error(`❌ Template not found: ${message_template_name} (${message_template_language})`);
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

    // Log the activity
    await db.communicationLog.create({
      data: {
        action: "template_status_update",
        description: `Template "${message_template_name}" status changed to ${status}${rejectionReason ? ` - ${rejectionReason}` : ''}`,
        metadata: JSON.parse(JSON.stringify({
          templateId: template.id,
          metaTemplateId: message_template_id,
          templateName: message_template_name,
          status: status,
          reason: rejectionReason,
          businessAccountId
        })),
        userId: template.createdBy,
      }
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

    console.log(`📄 Template status updated successfully: ${message_template_name} -> ${status}`);
  } catch (error) {
    console.error('❌ Error processing template status update:', error);
  }
}

// Main webhook handler for Meta (POST request)
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🔵 META WEBHOOK STARTED:', new Date().toISOString());
  
  try {
    // Get the raw body for signature verification
    const body = await req.text();
    console.log('📩 Meta webhook received body length:', body.length);
    
    // Verify webhook signature in production
    if (env.NODE_ENV === 'production') {
      const headersList = await headers();
      const metaSignature = headersList.get('x-hub-signature-256');
      
      if (!metaSignature || !validateMetaWebhookSignature(body, metaSignature)) {
        console.error('❌ Invalid Meta webhook signature');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      console.log('✅ Meta webhook signature verified');
    } else {
      console.log('🔓 Signature validation skipped in development');
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
    let mediaUrl = null;
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
    
    // Find the message by Meta message ID
    const message = await db.chatMessage.findFirst({
      where: { metaMessageId: status.id }
    });

    if (!message) {
      console.log(`⚠️ Message ${status.id} not found for status update`);
      return;
    }

    // Update message status  
    let messageStatus: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' = 'SENT';
    
    switch (status.status) {
      case 'sent':
        messageStatus = 'SENT';
        break;
      case 'delivered':
        messageStatus = 'DELIVERED';
        break;
      case 'read':
        messageStatus = 'READ';
        break;
      case 'failed':
        messageStatus = 'FAILED';
        break;
      default:
        messageStatus = 'SENT';
    }

    await db.chatMessage.update({
      where: { id: message.id },
      data: {
        status: messageStatus,
        metadata: {
          ...message.metadata as any,
          statusUpdate: status,
          statusTimestamp: status.timestamp
        }
      }
    });

    console.log(`✅ Status updated for message ${status.id}: ${status.status}`);
    
  } catch (error) {
    console.error(`❌ Failed to process status update for message ${status.id}:`, error);
  }
} 