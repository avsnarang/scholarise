import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Starting automatic contact metadata refresh for all conversations...');

    // Get all branches
    const branches = await db.branch.findMany({
      select: { id: true, name: true }
    });

    let totalUpdated = 0;
    let totalErrors = 0;

    for (const branch of branches) {
      console.log(`🏢 Processing branch: ${branch.name} (${branch.id})`);

      // Get all conversations for this branch that might need updating
      const conversations = await db.conversation.findMany({
        where: {
          branchId: branch.id,
          OR: [
            { participantName: 'Unknown Contact' },
            { participantName: { contains: '+' } }, // Phone number as name
            { participantType: 'UNKNOWN' },
            { participantType: 'unknown' }
          ]
        },
        take: 50 // Process in batches to avoid overwhelming the database
      });

      console.log(`📋 Found ${conversations.length} conversations to refresh in ${branch.name}`);

      // Use the same identifyParticipant logic from the chat router
      const phoneNumbersMatch = (phone1: string, phone2: string): boolean => {
        if (!phone1 || !phone2) return false;
        
        const clean1 = phone1.replace(/[^\d]/g, '');
        const clean2 = phone2.replace(/[^\d]/g, '');
        
        if (!clean1 || !clean2) return false;
        
        const minLength = Math.min(clean1.length, clean2.length);
        if (minLength >= 10) {
          const suffix1 = clean1.slice(-10);
          const suffix2 = clean2.slice(-10);
          return suffix1 === suffix2;
        }
        
        return clean1 === clean2;
      };

      const identifyParticipant = async (phoneNumber: string, branchId: string) => {
        // Get students with parent info
        const students = await db.student.findMany({
          where: { branchId },
          include: {
            parent: true,
            section: { include: { class: true } }
          }
        });

        // Check all student and parent phone numbers
        for (const student of students) {
          if (student.phone && phoneNumbersMatch(phoneNumber, student.phone)) {
            return {
              type: 'student',
              id: student.id,
              name: `${student.firstName} ${student.lastName}`,
              metadata: {
                class: student.section?.class?.name,
                section: student.section?.name,
                rollNumber: student.rollNumber,
                contactDetails: {
                  contactType: 'Student Phone',
                  displayName: `${student.firstName} ${student.lastName} (Student)`,
                  phoneUsed: student.phone
                }
              }
            };
          }

          if (student.parent?.fatherMobile && phoneNumbersMatch(phoneNumber, student.parent.fatherMobile)) {
            return {
              type: 'student',
              id: student.id,
              name: `${student.parent.fatherName || 'Father'} (${student.firstName} ${student.lastName})`,
              metadata: {
                class: student.section?.class?.name,
                section: student.section?.name,
                contactDetails: {
                  contactType: 'Father Phone',
                  displayName: `${student.parent.fatherName || 'Father'} (${student.firstName}'s Father)`,
                  phoneUsed: student.parent.fatherMobile,
                  studentName: `${student.firstName} ${student.lastName}`
                }
              }
            };
          }

          if (student.parent?.motherMobile && phoneNumbersMatch(phoneNumber, student.parent.motherMobile)) {
            return {
              type: 'student',
              id: student.id,
              name: `${student.parent.motherName || 'Mother'} (${student.firstName} ${student.lastName})`,
              metadata: {
                class: student.section?.class?.name,
                section: student.section?.name,
                contactDetails: {
                  contactType: 'Mother Phone',
                  displayName: `${student.parent.motherName || 'Mother'} (${student.firstName}'s Mother)`,
                  phoneUsed: student.parent.motherMobile,
                  studentName: `${student.firstName} ${student.lastName}`
                }
              }
            };
          }

          if (student.parent?.guardianMobile && phoneNumbersMatch(phoneNumber, student.parent.guardianMobile)) {
            return {
              type: 'student',
              id: student.id,
              name: `${student.parent.guardianName || 'Guardian'} (${student.firstName} ${student.lastName})`,
              metadata: {
                class: student.section?.class?.name,
                section: student.section?.name,
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

        // Check teachers
        const teachers = await db.teacher.findMany({
          where: { branchId }
        });

        for (const teacher of teachers) {
          if (teacher.phone && phoneNumbersMatch(phoneNumber, teacher.phone)) {
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

        // Check employees
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

        return null; // No match found
      };

      // Process each conversation
      for (const conversation of conversations) {
        try {
          const phoneNumber = conversation.participantPhone.replace('whatsapp:', '');
          const participant = await identifyParticipant(phoneNumber, branch.id);
          
          if (participant) {
            await db.conversation.update({
              where: { id: conversation.id },
              data: {
                participantType: participant.type,
                participantId: participant.id,
                participantName: participant.name,
                metadata: participant.metadata
              }
            });
            
            console.log(`✅ Updated conversation ${conversation.id}: ${participant.name}`);
            totalUpdated++;
          }
        } catch (error) {
          console.error(`❌ Failed to update conversation ${conversation.id}:`, error);
          totalErrors++;
        }
      }
    }

    console.log(`🎉 Contact refresh completed: ${totalUpdated} updated, ${totalErrors} errors`);

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${totalUpdated} conversations across ${branches.length} branches`,
      updated: totalUpdated,
      errors: totalErrors,
      branches: branches.length
    });

  } catch (error) {
    console.error('❌ Contact refresh failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 