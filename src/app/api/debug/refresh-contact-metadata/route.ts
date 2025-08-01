import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const branchId = url.searchParams.get('branchId');

    if (!branchId) {
      return NextResponse.json({
        error: 'branchId parameter is required'
      }, { status: 400 });
    }

    console.log(`🔄 Starting contact metadata refresh for branch ${branchId}`);
    
    // Get conversations to refresh
    const conversations = await db.conversation.findMany({
      where: {
        branchId: branchId,
        isActive: true
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    console.log(`📋 Found ${conversations.length} conversations to refresh`);

    if (conversations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No conversations found to refresh",
        refreshed: 0,
        errors: []
      });
    }

    // Import the phone utils
    const { phoneNumbersMatch } = await import("@/utils/phone-utils");
    
    const identifyParticipant = async (phoneNumber: string, branchId: string) => {
      // Try to find in students first (via parent phone numbers)
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
      const teachers = await db.teacher.findMany({
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
      const employees = await db.employee.findMany({
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
    const results: any[] = [];

    for (let i = 0; i < conversations.length; i += batchSize) {
      const batch = conversations.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (conversation) => {
        try {
          // Clean phone number (remove whatsapp: prefix if present)
          const phoneNumber = conversation.participantPhone.replace('whatsapp:', '');
          
          // Re-identify participant
          const participant = await identifyParticipant(phoneNumber, branchId);
          
          // Update conversation with fresh metadata
          await db.conversation.update({
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
          
          results.push({
            conversationId: conversation.id,
            phone: phoneNumber,
            oldContactType: conversation.participantType,
            newContactType: participant.contactType,
            contactDetails: (participant.metadata as any)?.contactDetails
          });
          
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

    return NextResponse.json({
      success: true,
      message: `Successfully refreshed metadata for ${refreshed} conversations`,
      refreshed,
      total: conversations.length,
      errors: errors.length > 0 ? errors : undefined,
      details: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error refreshing contact metadata:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Use GET method for metadata refresh' 
  }, { status: 405 });
} 