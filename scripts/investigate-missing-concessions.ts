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

async function investigateMissingConcessions() {
  console.log('🔍 Investigating Missing Concessions for 2 Students...\n');

  try {
    const missingAdmissions = ['10003487', '10003488'];
    const csvData = parseCSV('AI/concession_4-8-2025.csv');

    for (const admissionNumber of missingAdmissions) {
      console.log('='.repeat(60));
      console.log(`🎓 Student: ${admissionNumber}`);
      console.log('='.repeat(60));

      // Get CSV records for this student
      const csvRecords = csvData.filter(row => row.admissionNumber === admissionNumber);
      console.log(`📁 CSV Records: ${csvRecords.length}`);

      if (csvRecords.length > 0) {
        console.log('\n📋 CSV Data:');
        csvRecords.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.studentName}`);
          console.log(`     Fee Head: ${record.feeHead}`);
          console.log(`     Term: ${record.term}`);
          console.log(`     Category: ${record.concessionCategory}`);
          console.log(`     Concession: ₹${record.concession.toLocaleString('en-IN')}`);
          console.log('');
        });
      }

      // Get student from database
      const student = await prisma.student.findUnique({
        where: { admissionNumber },
        include: {
          section: {
            include: {
              class: true
            }
          },
          branch: true,
          studentConcessions: {
            include: {
              concessionType: true
            }
          }
        }
      });

      if (student) {
        console.log(`👤 Database Student: ${student.firstName} ${student.lastName}`);
        console.log(`🏫 Class: ${student.section?.class?.name || 'No class'} - ${student.section?.name || 'No section'}`);
        console.log(`🏢 Branch: ${student.branch.name} (${student.branchId})`);
        console.log(`📅 Session: ${student.section?.class?.sessionId || 'No session'}`);
        console.log(`✅ Active: ${student.isActive}`);
        console.log(`🎯 Existing Concessions: ${student.studentConcessions.length}`);

        if (student.studentConcessions.length > 0) {
          student.studentConcessions.forEach((concession, index) => {
            console.log(`  ${index + 1}. ${concession.concessionType.name}: ₹${(concession.customValue || concession.concessionType.value).toLocaleString('en-IN')} (${concession.status})`);
          });
        }

        // Check if the required concession types exist
        console.log('\n🔍 Checking Required Concession Types:');
        const uniqueCategories = [...new Set(csvRecords.map(r => r.concessionCategory))];
        const uniqueFeeHeads = [...new Set(csvRecords.map(r => r.feeHead))];

        for (const category of uniqueCategories) {
          for (const feeHead of uniqueFeeHeads) {
            const typeName = `${category}/${feeHead}`;
            
            const concessionType = await prisma.concessionType.findFirst({
              where: {
                branchId: student.branchId,
                sessionId: student.section?.class?.sessionId || '',
                name: {
                  contains: category
                }
              }
            });

            if (concessionType) {
              console.log(`  ✅ Found type for "${category}": ${concessionType.name}`);
              
              // Check if student already has this concession type
              const existingConcession = await prisma.studentConcession.findFirst({
                where: {
                  studentId: student.id,
                  concessionTypeId: concessionType.id
                }
              });

              if (existingConcession) {
                console.log(`    ⚠️  Student already has this concession: ${existingConcession.status}`);
              } else {
                console.log(`    💡 Student doesn't have this concession - could be imported`);
              }
            } else {
              console.log(`  ❌ No type found for "${category}" + "${feeHead}"`);
            }
          }
        }

        // Check branch and session consistency
        const expectedBranchId = 'cmbdk8dd9000w7ip2rpxsd5rr'; // Paonta Sahib
        const expectedSessionId = 'cmbdk90xz000x7ip2ido648y3'; // 2025-26

        console.log('\n🔧 Import Requirements Check:');
        console.log(`  Branch Match: ${student.branchId === expectedBranchId ? '✅' : '❌'} (Expected: ${expectedBranchId}, Got: ${student.branchId})`);
        console.log(`  Session Match: ${student.section?.class?.sessionId === expectedSessionId ? '✅' : '❌'} (Expected: ${expectedSessionId}, Got: ${student.section?.class?.sessionId})`);

      } else {
        console.log('❌ Student not found in database');
      }

      console.log('\n');
    }

    console.log('='.repeat(60));
    console.log('🎯 POTENTIAL SOLUTIONS');
    console.log('='.repeat(60));
    console.log('1. Check if students are in the correct branch/session');
    console.log('2. Verify concession types exist for their categories');
    console.log('3. Run import script with debug logging for these specific students');
    console.log('4. Check if there were validation errors during import');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateMissingConcessions();