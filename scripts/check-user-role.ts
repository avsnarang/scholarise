// This script checks the roles for a user in Clerk
// Usage: node scripts/check-user-role.js <user_id>

import dotenv from 'dotenv';
import { Clerk } from '@clerk/clerk-sdk-node';

dotenv.config();

// Initialize Clerk client
const clerk = Clerk({ apiKey: process.env.CLERK_SECRET_KEY });

async function checkUserRole(userId: string) {
  try {
    if (!userId) {
      console.error('Error: User ID is required');
      console.log('Usage: node scripts/check-user-role.js <user_id>');
      process.exit(1);
    }

    console.log(`Checking roles for user ${userId}...`);

    // Get the user
    const user = await clerk.users.getUser(userId);
    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.emailAddresses[0]?.emailAddress})`);

    // Display the user's metadata
    console.log('Public Metadata:', JSON.stringify(user.publicMetadata, null, 2));
    console.log('Private Metadata:', JSON.stringify(user.privateMetadata, null, 2));

    // Display specific role information
    console.log('Role:', user.publicMetadata?.role || 'None');
    console.log('Roles:', user.publicMetadata?.roles || 'None');
  } catch (error) {
    console.error('Error checking user role:', error);
    process.exit(1);
  }
}

// Get the user ID from command line arguments
const userId = process.argv[2] || '';
checkUserRole(userId);
