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



// Mapping of concession categories to determine if they are percentage or fixed
const CONCESSION_TYPE_MAPPING: Record<string, { type: 'PERCENTAGE' | 'FIXED'; baseValue?: number }> = {
  'Sibling Concession - 15% discount on applicable fee': { type: 'PERCENTAGE', baseValue: 15 },
  'Sibling Concession 20%': { type: 'PERCENTAGE', baseValue: 20 },
  'School Concession 20%': { type: 'PERCENTAGE', baseValue: 20 },
  'School Concession 25%': { type: 'PERCENTAGE', baseValue: 25 },
  'School Concession 30%': { type: 'PERCENTAGE', baseValue: 30 },
  'School Concession 40%': { type: 'PERCENTAGE', baseValue: 40 },
  'School Concession 50%': { type: 'PERCENTAGE', baseValue: 50 },
  'School Concession 100%': { type: 'PERCENTAGE', baseValue: 100 },
  'Staff Concession 1500': { type: 'FIXED', baseValue: 1500 },
  'Junior Wing Admission Fee Concession - _4000 off': { type: 'FIXED', baseValue: 4000 },
  'Juniors Admission Fee Con 2000': { type: 'FIXED', baseValue: 2000 },
  'Bright Foundation - _8000 concession on Admission Fee': { type: 'FIXED', baseValue: 8000 },
  'Advance Fee Deposit Discount 4000': { type: 'FIXED', baseValue: 4000 },
  'Merit Scholarship Above 90% 11000': { type: 'FIXED', baseValue: 11000 },
  'Merit Scholarship-8000 In Adm. Fee': { type: 'FIXED', baseValue: 8000 },
  'Super 30 Discount 8000': { type: 'FIXED', baseValue: 8000 },
  'School Concession 6000 Adm Fee': { type: 'FIXED', baseValue: 6000 },
  'School Concession On Annual Charges 5000': { type: 'FIXED', baseValue: 5000 },
  'Majra Branch Concession 4000 In Adm Fee': { type: 'FIXED', baseValue: 4000 },
  'School Concession 500': { type: 'FIXED', baseValue: 500 },
  'Janab Abdul Rehman Scholarship 500 Pm': { type: 'FIXED', baseValue: 500 },
  'Sh. Nanak Chand Khurana Memorial Scholarship 500 Pm': { type: 'FIXED', baseValue: 500 },
  'X Class Board Exam Scholarship 500 Pm': { type: 'FIXED', baseValue: 500 },
  'X Class Board Exam Scholarship 1000 Pm': { type: 'FIXED', baseValue: 1000 },
  'Orientation 1000': { type: 'FIXED', baseValue: 1000 },
  'Woner Skill Collected Refund 1000': { type: 'FIXED', baseValue: 1000 },
  'Term Charges Advance Paid 1900': { type: 'FIXED', baseValue: 1900 },
  '2625 Sibling': { type: 'FIXED', baseValue: 2625 },
  'Tuition Fee 2500': { type: 'FIXED', baseValue: 2500 },
  'Term Charges 4600': { type: 'FIXED', baseValue: 4600 },
  'Annual Charges 5000': { type: 'FIXED', baseValue: 5000 },
  'Security 5000': { type: 'FIXED', baseValue: 5000 },
  '5000 Security Discount': { type: 'FIXED', baseValue: 5000 },
  'Tuition Fee 5000': { type: 'FIXED', baseValue: 5000 },
  'Tuition Fee 500': { type: 'FIXED', baseValue: 500 },
  '300 Term Charges Diff': { type: 'FIXED', baseValue: 300 },
  '1500 School Concession': { type: 'FIXED', baseValue: 1500 },
  'Admission Fee 12000': { type: 'FIXED', baseValue: 12000 },
  'School Concession': { type: 'FIXED', baseValue: 0 }, // Will be determined dynamically
  'Sports Scholarship': { type: 'FIXED', baseValue: 0 }, // Will be determined dynamically
  'Bus Fee Adjustment': { type: 'FIXED', baseValue: 0 }, // Will be determined dynamically
};

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

interface ConcessionTypeWithTerms {
  name: string;
  feeHead: string;
  concessionCategory: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  description: string;
  appliedFeeTerms: string[];
  feeTermAmounts: Record<string, number>;
}

