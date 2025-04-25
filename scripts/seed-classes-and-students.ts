import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to seed dummy classes and student data...');

  // Get all branches
  const branches = await prisma.branch.findMany();
  if (branches.length === 0) {
    console.error('No branches found. Please create branches first.');
    return;
  }
  console.log(`Found ${branches.length} branches`);

  // Get all academic sessions
  const sessions = await prisma.academicSession.findMany();
  if (sessions.length === 0) {
    console.error('No academic sessions found. Please create sessions first.');
    return;
  }
  console.log(`Found ${sessions.length} academic sessions`);

  // Create classes for each branch and session
  for (const branch of branches) {
    console.log(`Creating classes for branch: ${branch.name} (${branch.code})`);

    for (const session of sessions) {
      console.log(`- Session: ${session.name}`);

      // Standard class names based on Indian education system
      const classNames = [
        'Nursery', 'LKG', 'UKG',
        'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
        'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
        'Class 11', 'Class 12'
      ];
      
      // Sections for each class
      const sections = ['A', 'B', 'C'];

      // Create classes with sections
      for (const className of classNames) {
        for (const section of sections) {
          // Don't create all sections for all classes to make it realistic
          if (
            (className === 'Nursery' && section !== 'A') || 
            (className === 'LKG' && section === 'C') || 
            (className === 'UKG' && section === 'C') ||
            (className === 'Class 11' && faker.number.int(10) > 7) || 
            (className === 'Class 12' && faker.number.int(10) > 7)
          ) {
            continue;
          }

          try {
            const classData = await prisma.class.create({
              data: {
                name: className,
                section: section,
                capacity: faker.number.int({ min: 25, max: 40 }),
                isActive: true,
                branchId: branch.id,
                sessionId: session.id,
              }
            });
            console.log(`  Created ${classData.name} ${classData.section}`);
          } catch (error) {
            console.error(`Error creating ${className} ${section}:`, error);
          }
        }
      }
    }
  }

  console.log('Classes created successfully. Now creating students...');

  // For each branch and session, create students for each class
  for (const branch of branches) {
    console.log(`Creating students for branch: ${branch.name} (${branch.code})`);

    for (const session of sessions) {
      console.log(`- Session: ${session.name}`);

      // Get classes for this branch and session
      const classes = await prisma.class.findMany({
        where: {
          branchId: branch.id,
          sessionId: session.id,
          isActive: true,
        },
      });

      if (classes.length === 0) {
        console.warn(`No classes found for branch ${branch.code} and session ${session.name}. Skipping.`);
        continue;
      }

      // Create students per class
      for (const classObj of classes) {
        // Number of students to create per class (varies by class level)
        let numStudents = 10;
        if (classObj.name.includes('Nursery') || classObj.name.includes('LKG') || classObj.name.includes('UKG')) {
          numStudents = faker.number.int({ min: 5, max: 15 });
        } else if (classObj.name.includes('11') || classObj.name.includes('12')) {
          numStudents = faker.number.int({ min: 8, max: 25 });
        } else {
          numStudents = faker.number.int({ min: 10, max: 30 });
        }

        console.log(`  Creating ${numStudents} students for ${classObj.name} ${classObj.section}`);

        // Create students for this class
        for (let i = 0; i < numStudents; i++) {
          // Generate a unique admission number
          // Format: BranchCode + Year + Random Number
          const currentYear = new Date().getFullYear().toString().slice(-2);
          let prefix = "";
          
          if (branch.code === "PS" || branch.name.includes("Paonta Sahib")) {
            prefix = "1000";
          } else if (branch.code === "JUN" || branch.name.includes("Juniors")) {
            prefix = "2000";
          } else if (branch.code === "MAJ" || branch.name.includes("Majra")) {
            prefix = "3000";
          } else {
            // Default prefix if branch doesn't match
            prefix = "4000";
          }
          
          const admissionNumber = `${prefix}${currentYear}${faker.number.int({ min: 1000, max: 9999 })}`;
          
          // Create a parent first
          const parent = await prisma.parent.create({
            data: {
              // Required compatibility fields
              firstName: faker.person.firstName(),
              lastName: faker.person.lastName(),
              phone: faker.phone.number(),
              // Parent-specific fields
              fatherName: faker.person.fullName({ sex: 'male' }),
              motherName: faker.person.fullName({ sex: 'female' }),
              fatherMobile: faker.phone.number(),
              motherMobile: faker.phone.number(),
              fatherOccupation: faker.person.jobTitle(),
              motherOccupation: faker.person.jobTitle(),
              fatherEmail: faker.internet.email().toLowerCase(),
              motherEmail: faker.internet.email().toLowerCase(),
              // Add additional fields
              fatherDob: faker.date.past({ years: 40 }),
              motherDob: faker.date.past({ years: 38 }),
              fatherEducation: faker.helpers.arrayElement(['High School', 'Bachelor\'s', 'Master\'s', 'PhD', 'Diploma']),
              motherEducation: faker.helpers.arrayElement(['High School', 'Bachelor\'s', 'Master\'s', 'PhD', 'Diploma']),
              monthlyIncome: faker.helpers.arrayElement(['Below 25,000', '25,000-50,000', '50,000-1,00,000', 'Above 1,00,000']),
              parentAnniversary: faker.date.past({ years: 20 }),
            }
          });
          
          // Generate date of birth based on class
          let dob;
          const classNum = classObj.name.replace(/[^0-9]/g, '');
          if (classObj.name.includes('Nursery')) {
            dob = faker.date.between({ from: new Date(new Date().setFullYear(new Date().getFullYear() - 4)), to: new Date(new Date().setFullYear(new Date().getFullYear() - 3)) });
          } else if (classObj.name.includes('LKG')) {
            dob = faker.date.between({ from: new Date(new Date().setFullYear(new Date().getFullYear() - 5)), to: new Date(new Date().setFullYear(new Date().getFullYear() - 4)) });
          } else if (classObj.name.includes('UKG')) {
            dob = faker.date.between({ from: new Date(new Date().setFullYear(new Date().getFullYear() - 6)), to: new Date(new Date().setFullYear(new Date().getFullYear() - 5)) });
          } else if (classNum) {
            // For Class 1-12, calculate age as 5 + class number (with some variation)
            const classAge = 5 + parseInt(classNum);
            dob = faker.date.between({ from: new Date(new Date().setFullYear(new Date().getFullYear() - (classAge + 1))), to: new Date(new Date().setFullYear(new Date().getFullYear() - classAge)) });
          } else {
            // Default case
            dob = faker.date.between({ from: new Date(new Date().setFullYear(new Date().getFullYear() - 18)), to: new Date(new Date().setFullYear(new Date().getFullYear() - 5)) });
          }
          
          // Generate email based on admission number and branch
          let domain = "";
          if (branch.code === "PS" || branch.name.includes("Paonta Sahib")) {
            domain = "@ps.tsh.edu.in";
          } else if (branch.code === "JUN" || branch.name.includes("Juniors")) {
            domain = "@jun.tsh.edu.in";
          } else if (branch.code === "MAJ" || branch.name.includes("Majra")) {
            domain = "@majra.tsh.edu.in";
          } else {
            domain = "@tsh.edu.in";
          }
          
          const schoolEmail = `${admissionNumber}${domain}`;
          
          // Generate address details
          const city = faker.location.city();
          const state = faker.location.state();
          const zipCode = faker.location.zipCode();
          
          // Create student with more detailed information
          try {
            const student = await prisma.student.create({
              data: {
                admissionNumber,
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                dateOfBirth: dob,
                gender: faker.helpers.arrayElement(['Male', 'Female']),
                bloodGroup: faker.helpers.arrayElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
                address: faker.location.streetAddress(),
                phone: faker.phone.number(),
                email: schoolEmail,
                personalEmail: faker.internet.email().toLowerCase(),
                nationality: faker.helpers.arrayElement(['Indian', 'Indian', 'Indian', 'Nepalese', 'Bhutanese']), // Mostly Indian
                religion: faker.helpers.arrayElement(['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain']),
                caste: faker.helpers.arrayElement(['General', 'OBC', 'SC', 'ST']),
                joinDate: faker.date.between({ 
                  from: new Date(new Date().setFullYear(new Date().getFullYear() - 2)), 
                  to: new Date() 
                }),
                dateOfAdmission: faker.date.recent({ days: 30 }),
                isActive: true,
                branchId: branch.id,
                parentId: parent.id,
                classId: classObj.id,
                // Remove rollNumber as it's not in the schema
                
                // Address information
                permanentAddress: faker.location.streetAddress(),
                permanentCity: city,
                permanentState: state,
                permanentCountry: 'India',
                permanentZipCode: zipCode,
                correspondenceAddress: faker.number.int(10) > 3 ? faker.location.streetAddress() : undefined, // 70% chance of different correspondence address
                correspondenceCity: faker.number.int(10) > 3 ? faker.location.city() : undefined,
                correspondenceState: faker.number.int(10) > 3 ? faker.location.state() : undefined,
                correspondenceCountry: 'India',
                correspondenceZipCode: faker.number.int(10) > 3 ? faker.location.zipCode() : undefined,
                
                // School information (for transfers, only fill for some students)
                previousSchool: faker.number.int(10) > 7 ? faker.company.name() + " School" : undefined,
                lastClassAttended: faker.number.int(10) > 7 ? `Class ${faker.number.int({ min: 1, max: 10 })}` : undefined,
                mediumOfInstruction: faker.helpers.arrayElement(['English', 'Hindi']),
                recognisedByStateBoard: true,
                schoolCity: faker.number.int(10) > 7 ? faker.location.city() : undefined,
                schoolState: faker.number.int(10) > 7 ? faker.location.state() : undefined,
                reasonForLeaving: faker.number.int(10) > 7 ? faker.helpers.arrayElement(['Transfer of parents', 'Better opportunities', 'Change of residence', 'Financial reasons']) : undefined,
              }
            });

            // Create academic record for this student
            await prisma.academicRecord.create({
              data: {
                studentId: student.id,
                sessionId: session.id,
                classId: classObj.id,
                status: 'Active',
              }
            });

            console.log(`    Created student: ${student.firstName} ${student.lastName} (${admissionNumber})`);
          } catch (error) {
            console.error(`    Error creating student with admission number ${admissionNumber}:`, error);
          }
        }
      }
    }
  }

  console.log('Student seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 