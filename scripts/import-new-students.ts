import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface StudentCSVRow {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  admissionNumber: string;
  branchCode: string;
  classId: string;
  dateOfAdmission: string;
  email: string;
  personalEmail?: string;
  phone?: string;
  bloodGroup?: string;
  religion?: string;
  nationality?: string;
  caste?: string;
  aadharNumber?: string;
  udiseId?: string;
  username: string;
  password: string;
  permanentAddress?: string;
  permanentCity?: string;
  permanentState?: string;
  permanentCountry?: string;
  permanentZipCode?: string;
  correspondenceAddress?: string;
  correspondenceCity?: string;
  correspondenceState?: string;
  correspondenceCountry?: string;
  correspondenceZipCode?: string;
  previousSchool?: string;
  lastClassAttended?: string;
  mediumOfInstruction?: string;
  recognisedByStateBoard?: string;
  schoolCity?: string;
  schoolState?: string;
  reasonForLeaving?: string;
  fatherName?: string;
  fatherDob?: string;
  fatherEducation?: string;
  fatherOccupation?: string;
  fatherWorkplace?: string;
  fatherDesignation?: string;
  fatherMobile?: string;
  fatherEmail?: string;
  fatherAadharNumber?: string;
  motherName?: string;
  motherDob?: string;
  motherEducation?: string;
  motherOccupation?: string;
  motherWorkplace?: string;
  motherDesignation?: string;
  motherMobile?: string;
  motherEmail?: string;
  motherAadharNumber?: string;
  guardianName?: string;
  guardianDob?: string;
  guardianEducation?: string;
  guardianOccupation?: string;
  guardianWorkplace?: string;
  guardianDesignation?: string;
  guardianMobile?: string;
  guardianEmail?: string;
  guardianAadharNumber?: string;
  parentAnniversary?: string;
  monthlyIncome?: string;
  parentUsername: string;
  parentPassword: string;
  siblingAdmissionNumber?: string;
  siblingRelationshipType?: string;
}

function parseCSVData(csvContent: string): StudentCSVRow[] {
  const lines = csvContent.split('\n');
  const headerLine = lines[0]?.trim();
  if (!headerLine) return [];

  // Parse CSV properly handling commas in quotes
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseCSVLine(headerLine).map(h => h.replace(/\*$/, ''));
  const students: StudentCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length < 10) continue; // Must have at least basic fields

    const student: any = {};
    headers.forEach((header, index) => {
      const value = values[index]?.trim().replace(/^"/, '').replace(/"$/, '') || '';
      student[header] = value || undefined;
    });

    // Only add if we have the required fields
    if (student.firstName && student.lastName && student.admissionNumber) {
      students.push(student as StudentCSVRow);
    }
  }

  return students;
}

