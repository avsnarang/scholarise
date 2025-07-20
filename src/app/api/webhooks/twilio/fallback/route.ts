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
  const { phoneNumbersMatch } = await import("@/utils/phone-utils");
  
  // Try to find in students first (via parent phone numbers)
  const students = await db.student.findMany({
    where: {
      branchId,
    },
    include: {
      parent: true,
      section: {
        include: { class: true }
      }
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
          rollNumber: student.rollNumber,
          parentName: student.parent?.fatherName || student.parent?.motherName,
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
          rollNumber: student.rollNumber,
          parentName: student.parent.fatherName,
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
          rollNumber: student.rollNumber,
          parentName: student.parent.motherName,
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
          rollNumber: student.rollNumber,
          parentName: student.parent.guardianName,
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
    where: {
      branchId,
    }
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
          department: 'Teaching',
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
    where: {
      branchId,
    },
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
    let conversation = await db.conversation.findUnique({
      where: {
        branchId_participantPhone: {
          branchId: branch.id,
          participantPhone: payload.From
        }
      }
    });

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
      console.log(`Created new conversation ${conversation.id} for ${payload.From} (fallback)`);
    } else {
      // Update conversation with latest activity
      await db.conversation.update({
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