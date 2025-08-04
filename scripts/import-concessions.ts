import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
// @ts-ignore - csv-parser doesn't have type definitions
import csv from 'csv-parser';
import { createReadStream } from 'fs';

const prisma = new PrismaClient();

// Helper function to detect double month terms
function isDoubleMonthTerm(termName: string): boolean {
  const doubleMonthTerms = [
    'May + June',
    'July + August', 
    'September + October',
    'December + January',
    'February + March'
  ];
  
  return doubleMonthTerms.some(doubleTerm => 
    termName.toLowerCase().includes(doubleTerm.toLowerCase())
  );
}

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

interface ImportStats {
  processed: number;
  success: number;
  created: number;
  skipped: number;
  updated: number;
  errors: string[];
  concessionTypeBreakdown: Record<string, number>;
  termBreakdown: Record<string, number>;
  feeHeadBreakdown: Record<string, number>;
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
  'Bright Foundation - _8000 concession on Admission Fee': {
    name: 'Bright Foundation Scholarship',
    description: '8000 discount on admission fee for needy students',
    type: 'FIXED',
    value: 8000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: false,
  },
  'Junior Wing Admission Fee Concession - _4000 off': {
    name: 'Junior Wing Admission Fee Concession',
    description: '4000 discount on admission fee for junior wing students',
    type: 'FIXED',
    value: 4000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: true,
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
  console.log('🔧 Creating concession types...');
  const concessionTypeMap: Record<string, string> = {};
  let created = 0;
  let existing = 0;

  for (const [category, config] of Object.entries(CONCESSION_TYPE_MAPPINGS)) {
    try {
      // Check if concession type already exists
      const existingType = await prisma.concessionType.findFirst({
        where: {
          name: config.name,
          branchId,
          sessionId,
        },
      });

      if (existingType) {
        console.log(`   ✓ Concession type "${config.name}" already exists`);
        concessionTypeMap[category] = existingType.id;
        existing++;
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
      console.log(`   ➕ Created concession type: ${config.name}`);
      created++;
    } catch (error) {
      console.error(`Error creating concession type "${config.name}":`, error);
    }
  }

  console.log(`✅ Concession types setup completed:`);
  console.log(`   • Created: ${created} new types`);
  console.log(`   • Existing: ${existing} types found`);
  console.log(`   • Total: ${Object.keys(concessionTypeMap).length} types available\n`);

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
  stats: ImportStats,
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
        // For fixed concessions, adjust expected value for double-month terms
        const isDoubleTerm = isDoubleMonthTerm(termName);
        const expectedValue = isDoubleTerm ? concessionType.value * 2 : concessionType.value;
        
        // Use custom value if different from expected value (considering double months)
        if (Math.abs(concessionAmount - expectedValue) > 0.01) {
          customValue = concessionAmount;
        }
        
        console.log(`Fixed concession for ${admissionNumber} - Term: ${termName} ${isDoubleTerm ? '(Double Month)' : '(Single Month)'} - Expected: ${expectedValue}, Actual: ${concessionAmount}`);
      }
    }

    // Check if this student concession already exists (using unique constraint fields)
    const existingConcession = await prisma.studentConcession.findUnique({
      where: {
        student_concession_type_unique: {
          studentId: student.id,
          concessionTypeId,
        },
      },
    });

    if (dryRun) {
      // Dry run mode - just log what would happen
      if (existingConcession) {
        console.log(`[DRY RUN] Would skip duplicate concession for student ${admissionNumber} (${student.section?.class?.name} ${student.section?.name}) - ${concessionCategory} - Term: ${termName}`);
      } else {
        console.log(`[DRY RUN] Would create new concession for student ${admissionNumber} (${student.section?.class?.name} ${student.section?.name}) - ${concessionCategory} - Amount: ${concessionAmount}`);
      }
    } else {
      // Actual database operations
      if (existingConcession) {
        // Skip duplicate - concession already exists for this student and type
        console.log(`⚠️  Skipping duplicate concession for student ${admissionNumber} - ${concessionCategory} (Term: ${termName}) - already exists`);
        stats.skipped++;
        
        // Only update if the custom value is significantly different
        if (customValue && Math.abs(customValue - (existingConcession.customValue || 0)) > 0.01) {
          await prisma.studentConcession.update({
            where: { id: existingConcession.id },
            data: {
              customValue: customValue,
            },
          });
          console.log(`   ✓ Updated custom value to ${customValue}`);
          stats.updated++;
        }
      } else {
        // Create new student concession (fee heads/terms are now managed at concession type level)
        await prisma.studentConcession.create({
          data: {
            studentId: student.id,
            concessionTypeId,
            customValue,
            reason: `Imported from CSV - ${concessionCategory}`,
            status: 'APPROVED', // Auto-approve imported concessions
            validFrom: new Date(),
            branchId,
            sessionId,
            approvedBy: 'SYSTEM_IMPORT',
            approvedAt: new Date(),
          },
        });

        console.log(`✅ Created concession for student ${admissionNumber} - ${concessionCategory}`);
        stats.created++;
      }
    }

