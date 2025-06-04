import { env } from "@/env";
import { Clerk } from "@clerk/clerk-sdk-node";
import { PrismaClient } from "@prisma/client";
import { createStudentUser, createParentUser } from "@/utils/clerk";

const prisma = new PrismaClient();
const clerk = Clerk({ secretKey: env.CLERK_SECRET_KEY });

interface StudentToFix {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  username: string | null;
  password: string | null;
  clerkId: string | null;
  branchId: string;
  branchCode: string;
  parent: {
    id: string;
    fatherName: string | null;
    motherName: string | null;
    guardianName: string | null;
    clerkId: string | null;
  } | null;
}

async function findStudentsWithoutClerkAccounts(): Promise<StudentToFix[]> {
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { clerkId: null },
        { clerkId: "" }
      ],
      isActive: true
    },
    include: {
      parent: true,
      branch: {
        select: {
          code: true
        }
      }
    }
  });

  return students.map(student => ({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    admissionNumber: student.admissionNumber,
    username: student.username,
    password: student.password,
    clerkId: student.clerkId,
    branchId: student.branchId,
    branchCode: student.branch?.code || '',
    parent: student.parent ? {
      id: student.parent.id,
      fatherName: student.parent.fatherName,
      motherName: student.parent.motherName,
      guardianName: student.parent.guardianName,
      clerkId: student.parent.clerkId
    } : null
  }));
}

async function createMissingClerkAccounts(studentsToFix: StudentToFix[]): Promise<void> {
  console.log(`\n🔧 Found ${studentsToFix.length} students without Clerk accounts. Creating missing accounts...\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const student of studentsToFix) {
    try {
      console.log(`📝 Processing: ${student.firstName} ${student.lastName} (${student.admissionNumber})`);

      // Generate credentials if missing
      const emailDomain = student.branchCode === 'PS' ? 'ps.tsh.edu.in' :
                         student.branchCode === 'JUN' ? 'jun.tsh.edu.in' :
                         student.branchCode === 'MAJ' ? 'majra.tsh.edu.in' : 'tsh.edu.in';
      
      const studentUsername = student.username || `${student.admissionNumber}@${emailDomain}`;
      const defaultPassword = student.branchCode === 'PS' ? 'TSHPS@12345' :
                             student.branchCode === 'JUN' ? 'TSHJ@12345' :
                             student.branchCode === 'MAJ' ? 'TSHM@12345' : 'TSH@12345';
      const studentPassword = student.password || defaultPassword;

      let studentClerkId: string | null = null;
      let parentClerkId: string | null = null;

      // Create student Clerk account
      try {
        console.log(`  📧 Creating student account: ${studentUsername}`);
        const studentUser = await createStudentUser({
          firstName: student.firstName,
          lastName: student.lastName,
          username: studentUsername,
          password: studentPassword,
          branchCode: student.branchCode,
          branchId: student.branchId,
        });
        studentClerkId = studentUser.id;
        console.log(`  ✅ Student Clerk account created: ${studentClerkId}`);
      } catch (error) {
        console.log(`  ❌ Failed to create student Clerk account: ${error}`);
        errors.push(`Student ${student.admissionNumber}: ${error}`);
      }

      // Create parent Clerk account if parent exists and doesn't have one
      if (student.parent && (!student.parent.clerkId || student.parent.clerkId === "")) {
        try {
          // Determine parent name
          let parentFirstName = '';
          let parentLastName = student.lastName;
          
          if (student.parent.fatherName) {
            const nameParts = student.parent.fatherName.trim().split(/\s+/);
            parentFirstName = nameParts[0] || student.parent.fatherName;
            if (nameParts.length > 1) {
              parentLastName = nameParts.slice(1).join(' ');
            }
          } else if (student.parent.motherName) {
            const nameParts = student.parent.motherName.trim().split(/\s+/);
            parentFirstName = nameParts[0] || student.parent.motherName;
            if (nameParts.length > 1) {
              parentLastName = nameParts.slice(1).join(' ');
            }
          } else if (student.parent.guardianName) {
            const nameParts = student.parent.guardianName.trim().split(/\s+/);
            parentFirstName = nameParts[0] || student.parent.guardianName;
            if (nameParts.length > 1) {
              parentLastName = nameParts.slice(1).join(' ');
            }
          } else {
            parentFirstName = student.firstName;
            parentLastName = student.lastName;
          }

          const parentUsername = `P${student.admissionNumber}`;
          const parentPassword = defaultPassword;

          console.log(`  👤 Creating parent account: ${parentUsername}`);
          const parentUser = await createParentUser({
            firstName: parentFirstName,
            lastName: parentLastName,
            username: parentUsername,
            password: parentPassword,
            branchId: student.branchId,
          });
          parentClerkId = parentUser.id;
          console.log(`  ✅ Parent Clerk account created: ${parentClerkId}`);
        } catch (error) {
          console.log(`  ❌ Failed to create parent Clerk account: ${error}`);
          errors.push(`Parent of ${student.admissionNumber}: ${error}`);
        }
      }

      // Update database with Clerk IDs
      await prisma.$transaction(async (tx) => {
        // Update student with Clerk ID and credentials
        await tx.student.update({
          where: { id: student.id },
          data: {
            clerkId: studentClerkId,
            username: studentUsername,
            password: studentPassword,
          }
        });

        // Update parent with Clerk ID if created
        if (student.parent && parentClerkId) {
          await tx.parent.update({
            where: { id: student.parent.id },
            data: {
              clerkId: parentClerkId
            }
          });
        }
      });

      successCount++;
      console.log(`  ✅ Database updated successfully\n`);

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      errorCount++;
      const errorMsg = `Failed to process ${student.admissionNumber}: ${error}`;
      errors.push(errorMsg);
      console.log(`  ❌ ${errorMsg}\n`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Error details:`);
    errors.forEach(error => console.log(`  - ${error}`));
  }
}

async function main() {
  try {
    console.log("🔍 Searching for students without Clerk accounts...");
    
    const studentsToFix = await findStudentsWithoutClerkAccounts();
    
    if (studentsToFix.length === 0) {
      console.log("✅ All students already have Clerk accounts!");
      return;
    }

    console.log(`\n📋 Students without Clerk accounts:`);
    studentsToFix.forEach((student, index) => {
      console.log(`${index + 1}. ${student.firstName} ${student.lastName} (${student.admissionNumber}) - ${student.branchCode}`);
    });

    // Ask for confirmation in production
    if (process.env.NODE_ENV === 'production') {
      console.log(`\n⚠️  This will create ${studentsToFix.length} Clerk accounts in PRODUCTION.`);
      console.log(`Press Ctrl+C to cancel or wait 10 seconds to continue...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    await createMissingClerkAccounts(studentsToFix);

  } catch (error) {
    console.error("❌ Script failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main(); 