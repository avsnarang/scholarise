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
    console.log('🔧 FIXING PERCENTAGE CONCESSIONS\n');

    // Step 1: Read CSV and create aggregated mapping
    console.log('📖 Creating CSV-to-Database mapping...');
    const csvPath = path.join(process.cwd(), 'AI', 'concession_4-8-2025.csv');
    const csvData = parseCSV(csvPath);
    
    const validCsvData = csvData.filter(row => 
      row.feeHead !== 'Fee Head' && 
      row.concession > 0
    );

    // Create mapping of student+concession to actual amounts from CSV
    const csvAmountMapping = new Map<string, number>();
    
    validCsvData.forEach(row => {
      const key = `${row.admissionNumber}|${row.concessionCategory}|${row.feeHead}`;
      if (!csvAmountMapping.has(key)) {
        csvAmountMapping.set(key, 0);
      }
      csvAmountMapping.set(key, csvAmountMapping.get(key)! + row.concession);
    });

    console.log(`   📊 Created mapping for ${csvAmountMapping.size} unique concession combinations`);

    // Step 2: Get all student concessions from database
    console.log('\n🗄️  Loading student concessions from database...');
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
            feeTermAmounts: true,
          }
        }
      }
    });

    console.log(`   📊 Found ${studentConcessions.length} student concessions in database`);

    // Step 3: Update concessions with correct amounts
    let updatedCount = 0;
    let correctTotal = 0;
    
    console.log('\n🔧 Updating student concessions with correct amounts...');
    
    for (const sc of studentConcessions) {
      // Parse concession type name to match CSV format
      const parts = sc.concessionType.name.split('/');
      if (parts.length >= 2) {
        const category = parts[0];
        const feeHead = parts[1]?.split(' [')[0]; // Remove the [value] part
        const key = `${sc.student.admissionNumber}|${category}|${feeHead}`;
        
        const csvAmount = csvAmountMapping.get(key);
        if (csvAmount && csvAmount !== sc.customValue) {
          // Update the student concession with the correct amount
          await prisma.studentConcession.update({
            where: { id: sc.id },
            data: { customValue: csvAmount }
          });
          
          console.log(`   ✅ Updated ${sc.student.firstName} ${sc.student.lastName} - ${category}/${feeHead}: ${formatIndianNumber(csvAmount)}`);
          updatedCount++;
        }
        
        // Add to correct total
        correctTotal += csvAmount || 0;
      }
    }

    console.log(`\n📊 UPDATE SUMMARY:`);
    console.log(`   ✅ Updated ${updatedCount} student concessions`);
    console.log(`   💰 Correct total should be: ${formatIndianNumber(correctTotal)}`);

    // Step 4: Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const updatedConcessions = await prisma.studentConcession.findMany({
      include: {
        concessionType: {
          select: { type: true, value: true, feeTermAmounts: true }
        }
      }
    });

    let verifiedTotal = 0;
    updatedConcessions.forEach(sc => {
      if (sc.customValue) {
        verifiedTotal += sc.customValue;
      } else if (sc.concessionType.type === 'FIXED') {
        const feeTermAmounts = sc.concessionType.feeTermAmounts as Record<string, number> || {};
        verifiedTotal += Object.values(feeTermAmounts).reduce((sum, amount) => sum + amount, 0);
      } else {
        // This should now be rare since we updated percentage concessions
        verifiedTotal += sc.concessionType.value;
      }
    });

    console.log(`   💰 Database total after fix: ${formatIndianNumber(verifiedTotal)}`);
    
    const csvTotal = validCsvData.reduce((sum, row) => sum + row.concession, 0);
    console.log(`   💰 CSV total: ${formatIndianNumber(csvTotal)}`);
    console.log(`   📊 Difference: ${formatIndianNumber(Math.abs(verifiedTotal - csvTotal))}`);
    
    if (Math.abs(verifiedTotal - csvTotal) < 1000) {
      console.log('   ✅ TOTALS NOW MATCH! (within rounding tolerance)');
    } else {
      console.log('   ⚠️  Still some discrepancy remaining');
    }

  } catch (error) {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();