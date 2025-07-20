import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

// Helper function to identify participant from phone number (same as webhook)
async function identifyParticipant(phoneNumber: string, branchId: string) {
  const { phoneNumbersMatch } = await import("@/utils/phone-utils");
  
  console.log(`🔍 DEBUG: Looking up phone ${phoneNumber} in branch ${branchId}`);
  
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

  console.log(`📊 Found ${students.length} students in branch`);

  // Check each student's phone numbers for exact match
  for (const student of students) {
    console.log(`👤 Checking student: ${student.firstName} ${student.lastName}`);
    console.log(`📱 Student phone: ${student.phone}`);
    console.log(`👨 Father phone: ${student.parent?.fatherMobile}`);
    console.log(`👩 Mother phone: ${student.parent?.motherMobile}`);
    console.log(`👪 Guardian phone: ${student.parent?.guardianMobile}`);

    // Check student's own phone
    if (student.phone && phoneNumbersMatch(phoneNumber, student.phone)) {
      console.log(`✅ MATCH: Student's own phone`);
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
      console.log(`✅ MATCH: Father's phone`);
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
      console.log(`✅ MATCH: Mother's phone`);
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
      console.log(`✅ MATCH: Guardian's phone`);
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
  console.log(`🔍 Checking teachers...`);
  const teachers = await db.teacher.findMany({
    where: {
      branchId,
    }
  });

  for (const teacher of teachers) {
    if (teacher.phone && phoneNumbersMatch(phoneNumber, teacher.phone)) {
      console.log(`✅ MATCH: Teacher phone`);
      return {
        type: 'teacher',
        id: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        contactType: 'teacher',
        metadata: {
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
  console.log(`🔍 Checking employees...`);
  const employees = await db.employee.findMany({
    where: {
      branchId,
    }
  });

  for (const employee of employees) {
    if (employee.phone && phoneNumbersMatch(phoneNumber, employee.phone)) {
      console.log(`✅ MATCH: Employee phone`);
      return {
        type: 'employee',
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        contactType: 'employee',
        metadata: {
          designation: employee.designation,
          contactDetails: {
            contactType: 'Employee Phone',
            displayName: `${employee.firstName} ${employee.lastName} (Employee)`,
            phoneUsed: employee.phone
          }
        }
      };
    }
  }

  console.log(`❌ NO MATCH FOUND for ${phoneNumber}`);
  // Default to unknown
  return {
    type: 'unknown',
    id: 'unknown',
    name: `Unknown Contact (${phoneNumber})`,
    contactType: 'unknown',
    metadata: {
      contactDetails: {
        contactType: 'Unknown',
        displayName: `Unknown Contact`,
        phoneUsed: phoneNumber
      }
    }
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const phone = url.searchParams.get('phone');
    const branchId = url.searchParams.get('branchId');

    if (!phone || !branchId) {
      return NextResponse.json({
        error: 'Missing phone or branchId parameter'
      }, { status: 400 });
    }

    console.log(`🔍 DEBUG LOOKUP: Phone=${phone}, Branch=${branchId}`);

    const result = await identifyParticipant(phone, branchId);

    return NextResponse.json({
      success: true,
      phone,
      branchId,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug phone lookup error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 