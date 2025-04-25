import { Clerk } from '@clerk/clerk-sdk-node';

// Initialize Clerk client
const clerk = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY });

interface CreateStudentUserParams {
  firstName: string;
  lastName: string;
  username: string; // This will be used as email (e.g. username@ps.tsh.edu.in)
  password: string;
  branchCode: string; // PS, JUN, MAJRA
  branchId: string;
}

interface CreateParentUserParams {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  email?: string;
  branchId: string;
}

/**
 * Create a Clerk user account for a student
 */
export async function createStudentUser({
  firstName,
  lastName,
  username,
  password,
  branchCode,
  branchId,
}: CreateStudentUserParams) {
  try {
    // Determine email domain based on branch code
    let emailDomain = '';
    if (branchCode === 'PS') {
      emailDomain = 'ps.tsh.edu.in';
    } else if (branchCode === 'JUN') {
      emailDomain = 'jun.tsh.edu.in';
    } else if (branchCode === 'MAJ') {
      emailDomain = 'majra.tsh.edu.in';
    }

    if (!emailDomain) {
      throw new Error(`Invalid branch code: ${branchCode}`);
    }

    // Create email from username and domain
    const email = `${username}@${emailDomain}`;

    // Create user in Clerk
    const user = await clerk.users.createUser({
      firstName,
      lastName,
      emailAddress: [email],
      password,
      username,
      publicMetadata: {
        role: 'Student',
        roles: ['Student'],
        branchId,
      },
    });

    return user;
  } catch (error) {
    console.error('Error creating student user in Clerk:', error);
    throw error;
  }
}

/**
 * Create a Clerk user account for a parent
 */
export async function createParentUser({
  firstName,
  lastName,
  username,
  password,
  email,
  branchId,
}: CreateParentUserParams) {
  try {
    // Create user in Clerk
    const createParams: any = {
      firstName,
      lastName,
      username,
      password,
      publicMetadata: {
        role: 'Parent',
        roles: ['Parent'],
        branchId,
      },
    };

    // Add email if provided
    if (email) {
      createParams.emailAddress = [email];
    }

    const user = await clerk.users.createUser(createParams);

    return user;
  } catch (error) {
    console.error('Error creating parent user in Clerk:', error);
    throw error;
  }
} 