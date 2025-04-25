// This script sets the SuperAdmin role for a user in Clerk
// Usage: node scripts/set-admin-role.js <user_id>

import dotenv from 'dotenv';
import { Clerk } from '@clerk/clerk-sdk-node';

dotenv.config();

// Initialize Clerk client
const clerk = Clerk({ apiKey: process.env.CLERK_SECRET_KEY });

async function setAdminRole(userId) {
  try {
    if (!userId) {
      console.error('Error: User ID is required');
      console.log('Usage: node scripts/set-admin-role.js <user_id>');
      process.exit(1);
    }

    console.log(`Setting SuperAdmin role for user ${userId}...`);

    // Get the user
    const user = await clerk.users.getUser(userId);
    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.emailAddresses[0]?.emailAddress})`);

    // Update the user's metadata
    await clerk.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        role: 'SuperAdmin',
        roles: ['SuperAdmin'],
      },
    });

    console.log('Successfully set SuperAdmin role for user');
  } catch (error) {
    console.error('Error setting admin role:', error);
    process.exit(1);
  }
}

// Get the user ID from command line arguments
const userId = process.argv[2];
setAdminRole(userId);
