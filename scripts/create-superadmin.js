// Script to create a SuperAdmin user in the database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Creating SuperAdmin user in database...');

    const email = 'avsnarang@tsh.edu.in';
    const name = 'Aditya Veer Singh Narang';

    // Step 1: Get the SuperAdmin role
    let superAdminRole = await prisma.role.findFirst({
      where: { name: 'SuperAdmin' },
    });

    if (!superAdminRole) {
      console.log('SuperAdmin role not found, creating it...');
      superAdminRole = await prisma.role.create({
        data: {
          name: 'SuperAdmin',
          description: 'Super Administrator with full access to all features',
          isSystem: true,
        },
      });
      console.log('Created SuperAdmin role:', superAdminRole.id);
    }

    // Step 2: Get the main branch
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

    // Step 3: Create or update user in Prisma database
    console.log('Creating user in database...');
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        isActive: true,
        branchId: mainBranch.id,
      },
      create: {
        name,
        email,
        isActive: true,
        branchId: mainBranch.id,
      },
    });

    console.log('User created/updated in database:', user.id);

    // Step 4: Assign SuperAdmin role to user
    const existingRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    });

    if (!existingRole) {
      console.log('Assigning SuperAdmin role to user...');
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: superAdminRole.id,
        },
      });
      console.log('SuperAdmin role assigned to user');
    } else {
      console.log('User already has SuperAdmin role');
    }

    console.log('SuperAdmin user created successfully!');
    console.log({
      email,
      name,
      userId: user.id,
      roleId: superAdminRole.id,
      branchId: mainBranch.id,
    });
  } catch (error) {
    console.error('Error creating SuperAdmin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
