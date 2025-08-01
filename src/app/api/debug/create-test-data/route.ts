import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Creating test data for phone number identification...');

    // Get first branch
    const branch = await db.branch.findFirst({
      select: { id: true, name: true }
    });

    if (!branch) {
      return NextResponse.json({
        error: 'No branches found in database'
      }, { status: 404 });
    }

    // Get first class and section for this branch
    const classItem = await db.class.findFirst({
      where: { branchId: branch.id },
      include: {
        sections: {
          take: 1
        }
      }
    });

    if (!classItem || !classItem.sections[0]) {
      return NextResponse.json({
        error: 'No classes or sections found for this branch'
      }, { status: 404 });
    }

    const section = classItem.sections[0];

    console.log(`📚 Using class: ${classItem.name}, section: ${section.name}`);

    // Check if test student already exists
    const existingStudent = await db.student.findFirst({
      where: {
        phone: '+919816900056'
      }
    });

    if (existingStudent) {
      return NextResponse.json({
        message: 'Test student already exists',
        student: {
          id: existingStudent.id,
          name: `${existingStudent.firstName} ${existingStudent.lastName}`,
          phone: existingStudent.phone
        }
      });
    }

    // Create parent first
    const parent = await db.parent.create({
      data: {
        fatherName: "Test Father",
        fatherMobile: "+919816500056", // This is the key phone number for testing
        motherName: "Test Mother", 
        motherMobile: "+919816400056", // Another test number
        guardianName: "Test Father", // Same as father in this case
        guardianMobile: "+919816500056"
      }
    });

    console.log(`👨‍👩‍👧 Created parent with father phone: ${parent.fatherMobile}`);

    // Create test student
    const student = await db.student.create({
      data: {
        firstName: "Test",
        lastName: "Student",
        phone: "+919816900056", // Student's own phone
        email: "test.student@example.com",
        rollNumber: 1,
        admissionNumber: "ADM001",
        sectionId: section.id,
        parentId: parent.id,
        branchId: branch.id,
        dateOfBirth: new Date('2010-01-01'),
        gender: 'MALE',
        address: "Test Address",
        dateOfAdmission: new Date()
      }
    });

    console.log(`🎓 Created student: ${student.firstName} ${student.lastName} with phone: ${student.phone}`);

    const testData = {
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        phone: student.phone,
        rollNumber: student.rollNumber
      },
      parent: {
        id: parent.id,
        fatherName: parent.fatherName,
        fatherPhone: parent.fatherMobile,
        motherName: parent.motherName,
        motherPhone: parent.motherMobile
      },
      class: classItem.name,
      section: section.name,
      branch: branch.name
    };

    console.log('\n✅ Test data created successfully!');
    console.log('📞 Phone numbers for testing:');
    console.log(`   Student phone: ${student.phone} (should show as "Student")`);
    console.log(`   Father phone: ${parent.fatherMobile} (should show as "Father")`);
    console.log(`   Mother phone: ${parent.motherMobile} (should show as "Mother")`);

    return NextResponse.json({
      success: true,
      message: 'Test data created successfully',
      testData,
      instructions: [
        "1. Delete any existing conversations for these phone numbers",
        "2. Send WhatsApp messages from these phone numbers",
        "3. New conversations should show enhanced metadata:",
        `   • ${student.phone} → "Student" badge`,
        `   • ${parent.fatherMobile} → "Father" badge`, 
        `   • ${parent.motherMobile} → "Mother" badge`,
        "4. Contact names should include relationship info"
      ]
    });

  } catch (error) {
    console.error('Create test data error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 