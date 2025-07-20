import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const branchId = url.searchParams.get('branchId');

    if (!branchId) {
      return NextResponse.json({
        error: 'Missing branchId parameter'
      }, { status: 400 });
    }

    console.log(`🔍 COMPREHENSIVE CHECK for branch: ${branchId}`);

    // Check 1: Database Structure
    console.log('\n📊 Checking database structure...');
    const students = await db.student.findMany({
      where: { branchId },
      include: {
        parent: true,
        section: { include: { class: true } }
      },
      take: 5 // Just a few for debugging
    });

    console.log(`Found ${students.length} students`);

    // Check 2: Conversations and their metadata
    console.log('\n💬 Checking conversations...');
    const conversations = await db.conversation.findMany({
      where: { branchId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      },
      take: 10 // Recent conversations
    });

    console.log(`Found ${conversations.length} conversations`);

    // Check 3: Specific phone numbers mentioned by user
    const testPhones = ['+919816900056', '+919816500056'];
    const phoneResults: Record<string, any> = {};

    console.log('\n📞 Testing specific phone numbers...');
    for (const phone of testPhones) {
      const { phoneNumbersMatch } = await import("@/utils/phone-utils");
      let foundMatch = null;

      // Check students
      for (const student of students) {
        if (student.phone && phoneNumbersMatch(phone, student.phone)) {
          foundMatch = {
            type: 'student_own',
            student: `${student.firstName} ${student.lastName}`,
            phone: student.phone
          };
          break;
        }
        if (student.parent?.fatherMobile && phoneNumbersMatch(phone, student.parent.fatherMobile)) {
          foundMatch = {
            type: 'father',
            student: `${student.firstName} ${student.lastName}`,
            father: student.parent.fatherName,
            phone: student.parent.fatherMobile
          };
          break;
        }
        if (student.parent?.motherMobile && phoneNumbersMatch(phone, student.parent.motherMobile)) {
          foundMatch = {
            type: 'mother',
            student: `${student.firstName} ${student.lastName}`,
            mother: student.parent.motherName,
            phone: student.parent.motherMobile
          };
          break;
        }
      }

      phoneResults[phone] = foundMatch;
      console.log(`${phone}: ${foundMatch ? JSON.stringify(foundMatch) : 'NOT FOUND'}`);
    }

    // Check 4: Conversation metadata analysis
    console.log('\n🔍 Analyzing conversation metadata...');
    const metadataAnalysis = conversations.map(conv => {
      const hasEnhancedMetadata = conv.metadata && 
        typeof conv.metadata === 'object' && 
        conv.metadata !== null &&
        !Array.isArray(conv.metadata) &&
        'contactDetails' in conv.metadata;

      const unreadIssue = conv.unreadCount !== conv.messages.filter(m => 
        m.direction === 'INCOMING' && !m.readAt
      ).length;

      return {
        id: conv.id,
        participantName: conv.participantName,
        participantPhone: conv.participantPhone,
        participantType: conv.participantType,
        hasEnhancedMetadata,
        metadataContactType: hasEnhancedMetadata ? 
          (conv.metadata as any).contactDetails?.contactType : null,
        unreadCount: conv.unreadCount,
        actualUnreadCount: conv.messages.filter(m => m.direction === 'INCOMING' && !m.readAt).length,
        hasUnreadIssue: unreadIssue,
        lastMessageAt: conv.lastMessageAt,
        totalMessages: conv.messages.length
      };
    });

    // Check 5: Phone format analysis
    console.log('\n📱 Analyzing phone formats...');
    const phoneFormats = {
      conversationPhones: conversations.map(c => c.participantPhone),
      studentPhones: students.map(s => s.phone).filter(Boolean),
      fatherPhones: students.map(s => s.parent?.fatherMobile).filter(Boolean),
      motherPhones: students.map(s => s.parent?.motherMobile).filter(Boolean)
    };

    // Summary
    const summary = {
      branch: branchId,
      timestamp: new Date().toISOString(),
      checks: {
        students: {
          total: students.length,
          withParents: students.filter(s => s.parent).length,
          withFatherPhone: students.filter(s => s.parent?.fatherMobile).length,
          withMotherPhone: students.filter(s => s.parent?.motherMobile).length
        },
        conversations: {
          total: conversations.length,
          withEnhancedMetadata: metadataAnalysis.filter(c => c.hasEnhancedMetadata).length,
          withUnreadIssues: metadataAnalysis.filter(c => c.hasUnreadIssue).length
        },
        phoneNumbers: {
          testResults: phoneResults,
          formats: phoneFormats
        }
      },
      sampleData: {
        students: students.slice(0, 2).map(s => ({
          name: `${s.firstName} ${s.lastName}`,
          phone: s.phone,
          fatherName: s.parent?.fatherName,
          fatherPhone: s.parent?.fatherMobile,
          motherName: s.parent?.motherName,
          motherPhone: s.parent?.motherMobile
        })),
        conversations: metadataAnalysis.slice(0, 3)
      },
      issues: {
        missingEnhancedMetadata: metadataAnalysis.filter(c => !c.hasEnhancedMetadata),
        unreadCountIssues: metadataAnalysis.filter(c => c.hasUnreadIssue),
        phoneMatchIssues: Object.entries(phoneResults).filter(([phone, result]) => !result)
      }
    };

    console.log('\n✅ Comprehensive check completed');
    console.log('Summary:', JSON.stringify(summary, null, 2));

    return NextResponse.json({
      success: true,
      summary,
      recommendations: [
        metadataAnalysis.filter(c => !c.hasEnhancedMetadata).length > 0 ? 
          "Some conversations lack enhanced metadata. Send new messages to trigger updates." : null,
        metadataAnalysis.filter(c => c.hasUnreadIssue).length > 0 ? 
          "Some conversations have incorrect unread counts. Use the fix endpoint to correct them." : null,
        Object.values(phoneResults).some(r => !r) ? 
          "Some test phone numbers not found in database. Check if student/parent data exists." : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Comprehensive check error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 