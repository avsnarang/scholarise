import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
// @ts-ignore - csv-parser doesn't have type definitions
import csv from 'csv-parser';
import { createReadStream } from 'fs';

const prisma = new PrismaClient();

interface ConcessionCSVRow {
  'Admission Number': string;
  'Student Name': string;
  'Father Name': string;
  'Class': string;
  'Fee Head': string;
  'Term': string;
  'Concession Category': string;
  'Total Fee Assigned': string;
  'Concession': string;
  'Net Fee Assigned': string;
}

interface ConcessionTypeConfig {
  name: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  maxValue?: number;
  applicableStudentTypes: string[];
  autoApproval: boolean;
}

const CONCESSION_TYPE_MAPPINGS: Record<string, ConcessionTypeConfig> = {
  'Sibling Concession - 15% discount on applicable fee': {
    name: 'Sibling Concession',
    description: '15% discount on applicable fees for siblings',
    type: 'PERCENTAGE',
    value: 15,
    applicableStudentTypes: ['BOTH'],
    autoApproval: true,
  },
  'Staff Concession 1500': {
    name: 'Staff Concession',
    description: 'Fixed discount for staff children',
    type: 'FIXED',
    value: 1500,
    applicableStudentTypes: ['BOTH'],
    autoApproval: true,
  },
  'Bright Foundation - 8000 concession on Admission Fee': {
    name: 'Bright Foundation Scholarship',
    description: '8000 discount on admission fee for needy students',
    type: 'FIXED',
    value: 8000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: false,
  },
  'TSH Juniors Admission Fee Concession - 4000 off': {
    name: 'TSH Juniors Admission Concession',
    description: '4000 discount on admission fee for TSH Juniors',
    type: 'FIXED',
    value: 4000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: true,
  },
  'Juniors Admission Fee Con 2000': {
    name: 'Juniors Admission Concession (2000)',
    description: '2000 discount on admission fee for junior students',
    type: 'FIXED',
    value: 2000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: true,
  },
  'School Concession 20%': {
    name: 'School General Concession',
    description: '20% discount on applicable fees',
    type: 'PERCENTAGE',
    value: 20,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Advance Fee Deposit Discount 4000': {
    name: 'Advance Fee Deposit Discount',
    description: '4000 discount on advance fee deposit',
    type: 'FIXED',
    value: 4000,
    applicableStudentTypes: ['BOTH'],
    autoApproval: true,
  },
  'Merit Scholarship-8000 In Adm. Fee': {
    name: 'Merit Scholarship',
    description: '8000 merit scholarship on admission fee',
    type: 'FIXED',
    value: 8000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: false,
  },
  'Orientation 1000': {
    name: 'Parent Orientation Fee',
    description: 'Parent orientation program fee',
    type: 'FIXED',
    value: 1000,
    applicableStudentTypes: ['BOTH'],
    autoApproval: true,
  },
  'School Concession On Annual Charges 5000': {
    name: 'School Annual Charges Concession',
    description: '5000 discount on annual charges',
    type: 'FIXED',
    value: 5000,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'School Concession': {
    name: 'General School Concession',
    description: 'General school concession with variable amount',
    type: 'FIXED',
    value: 0, // Will use custom value from CSV
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'School Concession 6000 Adm Fee': {
    name: 'School Admission Fee Concession',
    description: '6000 discount on admission fee',
    type: 'FIXED',
    value: 6000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: false,
  },
  'School Concession 100%': {
    name: 'Full School Concession',
    description: '100% discount on applicable fees',
    type: 'PERCENTAGE',
    value: 100,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'School Concession 25%': {
    name: 'School Concession 25%',
    description: '25% discount on applicable fees',
    type: 'PERCENTAGE',
    value: 25,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Sibling Concession 20%': {
    name: 'Sibling Concession 20%',
    description: '20% discount on applicable fees for siblings',
    type: 'PERCENTAGE',
    value: 20,
    applicableStudentTypes: ['BOTH'],
    autoApproval: true,
  },
  'Merit Scholarship Above 90% 11000': {
    name: 'Merit Scholarship Above 90%',
    description: '11000 merit scholarship for students scoring above 90%',
    type: 'FIXED',
    value: 11000,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Super 30 Discount 8000': {
    name: 'Super 30 Program Discount',
    description: '8000 discount for Super 30 program',
    type: 'FIXED',
    value: 8000,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Sports Scholarship': {
    name: 'Sports Scholarship',
    description: 'Scholarship for sports achievements',
    type: 'FIXED',
    value: 0, // Will use custom value from CSV
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Woner Skill Collected Refund 1000': {
    name: 'Wonder Skill Refund',
    description: '1000 refund for Wonder Skill workshop',
    type: 'FIXED',
    value: 1000,
    applicableStudentTypes: ['BOTH'],
    autoApproval: true,
  },
  'X Class Board Exam Scholarship 1000 Pm': {
    name: 'Class X Board Exam Scholarship (1000)',
    description: '1000 per month scholarship for Class X board exam performance',
    type: 'FIXED',
    value: 1000,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'X Class Board Exam Scholarship 500 Pm': {
    name: 'Class X Board Exam Scholarship (500)',
    description: '500 per month scholarship for Class X board exam performance',
    type: 'FIXED',
    value: 500,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Janab Abdul Rehman Scholarship 500 Pm': {
    name: 'Janab Abdul Rehman Scholarship',
    description: '500 per month Janab Abdul Rehman memorial scholarship',
    type: 'FIXED',
    value: 500,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Sh. Nanak Chand Khurana Memorial Scholarship 500 Pm': {
    name: 'Sh. Nanak Chand Khurana Memorial Scholarship',
    description: '500 per month Sh. Nanak Chand Khurana memorial scholarship',
    type: 'FIXED',
    value: 500,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Bus Fee Adjustment': {
    name: 'Transport Fee Adjustment',
    description: 'Adjustment in transport/bus fee',
    type: 'FIXED',
    value: 0, // Will use custom value from CSV
    applicableStudentTypes: ['BOTH'],
    autoApproval: true,
  },
  '1500 School Concession': {
    name: 'School Concession (1500)',
    description: '1500 school concession',
    type: 'FIXED',
    value: 1500,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'School Concession 500': {
    name: 'School Concession (500)',
    description: '500 school concession',
    type: 'FIXED',
    value: 500,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Majra Branch Concession 4000 In Adm Fee': {
    name: 'Majra Branch Admission Concession',
    description: '4000 concession on admission fee for Majra branch',
    type: 'FIXED',
    value: 4000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: false,
  },
  '5000 Security Discount': {
    name: 'Security Deposit Discount',
    description: '5000 discount on security deposit',
    type: 'FIXED',
    value: 5000,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  '300 Term Charges Diff': {
    name: 'Term Charges Adjustment',
    description: 'Term charges adjustment of 300',
    type: 'FIXED',
    value: 300,
    applicableStudentTypes: ['BOTH'],
    autoApproval: true,
  },
  'Annual Charges 5000': {
    name: 'Annual Charges Concession',
    description: '5000 concession on annual charges',
    type: 'FIXED',
    value: 5000,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Term Charges 4600': {
    name: 'Term Charges Concession',
    description: '4600 concession on term charges',
    type: 'FIXED',
    value: 4600,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Admission Fee 12000': {
    name: 'Admission Fee Concession',
    description: '12000 concession on admission fee',
    type: 'FIXED',
    value: 12000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: false,
  },
  'Security 5000': {
    name: 'Security Deposit Concession',
    description: '5000 concession on security deposit',
    type: 'FIXED',
    value: 5000,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'School Concession 50%': {
    name: 'School Concession 50%',
    description: '50% discount on applicable fees',
    type: 'PERCENTAGE',
    value: 50,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'School Concession 30%': {
    name: 'School Concession 30%',
    description: '30% discount on applicable fees',
    type: 'PERCENTAGE',
    value: 30,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'School Concession 40%': {
    name: 'School Concession 40%',
    description: '40% discount on applicable fees',
    type: 'PERCENTAGE',
    value: 40,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Term Charges Advance Paid 1900': {
    name: 'Term Charges Advance Payment',
    description: 'Term charges advance payment adjustment of 1900',
    type: 'FIXED',
    value: 1900,
    applicableStudentTypes: ['BOTH'],
    autoApproval: true,
  },
  'Tuition Fee 2500': {
    name: 'Tuition Fee Concession (2500)',
    description: '2500 concession on tuition fee',
    type: 'FIXED',
    value: 2500,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Tuition Fee 5000': {
    name: 'Tuition Fee Concession (5000)',
    description: '5000 concession on tuition fee',
    type: 'FIXED',
    value: 5000,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  'Tuition Fee 500': {
    name: 'Tuition Fee Concession (500)',
    description: '500 concession on tuition fee',
    type: 'FIXED',
    value: 500,
    applicableStudentTypes: ['BOTH'],
    autoApproval: false,
  },
  '2625 Sibling': {
    name: 'Sibling Concession (2625)',
    description: '2625 sibling concession',
    type: 'FIXED',
    value: 2625,
    applicableStudentTypes: ['BOTH'],
    autoApproval: true,
  },
  '790 Diary': {
    name: 'Diary Fee Concession',
    description: '790 concession on diary fee',
    type: 'FIXED',
    value: 790,
    applicableStudentTypes: ['BOTH'],
    autoApproval: true,
  },
};

async function getDefaultBranchAndSession() {
  // Get the first branch (or you can modify this to get a specific branch)
  const branch = await prisma.branch.findFirst({
    orderBy: { createdAt: 'asc' }
  });
  
  if (!branch) {
    throw new Error('No branch found in the database');
  }

  // Get the current academic session
  const session = await prisma.academicSession.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!session) {
    throw new Error('No active academic session found');
  }

  return { branch, session };
}

async function createConcessionTypes(branchId: string, sessionId: string) {
  console.log('Creating concession types...');
  const concessionTypeMap: Record<string, string> = {};

  for (const [category, config] of Object.entries(CONCESSION_TYPE_MAPPINGS)) {
    try {
      // Check if concession type already exists
      const existing = await prisma.concessionType.findFirst({
        where: {
          name: config.name,
          branchId,
          sessionId,
        },
      });

      if (existing) {
        console.log(`Concession type "${config.name}" already exists, using existing one`);
        concessionTypeMap[category] = existing.id;
        continue;
      }

      const concessionType = await prisma.concessionType.create({
        data: {
          name: config.name,
          description: config.description,
          type: config.type,
          value: config.value,
          maxValue: config.maxValue,
          isActive: true,
          applicableStudentTypes: config.applicableStudentTypes,
          autoApproval: config.autoApproval,
          branchId,
          sessionId,
        },
      });

      concessionTypeMap[category] = concessionType.id;
      console.log(`Created concession type: ${config.name}`);
    } catch (error) {
      console.error(`Error creating concession type "${config.name}":`, error);
    }
  }

  return concessionTypeMap;
}

async function findStudent(admissionNumber: string) {
  const student = await prisma.student.findUnique({
    where: { admissionNumber },
    include: {
      section: {
        include: {
          class: true,
        },
      },
    },
  });
  return student;
}

async function findFeeHeadAndTerm(feeHeadName: string, termName: string, branchId: string, sessionId: string) {
  const feeHead = await prisma.feeHead.findFirst({
    where: {
      name: {
        contains: feeHeadName,
        mode: 'insensitive',
      },
      branchId,
      sessionId,
    },
  });

  let feeTerm = null;
  if (termName) {
    feeTerm = await prisma.feeTerm.findFirst({
      where: {
        name: {
          contains: termName,
          mode: 'insensitive',
        },
        branchId,
        sessionId,
      },
    });
  }

  return { feeHead, feeTerm };
}

async function processCSVRow(
  row: ConcessionCSVRow,
  concessionTypeMap: Record<string, string>,
  branchId: string,
  sessionId: string,
  stats: { processed: number; success: number; errors: string[] },
  dryRun: boolean = false
) {
  stats.processed++;
  
  try {
    // Check if row has required data - be more flexible with validation
    const admissionNumber = row['Admission Number']?.toString().trim();
    const concessionCategory = row['Concession Category']?.toString().trim();
    const feeHeadName = row['Fee Head']?.toString().trim();
    
    if (!admissionNumber || !concessionCategory || !feeHeadName) {
      stats.errors.push(`Skipping row with missing required fields: admission=${admissionNumber}, category=${concessionCategory}, feeHead=${feeHeadName}`);
      return;
    }

    // Use the validated values
    const concessionAmount = parseFloat(row['Concession']) || 0;
    const totalFeeAssigned = parseFloat(row['Total Fee Assigned']) || 0;
    const termName = row['Term'] ? row['Term'].toString().trim() : '';

    // Find student
    const student = await findStudent(admissionNumber);
    if (!student) {
      stats.errors.push(`Student not found for admission number: ${admissionNumber}`);
      return;
    }

    // Map concession category to concession type
    const concessionTypeId = concessionTypeMap[concessionCategory];
    if (!concessionTypeId) {
      stats.errors.push(`Unknown concession category: ${concessionCategory} for student ${admissionNumber}`);
      return;
    }

    // Find fee head and term
    const { feeHead: foundFeeHead, feeTerm: foundFeeTerm } = await findFeeHeadAndTerm(feeHeadName, termName, branchId, sessionId);

    // Calculate custom value based on the actual concession amount
    let customValue: number | undefined;
    const concessionType = await prisma.concessionType.findUnique({
      where: { id: concessionTypeId }
    });

    if (concessionType) {
      if (concessionType.type === 'PERCENTAGE') {
        // Calculate the actual percentage from the concession amount
        if (totalFeeAssigned > 0) {
          const actualPercentage = (concessionAmount / totalFeeAssigned) * 100;
          if (Math.abs(actualPercentage - concessionType.value) > 0.1) {
            customValue = actualPercentage;
          }
        }
      } else if (concessionType.type === 'FIXED') {
        // Use custom value if different from default
        if (Math.abs(concessionAmount - concessionType.value) > 0.01) {
          customValue = concessionAmount;
        }
      }
    }

    // Check if this student concession already exists
    const existingConcession = await prisma.studentConcession.findFirst({
      where: {
        studentId: student.id,
        concessionTypeId,
        branchId,
        sessionId,
      },
    });

    if (dryRun) {
      // Dry run mode - just log what would happen
      if (existingConcession) {
        console.log(`[DRY RUN] Would update existing concession for student ${admissionNumber} (${student.section?.class?.name} ${student.section?.name}) - ${concessionCategory} - Amount: ${concessionAmount}`);
      } else {
        console.log(`[DRY RUN] Would create new concession for student ${admissionNumber} (${student.section?.class?.name} ${student.section?.name}) - ${concessionCategory} - Amount: ${concessionAmount}`);
      }
    } else {
      // Actual database operations
      if (existingConcession) {
        // Update existing concession with additional fee heads/terms
        const appliedFeeHeads = new Set(existingConcession.appliedFeeHeads);
        const appliedFeeTerms = new Set(existingConcession.appliedFeeTerms);

        if (foundFeeHead) appliedFeeHeads.add(foundFeeHead.id);
        if (foundFeeTerm) appliedFeeTerms.add(foundFeeTerm.id);

        await prisma.studentConcession.update({
          where: { id: existingConcession.id },
          data: {
            appliedFeeHeads: Array.from(appliedFeeHeads),
            appliedFeeTerms: Array.from(appliedFeeTerms),
            customValue: customValue ?? existingConcession.customValue,
          },
        });

        console.log(`Updated existing concession for student ${admissionNumber} - ${concessionCategory}`);
      } else {
        // Create new student concession
        const appliedFeeHeads = foundFeeHead ? [foundFeeHead.id] : [];
        const appliedFeeTerms = foundFeeTerm ? [foundFeeTerm.id] : [];

        await prisma.studentConcession.create({
          data: {
            studentId: student.id,
            concessionTypeId,
            customValue,
            reason: `Imported from CSV - ${concessionCategory}`,
            status: 'APPROVED', // Auto-approve imported concessions
            validFrom: new Date(),
            appliedFeeHeads,
            appliedFeeTerms,
            branchId,
            sessionId,
            approvedBy: 'SYSTEM_IMPORT',
            approvedAt: new Date(),
          },
        });

        console.log(`Created concession for student ${admissionNumber} - ${concessionCategory}`);
      }
    }

    stats.success++;
  } catch (error) {
    const errorMsg = `Error processing row for student ${row['Admission Number']}: ${error instanceof Error ? error.message : String(error)}`;
    stats.errors.push(errorMsg);
    console.error(errorMsg);
  }
}

async function importConcessions(dryRun: boolean = false) {
  console.log(`Starting concession import${dryRun ? ' (DRY RUN MODE)' : ''}...`);
  
  try {
    const { branch, session } = await getDefaultBranchAndSession();
    console.log(`Using branch: ${branch.name}, session: ${session.name}`);

    // Create concession types (skip in dry run mode)
    let concessionTypeMap: Record<string, string> = {};
    if (!dryRun) {
      concessionTypeMap = await createConcessionTypes(branch.id, session.id);
    } else {
      // In dry run mode, just map to dummy IDs for validation
      for (const category of Object.keys(CONCESSION_TYPE_MAPPINGS)) {
        concessionTypeMap[category] = `dummy-id-${category}`;
      }
      console.log(`[DRY RUN] Skipping concession type creation - using dummy IDs for validation`);
    }

    // Read and process CSV file
    const csvFilePath = path.join(process.cwd(), 'AI', 'Concession_02-08-2025.csv');
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }

    const stats = {
      processed: 0,
      success: 0,
      errors: [] as string[],
    };

    const rows: ConcessionCSVRow[] = [];
    let totalRowsRead = 0;
    let validRows = 0;

    // Read CSV file
    await new Promise<void>((resolve, reject) => {
      createReadStream(csvFilePath)
        .pipe(csv({ 
          // Remove BOM and normalize headers
          mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim()
        }))
        .on('data', (row: ConcessionCSVRow) => {
          totalRowsRead++;
          
          // Debug first few rows
          if (totalRowsRead <= 2) {
            console.log('Available field names:', Object.keys(row));
            console.log('Sample row data:', {
              admissionNumber: row['Admission Number'],
              category: row['Concession Category'],
              feeHead: row['Fee Head']
            });
          }
          
          const admissionNumber = row['Admission Number'];
          if (admissionNumber && admissionNumber.toString().trim()) {
            validRows++;
            rows.push(row);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });

    console.log(`Found ${rows.length} valid rows in CSV file`);

    // Process rows in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rows.length / batchSize)}`);
      
      await Promise.all(
        batch.map(row => processCSVRow(row, concessionTypeMap, branch.id, session.id, stats, dryRun))
      );
    }

    // Print summary
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total rows processed: ${stats.processed}`);
    console.log(`Successful imports: ${stats.success}`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n=== ERRORS ===');
      stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Save error log to file
    if (stats.errors.length > 0) {
      const errorLogPath = path.join(process.cwd(), 'scripts', 'concession-import-errors.log');
      fs.writeFileSync(errorLogPath, stats.errors.join('\n'));
      console.log(`\nError log saved to: ${errorLogPath}`);
    }

  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import directly
if (process.argv.includes('--run') || process.argv.includes('--dry-run')) {
  const dryRun = process.argv.includes('--dry-run');
  
  importConcessions(dryRun)
    .then(() => {
      console.log(`${dryRun ? 'Dry run' : 'Import'} completed successfully!`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`${dryRun ? 'Dry run' : 'Import'} failed:`, error);
      process.exit(1);
    });
}

export { importConcessions };