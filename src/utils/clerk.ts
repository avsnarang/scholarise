import { Clerk } from '@clerk/clerk-sdk-node';

// Initialize Clerk client
console.log("Initializing Clerk with secret key:", process.env.CLERK_SECRET_KEY ? "Key is present" : "Key is missing");
const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error("CLERK_SECRET_KEY is not defined in environment variables!");
}
const clerk = Clerk({ secretKey: secretKey || "" });

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

interface CreateTeacherUserParams {
  firstName: string;
  lastName: string;
  email: string; // Email must be provided
  password: string;
  branchId: string;
  isHQ?: boolean;
  username?: string; // Make username optional
  roleId?: string; // Add roleId param
  roleName?: string; // Add roleName param
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
    const createParams: {
      firstName: string;
      lastName: string;
      username: string;
      password: string;
      emailAddress?: string[];
      publicMetadata: {
        role: string;
        roles: string[];
        branchId: string;
      };
    } = {
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

/**
 * Create a Clerk user account for a teacher
 */
export async function createTeacherUser({
  firstName,
  lastName,
  email,
  password,
  branchId,
  isHQ = false,
  username,
  roleId,
  roleName,
}: CreateTeacherUserParams) {
  if (!email) {
    throw new Error('Email is required to create a teacher user');
  }
  
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  console.log("createTeacherUser called with:", { 
    firstName, 
    lastName, 
    email, 
    branchId, 
    isHQ,
    hasUsername: !!username,
    roleId,
    roleName
  });
  
  // We already verified email exists above, but TypeScript doesn't know that
  const emailValue: string = email || '';
  
  try {
    // Generate a username from email if not provided
    let usernameToUse = username;
    if (!usernameToUse) {
      // Extract part before @ from email or use 'teacher' as fallback
      const emailBase = emailValue.includes('@') 
        ? emailValue.substring(0, emailValue.indexOf('@'))
        : 'teacher';
      
      // Clean up the username (remove special chars)
      const cleanedBase = emailBase.replace(/[^a-zA-Z0-9]/g, '');
      const timestamp = Date.now().toString().slice(-6);
      usernameToUse = `${cleanedBase}${timestamp}`;
    }
    
    console.log("Creating user in Clerk with email:", email, "and username:", usernameToUse);
    
    // Validate required parameters before making the API call
    if (!firstName || !lastName) {
      throw new Error('First name and last name are required');
    }
    
    if (!branchId) {
      throw new Error('Branch ID is required');
    }
    
    // Create user in Clerk
    try {
      const user = await clerk.users.createUser({
        firstName,
        lastName,
        emailAddress: [email],
        username: usernameToUse,
        password,
        publicMetadata: {
          role: roleName || 'Teacher', // Use provided role or default to Teacher
          roles: [roleName || 'Teacher'],
          branchId,
          isHQ,
          roleId, // Include roleId in metadata
        },
      });

      console.log("Clerk user created successfully:", user.id);
      return user;
    } catch (clerkError) {
      console.error('Clerk API error creating teacher user:', clerkError);
      
      // Handle specific Clerk errors more gracefully
      if (typeof clerkError === 'object' && clerkError !== null) {
        const error = clerkError as { status?: number; errors?: Array<{ code?: string; message?: string }> };
        
        // Check for common errors
        if (error.status === 422) {
          const messages = error.errors?.map(e => e.message).filter(Boolean).join(', ');
          if (messages?.toLowerCase().includes('password')) {
            throw new Error(`Password validation failed: ${messages}. Please use a stronger password that is not commonly used.`);
          }
          throw new Error(`Invalid data for user creation: ${messages || 'Unknown validation error'}`);
        }
        
        if (error.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Handle duplicate emails
        if (error.errors?.some(e => e.code === 'user_already_exists' || e.message?.includes('already exists'))) {
          throw new Error('A user with this email already exists. Please use a different email address.');
        }
      }
      
      // Rethrow with more context
      throw new Error(`Failed to create user in Clerk: ${clerkError instanceof Error ? clerkError.message : String(clerkError)}`);
    }
  } catch (error) {
    console.error('Error creating teacher user in Clerk:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Create a Clerk user account for an employee
 */
export async function createEmployeeUser({
  firstName,
  lastName,
  email,
  password,
  branchId,
  username,
  roleId,
  roleName,
}: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  branchId: string;
  username?: string;
  roleId?: string;
  roleName?: string;
}) {
  if (!email) {
    throw new Error('Email is required to create an employee user');
  }
  
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  console.log("createEmployeeUser called with:", { 
    firstName, 
    lastName, 
    email, 
    branchId,
    hasUsername: !!username,
    roleId,
    roleName
  });
  
  // We already verified email exists above, but TypeScript doesn't know that
  const emailValue: string = email || '';
  
  try {
    // Generate a username from email if not provided
    let usernameToUse = username;
    if (!usernameToUse) {
      // Extract part before @ from email or use 'employee' as fallback
      const emailBase = emailValue.includes('@') 
        ? emailValue.substring(0, emailValue.indexOf('@'))
        : 'employee';
      
      // Clean up the username (remove special chars)
      const cleanedBase = emailBase.replace(/[^a-zA-Z0-9]/g, '');
      const timestamp = Date.now().toString().slice(-6);
      usernameToUse = `${cleanedBase}${timestamp}`;
    }
    
    console.log("Creating user in Clerk with email:", email, "and username:", usernameToUse);
    
    // Validate required parameters before making the API call
    if (!firstName || !lastName) {
      throw new Error('First name and last name are required');
    }
    
    if (!branchId) {
      throw new Error('Branch ID is required');
    }
    
    // Create user in Clerk
    try {
      const user = await clerk.users.createUser({
        firstName,
        lastName,
        emailAddress: [email],
        username: usernameToUse,
        password,
        publicMetadata: {
          role: roleName || 'Employee',
          roles: [roleName || 'Employee'],
          branchId,
          roleId, // Include roleId in metadata
        },
      });

      console.log("Clerk user created successfully:", user.id);
      return user;
    } catch (clerkError) {
      console.error('Clerk API error creating employee user:', clerkError);
      
      // Handle specific Clerk errors more gracefully
      if (typeof clerkError === 'object' && clerkError !== null) {
        const error = clerkError as { status?: number; errors?: Array<{ code?: string; message?: string }> };
        
        // Check for common errors
        if (error.status === 422) {
          const messages = error.errors?.map(e => e.message).filter(Boolean).join(', ');
          if (messages?.toLowerCase().includes('password')) {
            throw new Error(`Password validation failed: ${messages}. Please use a stronger password that is not commonly used.`);
          }
          throw new Error(`Invalid data for user creation: ${messages || 'Unknown validation error'}`);
        }
        
        if (error.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Handle duplicate emails
        if (error.errors?.some(e => e.code === 'user_already_exists' || e.message?.includes('already exists'))) {
          throw new Error('A user with this email already exists. Please use a different email address.');
        }
      }
      
      // Rethrow with more context
      throw new Error(`Failed to create user in Clerk: ${clerkError instanceof Error ? clerkError.message : String(clerkError)}`);
    }
  } catch (error) {
    console.error('Error creating employee user in Clerk:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}
