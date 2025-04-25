// This script lists all users in Clerk
// Usage: node scripts/list-users.js

import dotenv from 'dotenv';
import { Clerk } from '@clerk/clerk-sdk-node';

dotenv.config();

// Initialize Clerk client
const clerk = Clerk({ apiKey: process.env.CLERK_SECRET_KEY });

async function listUsers() {
  try {
    console.log('Listing all users...');

    // Get all users
    const users = await clerk.users.getUserList();

    // Display user information
    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Email: ${user.emailAddresses[0]?.emailAddress || 'None'}`);
      console.log(`Role: ${user.publicMetadata?.role || 'None'}`);
      console.log(`Roles: ${JSON.stringify(user.publicMetadata?.roles || 'None')}`);
    });

    console.log(`\nTotal users: ${users.length}`);
  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
}

listUsers();