function transformDateFormat(dateStr: string): string {
  if (!dateStr) return '';
  
  // Convert from DD/MM/YYYY to YYYY-MM-DD
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (!day || !month || !year) {
      return '';
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

function transformStudentData(csvStudent: StudentCSVRow) {
  return {
    firstName: csvStudent.firstName,
    lastName: csvStudent.lastName,
    gender: csvStudent.gender,
    dateOfBirth: transformDateFormat(csvStudent.dateOfBirth),
    admissionNumber: csvStudent.admissionNumber,
    sectionId: csvStudent.classId, // Use the provided classId as sectionId
    dateOfAdmission: transformDateFormat(csvStudent.dateOfAdmission),
    email: csvStudent.email || null,
    personalEmail: csvStudent.personalEmail || null,
    phone: csvStudent.phone || null,
    bloodGroup: csvStudent.bloodGroup || null,
    religion: csvStudent.religion || null,
    nationality: csvStudent.nationality || null,
    caste: csvStudent.caste || null,
    aadharNumber: csvStudent.aadharNumber || null,
    udiseId: csvStudent.udiseId || null,
    username: csvStudent.username,
    password: csvStudent.password,
    permanentAddress: csvStudent.permanentAddress || null,
    permanentCity: csvStudent.permanentCity || null,
    permanentState: csvStudent.permanentState || null,
    permanentCountry: csvStudent.permanentCountry || null,
    permanentZipCode: csvStudent.permanentZipCode || null,
    correspondenceAddress: csvStudent.correspondenceAddress || null,
    correspondenceCity: csvStudent.correspondenceCity || null,
    correspondenceState: csvStudent.correspondenceState || null,
    correspondenceCountry: csvStudent.correspondenceCountry || null,
    correspondenceZipCode: csvStudent.correspondenceZipCode || null,
    previousSchool: csvStudent.previousSchool || null,
    lastClassAttended: csvStudent.lastClassAttended || null,
    mediumOfInstruction: csvStudent.mediumOfInstruction || null,
    recognisedByStateBoard: csvStudent.recognisedByStateBoard || null,
    schoolCity: csvStudent.schoolCity || null,
    schoolState: csvStudent.schoolState || null,
    reasonForLeaving: csvStudent.reasonForLeaving || null,
    // Parent information
    fatherName: csvStudent.fatherName || null,
    fatherDob: csvStudent.fatherDob && csvStudent.fatherDob.trim() !== '' ? transformDateFormat(csvStudent.fatherDob) : null,
    fatherEducation: csvStudent.fatherEducation || null,
    fatherOccupation: csvStudent.fatherOccupation || null,
    fatherMobile: csvStudent.fatherMobile || null,
    fatherEmail: csvStudent.fatherEmail || null,
    fatherAadharNumber: csvStudent.fatherAadharNumber || null,
    motherName: csvStudent.motherName || null,
    motherDob: csvStudent.motherDob && csvStudent.motherDob.trim() !== '' ? transformDateFormat(csvStudent.motherDob) : null,
    motherEducation: csvStudent.motherEducation || null,
    motherOccupation: csvStudent.motherOccupation || null,
    motherMobile: csvStudent.motherMobile || null,
    motherEmail: csvStudent.motherEmail || null,
    motherAadharNumber: csvStudent.motherAadharNumber || null,
    guardianName: csvStudent.guardianName || null,
    guardianDob: csvStudent.guardianDob && csvStudent.guardianDob.trim() !== '' ? transformDateFormat(csvStudent.guardianDob) : null,
    guardianEducation: csvStudent.guardianEducation || null,
    guardianOccupation: csvStudent.guardianOccupation || null,
    guardianMobile: csvStudent.guardianMobile || null,
    guardianEmail: csvStudent.guardianEmail || null,
    guardianAadharNumber: csvStudent.guardianAadharNumber || null,
    parentAnniversary: csvStudent.parentAnniversary && csvStudent.parentAnniversary.trim() !== '' ? transformDateFormat(csvStudent.parentAnniversary) : null,
    monthlyIncome: csvStudent.monthlyIncome && csvStudent.monthlyIncome.trim() !== '' ? parseFloat(csvStudent.monthlyIncome) || null : null,
    parentUsername: csvStudent.parentUsername,
    parentPassword: csvStudent.parentPassword,
    siblingAdmissionNumber: csvStudent.siblingAdmissionNumber || null,
    siblingRelationshipType: csvStudent.siblingRelationshipType || null,
  };
}

async function importStudents() {
  console.log('🚀 Starting student import...');
  
  try {
    // Read CSV file
    const csvFilePath = path.join(process.cwd(), '..', 'AI', 'New Students_5:8:25.csv');
    console.log(`📁 Reading CSV file: ${csvFilePath}`);
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }
    
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const csvStudents = parseCSVData(csvContent);
    
    console.log(`📊 Found ${csvStudents.length} students to import`);
    
    // Get branch information (PS branch)
    const branch = await prisma.branch.findFirst({
      where: { code: 'PS' },
    });
    
    if (!branch) {
      throw new Error('PS branch not found');
    }
    
    console.log(`✅ Found branch: ${branch.name} (ID: ${branch.id})`);
    
    // Get current active session
    const session = await prisma.academicSession.findFirst({
      where: { isActive: true },
    });
    
    if (!session) {
      throw new Error('No active academic session found');
    }
    
    console.log(`✅ Found active session: ${session.name} (ID: ${session.id})`);
    
    // Transform student data
    const transformedStudents = csvStudents.map(transformStudentData);
    
    console.log('📋 Students to import:');
    transformedStudents.forEach((student, index) => {
      console.log(`${index + 1}. ${student.firstName} ${student.lastName} (${student.admissionNumber})`);
    });
    
    // Import using Prisma directly since we're in a script context
    console.log('\n🔄 Starting database import...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const studentData of transformedStudents) {
      try {
        console.log(`\n📝 Processing: ${studentData.firstName} ${studentData.lastName}...`);
        
        // Check if student already exists
        const existingStudent = await prisma.student.findFirst({
          where: {
            OR: [
              { admissionNumber: studentData.admissionNumber },
              { email: studentData.email },
            ],
          },
        });
        
        if (existingStudent) {
          console.log(`   ⚠️  Student already exists: ${studentData.admissionNumber}`);
          continue;
        }
        
        // Create parent first if parent data exists
        let parentId: string | undefined;
        
        if (studentData.fatherName || studentData.motherName || studentData.guardianName) {
          const parentData = await prisma.parent.create({
            data: {
              fatherName: studentData.fatherName,
              fatherDob: studentData.fatherDob && studentData.fatherDob !== '' ? new Date(studentData.fatherDob) : null,
              fatherEducation: studentData.fatherEducation,
              fatherOccupation: studentData.fatherOccupation,
              fatherMobile: studentData.fatherMobile,
              fatherEmail: studentData.fatherEmail,
              fatherAadharNumber: studentData.fatherAadharNumber,
              motherName: studentData.motherName,
              motherDob: studentData.motherDob && studentData.motherDob !== '' ? new Date(studentData.motherDob) : null,
              motherEducation: studentData.motherEducation,
              motherOccupation: studentData.motherOccupation,
              motherMobile: studentData.motherMobile,
              motherEmail: studentData.motherEmail,
              motherAadharNumber: studentData.motherAadharNumber,
              guardianName: studentData.guardianName,
              guardianDob: studentData.guardianDob && studentData.guardianDob !== '' ? new Date(studentData.guardianDob) : null,
              guardianEducation: studentData.guardianEducation,
              guardianOccupation: studentData.guardianOccupation,
              guardianMobile: studentData.guardianMobile,
              guardianEmail: studentData.guardianEmail,
              guardianAadharNumber: studentData.guardianAadharNumber,
              parentAnniversary: studentData.parentAnniversary && studentData.parentAnniversary !== '' ? new Date(studentData.parentAnniversary) : null,
              monthlyIncome: studentData.monthlyIncome ? String(studentData.monthlyIncome) : null,
            },
          });
          parentId = parentData.id;
          console.log(`   ✅ Created parent record`);
        }
        
        // Create student
        const student = await prisma.student.create({
          data: {
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            gender: studentData.gender as 'Male' | 'Female' | 'Other',
            dateOfBirth: new Date(studentData.dateOfBirth),
            admissionNumber: studentData.admissionNumber,
            sectionId: studentData.sectionId,
            branchId: branch.id,
            dateOfAdmission: studentData.dateOfAdmission && studentData.dateOfAdmission !== '' ? new Date(studentData.dateOfAdmission) : null,
            email: studentData.email,
            personalEmail: studentData.personalEmail,
            phone: studentData.phone,
            bloodGroup: studentData.bloodGroup,
            religion: studentData.religion,
            nationality: studentData.nationality,
            caste: studentData.caste,
            aadharNumber: studentData.aadharNumber,
            udiseId: studentData.udiseId,
            username: studentData.username,
            password: studentData.password,
            permanentAddress: studentData.permanentAddress,
            permanentCity: studentData.permanentCity,
            permanentState: studentData.permanentState,
            permanentCountry: studentData.permanentCountry,
            permanentZipCode: studentData.permanentZipCode,
            correspondenceAddress: studentData.correspondenceAddress,
            correspondenceCity: studentData.correspondenceCity,
            correspondenceState: studentData.correspondenceState,
            correspondenceCountry: studentData.correspondenceCountry,
            correspondenceZipCode: studentData.correspondenceZipCode,
            previousSchool: studentData.previousSchool,
            lastClassAttended: studentData.lastClassAttended,
            mediumOfInstruction: studentData.mediumOfInstruction,
            recognisedByStateBoard: studentData.recognisedByStateBoard === 'true',
            schoolCity: studentData.schoolCity,
            schoolState: studentData.schoolState,
            reasonForLeaving: studentData.reasonForLeaving,
            parentId: parentId,
            firstJoinedSessionId: session.id,
          },
        });
        
        console.log(`   ✅ Created student: ${student.firstName} ${student.lastName} (ID: ${student.id})`);
        
        // Create academic record
        if (studentData.sectionId) {
          const section = await prisma.section.findUnique({
            where: { id: studentData.sectionId },
            include: { class: true },
          });
          
          if (section && section.class) {
            await prisma.academicRecord.create({
              data: {
                studentId: student.id,
                sessionId: session.id,
                classId: section.class.id,
                status: 'ENROLLED',
              },
            });
            console.log(`   ✅ Created academic record`);
          }
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Error processing ${studentData.firstName} ${studentData.lastName}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`✅ Successfully imported: ${successCount} students`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total processed: ${successCount + errorCount}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importStudents()
  .then(() => {
    console.log('🎉 Import process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import process failed:', error);
    process.exit(1);
  });