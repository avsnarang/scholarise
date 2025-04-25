// Test script for Prisma connection
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing Prisma connection...');
    
    // Try to query the database
    const branches = await prisma.branch.findMany({
      take: 5,
    });
    
    console.log('Successfully connected to the database!');
    console.log(`Found ${branches.length} branches:`);
    console.log(branches);
    
    // Create a test branch if none exist
    if (branches.length === 0) {
      console.log('Creating a test branch...');
      const newBranch = await prisma.branch.create({
        data: {
          name: 'Main Branch',
          code: 'MAIN',
          address: '123 Main Street, New Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
          phone: '+91 9876543210',
          email: 'main@scholarise.com',
        },
      });
      console.log('Created branch:', newBranch);
    }
    
    // Create a test role if none exist
    const roles = await prisma.role.findMany({
      take: 5,
    });
    
    console.log(`Found ${roles.length} roles:`);
    console.log(roles);
    
    if (roles.length === 0) {
      console.log('Creating default roles...');
      const defaultRoles = [
        { name: 'SuperAdmin', description: 'Super Administrator', isSystem: true },
        { name: 'Employee', description: 'School Employee', isSystem: true },
        { name: 'Teacher', description: 'School Teacher', isSystem: true },
        { name: 'Parent', description: 'Student Parent', isSystem: true },
        { name: 'Student', description: 'School Student', isSystem: true },
      ];
      
      for (const role of defaultRoles) {
        await prisma.role.create({
          data: role,
        });
      }
      
      console.log('Created default roles');
    }
    
  } catch (error) {
    console.error('Error connecting to the database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
