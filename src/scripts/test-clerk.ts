// Run this script with ts-node: npx ts-node src/scripts/test-clerk.ts

import { Clerk } from '@clerk/clerk-sdk-node';
import { env } from '@/env';

// Initialize Clerk client
const CLERK_SECRET_KEY = env.CLERK_SECRET_KEY;
console.log("CLERK_SECRET_KEY present:", !!CLERK_SECRET_KEY);

if (!CLERK_SECRET_KEY) {
  console.error("ERROR: CLERK_SECRET_KEY is not defined in environment variables!");
  process.exit(1);
}

const clerk = Clerk({ secretKey: CLERK_SECRET_KEY });

// Generate a secure random password
function generateSecurePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function testClerkAPI() {
  console.log("Starting Clerk API test...");
  
  try {
    const timestamp = Date.now();
    const testEmail = `test.teacher.${timestamp}@example.com`;
    const username = `testteacher${timestamp}`;
    const securePassword = generateSecurePassword();
    console.log("Creating test user with email:", testEmail);
    console.log("Using username:", username);
    console.log("Using secure random password of length:", securePassword.length);
    
    // Create user in Clerk
    const user = await clerk.users.createUser({
      firstName: "Test",
      lastName: "Teacher",
      emailAddress: [testEmail],
      username: username,
      password: securePassword,
      publicMetadata: {
        role: 'Teacher',
        roles: ['Teacher'],
        branchId: 'test_branch',
        isHQ: false,
      },
    });
    
    console.log("Test successful! Created user with ID:", user.id);
    console.log("User email:", user.emailAddresses[0]?.emailAddress);
    console.log("User username:", user.username);
  } catch (error) {
    console.error("Test failed with error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }
}

// Execute the test
testClerkAPI().catch(console.error); 