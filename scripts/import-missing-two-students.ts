import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

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
        totalFeeAssigned: parseFloat(columns[5]?.trim() || '0'),
        concession: parseFloat(columns[6]?.trim() || '0'),
        netFeeAssigned: parseFloat(columns[7]?.trim() || '0'),
      });
    }
  }

  return data;
}

async function importMissingConcessions() {
  console.log('🎯 Importing Missing Concessions for 2 Students...\n');

  try {
    const missingAdmissions = ['10003487', '10003488'];
    const csvData = parseCSV('AI/concession_4-8-2025.csv');
    const branchId = 'cmbdk8dd9000w7ip2rpxsd5rr'; // Paonta Sahib
    const sessionId = 'cmbdk90xz000x7ip2ido648y3'; // 2025-26

    let successCount = 0;
    let errorCount = 0;

    for (const admissionNumber of missingAdmissions) {
      console.log('='.repeat(50));
      console.log(`🎓 Processing: ${admissionNumber}`);
      console.log('='.repeat(50));

      // Get student from database
      const student = await prisma.student.findUnique({
        where: { admissionNumber },
        include: {
          section: {
            include: {
              class: true
            }
          }
        }
      });

      if (!student) {
        console.log(`❌ Student ${admissionNumber} not found`);
        errorCount++;
        continue;
      }

      console.log(`👤 Found: ${student.firstName} ${student.lastName}`);

      // Get CSV records for this student
      const csvRecords = csvData.filter(row => row.admissionNumber === admissionNumber);
      console.log(`📁 CSV Records: ${csvRecords.length}`);

      // Group by concession category + fee head to aggregate amounts
      const concessionGroups = new Map<string, {
        category: string;
        feeHead: string;
        totalAmount: number;
        records: CSVConcessionData[];
      }>();

      csvRecords.forEach(record => {
        const key = `${record.concessionCategory}|${record.feeHead}`;
        if (!concessionGroups.has(key)) {
          concessionGroups.set(key, {
            category: record.concessionCategory,
            feeHead: record.feeHead,
            totalAmount: 0,
            records: []
          });
        }
        const group = concessionGroups.get(key)!;
        group.totalAmount += record.concession;
        group.records.push(record);
      });

      console.log(`🔄 Processing ${concessionGroups.size} concession groups...`);

      for (const [key, group] of concessionGroups) {
        console.log(`\n💰 ${group.category} on ${group.feeHead}: ₹${group.totalAmount.toLocaleString('en-IN')}`);

        // Find matching concession type
        const concessionType = await prisma.concessionType.findFirst({
          where: {
            branchId,
            sessionId,
            name: {
              contains: group.category
            }
          }
        });

        if (!concessionType) {
          console.log(`  ❌ No concession type found for "${group.category}"`);
          errorCount++;
          continue;
        }

        console.log(`  ✅ Found type: ${concessionType.name}`);

        // Check if student already has this concession
        const existingConcession = await prisma.studentConcession.findFirst({
          where: {
            studentId: student.id,
            concessionTypeId: concessionType.id
          }
        });

        if (existingConcession) {
          console.log(`  ⚠️  Student already has this concession (${existingConcession.status})`);
          continue;
        }

        try {
          // Create the student concession
          const createdConcession = await prisma.studentConcession.create({
            data: {
              studentId: student.id,
              concessionTypeId: concessionType.id,
              customValue: group.totalAmount,
              reason: 'Imported from CSV - Missing student',
              status: 'APPROVED',
              validFrom: new Date('2025-04-01'),
              branchId,
              sessionId,
              approvedBy: 'system',
              approvedAt: new Date(),
            }
          });

          // Create history record
          await prisma.concessionHistory.create({
            data: {
              studentConcessionId: createdConcession.id,
              action: 'CREATED',
              newValue: group.totalAmount,
              reason: 'Imported from CSV - Missing student',
              performedBy: 'system',
            }
          });

          console.log(`  ✅ Created concession: ₹${group.totalAmount.toLocaleString('en-IN')}`);
          successCount++;

        } catch (error) {
          console.log(`  ❌ Error creating concession: ${error}`);
          errorCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${successCount} concessions`);
    console.log(`❌ Errors: ${errorCount}`);

    if (successCount > 0) {
      console.log('\n🎉 Missing concessions have been imported!');
      console.log('📈 Updated totals:');
      
      // Get updated count
      const totalConcessions = await prisma.studentConcession.count({
        where: {
          status: 'APPROVED',
          branchId,
          sessionId
        }
      });

      console.log(`   Total approved concessions: ${totalConcessions}`);
      console.log(`   Should now be: 594 students with concessions`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importMissingConcessions();