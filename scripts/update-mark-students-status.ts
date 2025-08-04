import { PrismaClient, StudentStatus } from '@prisma/client';
import { STATUS_LABELS, getStatusWhereClause, isValidStatusTransition } from '../src/utils/student-status';

const prisma = new PrismaClient();

interface UpdateStudentStatusOptions {
  admissionNumbers: string[];
  newStatus: StudentStatus;
  reason?: string;
  dryRun?: boolean;
}

async function updateStudentStatus(options: UpdateStudentStatusOptions) {
  const { admissionNumbers, newStatus, reason, dryRun = false } = options;
  
  console.log(`🔄 ${dryRun ? '[DRY RUN] ' : ''}Starting to update student status to ${STATUS_LABELS[newStatus]}...`);
  console.log(`📋 Processing ${admissionNumbers.length} students...\n`);

  try {
    let successCount = 0;
    let notFoundCount = 0;
    let noChangeCount = 0;
    let invalidTransitionCount = 0;
    const errors: string[] = [];

    for (const admissionNumber of admissionNumbers) {
      try {
        // First, check if student exists and their current status
        const existingStudent = await prisma.student.findFirst({
          where: { admissionNumber },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            section: {
              select: {
                name: true,
                class: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        });

        if (!existingStudent) {
          console.log(`❌ Student not found: ${admissionNumber}`);
          notFoundCount++;
          continue;
        }

        if (existingStudent.status === newStatus) {
          console.log(`⚠️  Student already has status ${STATUS_LABELS[newStatus]}: ${admissionNumber} - ${existingStudent.firstName} ${existingStudent.lastName}`);
          noChangeCount++;
          continue;
        }

        // Validate status transition
        if (!isValidStatusTransition(existingStudent.status, newStatus)) {
          console.log(`🚫 Invalid status transition for ${admissionNumber} - ${existingStudent.firstName} ${existingStudent.lastName}: ${STATUS_LABELS[existingStudent.status]} → ${STATUS_LABELS[newStatus]}`);
          invalidTransitionCount++;
          continue;
        }

        if (!dryRun) {
          // Update student status
          await prisma.student.update({
            where: { id: existingStudent.id },
            data: { 
              status: newStatus,
              // Optionally update reason for leaving if it's a departure status
              ...(reason && ['EXPELLED', 'WITHDRAWN', 'TRANSFERRED'].includes(newStatus) ? { reasonForLeaving: reason } : {})
            }
          });
        }

        const classSection = existingStudent.section ? `${existingStudent.section.class?.name} ${existingStudent.section.name}` : 'No Section';
        console.log(`✅ ${dryRun ? '[DRY RUN] Would update' : 'Updated'}: ${admissionNumber} - ${existingStudent.firstName} ${existingStudent.lastName} (${classSection}) from ${STATUS_LABELS[existingStudent.status]} → ${STATUS_LABELS[newStatus]}`);
        successCount++;

      } catch (error) {
        const errorMsg = `Error processing ${admissionNumber}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ ${dryRun ? 'Would be updated' : 'Successfully updated'}: ${successCount} students`);
    console.log(`⚠️  No change needed: ${noChangeCount} students`);
    console.log(`🚫 Invalid transitions: ${invalidTransitionCount} students`);
    console.log(`❌ Not found: ${notFoundCount} students`);
    console.log(`💥 Errors: ${errors.length} students`);
    console.log(`📋 Total processed: ${admissionNumbers.length} students`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(error => console.log(`  - ${error}`));
    }

    if (!dryRun && successCount > 0) {
      // Verification: Check updated students
      console.log('\n🔍 Verification - checking updated students:');
      const updatedStudents = await prisma.student.findMany({
        where: {
          admissionNumber: { in: admissionNumbers },
          status: newStatus
        },
        select: {
          admissionNumber: true,
          firstName: true,
          lastName: true,
          status: true
        }
      });

      console.log(`✅ Confirmed ${updatedStudents.length} students now have status: ${STATUS_LABELS[newStatus]}`);
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Example usage function for marking students inactive
async function markStudentsInactive(admissionNumbers: string[], reason?: string, dryRun = false) {
  return updateStudentStatus({
    admissionNumbers,
    newStatus: 'INACTIVE',
    reason,
    dryRun
  });
}

// Example usage function for marking students withdrawn
async function markStudentsWithdrawn(admissionNumbers: string[], reason?: string, dryRun = false) {
  return updateStudentStatus({
    admissionNumbers,
    newStatus: 'WITHDRAWN',
    reason,
    dryRun
  });
}

// Example usage function for marking students expelled
async function markStudentsExpelled(admissionNumbers: string[], reason?: string, dryRun = false) {
  return updateStudentStatus({
    admissionNumbers,
    newStatus: 'EXPELLED',
    reason,
    dryRun
  });
}

// Export for use as a module
export { updateStudentStatus, markStudentsInactive, markStudentsWithdrawn, markStudentsExpelled };

// CLI usage when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Usage: npx tsx update-mark-students-status.ts <status> <admission-numbers...> [options]

Statuses: ACTIVE, INACTIVE, EXPELLED, WITHDRAWN, REPEAT, TRANSFERRED, GRADUATED, SUSPENDED

Options:
  --reason "reason text"    Reason for status change
  --dry-run                Run in simulation mode

Examples:
  npx tsx update-mark-students-status.ts INACTIVE 10001234 10001235
  npx tsx update-mark-students-status.ts WITHDRAWN 10001234 --reason "Family relocation"
  npx tsx update-mark-students-status.ts EXPELLED 10001234 --reason "Disciplinary action" --dry-run
`);
    process.exit(1);
  }

  const newStatus = args[0]?.toUpperCase() as StudentStatus;
  const admissionNumbers: string[] = [];
  let reason: string | undefined;
  let dryRun = false;

  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--reason' && i + 1 < args.length) {
      reason = args[i + 1];
      i++; // Skip next argument as it's the reason value
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (!arg?.startsWith('--')) {
      admissionNumbers.push(arg!);
    }
  }

  if (!Object.values(['ACTIVE', 'INACTIVE', 'EXPELLED', 'WITHDRAWN', 'REPEAT', 'TRANSFERRED', 'GRADUATED', 'SUSPENDED']).includes(newStatus)) {
    console.error(`❌ Invalid status: ${newStatus}`);
    process.exit(1);
  }

  if (admissionNumbers.length === 0) {
    console.error('❌ No admission numbers provided');
    process.exit(1);
  }

  updateStudentStatus({
    admissionNumbers,
    newStatus,
    reason,
    dryRun
  }).then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}