function generateConcessionTypeTemplates(csvData: CSVConcessionData[]): ConcessionTypeWithTerms[] {
  const concessionGroups = new Map<string, {
    feeHead: string;
    concessionCategory: string;
    type: 'PERCENTAGE' | 'FIXED';
    baseValue: number;
    termAmounts: Map<string, number>;
  }>();

  // Group by concession category + fee head
  csvData.forEach(row => {
    if (row.feeHead === 'Fee Head') return; // Skip any remaining header rows

    const key = `${row.concessionCategory}|${row.feeHead}`;
    
    if (!concessionGroups.has(key)) {
      const categoryMapping = CONCESSION_TYPE_MAPPING[row.concessionCategory];
      
      let type: 'PERCENTAGE' | 'FIXED' = 'FIXED';
      let baseValue = row.concession;

      if (categoryMapping) {
        type = categoryMapping.type;
        if (type === 'PERCENTAGE') {
          baseValue = categoryMapping.baseValue || 0;
        } else {
          // For FIXED types, use the base value if available
          baseValue = categoryMapping.baseValue || row.concession;
        }
      }

      concessionGroups.set(key, {
        feeHead: row.feeHead,
        concessionCategory: row.concessionCategory,
        type,
        baseValue,
        termAmounts: new Map(),
      });
    }

    const group = concessionGroups.get(key)!;
    
    // For percentage concessions, use the base percentage for all terms
    if (group.type === 'PERCENTAGE') {
      group.termAmounts.set(row.term, group.baseValue);
    } else {
      // For fixed concessions, use the actual concession amount from CSV
      // This handles cases where amount doubles for double-month terms
      group.termAmounts.set(row.term, row.concession);
    }
  });

  // Convert to final format
  const templates: ConcessionTypeWithTerms[] = [];
  
  concessionGroups.forEach((group, key) => {
    const appliedFeeTerms = Array.from(group.termAmounts.keys());
    const feeTermAmounts: Record<string, number> = {};
    
    group.termAmounts.forEach((amount, term) => {
      feeTermAmounts[term] = amount;
    });

    // Generate template name: "Concession Category/Fee Head [Type-Value]"
    const templateName = `${group.concessionCategory}/${group.feeHead} [${group.type === 'PERCENTAGE' ? group.baseValue + '%' : '₹' + group.baseValue}]`;

    templates.push({
      name: templateName,
      feeHead: group.feeHead,
      concessionCategory: group.concessionCategory,
      type: group.type,
      value: group.baseValue,
      description: `${group.concessionCategory} applied to ${group.feeHead} across multiple terms`,
      appliedFeeTerms,
      feeTermAmounts,
    });
  });

  return templates;
}

