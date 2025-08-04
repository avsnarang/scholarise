import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CSVConcessionData {
  admissionNumber: string;
  studentName: string;
  feeHead: string;
  term: string;
  concessionCategory: string;
  totalFeeAssigned: number;
  concession: number;
  netFeeAssigned: number;
}

interface StudentConcessionAssignment {
  studentId: string;
  concessionTypeId: string;
  concessionTypeName: string;
  reason: string;
  customValue?: number;
}

function parseCSV(filePath: string): CSVConcessionData[] {
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const lines = csvContent.split('\n');
  const data: CSVConcessionData[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const columns = line.split(',');
    if (columns.length >= 8) {
      data.push({
        admissionNumber: columns[0]?.trim() || '',
        studentName: columns[1]?.trim() || '',
        feeHead: columns[2]?.trim() || '',
        term: columns[3]?.trim() || '',
        concessionCategory: columns[4]?.trim() || '',
        totalFeeAssigned: parseFloat(columns[5] || '0') || 0,
        concession: parseFloat(columns[6] || '0') || 0,
        netFeeAssigned: parseFloat(columns[7] || '0') || 0,
      });
    }
  }

  return data;
}

async function getDefaultBranchAndSession() {
  try {
    const branch = await prisma.branch.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!branch) {
      throw new Error('No branch found in the database');
    }

    const academicSession = await prisma.academicSession.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!academicSession) {
      throw new Error('No active academic session found');
    }

    return { branch, academicSession };
  } catch (error) {
    console.error('Error getting default branch and session:', error);
    throw error;
  }
}

