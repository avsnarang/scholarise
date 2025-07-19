import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { env } from "@/env.js";

// Webhook signature verification (optional but recommended for production)
function validateTwilioSignature(body: string, signature: string, url: string): boolean {
  if (!env.TWILIO_AUTH_TOKEN) return false;
  
  try {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha1', env.TWILIO_AUTH_TOKEN)
      .update(Buffer.from(url + body, 'utf-8'))
      .digest('base64');
      
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

// Twilio webhook payload interface
interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaContentType0?: string;
  MediaUrl0?: string;
  ProfileName?: string;
  WaId?: string; // WhatsApp ID
}

// Helper function to identify participant from phone number
async function identifyParticipant(phoneNumber: string, branchId: string) {
  // Clean phone number - remove whatsapp: prefix and normalize
  const cleanPhone = phoneNumber.replace(/^whatsapp:/, '').replace(/^\+/, '');
  
  // Try to find in students first (via parent phone numbers)
  const student = await db.student.findFirst({
    where: {
      branchId,
      OR: [
        { phone: { contains: cleanPhone } },
        { parent: { 
          OR: [
            { fatherMobile: { contains: cleanPhone } },
            { motherMobile: { contains: cleanPhone } },
            { guardianMobile: { contains: cleanPhone } }
          ]
        }}
      ]
    },
    include: {
      parent: true,
      section: {
        include: { class: true }
      }
    }
  });

  if (student) {
    return {
      type: 'student',
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      metadata: {
        class: student.section?.class?.name,
        section: student.section?.name,
        parentInfo: student.parent
      }
    };
  }

  // Try to find in teachers
  const teacher = await db.teacher.findFirst({
    where: {
      branchId,
      phone: { contains: cleanPhone }
    }
  });

  if (teacher) {
    return {
      type: 'teacher',
      id: teacher.id,
      name: `${teacher.firstName} ${teacher.lastName}`,
      metadata: {
        employeeCode: teacher.employeeCode,
        designation: teacher.designation
      }
    };
  }

  // Try to find in employees
  const employee = await db.employee.findFirst({
    where: {
      branchId,
      phone: { contains: cleanPhone }
    },
    include: {
      designationRef: true,
      departmentRef: true
    }
  });

  if (employee) {
    return {
      type: 'employee',
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      metadata: {
        employeeCode: employee.employeeCode,
        designation: employee.designationRef?.title,
        department: employee.departmentRef?.name
      }
    };
  }

  // If not found in any specific category, treat as unknown contact
  return {
    type: 'unknown',
    id: `unknown_${cleanPhone}`,
    name: `Unknown Contact (${cleanPhone})`,
    metadata: {}
  };
}

// Helper function to determine branch from phone number (you may need to customize this)
async function determineBranch(toNumber: string) {
  // For now, get the first branch. In a multi-branch setup, you might:
  // 1. Have different WhatsApp numbers for different branches
  // 2. Use the 'To' number to determine which branch
  // 3. Have a default branch for unknown numbers
  
  const branch = await db.branch.findFirst({
    orderBy: { order: 'asc' }
  });
  
  return branch;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🔵 WEBHOOK STARTED:', new Date().toISOString());
  
  // Declare variables outside try block for access in catch block
  let isFallback = false;
  let attempt = 1;
  
  try {
    // Check if this is a fallback attempt
    const url = new URL(req.url);
    isFallback = url.searchParams.get('fallback') === 'true';
    attempt = parseInt(url.searchParams.get('attempt') || '1');
    
    if (isFallback) {
      console.warn(`⚠️ Fallback webhook triggered - Attempt ${attempt}`);
    }
    
    // Get the raw body for Twilio signature verification (optional but recommended)
    const body = await req.text();
    console.log('📩 Webhook received body length:', body.length);
    
    // Verify Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const headersList = await headers();
      const twilioSignature = headersList.get('x-twilio-signature');
      const fullUrl = req.url;
      
      console.log('🔐 Verifying Twilio signature...');
      if (!twilioSignature) {
        console.error('❌ No Twilio signature header found');
        return NextResponse.json({ error: 'No signature header' }, { status: 401 });
      }
      
      if (!validateTwilioSignature(body, twilioSignature, fullUrl)) {
        console.error('❌ Invalid Twilio signature');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      console.log('✅ Twilio signature validated');
    } else {
      console.log('🔓 Development mode - skipping signature validation');
    }
    
    const formData = new URLSearchParams(body);
    
    // Parse Twilio webhook payload
    const payload: TwilioWebhookPayload = {
      MessageSid: formData.get('MessageSid') || '',
      AccountSid: formData.get('AccountSid') || '',
      From: formData.get('From') || '',
      To: formData.get('To') || '',
      Body: formData.get('Body') || '',
      NumMedia: formData.get('NumMedia') || '0',
      MediaContentType0: formData.get('MediaContentType0') || undefined,
      MediaUrl0: formData.get('MediaUrl0') || undefined,
      ProfileName: formData.get('ProfileName') || undefined,
      WaId: formData.get('WaId') || undefined,
    };

    console.log('📋 WEBHOOK PAYLOAD:', {
      MessageSid: payload.MessageSid,
      From: payload.From,
      To: payload.To,
      Body: payload.Body?.substring(0, 100) + (payload.Body?.length > 100 ? '...' : ''),
      NumMedia: payload.NumMedia,
      ProfileName: payload.ProfileName,
      WaId: payload.WaId
    });

    // Validate required fields
    if (!payload.MessageSid || !payload.From || !payload.To) {
      console.error('❌ Invalid webhook payload - missing required fields:', {
        MessageSid: !!payload.MessageSid,
        From: !!payload.From,
        To: !!payload.To
      });
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    console.log('✅ Payload validation passed');

    // Determine which branch this message belongs to
    const branch = await determineBranch(payload.To);
    if (!branch) {
      console.error('No branch found for incoming message');
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Identify the participant (student, teacher, employee, etc.)
    const participant = await identifyParticipant(payload.From, branch.id);

    // Check if conversation already exists
    let conversation = await db.conversation.findUnique({
      where: {
        branchId_participantPhone: {
          branchId: branch.id,
          participantPhone: payload.From
        }
      }
    });

    // Create conversation if it doesn't exist
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          branchId: branch.id,
          participantType: participant.type,
          participantId: participant.id,
          participantName: participant.name,
          participantPhone: payload.From,
          lastMessageAt: new Date(),
          lastMessageContent: payload.Body.substring(0, 100),
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
          lastMessageAt: new Date(),
          lastMessageContent: payload.Body.substring(0, 100),
          lastMessageFrom: 'INCOMING',
          unreadCount: { increment: 1 },
          // Update participant info in case it changed
          participantName: participant.name,
          metadata: participant.metadata
        }
      });
    }

    // Determine message type
    let messageType = 'TEXT';
    let mediaUrl = null;
    let mediaType = null;

    if (payload.NumMedia && parseInt(payload.NumMedia) > 0) {
      mediaUrl = payload.MediaUrl0;
      mediaType = payload.MediaContentType0;
      
      if (mediaType?.startsWith('image/')) {
        messageType = 'IMAGE';
      } else if (mediaType?.startsWith('audio/')) {
        messageType = 'AUDIO';
      } else if (mediaType?.startsWith('video/')) {
        messageType = 'VIDEO';
      } else {
        messageType = 'DOCUMENT';
      }
    }

    // Create the chat message
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        direction: 'INCOMING',
        content: payload.Body || (mediaUrl ? `[${messageType.toLowerCase()}]` : ''),
        messageType: messageType as any,
        twilioMessageId: payload.MessageSid,
        status: 'DELIVERED',
        mediaUrl,
        mediaType,
        metadata: {
          twilioPayload: payload as any,
          profileName: payload.ProfileName,
          waId: payload.WaId
        } as any
      }
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ WEBHOOK SUCCESS: Message processed in ${processingTime}ms`);
    console.log(`📨 Message from ${payload.From} saved to conversation ${conversation.id}`);
    console.log('🟢 WEBHOOK COMPLETED:', new Date().toISOString());

    // Return TwiML response (empty for now)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
       <Response></Response>`,
      {
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`🔴 WEBHOOK FAILED after ${processingTime}ms:`, error);
    
    // Enhanced error logging for fallback scenarios
    if (isFallback) {
      console.error(`❌ Fallback webhook also failed - Attempt ${attempt}:`, error);
    } else {
      console.error('❌ Primary webhook failed:', error);
    }
    
    console.error('🔴 WEBHOOK ERROR COMPLETED:', new Date().toISOString());
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 