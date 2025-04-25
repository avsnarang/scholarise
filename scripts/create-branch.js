// This script creates a default branch in the database
// Usage: node scripts/create-branch.js

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

async function createBranch() {
  try {
    console.log('Checking if branch with ID 1 exists...');

    // Check if branch with ID 1 exists
    const existingBranch = await prisma.branch.findUnique({
      where: { id: '1' },
    });

    if (existingBranch) {
      console.log('Branch with ID 1 already exists:', existingBranch);
      return;
    }

    console.log('Creating default branch...');

    // Create the default branch
    const branch = await prisma.branch.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1', // Use ID 1 since that's what the app is looking for
        name: 'Main Branch',
        code: 'MAIN-01',
        address: '123 Main Street',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        phone: '+91 1234567890',
        email: 'main@scholarise.edu',
      },
    });

    console.log('Successfully created branch:', branch);
  } catch (error) {
    console.error('Error creating branch:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createBranch();
