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
        totalFeeAssigned: parseFloat(columns[5]?.trim() || '0'),
        concession: parseFloat(columns[6]?.trim() || '0'),
        netFeeAssigned: parseFloat(columns[7]?.trim() || '0'),
      });
    }
  }

  return data;
}

async function checkMissingAdmissions() {
  console.log('🔍 Checking for Missing Admission Numbers...\n');

  try {
    // Parse CSV data
    const csvFilePath = 'AI/concession_4-8-2025.csv';
    const csvData = parseCSV(csvFilePath);
    
    console.log(`📁 CSV contains ${csvData.length} total records`);

    // Get unique admission numbers from CSV
    const csvAdmissionNumbers = [...new Set(csvData.map(row => row.admissionNumber))];
    console.log(`👥 Unique admission numbers in CSV: ${csvAdmissionNumbers.length}`);

    // Get all students from database
    const allStudents = await prisma.student.findMany({
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        isActive: true,
        section: {
          select: {
            name: true,
            class: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    console.log(`🏫 Total students in database: ${allStudents.length}`);

    // Create maps for quick lookup
    const dbAdmissionNumbers = new Set(allStudents.map(s => s.admissionNumber));
    const admissionToStudent = new Map(allStudents.map(s => [s.admissionNumber, s]));

    // Find missing admission numbers
    const missingAdmissions: Array<{
      admissionNumber: string;
      studentName: string;
      recordCount: number;
      totalConcessionAmount: number;
      concessionCategories: string[];
    }> = [];

    const foundAdmissions: Array<{
      admissionNumber: string;
      csvName: string;
      dbStudent: any;
      recordCount: number;
      totalConcessionAmount: number;
    }> = [];

    for (const admissionNumber of csvAdmissionNumbers) {
      const csvRecords = csvData.filter(row => row.admissionNumber === admissionNumber);
      const totalConcessionAmount = csvRecords.reduce((sum, record) => sum + record.concession, 0);
      const concessionCategories = [...new Set(csvRecords.map(r => r.concessionCategory))];
      
      if (dbAdmissionNumbers.has(admissionNumber)) {
        const dbStudent = admissionToStudent.get(admissionNumber);
        foundAdmissions.push({
          admissionNumber,
          csvName: csvRecords[0]?.studentName || 'Unknown',
          dbStudent,
          recordCount: csvRecords.length,
          totalConcessionAmount
        });
      } else {
        missingAdmissions.push({
          admissionNumber,
          studentName: csvRecords[0]?.studentName || 'Unknown',
          recordCount: csvRecords.length,
          totalConcessionAmount,
          concessionCategories
        });
      }
    }

    // Get students with concessions to see who was actually imported
    const studentsWithConcessions = await prisma.studentConcession.findMany({
      where: {
        status: 'APPROVED'
      },
      include: {
        student: {
          select: {
            admissionNumber: true,
            firstName: true,
            lastName: true
          }
        },
        concessionType: {
          select: {
            name: true,
            value: true
          }
        }
      }
    });

    const importedAdmissions = new Set(studentsWithConcessions.map(sc => sc.student.admissionNumber));

    console.log('\n' + '='.repeat(70));
    console.log('📊 MISSING ADMISSION NUMBERS ANALYSIS');
    console.log('='.repeat(70));

    if (missingAdmissions.length > 0) {
      console.log(`❌ Missing from Database: ${missingAdmissions.length} admission numbers\n`);
      
      // Sort by total concession amount (highest first)
      missingAdmissions.sort((a, b) => b.totalConcessionAmount - a.totalConcessionAmount);
      
      missingAdmissions.forEach((missing, index) => {
        console.log(`${index + 1}. ${missing.admissionNumber} - ${missing.studentName}`);
        console.log(`   Records: ${missing.recordCount}, Total: ₹${missing.totalConcessionAmount.toLocaleString('en-IN')}`);
        console.log(`   Categories: ${missing.concessionCategories.join(', ')}`);
        console.log('');
      });

      const totalMissingAmount = missingAdmissions.reduce((sum, m) => sum + m.totalConcessionAmount, 0);
      console.log(`💰 Total amount for missing students: ₹${totalMissingAmount.toLocaleString('en-IN')}\n`);
    } else {
      console.log('✅ All admission numbers from CSV found in database!\n');
    }

    console.log('='.repeat(70));
    console.log('📈 IMPORT SUCCESS ANALYSIS');
    console.log('='.repeat(70));

    const foundButNotImported = foundAdmissions.filter(f => !importedAdmissions.has(f.admissionNumber));
    
    console.log(`✅ Found in DB: ${foundAdmissions.length} admission numbers`);
    console.log(`✅ Actually imported concessions: ${importedAdmissions.size} students`);
    console.log(`⚠️  Found but not imported: ${foundButNotImported.length} students`);

    if (foundButNotImported.length > 0) {
      console.log('\n🔍 Students found in DB but no concessions imported:');
      foundButNotImported.slice(0, 10).forEach((student, index) => {
        const dbStudent = student.dbStudent;
        console.log(`${index + 1}. ${student.admissionNumber} - ${student.csvName}`);
        console.log(`   DB: ${dbStudent.firstName} ${dbStudent.lastName} (${dbStudent.isActive ? 'Active' : 'Inactive'})`);
        console.log(`   Class: ${dbStudent.section?.class?.name || 'No class'} - ${dbStudent.section?.name || 'No section'}`);
        console.log(`   Expected concession: ₹${student.totalConcessionAmount.toLocaleString('en-IN')}`);
        console.log('');
      });
      
      if (foundButNotImported.length > 10) {
        console.log(`   ... and ${foundButNotImported.length - 10} more`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📋 SUMMARY');
    console.log('='.repeat(70));
    console.log(`📁 CSV admission numbers: ${csvAdmissionNumbers.length}`);
    console.log(`❌ Missing from DB: ${missingAdmissions.length}`);
    console.log(`✅ Found in DB: ${foundAdmissions.length}`);
    console.log(`🎯 Successfully imported: ${importedAdmissions.size}`);
    console.log(`⚠️  Import gaps: ${foundAdmissions.length - importedAdmissions.size}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissingAdmissions();