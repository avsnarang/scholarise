/**
 * Admission Data Import & Analysis Script
 * 
 * This script analyzes CSV admission data and creates admission inquiry records.
 * It provides detailed matching analysis and safely imports the data.
 * 
 * WHAT IT DOES:
 * 1. Reads CSV file and extracts admission numbers
 * 2. Checks which admission numbers exist in student database
 * 3. Provides detailed matching report with statistics
 * 4. Creates admission inquiry records for all CSV data
 * 5. Links inquiries to existing students where admission numbers match
 * 6. NO FINANCE MODULE CHANGES - only creates inquiries
 * 
 * PREREQUISITES:
 * 1. Place admissionsData.csv in AI/ directory
 * 2. Update BRANCH_ID and SESSION_ID below
 * 
 * USAGE:
 * npx tsx src/scripts/import-admissions-data.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Configuration - UPDATE THESE VALUES USING: npx tsx src/scripts/get-config-ids.ts
const CSV_FILE_PATH = path.join(process.cwd(), 'AI/admissionsData.csv');
const BRANCH_ID = 'cmbdk8dd9000w7ip2rpxsd5rr'; // Paonta Sahib Branch (PS)
const SESSION_ID = 'cmbdk90xz000x7ip2ido648y3'; // Update with current session ID (2025-26)






// Main import function
async function importAdmissionsData() {
  try {
    console.log(`🚀 Starting admission data import & analysis...`);
    console.log(`📁 CSV File: ${CSV_FILE_PATH}`);
    console.log(`🏢 Branch ID: ${BRANCH_ID}`);
    console.log(`📅 Session ID: ${SESSION_ID}`);
    
    // Check if CSV file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found: ${CSV_FILE_PATH}`);
    }

    // Validate configuration
    const branch = await prisma.branch.findUnique({
      where: { id: BRANCH_ID },
      select: { name: true, code: true }
    });
    
    const session = await prisma.academicSession.findUnique({
      where: { id: SESSION_ID },
      select: { name: true, isActive: true }
    });
    
    if (!branch || !session) {
      throw new Error('Invalid BRANCH_ID or SESSION_ID. Use: npx tsx src/scripts/get-config-ids.ts');
    }
    
    console.log(`\n✅ Configuration validated:`);
    console.log(`   Branch: ${branch.name} (${branch.code})`);
    console.log(`   Session: ${session.name} (${session.isActive ? 'Active' : 'Inactive'})`);

    // Read and parse CSV
    console.log('\n📊 Reading CSV file...');
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    
    // Simple CSV parser
    const lines = csvContent.split('\n');
    const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) || [];
    
    const records: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      
      // Parse CSV line considering quoted values
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim()); // Add the last value
      
      if (values.length >= headers.length) {
        const record: Record<string, string> = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        records.push(record);
      }
    }

    console.log(`📋 Found ${records.length} records in CSV`);

    // Process records and extract admission numbers
    const csvDataWithAdmission: { admissionNumber: string; name: string; parentPhone: string }[] = [];
    const csvDataWithoutAdmission: { name: string; parentPhone: string }[] = [];

    for (const record of records) {
      const firstName = record['Student Name']?.trim() || '';
      const lastName = record['Last Name']?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const parentPhone = record['Father Mobile']?.trim() || record['Mother Mobile']?.trim() || '';
      const admissionNumber = record['Admission Number']?.trim() || '';

      if (admissionNumber) {
        csvDataWithAdmission.push({
          admissionNumber,
          name: fullName,
          parentPhone
        });
      } else {
        csvDataWithoutAdmission.push({
          name: fullName,
          parentPhone
        });
      }
    }

    console.log(`\n📈 CSV Analysis:`);
    console.log(`   Records with admission numbers: ${csvDataWithAdmission.length}`);
    console.log(`   Records without admission numbers: ${csvDataWithoutAdmission.length}`);

    // STEP 1: Check which admission numbers exist in the database
    console.log(`\n🔍 STEP 1: Checking admission numbers against student database...`);

    const matchedStudents: { admissionNumber: string; csvName: string; dbName: string; studentId: string }[] = [];
    const unmatchedAdmissions: { admissionNumber: string; name: string; parentPhone: string }[] = [];

    for (const csvRecord of csvDataWithAdmission) {
      const student = await prisma.student.findFirst({
        where: {
          admissionNumber: csvRecord.admissionNumber,
          branchId: BRANCH_ID
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          isActive: true
        }
      });

      if (student) {
        const dbName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
        matchedStudents.push({
          admissionNumber: csvRecord.admissionNumber,
          csvName: csvRecord.name,
          dbName: dbName,
          studentId: student.id
        });
        console.log(`✅ Found: ${csvRecord.admissionNumber} - ${csvRecord.name} → ${dbName}`);
      } else {
        unmatchedAdmissions.push(csvRecord);
        console.log(`❌ Missing: ${csvRecord.admissionNumber} - ${csvRecord.name}`);
      }
    }

    // Generate final report
    console.log(`\n📊 FINAL MATCHING REPORT`);
    console.log(`════════════════════════════════════════════════`);
    console.log(`📁 CSV File: ${CSV_FILE_PATH}`);
    console.log(`🏢 Branch: ${branch.name} (${branch.code})`);
    console.log(`📅 Session: ${session.name}`);
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total CSV records: ${records.length}`);
    console.log(`   Records with admission numbers: ${csvDataWithAdmission.length}`);
    console.log(`   Records without admission numbers: ${csvDataWithoutAdmission.length}`);
    console.log(`   ✅ Matched in database: ${matchedStudents.length}`);
    console.log(`   ❌ Not found in database: ${unmatchedAdmissions.length}`);
    
    if (matchedStudents.length > 0) {
      console.log(`\n✅ MATCHED STUDENTS (${matchedStudents.length}):`);
      console.log(`────────────────────────────────────────────────`);
      matchedStudents.forEach((student, index) => {
        console.log(`${index + 1}. ${student.admissionNumber} - ${student.csvName}`);
        if (student.csvName !== student.dbName) {
          console.log(`   📝 DB Name: ${student.dbName}`);
        }
      });
    }

    if (unmatchedAdmissions.length > 0) {
      console.log(`\n❌ UNMATCHED ADMISSION NUMBERS (${unmatchedAdmissions.length}):`);
      console.log(`────────────────────────────────────────────────`);
      unmatchedAdmissions.forEach((record, index) => {
        console.log(`${index + 1}. ${record.admissionNumber} - ${record.name}`);
        console.log(`   📞 Phone: ${record.parentPhone}`);
      });
    }

    if (csvDataWithoutAdmission.length > 0) {
      console.log(`\n📝 RECORDS WITHOUT ADMISSION NUMBERS (${csvDataWithoutAdmission.length}):`);
      console.log(`────────────────────────────────────────────────`);
      csvDataWithoutAdmission.slice(0, 10).forEach((record, index) => {
        console.log(`${index + 1}. ${record.name} - ${record.parentPhone}`);
      });
      if (csvDataWithoutAdmission.length > 10) {
        console.log(`   ... and ${csvDataWithoutAdmission.length - 10} more records`);
      }
    }

    // Success rate
    const successRate = csvDataWithAdmission.length > 0 
      ? ((matchedStudents.length / csvDataWithAdmission.length) * 100).toFixed(1)
      : 0;

    console.log(`\n🎯 MATCH RATE: ${successRate}% (${matchedStudents.length}/${csvDataWithAdmission.length})`);
    
    console.log(`\n💾 STEP 2: Creating admission inquiry records...`);
    
    // Helper function to map enquiry status to valid enum values
    const mapEnquiryStatus = (status: string): 'NEW' | 'CONTACTED' | 'VISIT_SCHEDULED' | 'VISITED' | 'FORM_SUBMITTED' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_CONCLUDED' | 'ADMITTED' => {
      const upperStatus = status.toUpperCase();
      switch (upperStatus) {
        case 'NEW': return 'NEW';
        case 'CONTACTED': return 'CONTACTED';
        case 'VISIT_SCHEDULED': return 'VISIT_SCHEDULED';
        case 'VISITED': return 'VISITED';
        case 'FORM_SUBMITTED': return 'FORM_SUBMITTED';
        case 'INTERVIEW_SCHEDULED': return 'INTERVIEW_SCHEDULED';
        case 'INTERVIEW_CONCLUDED': return 'INTERVIEW_CONCLUDED';
        case 'ADMITTED': return 'ADMITTED';
        default: return 'NEW';
      }
    };

    console.log('\n🔄 Processing admissions data...');

    // Now create admission inquiries for all CSV records
    let inquiriesCreated = 0;
    let inquiriesSkipped = 0;
    let inquiriesLinked = 0;

    for (const record of records) {
      try {
        const firstName = record['Student Name']?.trim() || '';
        const lastName = record['Last Name']?.trim() || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const parentPhone = record['Father Mobile']?.trim() || record['Mother Mobile']?.trim() || '';
        const admissionNumber = record['Admission Number']?.trim() || '';
        const registrationNumber = record['Registration Number']?.trim() || `REG_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // Skip if no essential data
        if (!firstName && !registrationNumber) {
          continue;
        }

        // Check if inquiry already exists
        const existingInquiry = await prisma.admissionInquiry.findFirst({
          where: {
            OR: [
              { registrationNumber },
              {
                AND: [
                  { firstName: { contains: firstName, mode: 'insensitive' } },
                  { lastName: { contains: lastName, mode: 'insensitive' } },
                  { parentPhone },
                ]
              }
            ]
          }
        });

        if (existingInquiry) {
          console.log(`⏭️  Skipping duplicate inquiry: ${fullName}`);
          inquiriesSkipped++;
          continue;
        }

        // Find if student exists (for linking)
        let studentId: string | undefined;
        if (admissionNumber) {
          const matchedStudent = matchedStudents.find(m => m.admissionNumber === admissionNumber);
          if (matchedStudent) {
            studentId = matchedStudent.studentId;
            inquiriesLinked++;
            console.log(`🔗 Linking inquiry to existing student: ${fullName} (${admissionNumber})`);
          }
        }

        // Parse dates
        const parseDate = (dateStr: string): Date | undefined => {
          if (!dateStr || dateStr.trim() === '' || dateStr === '0000-00-00') return undefined;
          
          const formats = [
            /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // D/M/YYYY or DD/MM/YYYY
            /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
          ];
          
          for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
              if (format === formats[2]) {
                return new Date(parseInt(match[1]!), parseInt(match[2]!) - 1, parseInt(match[3]!));
              } else {
                return new Date(parseInt(match[3]!), parseInt(match[2]!) - 1, parseInt(match[1]!));
              }
            }
          }
          return undefined;
        };

        // Create admission inquiry
        await prisma.admissionInquiry.create({
          data: {
            registrationNumber,
            firstName,
            lastName,
            parentName: record['Father Name']?.trim() || record['Mother Name']?.trim() || 'Unknown Parent',
            parentPhone,
            parentEmail: record['Email']?.trim() || undefined,
            classApplying: record['Admission Opted For']?.trim() || '',
            dateOfBirth: parseDate(record['Date Of Birth'] || ''),
            gender: record['Gender']?.trim() || undefined,
            address: record['Address']?.trim() || undefined,
            status: studentId ? 'ADMITTED' : mapEnquiryStatus(record['Enquiry Status']?.trim() || 'NEW'),
            source: record['Source']?.trim() || undefined,
            notes: record['Comments']?.trim() || undefined,
            followUpDate: parseDate(record['Follow Up Date'] || ''),
            registrationSource: record['Source']?.toUpperCase().includes('WEBLEA') ? 'ONLINE' : 'OFFLINE',
            motherName: record['Mother Name']?.trim() || undefined,
            motherMobile: record['Mother Mobile']?.trim() || undefined,
            motherEmail: undefined,
            city: record['City']?.trim() || undefined,
            state: record['State']?.trim() || undefined,
            country: record['Country']?.trim() || undefined,
            classLastAttended: undefined,
            schoolLastAttended: record['Previous School']?.trim() || undefined,
            interviewScheduledDate: parseDate(record['Interview Date'] || ''),
            interviewMarks: record['Marks'] ? parseInt(record['Marks']) || undefined : undefined,
            studentId,
            branchId: BRANCH_ID,
            sessionId: SESSION_ID,
          },
        });

        inquiriesCreated++;
        console.log(`✅ Created inquiry: ${fullName} ${studentId ? '(linked to student)' : ''}`);

      } catch (error) {
        console.error(`❌ Error creating inquiry for record:`, error);
      }
    }

    console.log(`\n✅ Admission inquiry creation completed!`);
    console.log(`📊 CREATION SUMMARY:`);
    console.log(`   ✅ Inquiries created: ${inquiriesCreated}`);
    console.log(`   🔗 Linked to existing students: ${inquiriesLinked}`);
    console.log(`   ⏭️  Skipped (duplicates): ${inquiriesSkipped}`);
    
    console.log(`\n📋 Next Steps:`);
    console.log(`1. Review unmatched admission numbers in Admissions Module`);
    console.log(`2. Check for typos or missing students in database`);
    console.log(`3. Create missing students if needed`);
    console.log(`4. Review and process new admission inquiries`);

  } catch (error) {
    console.error('❌ Error during admission matching:', error);
    console.error('Analysis failed:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
if (import.meta.url === `file://${process.argv[1]}`) {
  importAdmissionsData()
    .then(() => {
      console.log('Import process finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importAdmissionsData }; 