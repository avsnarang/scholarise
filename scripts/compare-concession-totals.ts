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

function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

async function getDBConcessionTotal() {
  try {
    // Get all student concessions with their concession types
    const studentConcessions = await prisma.studentConcession.findMany({
      include: {
        concessionType: {
          select: {
            name: true,
            type: true,
            value: true,
            appliedFeeTerms: true,
            feeTermAmounts: true,
          }
        }
      }
    });

    console.log(`📊 Found ${studentConcessions.length} student concessions in database`);

    let totalDBAmount = 0;
    const concessionBreakdown: Record<string, { count: number; amount: number }> = {};

    for (const sc of studentConcessions) {
      const concessionType = sc.concessionType;
      let concessionAmount = 0;

      if (concessionType.type === 'PERCENTAGE') {
        // For percentage concessions, we can't calculate exact amount without fee structure
        // We'll use the base value for now (this might not be accurate)
        concessionAmount = sc.customValue || concessionType.value;
      } else {
        // For fixed concessions, use custom value or calculate from feeTermAmounts
        if (sc.customValue) {
          concessionAmount = sc.customValue;
        } else {
          // Sum up amounts from feeTermAmounts
          const feeTermAmounts = concessionType.feeTermAmounts as Record<string, number> || {};
          concessionAmount = Object.values(feeTermAmounts).reduce((sum, amount) => sum + amount, 0);
        }
      }

      totalDBAmount += concessionAmount;

      // Track breakdown by concession type
      const typeName = concessionType.name;
      if (!concessionBreakdown[typeName]) {
        concessionBreakdown[typeName] = { count: 0, amount: 0 };
      }
      concessionBreakdown[typeName].count++;
      concessionBreakdown[typeName].amount += concessionAmount;
    }

    return { totalDBAmount, concessionBreakdown, studentConcessions };
  } catch (error) {
    console.error('Error calculating DB total:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🔍 Comparing Concession Totals: CSV vs Database\n');

    // Step 1: Calculate CSV total
    console.log('📖 Reading CSV data...');
    const csvPath = path.join(process.cwd(), 'AI', 'concession_4-8-2025.csv');
    const csvData = parseCSV(csvPath);
    
    // Filter out header rows and zero concessions
    const validCsvData = csvData.filter(row => 
      row.feeHead !== 'Fee Head' && 
      row.concession > 0
    );

    const csvTotal = validCsvData.reduce((sum, row) => sum + row.concession, 0);
    
    console.log(`   📋 Total CSV rows: ${csvData.length}`);
    console.log(`   ✅ Valid concession entries: ${validCsvData.length}`);
    console.log(`   💰 CSV Total Concession Amount: ${formatIndianNumber(csvTotal)}`);

    // Step 2: Calculate Database total
    console.log('\n🗄️  Calculating database totals...');
    const { totalDBAmount, concessionBreakdown, studentConcessions } = await getDBConcessionTotal();
    
    console.log(`   💰 Database Total Concession Amount: ${formatIndianNumber(totalDBAmount)}`);

    // Step 3: Compare totals
    console.log('\n📊 COMPARISON RESULTS:');
    console.log('═'.repeat(50));
    console.log(`CSV Total:      ${formatIndianNumber(csvTotal)}`);
    console.log(`Database Total: ${formatIndianNumber(totalDBAmount)}`);
    console.log(`Difference:     ${formatIndianNumber(Math.abs(csvTotal - totalDBAmount))}`);
    
    if (csvTotal === totalDBAmount) {
      console.log('✅ TOTALS MATCH PERFECTLY!');
    } else {
      console.log(`❌ DISCREPANCY FOUND: ${csvTotal > totalDBAmount ? 'CSV is higher' : 'Database is higher'}`);
      console.log(`   Percentage difference: ${((Math.abs(csvTotal - totalDBAmount) / csvTotal) * 100).toFixed(2)}%`);
    }

    // Step 4: Show breakdown of largest concession types
    console.log('\n🔍 TOP 10 CONCESSION TYPES BY AMOUNT:');
    console.log('─'.repeat(80));
    const sortedBreakdown = Object.entries(concessionBreakdown)
      .sort(([,a], [,b]) => b.amount - a.amount)
      .slice(0, 10);

    sortedBreakdown.forEach(([typeName, data], index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${typeName}`);
      console.log(`    Count: ${data.count.toString().padStart(4)} | Amount: ${formatIndianNumber(data.amount)}`);
    });

    // Step 5: CSV breakdown by concession category
    console.log('\n📋 CSV BREAKDOWN BY CONCESSION CATEGORY:');
    console.log('─'.repeat(80));
    const csvCategoryBreakdown: Record<string, { count: number; amount: number }> = {};
    
    validCsvData.forEach(row => {
      if (!csvCategoryBreakdown[row.concessionCategory]) {
        csvCategoryBreakdown[row.concessionCategory] = { count: 0, amount: 0 };
      }
      csvCategoryBreakdown[row.concessionCategory]!.count++;
      csvCategoryBreakdown[row.concessionCategory]!.amount += row.concession;
    });

    const sortedCsvBreakdown = Object.entries(csvCategoryBreakdown)
      .sort(([,a], [,b]) => b.amount - a.amount);

    sortedCsvBreakdown.forEach(([category, data], index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${category}`);
      console.log(`    Count: ${data.count.toString().padStart(4)} | Amount: ${formatIndianNumber(data.amount)}`);
    });

    // Step 6: Check for potential issues
    console.log('\n🔍 POTENTIAL ISSUES:');
    console.log('─'.repeat(50));

    // Check for percentage concessions in DB
    const percentageConcessions = studentConcessions.filter(sc => sc.concessionType.type === 'PERCENTAGE');
    if (percentageConcessions.length > 0) {
      console.log(`⚠️  Found ${percentageConcessions.length} percentage concessions in DB`);
      console.log(`   These might not have accurate amounts calculated without fee structure`);
    }

    // Check for missing custom values
    const missingCustomValues = studentConcessions.filter(sc => 
      !sc.customValue && sc.concessionType.type === 'FIXED'
    );
    if (missingCustomValues.length > 0) {
      console.log(`⚠️  Found ${missingCustomValues.length} fixed concessions without custom values`);
      console.log(`   These are using calculated amounts from feeTermAmounts`);
    }

  } catch (error) {
    console.error('💥 Comparison failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the comparison
main();