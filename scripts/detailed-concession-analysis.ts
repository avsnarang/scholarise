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

async function main() {
  try {
    console.log('🔍 DETAILED CONCESSION ANALYSIS\n');

    // Step 1: Parse CSV and understand its structure
    console.log('📖 Reading CSV data...');
    const csvPath = path.join(process.cwd(), 'AI', 'concession_4-8-2025.csv');
    const csvData = parseCSV(csvPath);
    
    const validCsvData = csvData.filter(row => 
      row.feeHead !== 'Fee Head' && 
      row.concession > 0
    );

    console.log(`   📋 Total CSV entries: ${validCsvData.length}`);
    console.log(`   💰 CSV Raw Total: ${formatIndianNumber(validCsvData.reduce((sum, row) => sum + row.concession, 0))}`);

    // Step 2: Analyze unique student-concession combinations in CSV
    console.log('\n📊 Analyzing CSV aggregation (how our import script groups data)...');
    const csvAggregated = new Map<string, {
      studentName: string;
      concessionCategory: string;
      feeHead: string;
      totalAmount: number;
      entries: CSVConcessionData[];
    }>();

    validCsvData.forEach(row => {
      const key = `${row.admissionNumber}|${row.concessionCategory}|${row.feeHead}`;
      
      if (!csvAggregated.has(key)) {
        csvAggregated.set(key, {
          studentName: row.studentName,
          concessionCategory: row.concessionCategory,
          feeHead: row.feeHead,
          totalAmount: 0,
          entries: []
        });
      }
      
      const group = csvAggregated.get(key)!;
      group.totalAmount += row.concession;
      group.entries.push(row);
    });

    console.log(`   🔢 CSV Raw Entries: ${validCsvData.length}`);
    console.log(`   📦 Unique Student-Concession Combinations: ${csvAggregated.size}`);
    
    const aggregatedTotal = Array.from(csvAggregated.values()).reduce((sum, group) => sum + group.totalAmount, 0);
    console.log(`   💰 Aggregated Total (should match raw): ${formatIndianNumber(aggregatedTotal)}`);

    // Step 3: Get actual database data with proper calculations
    console.log('\n🗄️  Analyzing database data...');
    const studentConcessions = await prisma.studentConcession.findMany({
      include: {
        student: {
          select: { admissionNumber: true, firstName: true, lastName: true }
        },
        concessionType: {
          select: {
            name: true,
            type: true,
            value: true,
            appliedFeeHeads: true,
            appliedFeeTerms: true,
            feeTermAmounts: true,
          }
        }
      }
    });

    console.log(`   📊 Student Concessions in DB: ${studentConcessions.length}`);

    // Step 4: Calculate database total with proper logic
    let dbCalculatedTotal = 0;
    const dbBreakdown: Array<{
      admissionNumber: string;
      studentName: string;
      concessionTypeName: string;
      type: string;
      calculatedAmount: number;
      customValue?: number;
    }> = [];

    for (const sc of studentConcessions) {
      let calculatedAmount = 0;
      
      if (sc.customValue) {
        // If there's a custom value, use it
        calculatedAmount = sc.customValue;
      } else if (sc.concessionType.type === 'FIXED') {
        // For fixed concessions, sum up from feeTermAmounts
        const feeTermAmounts = sc.concessionType.feeTermAmounts as Record<string, number> || {};
        calculatedAmount = Object.values(feeTermAmounts).reduce((sum, amount) => sum + amount, 0);
      } else {
        // For percentage concessions, we need actual fee data to calculate
        // For now, we'll use the base value (this is likely incorrect)
        calculatedAmount = sc.concessionType.value;
      }

      dbCalculatedTotal += calculatedAmount;
      
      dbBreakdown.push({
        admissionNumber: sc.student.admissionNumber,
        studentName: `${sc.student.firstName} ${sc.student.lastName}`.trim(),
        concessionTypeName: sc.concessionType.name,
        type: sc.concessionType.type,
        calculatedAmount,
        customValue: sc.customValue || undefined
      });
    }

    console.log(`   💰 DB Calculated Total: ${formatIndianNumber(dbCalculatedTotal)}`);

    // Step 5: Find missing concessions
    console.log('\n🔍 Finding missing concessions...');
    const csvStudentConcessions = new Set<string>();
    const dbStudentConcessions = new Set<string>();

    // Build CSV set
    csvAggregated.forEach((group, key) => {
      csvStudentConcessions.add(key);
    });

    // Build DB set
    studentConcessions.forEach(sc => {
      // Try to match with CSV format
      const parts = sc.concessionType.name.split('/');
      if (parts.length >= 2) {
        const category = parts[0];
        const feeHead = parts[1]?.split(' [')[0]; // Remove the [value] part
        const key = `${sc.student.admissionNumber}|${category}|${feeHead}`;
        dbStudentConcessions.add(key);
      }
    });

    const missingInDB = Array.from(csvStudentConcessions).filter(key => !dbStudentConcessions.has(key));
    const extraInDB = Array.from(dbStudentConcessions).filter(key => !csvStudentConcessions.has(key));

    console.log(`   ❌ Missing in DB: ${missingInDB.length} concessions`);
    console.log(`   ➕ Extra in DB: ${extraInDB.length} concessions`);

    if (missingInDB.length > 0) {
      console.log('\n🔍 Sample missing concessions:');
      missingInDB.slice(0, 10).forEach((key, index) => {
        const group = csvAggregated.get(key);
        if (group) {
          console.log(`   ${index + 1}. ${key} - ${group.studentName} - ${formatIndianNumber(group.totalAmount)}`);
        }
      });
    }

    // Step 6: Identify percentage vs fixed discrepancy
    console.log('\n📊 PERCENTAGE CONCESSIONS ANALYSIS:');
    const percentageConcessions = dbBreakdown.filter(item => item.type === 'PERCENTAGE');
    const percentageTotal = percentageConcessions.reduce((sum, item) => sum + item.calculatedAmount, 0);
    
    console.log(`   📊 Percentage concessions count: ${percentageConcessions.length}`);
    console.log(`   💰 Percentage concessions total (likely incorrect): ${formatIndianNumber(percentageTotal)}`);
    
    // Find corresponding CSV entries for percentage concessions
    let csvPercentageTotal = 0;
    percentageConcessions.forEach(pc => {
      // Try to find matching CSV entries
      const matchingCsvEntries = validCsvData.filter(csv => 
        csv.admissionNumber === pc.admissionNumber &&
        csv.concessionCategory.includes('15%') || csv.concessionCategory.includes('20%') || 
        csv.concessionCategory.includes('25%') || csv.concessionCategory.includes('30%') ||
        csv.concessionCategory.includes('40%') || csv.concessionCategory.includes('50%') ||
        csv.concessionCategory.includes('100%')
      );
      
      const csvTotal = matchingCsvEntries.reduce((sum, entry) => sum + entry.concession, 0);
      csvPercentageTotal += csvTotal;
    });

    console.log(`   💰 Corresponding CSV percentage total: ${formatIndianNumber(csvPercentageTotal)}`);
    console.log(`   📉 Percentage calculation gap: ${formatIndianNumber(csvPercentageTotal - percentageTotal)}`);

    // Step 7: Summary
    console.log('\n📋 SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`CSV Total (raw):           ${formatIndianNumber(aggregatedTotal)}`);
    console.log(`DB Total (calculated):     ${formatIndianNumber(dbCalculatedTotal)}`);
    console.log(`Difference:                ${formatIndianNumber(Math.abs(aggregatedTotal - dbCalculatedTotal))}`);
    console.log(`Missing concessions:       ${missingInDB.length}`);
    console.log(`Percentage calc issue:     ${formatIndianNumber(csvPercentageTotal - percentageTotal)}`);

    const remainingGap = Math.abs(aggregatedTotal - dbCalculatedTotal) - (csvPercentageTotal - percentageTotal);
    console.log(`Remaining unexplained:     ${formatIndianNumber(remainingGap)}`);

  } catch (error) {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();