    stats.success++;
    
    // Track statistics for breakdown reports
    stats.concessionTypeBreakdown[concessionCategory] = (stats.concessionTypeBreakdown[concessionCategory] || 0) + 1;
    stats.feeHeadBreakdown[feeHeadName] = (stats.feeHeadBreakdown[feeHeadName] || 0) + 1;
    stats.termBreakdown[termName] = (stats.termBreakdown[termName] || 0) + 1;
    
  } catch (error) {
    const errorMsg = `Error processing row for student ${row['Admission Number']}: ${error instanceof Error ? error.message : String(error)}`;
    stats.errors.push(errorMsg);
    console.error(errorMsg);
  }
}

async function importConcessions(dryRun: boolean = false) {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Starting concession import${dryRun ? ' (DRY RUN MODE)' : ''}...`);
  console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    console.log(`📋 Step 1: Validating configuration...`);
    const { branch, session } = await getDefaultBranchAndSession();
    console.log(`✅ Branch: ${branch.name} (ID: ${branch.id})`);
    console.log(`✅ Session: ${session.name} (ID: ${session.id})`);
    console.log(`✅ Configuration validated successfully\n`);

    // Create concession types (skip in dry run mode)
    console.log(`📋 Step 2: Setting up concession types...`);
    let concessionTypeMap: Record<string, string> = {};
    const totalConcessionTypes = Object.keys(CONCESSION_TYPE_MAPPINGS).length;
    
    if (!dryRun) {
      console.log(`🔧 Creating ${totalConcessionTypes} concession types...`);
      concessionTypeMap = await createConcessionTypes(branch.id, session.id);
      console.log(`✅ All concession types created successfully\n`);
    } else {
      console.log(`⚠️  [DRY RUN] Skipping concession type creation - using dummy IDs for validation`);
      // In dry run mode, just map to dummy IDs for validation
      for (const category of Object.keys(CONCESSION_TYPE_MAPPINGS)) {
        concessionTypeMap[category] = `dummy-id-${category}`;
      }
      console.log(`✅ ${totalConcessionTypes} dummy concession type mappings created\n`);
    }

    // Read and process CSV file
    console.log(`📋 Step 3: Reading CSV file...`);
    const csvFilePath = path.join(process.cwd(), 'AI', 'concession_4-8-2025.csv');
    console.log(`📁 File path: ${csvFilePath}`);
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`❌ CSV file not found: ${csvFilePath}`);
    }
    console.log(`✅ CSV file found`);

    const stats: ImportStats = {
      processed: 0,
      success: 0,
      created: 0,
      skipped: 0,
      updated: 0,
      errors: [],
      concessionTypeBreakdown: {},
      termBreakdown: {},
      feeHeadBreakdown: {},
    };

    const rows: ConcessionCSVRow[] = [];
    let totalRowsRead = 0;
    let validRows = 0;

    console.log(`📖 Reading CSV data...`);
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
            console.log(`📋 CSV Headers:`, Object.keys(row));
            console.log(`📝 Sample row ${totalRowsRead}:`, {
              admissionNumber: row['Admission Number'],
              studentName: row['Student Name'],
              category: row['Concession Category'],
              feeHead: row['Fee Head'],
              term: row['Term'],
              concessionAmount: row['Concession']
            });
          }
          
          const admissionNumber = row['Admission Number'];
          if (admissionNumber && admissionNumber.toString().trim()) {
            validRows++;
            rows.push(row);
          } else {
            console.log(`⚠️  Skipping row ${totalRowsRead} - missing admission number`);
          }
        })
        .on('end', () => {
          console.log(`✅ CSV reading completed`);
          console.log(`📊 Total rows read: ${totalRowsRead}`);
          console.log(`📊 Valid rows: ${validRows}`);
          console.log(`📊 Skipped rows: ${totalRowsRead - validRows}\n`);
          resolve();
        })
        .on('error', (error) => {
          console.error(`❌ CSV reading error:`, error);
          reject(error);
        });
    });

    console.log(`📋 Step 4: Processing concession data...`);
    console.log(`📊 Found ${rows.length} valid concession records to process\n`);

    // Enhanced batch processing with better performance and logging
    const batchSize = 25; // Reduced for better database performance
    const totalBatches = Math.ceil(rows.length / batchSize);
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      
      console.log(`⚡ Processing batch ${currentBatch}/${totalBatches} (${batch.length} records)...`);
      const batchStart = Date.now();
      
      // Process batch with controlled concurrency and error handling
      const batchPromises = batch.map((row, index) => 
        processCSVRow(row, concessionTypeMap, branch.id, session.id, stats, dryRun)
          .catch(error => {
            console.error(`❌ Error in batch ${currentBatch}, row ${index + 1}:`, error.message);
            stats.errors.push(`Batch ${currentBatch}, Row ${index + 1}: ${error.message}`);
          })
      );
      
      await Promise.all(batchPromises);
      
      const batchTime = Date.now() - batchStart;
      const progress = ((i + batchSize) / rows.length * 100).toFixed(1);
      console.log(`✅ Batch ${currentBatch} completed in ${batchTime}ms (${progress}% total progress)`);
      
      // Add a small delay between batches to prevent overwhelming the database
      if (currentBatch < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Enhanced final summary with comprehensive statistics
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 IMPORT SUMMARY ${dryRun ? '(DRY RUN)' : ''}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`⏱️  Total execution time: ${totalTime.toFixed(2)} seconds`);
    console.log(`📈 Processing rate: ${(stats.processed / totalTime).toFixed(1)} records/second`);
    console.log(`📋 Total rows processed: ${stats.processed}`);
    console.log(`✅ Successful operations: ${stats.success}`);
    console.log(`   • 🆕 Created: ${stats.created} new concessions`);
    console.log(`   • ⚠️  Skipped: ${stats.skipped} duplicates`);
    console.log(`   • 🔄 Updated: ${stats.updated} existing concessions`);
    console.log(`❌ Errors: ${stats.errors.length}`);
    console.log(`📊 Success rate: ${((stats.success / stats.processed) * 100).toFixed(1)}%`);

    // Show breakdown by concession type
    if (Object.keys(stats.concessionTypeBreakdown).length > 0) {
      console.log(`\n📊 CONCESSION TYPE BREAKDOWN:`);
      Object.entries(stats.concessionTypeBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10) // Show top 10
        .forEach(([type, count]) => {
          console.log(`   • ${type}: ${count} records`);
        });
    }

    // Show breakdown by fee head
    if (Object.keys(stats.feeHeadBreakdown).length > 0) {
      console.log(`\n📊 FEE HEAD BREAKDOWN:`);
      Object.entries(stats.feeHeadBreakdown)
        .sort(([,a], [,b]) => b - a)
        .forEach(([feeHead, count]) => {
          console.log(`   • ${feeHead}: ${count} records`);
        });
    }

    // Show breakdown by term
    if (Object.keys(stats.termBreakdown).length > 0) {
      console.log(`\n📊 TERM BREAKDOWN:`);
      Object.entries(stats.termBreakdown)
        .sort(([,a], [,b]) => b - a)
        .forEach(([term, count]) => {
          console.log(`   • ${term}: ${count} records`);
        });
    }

    if (stats.errors.length > 0) {
      console.log(`\n❌ ERRORS (${stats.errors.length}):`);
      stats.errors.slice(0, 10).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      
      if (stats.errors.length > 10) {
        console.log(`   ... and ${stats.errors.length - 10} more errors`);
      }
      
      // Save errors to file
      const errorLogPath = path.join(process.cwd(), 'scripts', 'concession-import-errors.log');
      fs.writeFileSync(errorLogPath, stats.errors.join('\n'));
      console.log(`\n📄 Full error log saved to: ${errorLogPath}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 ${dryRun ? 'Dry run' : 'Import'} completed successfully!`);
    console.log(`📅 Completed at: ${new Date().toLocaleString()}`);
    console.log(`${'='.repeat(60)}\n`);

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