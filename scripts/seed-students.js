// Script to seed the database with dummy student data
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Seeding students data...');
    
    // Get the main branch
    let mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' },
    });
    
    if (!mainBranch) {
      console.log('Main branch not found, creating it...');
      mainBranch = await prisma.branch.create({
        data: {
          name: 'Main Branch',
          code: 'MAIN',
          address: '123 Main Street',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
        },
      });
      console.log('Created main branch:', mainBranch.id);
    }
    
    // Create classes if they don't exist
    const classData = [
      { name: '1st', section: 'A', capacity: 30 },
      { name: '1st', section: 'B', capacity: 30 },
      { name: '2nd', section: 'A', capacity: 30 },
      { name: '2nd', section: 'B', capacity: 30 },
      { name: '3rd', section: 'A', capacity: 30 },
      { name: '3rd', section: 'B', capacity: 30 },
    ];
    
    // Create academic session if it doesn't exist
    let session = await prisma.academicSession.findFirst({
      where: { name: '2023-2024' },
    });
    
    if (!session) {
      console.log('Academic session not found, creating it...');
      session = await prisma.academicSession.create({
        data: {
          name: '2023-2024',
          startDate: new Date('2023-04-01'),
          endDate: new Date('2024-03-31'),
          isActive: true,
          branchId: mainBranch.id,
        },
      });
      console.log('Created academic session:', session.id);
    }
    
    // Create classes
    const classes = [];
    for (const cls of classData) {
      const existingClass = await prisma.class.findFirst({
        where: {
          name: cls.name,
          section: cls.section,
          branchId: mainBranch.id,
        },
      });
      
      if (!existingClass) {
        const newClass = await prisma.class.create({
          data: {
            name: cls.name,
            section: cls.section,
            capacity: cls.capacity,
            isActive: true,
            branchId: mainBranch.id,
            sessionId: session.id,
          },
        });
        classes.push(newClass);
        console.log(`Created class ${cls.name}-${cls.section}`);
      } else {
        classes.push(existingClass);
        console.log(`Class ${cls.name}-${cls.section} already exists`);
      }
    }
    
    // Create parents
    const parents = [];
    for (let i = 0; i < 30; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet.email({ firstName, lastName }).toLowerCase();
      
      const existingParent = await prisma.parent.findFirst({
        where: { email },
      });
      
      if (!existingParent) {
        const parent = await prisma.parent.create({
          data: {
            firstName,
            lastName,
            occupation: faker.person.jobTitle(),
            phone: faker.phone.number('+91 ##########'),
            email,
            address: faker.location.streetAddress(),
          },
        });
        parents.push(parent);
        console.log(`Created parent: ${firstName} ${lastName}`);
      } else {
        parents.push(existingParent);
      }
    }
    
    // Create students
    const genders = ['Male', 'Female', 'Other'];
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const religions = ['Hinduism', 'Islam', 'Christianity', 'Sikhism', 'Buddhism', 'Jainism'];
    const nationalities = ['Indian', 'American', 'British', 'Canadian', 'Australian'];
    
    // Check how many students we already have
    const existingStudentCount = await prisma.student.count();
    console.log(`Found ${existingStudentCount} existing students`);
    
    // Create 50 students if we have less than that
    const studentsToCreate = Math.max(0, 50 - existingStudentCount);
    console.log(`Creating ${studentsToCreate} new students`);
    
    for (let i = 0; i < studentsToCreate; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const gender = faker.helpers.arrayElement(genders);
      const admissionNumber = `2023${String(existingStudentCount + i + 1).padStart(3, '0')}`;
      const randomClass = faker.helpers.arrayElement(classes);
      const randomParent = faker.helpers.arrayElement(parents);
      const isActive = faker.datatype.boolean(0.9); // 90% chance of being active
      
      const student = await prisma.student.create({
        data: {
          admissionNumber,
          firstName,
          lastName,
          dateOfBirth: faker.date.between({ from: '2005-01-01', to: '2015-12-31' }),
          gender,
          address: faker.location.streetAddress(),
          phone: faker.phone.number('+91 ##########'),
          email: faker.internet.email({ firstName, lastName }).toLowerCase(),
          bloodGroup: faker.helpers.arrayElement(bloodGroups),
          religion: faker.helpers.arrayElement(religions),
          nationality: faker.helpers.arrayElement(nationalities),
          joinDate: faker.date.past({ years: 3 }),
          isActive,
          branchId: mainBranch.id,
          classId: randomClass.id,
          parentId: randomParent.id,
        },
      });
      
      console.log(`Created student: ${firstName} ${lastName} (${admissionNumber})`);
    }
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
