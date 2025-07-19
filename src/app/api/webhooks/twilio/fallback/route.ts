import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { env } from "@/env.js";

// Import the same helper functions from the main webhook
// Webhook signature verification
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
        rollNumber: student.rollNumber,
        parentName: student.parent?.fatherName || student.parent?.motherName
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
        department: 'Teaching'
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
      designation: true,
      department: true
    }
  });

  if (employee) {
    return {
      type: 'employee',
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      metadata: {
        employeeCode: employee.employeeCode,
        designation: employee.designation?.name,
        department: employee.department?.name
      }
    };
  }

  // If no match found, return unknown contact
  return {
    type: 'unknown',
    id: `unknown_${cleanPhone}`,
    name: `Unknown Contact (${cleanPhone})`,
    metadata: {}
  };
}

// Helper function to determine branch from phone number
async function determineBranch(toNumber: string) {
  const branch = await db.branch.findFirst({
    orderBy: { order: 'asc' }
  });
  
  return branch;
}

export async function POST(req: NextRequest) {
  try {
    console.warn('🔄 FALLBACK WEBHOOK TRIGGERED - Primary webhook failed');
    
    // Get the raw body for Twilio signature verification
    const body = await req.text();
    
    // Verify Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const headersList = await headers();
      const twilioSignature = headersList.get('x-twilio-signature');
      const url = req.url;
      
      if (!twilioSignature || !validateTwilioSignature(body, twilioSignature, url)) {
        console.error('Invalid Twilio signature in fallback webhook');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
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

    console.log('Fallback webhook payload:', payload);

    // Validate required fields
    if (!payload.MessageSid || !payload.From || !payload.To) {
      console.error('Invalid fallback webhook payload - missing required fields');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Determine which branch this message belongs to
    const branch = await determineBranch(payload.To);
    if (!branch) {
      console.error('No branch found for fallback webhook');
      return NextResponse.json({ error: 'No branch configured' }, { status: 400 });
    }

    // Check if message already exists (to prevent duplicates)
    const existingMessage = await db.chatMessage.findFirst({
      where: { twilioMessageId: payload.MessageSid }
    });

    if (existingMessage) {
      console.log(`Message ${payload.MessageSid} already processed - skipping duplicate in fallback`);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Identify who sent the message
    const participant = await identifyParticipant(payload.From, branch.id);

    // Find or create conversation
    let conversation = await db.chatConversation.findFirst({
      where: {
        branchId: branch.id,
        participantType: participant.type.toUpperCase() as any,
        participantId: participant.id,
        phoneNumber: payload.From
      }
    });

    if (!conversation) {
      conversation = await db.chatConversation.create({
        data: {
          branchId: branch.id,
          participantType: participant.type.toUpperCase() as any,
          participantId: participant.id,
          participantName: participant.name,
          phoneNumber: payload.From,
          lastMessageAt: new Date(),
          unreadCount: 0,
          metadata: participant.metadata as any
        }
      });
      console.log(`Created new conversation ${conversation.id} for ${payload.From} (fallback)`);
    } else {
      // Update conversation with latest activity
      await db.chatConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          unreadCount: { increment: 1 },
          participantName: participant.name,
          metadata: participant.metadata as any
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
          waId: payload.WaId,
          processedByFallback: true // Mark as processed by fallback
        } as any
      }
    });

    console.log(`✅ Fallback webhook successfully processed message from ${payload.From} to conversation ${conversation.id}`);

    // Send notification about fallback processing
    console.warn(`⚠️ MESSAGE PROCESSED BY FALLBACK WEBHOOK - Check primary webhook health`);

    // Return TwiML response
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
    console.error('❌ CRITICAL: Fallback webhook also failed:', error);
    
    // This is critical - both primary and fallback failed
    // You might want to send an alert here
    
    return NextResponse.json(
      { error: 'Fallback webhook failed' }, 
      { status: 500 }
    );
  }
} 