async function getStudentMapping(branchId: string) {
  const students = await prisma.student.findMany({
    where: { branchId },
    select: { id: true, admissionNumber: true, firstName: true, lastName: true }
  });
  
  const mapping: Record<string, { id: string; name: string }> = {};
  
  students.forEach(student => {
    mapping[student.admissionNumber] = {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`.trim()
    };
  });

  return mapping;
}

async function getConcessionTypeMapping(branchId: string, sessionId: string) {
  const concessionTypes = await prisma.concessionType.findMany({
    where: { branchId, sessionId },
    select: { 
      id: true, 
      name: true,
      type: true,
      value: true,
      appliedFeeHeads: true,
      appliedFeeTerms: true,
      feeTermAmounts: true
    }
  });
  
  const mapping: Record<string, any> = {};
  
  concessionTypes.forEach(ct => {
    // Create mapping key based on how we named the concession types
    // Format: "Category/FeeHead [Value]"
    const parts = ct.name.split('/');
    if (parts.length >= 2) {
      const category = parts[0];
      const feeHeadPart = parts[1]?.split(' [')[0]; // Remove the [value] part
      const key = `${category}|${feeHeadPart}`;
      mapping[key] = ct;
    }
  });

  return mapping;
}

async function getFeeHeadAndTermMappings() {
  const [feeHeads, feeTerms] = await Promise.all([
    prisma.feeHead.findMany({ select: { id: true, name: true } }),
    prisma.feeTerm.findMany({ select: { id: true, name: true } })
  ]);

  const feeHeadMapping: Record<string, string> = {};
  const feeTermMapping: Record<string, string> = {};

  feeHeads.forEach(fh => {
    feeHeadMapping[fh.name] = fh.id;
  });

  feeTerms.forEach(ft => {
    feeTermMapping[ft.name] = ft.id;
  });

  return { feeHeadMapping, feeTermMapping };
}

function processStudentConcessions(csvData: CSVConcessionData[]): Map<string, StudentConcessionAssignment> {
  const studentConcessions = new Map<string, StudentConcessionAssignment>();

  csvData.forEach(row => {
    if (row.feeHead === 'Fee Head') return; // Skip header rows
    if (row.concession === 0) return; // Skip rows with no concession

    // Create key: admissionNumber|concessionCategory|feeHead
    const key = `${row.admissionNumber}|${row.concessionCategory}|${row.feeHead}`;
    
    if (!studentConcessions.has(key)) {
      studentConcessions.set(key, {
        studentId: '', // Will be filled later
        concessionTypeId: '', // Will be filled later
        concessionTypeName: `${row.concessionCategory}/${row.feeHead}`,
        reason: `Concession applied for ${row.concessionCategory}`,
        customValue: undefined, // Will be determined based on concession type logic
      });
    }
  });

  return studentConcessions;
}

async function assignStudentConcessions(
  studentConcessions: Map<string, StudentConcessionAssignment>,
  studentMapping: Record<string, { id: string; name: string }>,
  concessionTypeMapping: Record<string, any>,
  branchId: string,
  sessionId: string,
  dryRun: boolean = false
) {
  console.log(`\n🎯 Processing ${studentConcessions.size} student concession assignments...`);
  
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const [key, assignment] of studentConcessions) {
    try {
      // Parse the key: admissionNumber|concessionCategory|feeHead
      const [admissionNumber, concessionCategory, feeHead] = key.split('|');
      
      // Get student ID
      const student = studentMapping[admissionNumber!];
      if (!student) {
        console.log(`   ⚠️  Student not found: ${admissionNumber}`);
        skipped++;
        continue;
      }
      assignment.studentId = student.id;

      // Get concession type
      const concessionTypeKey = `${concessionCategory}|${feeHead}`;
      const concessionType = concessionTypeMapping[concessionTypeKey];
      if (!concessionType) {
        console.log(`   ⚠️  Concession type not found: ${concessionTypeKey}`);
        skipped++;
        continue;
      }
      assignment.concessionTypeId = concessionType.id;

      // Check if student already has this concession
      if (!dryRun) {
        const existing = await prisma.studentConcession.findFirst({
          where: {
            studentId: assignment.studentId,
            concessionTypeId: assignment.concessionTypeId,
          },
        });

        if (existing) {
          console.log(`   ⏭️  Already exists: ${student.name} - ${concessionType.name}`);
          skipped++;
          continue;
        }

        // Create the student concession
        const studentConcession = await prisma.studentConcession.create({
          data: {
            studentId: assignment.studentId,
            concessionTypeId: assignment.concessionTypeId,
            customValue: assignment.customValue,
            reason: assignment.reason,
            status: 'APPROVED', // Auto-approve imported concessions
            approvedBy: 'system',
            approvedAt: new Date(),
            validFrom: new Date(),
            branchId,
            sessionId,
          },
        });

        // Create history record
        await prisma.concessionHistory.create({
          data: {
            studentConcessionId: studentConcession.id,
            action: 'CREATED',
            newValue: assignment.customValue ?? concessionType.value,
            reason: 'Imported from CSV',
            performedBy: 'system',
          },
        });
      }

      created++;
      console.log(`   ✅ ${dryRun ? 'Would create' : 'Created'}: ${student.name} - ${concessionType.name}`);
    } catch (error) {
      console.error(`   ❌ Error processing ${key}:`, error);
      errors++;
    }
  }

  console.log(`\n📊 Assignment Summary:`);
  console.log(`   ✅ ${dryRun ? 'Would create' : 'Created'}: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📋 Total Processed: ${studentConcessions.size}`);
}

async function main() {
  try {
    const dryRun = process.argv.includes('--dry-run');
    
    console.log('🚀 Starting Student Concessions Import...');
    console.log(`   Mode: ${dryRun ? '🔍 DRY RUN' : '💥 LIVE MODE'}`);

    // Step 1: Parse CSV data
    console.log('\n📖 Reading CSV data...');
    const csvPath = path.join(process.cwd(), 'AI', 'concession_4-8-2025.csv');
    const csvData = parseCSV(csvPath);
    console.log(`   📋 Found ${csvData.length} rows in CSV`);

    // Step 2: Get default branch and session
    console.log('\n🔍 Getting default branch and session...');
    const { branch, academicSession } = await getDefaultBranchAndSession();
    console.log(`   🏢 Branch: ${branch.name}`);
    console.log(`   📅 Session: ${academicSession.name}`);

    // Step 3: Get mappings
    console.log('\n🗂️  Loading mappings...');
    const [studentMapping, concessionTypeMapping] = await Promise.all([
      getStudentMapping(branch.id),
      getConcessionTypeMapping(branch.id, academicSession.id),
    ]);
    
    console.log(`   👥 Students: ${Object.keys(studentMapping).length}`);
    console.log(`   🎯 Concession Types: ${Object.keys(concessionTypeMapping).length}`);

    // Step 4: Process CSV into student concession assignments
    console.log('\n🔄 Processing student concessions...');
    const studentConcessions = processStudentConcessions(csvData);
    console.log(`   📝 Unique student-concession combinations: ${studentConcessions.size}`);

    // Step 5: Assign concessions to students
    await assignStudentConcessions(
      studentConcessions,
      studentMapping,
      concessionTypeMapping,
      branch.id,
      academicSession.id,
      dryRun
    );

    console.log('\n🎉 Student Concessions Import Complete!');

  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();