async function getDefaultBranchAndSession() {
  try {
    // Get the first active branch
    const branch = await prisma.branch.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!branch) {
      throw new Error('No branch found in the database');
    }

    // Get the active academic session
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

async function getFeeHeadMapping() {
  const feeHeads = await prisma.feeHead.findMany();
  const mapping: Record<string, string> = {};
  
  feeHeads.forEach(fh => {
    mapping[fh.name] = fh.id;
  });

  return mapping;
}

async function getFeeTermMapping() {
  const feeTerms = await prisma.feeTerm.findMany();
  const mapping: Record<string, string> = {};
  
  feeTerms.forEach(ft => {
    mapping[ft.name] = ft.id;
  });

  return mapping;
}

async function deleteAllConcessionTypes() {
  console.log('🗑️  Deleting all existing concession types...');
  
  try {
    // First delete all student concessions that reference concession types
    const deletedStudentConcessions = await prisma.studentConcession.deleteMany({});
    console.log(`   Deleted ${deletedStudentConcessions.count} student concessions`);

    // Delete concession history
    const deletedHistory = await prisma.concessionHistory.deleteMany({});
    console.log(`   Deleted ${deletedHistory.count} concession history records`);

    // Then delete all concession types
    const deletedConcessionTypes = await prisma.concessionType.deleteMany({});
    console.log(`   Deleted ${deletedConcessionTypes.count} concession types`);

    console.log('✅ Successfully deleted all existing concession data');
  } catch (error) {
    console.error('❌ Error deleting concession types:', error);
    throw error;
  }
}

async function createConcessionTypes(templates: ConcessionTypeWithTerms[], branchId: string, sessionId: string) {
  console.log(`\n📝 Creating ${templates.length} new concession types...`);
  
  const feeHeadMapping = await getFeeHeadMapping();
  const feeTermMapping = await getFeeTermMapping();
  
  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    try {
      const feeHeadId = feeHeadMapping[template.feeHead];

      if (!feeHeadId) {
        console.log(`   ⚠️  Skipping - Fee Head not found: ${template.feeHead}`);
        skipped++;
        continue;
      }

      // Map term names to term IDs
      const appliedFeeTermIds: string[] = [];
      const feeTermAmounts: Record<string, number> = {};
      let hasInvalidTerms = false;

      for (const termName of template.appliedFeeTerms) {
        const termId = feeTermMapping[termName];
        if (!termId) {
          console.log(`   ⚠️  Fee Term not found: ${termName} for ${template.name}`);
          hasInvalidTerms = true;
          break;
        }
        appliedFeeTermIds.push(termId);
        feeTermAmounts[termId] = template.feeTermAmounts[termName] || 0;
      }

      if (hasInvalidTerms) {
        skipped++;
        continue;
      }

      // Check if this concession type already exists
      const existing = await prisma.concessionType.findFirst({
        where: {
          name: template.name,
          branchId,
          sessionId,
        },
      });

      if (existing) {
        console.log(`   ⏭️  Already exists: ${template.name}`);
        skipped++;
        continue;
      }

      // Create the concession type
      await prisma.concessionType.create({
        data: {
          name: template.name,
          description: template.description,
          type: template.type,
          value: template.value,
          isActive: true,
          applicableStudentTypes: ['BOTH'],
          autoApproval: false,
          appliedFeeHeads: [feeHeadId],
          appliedFeeTerms: appliedFeeTermIds,
          feeTermAmounts: feeTermAmounts,
          branchId,
          sessionId,
        },
      });

      created++;
      console.log(`   ✅ Created: ${template.name}`);
      console.log(`      Terms: ${template.appliedFeeTerms.join(', ')}`);
      console.log(`      Amounts: ${Object.entries(template.feeTermAmounts).map(([term, amount]) => `${term}=₹${amount}`).join(', ')}`);
    } catch (error) {
      console.error(`   ❌ Error creating ${template.name}:`, error);
      skipped++;
    }
  }

  console.log(`\n📊 Creation Summary:`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📋 Total Templates: ${templates.length}`);
}

async function main() {
  try {
    const dryRun = process.argv.includes('--dry-run');
    
    console.log('🚀 Starting Concession Types Rebuild Process...');
    console.log(`   Mode: ${dryRun ? '🔍 DRY RUN' : '💥 LIVE MODE'}`);
    
    // Step 1: Delete all existing concession types (skip in dry run)
    if (!dryRun) {
      await deleteAllConcessionTypes();
    } else {
      console.log('\n🔍 DRY RUN: Skipping deletion of existing concession types');
    }

    // Step 2: Parse CSV data
    console.log('\n📖 Reading CSV data...');
    const csvPath = path.join(process.cwd(), 'AI', 'concession_4-8-2025.csv');
    const csvData = parseCSV(csvPath);
    console.log(`   📋 Found ${csvData.length} rows in CSV`);

    // Step 3: Generate templates
    console.log('\n🏗️  Generating concession type templates...');
    const templates = generateConcessionTypeTemplates(csvData);
    console.log(`   📝 Generated ${templates.length} unique templates`);

    // Step 4: Get default branch and session
    console.log('\n🔍 Getting default branch and session...');
    const { branch, academicSession } = await getDefaultBranchAndSession();
    console.log(`   🏢 Branch: ${branch.name}`);
    console.log(`   📅 Session: ${academicSession.name}`);

    // Step 5: Create concession types (skip in dry run)
    if (!dryRun) {
      await createConcessionTypes(templates, branch.id, academicSession.id);
    } else {
      console.log('\n🔍 DRY RUN: Skipping actual creation of concession types');
    }

    console.log('\n🎉 Concession Types Rebuild Complete!');
    
    // Step 6: Show sample templates for verification
    console.log('\n📋 Sample Templates Created:');
    templates.slice(0, 10).forEach((template, index) => {
      console.log(`   ${index + 1}. ${template.name}`);
      console.log(`      Type: ${template.type}, Value: ${template.value}`);
      console.log(`      Fee Head: ${template.feeHead}`);
      console.log(`      Terms: ${template.appliedFeeTerms.join(', ')}`);
      console.log(`      Term Amounts: ${Object.entries(template.feeTermAmounts).map(([term, amount]) => `${term}=₹${amount}`).join(', ')}`);
      console.log('');
    });

  } catch (error) {
    console.error('💥 Process failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();