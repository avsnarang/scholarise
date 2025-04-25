import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to seed dummy student data...');

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

  // Create students for each branch and session
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

      // Create 10 students per branch and session
      for (let i = 0; i < 10; i++) {
        // Generate a unique admission number
        const admissionNumber = `${branch.code}${new Date().getFullYear().toString().slice(-2)}${faker.number.int({ min: 1000, max: 9999 })}`;
        
        // Create a parent first
        const parent = await prisma.parent.create({
          data: {
            fatherName: faker.person.fullName({ sex: 'male' }),
            motherName: faker.person.fullName({ sex: 'female' }),
            fatherMobile: faker.phone.number(),
            motherMobile: faker.phone.number(),
            fatherOccupation: faker.person.jobTitle(),
            motherOccupation: faker.person.jobTitle(),
            fatherEmail: faker.internet.email().toLowerCase(),
            motherEmail: faker.internet.email().toLowerCase(),
          }
        });
        
        // Randomly select a class
        const selectedClass = classes[Math.floor(Math.random() * classes.length)]; // Randomly select a class
        
        // Generate date of birth (between 5 and 18 years ago)
        const dob = faker.date.between({ 
          from: new Date(new Date().setFullYear(new Date().getFullYear() - 18)), 
          to: new Date(new Date().setFullYear(new Date().getFullYear() - 5))
        });
        
        // Create student
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
            email: faker.internet.email().toLowerCase(),
            nationality: 'Indian',
            religion: faker.helpers.arrayElement(['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain']),
            joinDate: faker.date.between({ 
              from: new Date(new Date().setFullYear(new Date().getFullYear() - 2)), 
              to: new Date() 
            }),
            dateOfAdmission: faker.date.recent({ days: 30 }),
            isActive: true,
            branchId: branch.id,
            parentId: parent.id,
            classId: selectedClass!.id,
            rollNumber: faker.number.int({ min: 1, max: 50 }).toString(),
            permanentAddress: faker.location.streetAddress(),
            permanentCity: faker.location.city(),
            permanentState: faker.location.state(),
            permanentCountry: 'India',
            permanentZipCode: faker.location.zipCode(),
            correspondenceAddress: faker.location.streetAddress(),
            correspondenceCity: faker.location.city(),
            correspondenceState: faker.location.state(),
            correspondenceCountry: 'India',
            correspondenceZipCode: faker.location.zipCode(),
          }
        });

        // Create academic record for this student
        await prisma.academicRecord.create({
          data: {
            studentId: student.id,
            sessionId: session.id,
            classId: selectedClass!.id,
            status: 'Active',
          }
        });

        console.log(`Created student: ${student.firstName} ${student.lastName} (${admissionNumber})`);
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