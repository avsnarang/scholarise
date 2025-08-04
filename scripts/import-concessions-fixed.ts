import { PrismaClient } from '@prisma/client';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import path from 'path';
import fs from 'fs';

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
  'Fee Head': string;
  'Term': string;
  'Concession Category': string;
  'Total Fee Assigned': string;
  'Concession': string;
  'Net Fee Assigned': string;
}

interface AggregatedConcession {
  student: string;
  concessionCategory: string;
  feeHeads: Set<string>;
  terms: Map<string, number>; // term -> amount
  totalAmount: number;
  sampleRow: ConcessionCSVRow;
}

// Mapping from CSV concession categories to our concession type configurations
const CONCESSION_TYPE_MAPPINGS: Record<string, {
  name: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  maxValue?: number;
  applicableStudentTypes: ('NEW_ADMISSION' | 'OLD_STUDENT')[];
  autoApproval: boolean;
}> = {
  'Sibling Concession - 15% discount on applicable fee': {
    name: 'Sibling Concession',
    description: '15% discount for students with siblings in school',
    type: 'PERCENTAGE',
    value: 15,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: true,
  },
  'Staff Concession 1500': {
    name: 'Staff Concession',
    description: 'Fixed 1500 discount for staff children',
    type: 'FIXED',
    value: 1500,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
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
  'School Concession 20%': {
    name: 'School Concession 20%',
    description: '20% school concession',
    type: 'PERCENTAGE',
    value: 20,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'School Concession 25%': {
    name: 'School Concession 25%',
    description: '25% school concession',
    type: 'PERCENTAGE',
    value: 25,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'School Concession 30%': {
    name: 'School Concession 30%',
    description: '30% school concession',
    type: 'PERCENTAGE',
    value: 30,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'School Concession 40%': {
    name: 'School Concession 40%',
    description: '40% school concession',
    type: 'PERCENTAGE',
    value: 40,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'School Concession 50%': {
    name: 'School Concession 50%',
    description: '50% school concession',
    type: 'PERCENTAGE',
    value: 50,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'School Concession 100%': {
    name: 'School Concession 100%',
    description: '100% school concession (full waiver)',
    type: 'PERCENTAGE',
    value: 100,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'Merit Scholarship (90% and above)': {
    name: 'Merit Scholarship',
    description: 'Merit scholarship for students scoring 90% and above',
    type: 'PERCENTAGE',
    value: 50,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'Sports Scholarship': {
    name: 'Sports Scholarship',
    description: 'Scholarship for outstanding sports performance',
    type: 'PERCENTAGE',
    value: 25,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'Sibling Concession 20%': {
    name: 'Sibling Concession 20%',
    description: '20% discount for students with siblings in school',
    type: 'PERCENTAGE',
    value: 20,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: true,
  },
  'School Concession': {
    name: 'School General Concession',
    description: 'General school concession',
    type: 'PERCENTAGE',
    value: 10,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'Advance Fee Deposit Discount 4000': {
    name: 'Advance Fee Deposit Discount',
    description: '4000 discount on advance fee deposit',
    type: 'FIXED',
    value: 4000,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: true,
  },
  'Orientation 1000': {
    name: 'Orientation Fee Concession',
    description: '1000 concession on orientation fee',
    type: 'FIXED',
    value: 1000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: true,
  },
  'School Concession On Annual Charges 5000': {
    name: 'Annual Charges Concession',
    description: '5000 concession on annual charges',
    type: 'FIXED',
    value: 5000,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'X Class Board Exam Scholarship 1000 Pm': {
    name: 'X Class Board Exam Scholarship',
    description: '1000 per month scholarship for X class board exam',
    type: 'FIXED',
    value: 1000,
    applicableStudentTypes: ['OLD_STUDENT'],
    autoApproval: false,
  },
  'X Class Board Exam Scholarship 500 Pm': {
    name: 'X Class Board Exam Scholarship 500',
    description: '500 per month scholarship for X class board exam',
    type: 'FIXED',
    value: 500,
    applicableStudentTypes: ['OLD_STUDENT'],
    autoApproval: false,
  },
  'Merit Scholarship-8000 In Adm. Fee': {
    name: 'Merit Scholarship on Admission',
    description: '8000 merit scholarship on admission fee',
    type: 'FIXED',
    value: 8000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: false,
  },
  '1500 School Concession': {
    name: 'School Concession 1500',
    description: '1500 fixed school concession',
    type: 'FIXED',
    value: 1500,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'Janab Abdul Rehman Scholarship 500 Pm': {
    name: 'Abdul Rehman Scholarship',
    description: '500 per month scholarship in memory of Janab Abdul Rehman',
    type: 'FIXED',
    value: 500,
    applicableStudentTypes: ['OLD_STUDENT'],
    autoApproval: false,
  },
  'Sh. Nanak Chand Khurana Memorial Scholarship 500 Pm': {
    name: 'Nanak Chand Khurana Memorial Scholarship',
    description: '500 per month memorial scholarship',
    type: 'FIXED',
    value: 500,
    applicableStudentTypes: ['OLD_STUDENT'],
    autoApproval: false,
  },
  'Merit Scholarship Above 90% 11000': {
    name: 'Merit Scholarship Above 90%',
    description: '11000 merit scholarship for students scoring above 90%',
    type: 'FIXED',
    value: 11000,
    applicableStudentTypes: ['OLD_STUDENT'],
    autoApproval: false,
  },
  'Annual Charges 5000': {
    name: 'Annual Charges Concession 5000',
    description: '5000 concession on annual charges',
    type: 'FIXED',
    value: 5000,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: true,
  },
  'Term Charges 4600': {
    name: 'Term Charges Concession',
    description: '4600 concession on term charges',
    type: 'FIXED',
    value: 4600,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: true,
  },
  'Security 5000': {
    name: 'Security Fee Concession',
    description: '5000 concession on security fee',
    type: 'FIXED',
    value: 5000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: true,
  },
  'Majra Branch Concession 4000 In Adm Fee': {
    name: 'Majra Branch Admission Concession',
    description: '4000 concession on admission fee for Majra branch',
    type: 'FIXED',
    value: 4000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: true,
  },
  'Juniors Admission Fee Con 2000': {
    name: 'Junior Admission Fee Concession',
    description: '2000 concession on admission fee for junior students',
    type: 'FIXED',
    value: 2000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: true,
  },
  'Admission Fee 12000': {
    name: 'Admission Fee Concession 12000',
    description: '12000 concession on admission fee',
    type: 'FIXED',
    value: 12000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: false,
  },
  '5000 Security Discount': {
    name: 'Security Discount 5000',
    description: '5000 discount on security fee',
    type: 'FIXED',
    value: 5000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: true,
  },
  '300 Term Charges Diff': {
    name: 'Term Charges Difference',
    description: '300 term charges adjustment',
    type: 'FIXED',
    value: 300,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: true,
  },
  'Woner Skill Collected Refund 1000': {
    name: 'Skill Collection Refund',
    description: '1000 refund adjustment',
    type: 'FIXED',
    value: 1000,
    applicableStudentTypes: ['OLD_STUDENT'],
    autoApproval: true,
  },
  'Tuition Fee 5000': {
    name: 'Tuition Fee Concession 5000',
    description: '5000 concession on tuition fee',
    type: 'FIXED',
    value: 5000,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'Tuition Fee 500': {
    name: 'Tuition Fee Concession 500',
    description: '500 concession on tuition fee',
    type: 'FIXED',
    value: 500,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: true,
  },
  'Tuition Fee 2500': {
    name: 'Tuition Fee Concession 2500',
    description: '2500 concession on tuition fee',
    type: 'FIXED',
    value: 2500,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: false,
  },
  'Term Charges Advance Paid 1900': {
    name: 'Term Charges Advance Payment',
    description: '1900 advance payment adjustment for term charges',
    type: 'FIXED',
    value: 1900,
    applicableStudentTypes: ['OLD_STUDENT'],
    autoApproval: true,
  },
  'Super 30 Discount 8000': {
    name: 'Super 30 Program Discount',
    description: '8000 discount for Super 30 program students',
    type: 'FIXED',
    value: 8000,
    applicableStudentTypes: ['OLD_STUDENT'],
    autoApproval: false,
  },
  'School Concession 6000 Adm Fee': {
    name: 'School Concession on Admission',
    description: '6000 school concession on admission fee',
    type: 'FIXED',
    value: 6000,
    applicableStudentTypes: ['NEW_ADMISSION'],
    autoApproval: false,
  },
  'School Concession 500': {
    name: 'School Concession 500',
    description: '500 general school concession',
    type: 'FIXED',
    value: 500,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: true,
  },
  'Bus Fee Adjustment': {
    name: 'Transportation Fee Adjustment',
    description: 'Bus fee adjustment/concession',
    type: 'FIXED',
    value: 1000, // Default value, will use custom from CSV
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
    autoApproval: true,
  },
  '2625 Sibling': {
    name: 'Sibling Concession 2625',
    description: '2625 fixed sibling concession',
    type: 'FIXED',
    value: 2625,
    applicableStudentTypes: ['NEW_ADMISSION', 'OLD_STUDENT'],
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
      console.log(`   + Created concession type: ${config.name}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating concession type ${config.name}:`, error);
      throw error;
    }
  }

  console.log(`✅ Concession types setup completed:`);
  console.log(`   • Created: ${created} new types`);
  console.log(`   • Existing: ${existing} types found`);
  console.log(`   • Total: ${Object.keys(concessionTypeMap).length} types available\n`);

  return concessionTypeMap;
}

async function processAggregatedConcession(
  aggregate: AggregatedConcession,
  concessionTypeMap: Record<string, string>,
  branchId: string,
  sessionId: string,
  stats: any,
  dryRun: boolean
) {
  try {
    stats.processed++;

    const { student: admissionNumber, concessionCategory, totalAmount } = aggregate;

    // Find the student
    const student = await prisma.student.findFirst({
      where: { 
        admissionNumber: admissionNumber.toString(),
        branchId 
      },
      include: {
        section: {
          include: {
            class: true
          }
        }
      }
    });

    if (!student) {
      const errorMsg = `Student not found: ${admissionNumber}`;
      stats.errors.push(errorMsg);
      console.log(`❌ ${errorMsg}`);
      return;
    }

    // Get concession type
    const concessionTypeId = concessionTypeMap[concessionCategory];
    if (!concessionTypeId) {
      const errorMsg = `Unknown concession category: ${concessionCategory}`;
      stats.errors.push(errorMsg);
      console.log(`❌ ${errorMsg}`);
      return;
    }

    // In dry run mode, create a mock concession type for validation
    let concessionType;
    if (dryRun) {
      const mockConfig = CONCESSION_TYPE_MAPPINGS[concessionCategory];
      if (!mockConfig) {
        const errorMsg = `Unknown concession category: ${concessionCategory}`;
        stats.errors.push(errorMsg);
        return;
      }
      concessionType = {
        id: concessionTypeId,
        type: mockConfig.type,
        value: mockConfig.value,
        name: mockConfig.name
      };
    } else {
      concessionType = await prisma.concessionType.findUnique({
        where: { id: concessionTypeId }
      });

      if (!concessionType) {
        const errorMsg = `Concession type not found for category: ${concessionCategory}`;
        stats.errors.push(errorMsg);
        return;
      }
    }

    // For fixed concessions, validate the total amount makes sense
    let customValue: number | null = null;
    if (concessionType.type === 'FIXED') {
      // Calculate expected total based on terms and double-month logic
      let expectedTotal = 0;
      for (const [termName, amount] of aggregate.terms) {
        const isDoubleTerm = isDoubleMonthTerm(termName);
        const expectedForTerm = isDoubleTerm ? concessionType.value * 2 : concessionType.value;
        expectedTotal += expectedForTerm;
      }
      
      // If the actual total differs from expected, store as custom value
      if (Math.abs(totalAmount - expectedTotal) > 0.01) {
        customValue = totalAmount;
      }
      
      console.log(`Fixed concession for ${admissionNumber} - Expected: ₹${expectedTotal}, Actual: ₹${totalAmount} ${customValue ? '(Custom)' : ''}`);
    } else {
      // For percentage concessions, use the total directly as custom value if different from type default
      if (Math.abs(totalAmount - concessionType.value) > 0.01) {
        customValue = totalAmount;
      }
    }

    // Check if this student concession already exists
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
        console.log(`[DRY RUN] Would update existing concession for student ${admissionNumber} - ${concessionCategory} - Total: ₹${totalAmount}`);
      } else {
        console.log(`[DRY RUN] Would create new concession for student ${admissionNumber} - ${concessionCategory} - Total: ₹${totalAmount}`);
      }
    } else {
      // Actual database operations
      if (existingConcession) {
        // Update existing concession with the new total
        await prisma.studentConcession.update({
          where: { id: existingConcession.id },
          data: {
            customValue: customValue,
          },
        });
        console.log(`🔄 Updated concession for student ${admissionNumber} - ${concessionCategory} - Total: ₹${totalAmount}`);
        stats.updated++;
      } else {
        // Create new student concession
        await prisma.studentConcession.create({
          data: {
            studentId: student.id,
            concessionTypeId,
            customValue,
            reason: `Imported from CSV - ${concessionCategory} (${aggregate.terms.size} terms)`,
            status: 'APPROVED', // Auto-approve imported concessions
            validFrom: new Date(),
            branchId,
            sessionId,
            approvedBy: 'SYSTEM_IMPORT',
            approvedAt: new Date(),
          },
        });

        console.log(`✅ Created concession for student ${admissionNumber} - ${concessionCategory} - Total: ₹${totalAmount}`);
        stats.created++;
      }
    }

    stats.success++;
    
    // Track statistics for breakdown reports
    stats.concessionTypeBreakdown[concessionCategory] = (stats.concessionTypeBreakdown[concessionCategory] || 0) + 1;
    stats.totalConcessionAmount += totalAmount;

  } catch (error) {
    const errorMsg = `Error processing concession for student ${aggregate.student}: ${error instanceof Error ? error.message : String(error)}`;
    stats.errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
  }
}

async function importConcessions(dryRun: boolean = false) {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Starting FIXED concession import${dryRun ? ' (DRY RUN MODE)' : ''}...`);
  console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    console.log(`📋 Step 1: Validating configuration...`);
    const { branch, session } = await getDefaultBranchAndSession();
    console.log(`✅ Branch: ${branch.name} (ID: ${branch.id})`);
    console.log(`✅ Session: ${session.name} (ID: ${session.id})`);
    console.log(`✅ Configuration validated\n`);

    // Create concession types (skip in dry run mode)
    console.log(`📋 Step 2: Setting up concession types...`);
    let concessionTypeMap: Record<string, string> = {};
    const totalConcessionTypes = Object.keys(CONCESSION_TYPE_MAPPINGS).length;
    
    if (!dryRun) {
      console.log(`🔧 Creating ${totalConcessionTypes} concession types...`);
      concessionTypeMap = await createConcessionTypes(branch.id, session.id);
    } else {
      // In dry run mode, just map to dummy IDs for validation
      for (const category of Object.keys(CONCESSION_TYPE_MAPPINGS)) {
        concessionTypeMap[category] = `dummy-id-${category}`;
      }
      console.log(`[DRY RUN] Skipping concession type creation - using dummy IDs for validation\n`);
    }

    // Read and process CSV file
    console.log(`📋 Step 3: Reading CSV file...`);
    const csvFilePath = path.join(process.cwd(), 'AI', 'concession_4-8-2025.csv');
    console.log(`📁 File path: ${csvFilePath}`);
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`❌ CSV file not found: ${csvFilePath}`);
    }
    console.log(`✅ CSV file found`);

    const stats = {
      processed: 0,
      success: 0,
      created: 0,
      skipped: 0,
      updated: 0,
      errors: [] as string[],
      concessionTypeBreakdown: {} as Record<string, number>,
      totalConcessionAmount: 0,
    };

    const rows: ConcessionCSVRow[] = [];
    let totalRowsRead = 0;

    // Read CSV file
    console.log(`📋 Reading CSV data...`);
    await new Promise<void>((resolve, reject) => {
      createReadStream(csvFilePath)
        .pipe(csv({ 
          // Remove BOM and normalize headers
          mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim()
        }))
        .on('data', (row: ConcessionCSVRow) => {
          totalRowsRead++;
          
          const admissionNumber = row['Admission Number'];
          if (admissionNumber && admissionNumber.toString().trim()) {
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

    console.log(`✅ Read ${totalRowsRead} total rows, ${rows.length} valid concession records\n`);

    // Pre-aggregate CSV data by student + concession type combination
    console.log(`📋 Step 4: Aggregating concession data by student and type...`);
    const aggregatedConcessions = new Map<string, AggregatedConcession>();

    for (const row of rows) {
      const admissionNumber = row['Admission Number']?.toString().trim();
      const concessionCategory = row['Concession Category']?.toString().trim();
      const concessionAmount = parseFloat(row['Concession']) || 0;
      const termName = row['Term']?.toString().trim();
      const feeHeadName = row['Fee Head']?.toString().trim();
      
      if (!admissionNumber || !concessionCategory) continue;
      
      const key = `${admissionNumber}|${concessionCategory}`;
      
      if (!aggregatedConcessions.has(key)) {
        aggregatedConcessions.set(key, {
          student: admissionNumber,
          concessionCategory,
          feeHeads: new Set(),
          terms: new Map(),
          totalAmount: 0,
          sampleRow: row
        });
      }
      
      const aggregate = aggregatedConcessions.get(key)!;
      aggregate.feeHeads.add(feeHeadName);
      aggregate.terms.set(termName, concessionAmount);
      aggregate.totalAmount += concessionAmount;
    }

    console.log(`✅ Aggregated ${aggregatedConcessions.size} unique student-concession combinations from ${rows.length} CSV rows`);
    console.log(`📊 Expected total concession amount: ₹${Array.from(aggregatedConcessions.values()).reduce((sum, a) => sum + a.totalAmount, 0).toLocaleString('en-IN')}\n`);

    // Process aggregated concessions in batches
    console.log(`📋 Step 5: Processing aggregated concessions...`);
    const aggregatedEntries = Array.from(aggregatedConcessions.values());
    const batchSize = 25;
    const totalBatches = Math.ceil(aggregatedEntries.length / batchSize);
    
    for (let i = 0; i < aggregatedEntries.length; i += batchSize) {
      const batch = aggregatedEntries.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      
      console.log(`⚡ Processing batch ${currentBatch}/${totalBatches} (${batch.length} aggregated concessions)...`);
      
      const batchStart = Date.now();
      await Promise.all(
        batch.map(aggregate => processAggregatedConcession(aggregate, concessionTypeMap, branch.id, session.id, stats, dryRun))
      );
      const batchTime = (Date.now() - batchStart) / 1000;
      
      console.log(`   ✓ Batch ${currentBatch} completed in ${batchTime.toFixed(1)}s`);
      console.log(`   📊 Progress: ${stats.success}/${stats.processed} processed, ${stats.errors.length} errors`);
    }

    // Enhanced final summary with comprehensive statistics
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 IMPORT SUMMARY ${dryRun ? '(DRY RUN)' : ''}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`⏱️  Total time: ${totalTime.toFixed(1)} seconds`);
    console.log(`📈 Processing rate: ${(stats.processed / totalTime).toFixed(1)} records/second`);
    console.log(`📋 Total aggregated concessions processed: ${stats.processed}`);
    console.log(`✅ Successful operations: ${stats.success}`);
    console.log(`   • 🆕 Created: ${stats.created} new concessions`);
    console.log(`   • 🔄 Updated: ${stats.updated} existing concessions`);
    console.log(`❌ Errors: ${stats.errors.length}`);
    console.log(`📊 Success rate: ${((stats.success / stats.processed) * 100).toFixed(1)}%`);
    console.log(`💰 Total concession amount: ₹${stats.totalConcessionAmount.toLocaleString('en-IN')}`);

    if (Object.keys(stats.concessionTypeBreakdown).length > 0) {
      console.log(`\n📈 CONCESSION TYPE BREAKDOWN:`);
      Object.entries(stats.concessionTypeBreakdown)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`   • ${type}: ${count} students`);
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

      // Save error log to file
      const errorLogPath = path.join(process.cwd(), 'scripts', 'concession-import-errors-fixed.log');
      fs.writeFileSync(errorLogPath, stats.errors.join('\n'));
      console.log(`\n📝 Full error log saved to: ${errorLogPath}`);
    }

    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Import failed:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const args = process.argv.slice(2);
const dryRun = !args.includes('--run');

if (dryRun && !args.includes('--dry-run')) {
  console.log('Usage:');
  console.log('  --dry-run: Test the import without making database changes');
  console.log('  --run: Actually perform the import');
  process.exit(1);
}

importConcessions(dryRun).catch(console.error);