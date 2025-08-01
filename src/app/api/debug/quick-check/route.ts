import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Running quick diagnostic check...');

    // Get first branch for testing
    const branch = await db.branch.findFirst({
      select: { id: true, name: true, code: true }
    });

    if (!branch) {
      return NextResponse.json({
        error: 'No branches found in database'
      }, { status: 404 });
    }

    console.log(`✅ Found branch: ${branch.name} (${branch.id})`);

    // Test phone numbers with actual branch ID
    const testPhones = ['+919816900056', '+919816500056'];
    const { phoneNumbersMatch } = await import("@/utils/phone-utils");
    
    const phoneResults: Record<string, any> = {};

    // Get students for this branch
    const students = await db.student.findMany({
      where: { branchId: branch.id },
      include: {
        parent: true,
        section: { include: { class: true } }
      },
      take: 10 // Just a few for testing
    });

    console.log(`📊 Found ${students.length} students in branch`);

    for (const phone of testPhones) {
      let foundMatch = null;

      // Check each student
      for (const student of students) {
        if (student.phone && phoneNumbersMatch(phone, student.phone)) {
          foundMatch = {
            type: 'student_own',
            student: `${student.firstName} ${student.lastName}`,
            phone: student.phone,
            class: student.section?.class?.name,
            section: student.section?.name
          };
          break;
        }
        if (student.parent?.fatherMobile && phoneNumbersMatch(phone, student.parent.fatherMobile)) {
          foundMatch = {
            type: 'father',
            student: `${student.firstName} ${student.lastName}`,
            father: student.parent.fatherName,
            phone: student.parent.fatherMobile,
            class: student.section?.class?.name
          };
          break;
        }
        if (student.parent?.motherMobile && phoneNumbersMatch(phone, student.parent.motherMobile)) {
          foundMatch = {
            type: 'mother',
            student: `${student.firstName} ${student.lastName}`,
            mother: student.parent.motherName,
            phone: student.parent.motherMobile,
            class: student.section?.class?.name
          };
          break;
        }
      }

      phoneResults[phone] = foundMatch;
      console.log(`${phone}: ${foundMatch ? JSON.stringify(foundMatch) : 'NOT FOUND'}`);
    }

    // Check conversations
    const conversations = await db.conversation.findMany({
      where: { branchId: branch.id },
      take: 5,
      include: {
        messages: {
          where: { direction: 'INCOMING', readAt: null },
          take: 1
        }
      }
    });

    const conversationIssues = conversations.map(conv => {
      const actualUnread = conv.messages.length;
      return {
        id: conv.id,
        participantName: conv.participantName,
        participantPhone: conv.participantPhone,
        recordedUnread: conv.unreadCount,
        actualUnread,
        hasIssue: conv.unreadCount !== actualUnread,
        hasEnhancedMetadata: conv.metadata && 
          typeof conv.metadata === 'object' && 
          conv.metadata !== null &&
          !Array.isArray(conv.metadata) &&
          'contactDetails' in conv.metadata
      };
    });

    const summary = {
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code
      },
      phoneNumbers: {
        testResults: phoneResults,
        issues: Object.entries(phoneResults).filter(([phone, result]) => !result)
      },
      conversations: {
        total: conversations.length,
        withUnreadIssues: conversationIssues.filter(c => c.hasIssue).length,
        withEnhancedMetadata: conversationIssues.filter(c => c.hasEnhancedMetadata).length,
        issues: conversationIssues.filter(c => c.hasIssue)
      },
      recommendations: [] as string[]
    };

    // Add recommendations
    if (Object.values(phoneResults).some(r => !r)) {
      summary.recommendations.push("Some test phone numbers not found. Check if student/parent data exists in database.");
    }
    if (conversationIssues.some(c => c.hasIssue)) {
      summary.recommendations.push("Some conversations have incorrect unread counts. Use fix endpoints to correct them.");
    }
    if (conversationIssues.some(c => !c.hasEnhancedMetadata)) {
      summary.recommendations.push("Some conversations lack enhanced metadata. Send new messages to trigger updates.");
    }

    console.log('\n✅ Quick diagnostic completed');
    console.log('Summary:', JSON.stringify(summary, null, 2));

    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Quick diagnostic error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 