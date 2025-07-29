import { createServerSupabaseClient } from '@/lib/supabase/server';
import { db } from '@/server/db';

interface CreateStudentUserParams {
  firstName: string;
  lastName: string;
  username: string; // This will be used to generate email (e.g. username@ps.tsh.edu.in)
  password: string;
  branchCode: string; // PS, JUN, MAJRA
  branchId: string;
}

interface CreateTeacherUserParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  branchId: string;
  isHQ?: boolean;
  username?: string;
  roleId?: string;
  roleName?: string;
}

interface CreateEmployeeUserParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  branchId: string;
  username?: string;
  roleId?: string;
  roleName?: string;
}

/**
 * Create a Supabase user account for a student
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
    // Validate required parameters
    if (!firstName || !lastName) {
      throw new Error('First name and last name are required for student user creation');
    }

    if (!username) {
      throw new Error('Username is required for student user creation');
    }

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long for student user creation');
    }

    if (!branchCode || !branchId) {
      throw new Error('Branch code and branch ID are required for student user creation');
    }

    // Check if username is already a full email address
    let email: string;
    
    if (username.includes('@')) {
      // Username is already a full email
      email = username;
    } else {
      // Username is just the local part, need to create full email
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

      email = `${username}@${emailDomain}`;
    }

    console.log('Creating student user with params:', {
      firstName,
      lastName,
      email,
      branchCode,
      branchId,
      passwordLength: password.length
    });

    const supabase = createServerSupabaseClient();

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        firstName,
        lastName,
        role: 'Student',
        roles: ['Student'],
        branchId,
        branchCode,
      },
    });

    if (error) {
      console.error('Supabase API error creating student user:', error);
      throw new Error(`Failed to create student user: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Failed to create user - no user returned from Supabase');
    }

    console.log("Supabase user created successfully:", data.user.id);

    // Create user role assignment in database
    try {
      // Find or create the Student role
      let studentRole = await db.rbacRole.findFirst({
        where: { name: 'Student' }
      });

      if (!studentRole) {
        studentRole = await db.rbacRole.create({
          data: {
            name: 'Student',
            description: 'Student role with basic permissions',
            isSystem: true,
            permissions: ['view_dashboard'], // Legacy permissions array
          }
        });
      }

      // Assign the role to the user
      await db.userRole.create({
        data: {
          userId: data.user.id,
          roleId: studentRole.id,
          branchId,
        }
      });

      console.log("User role assigned successfully");
    } catch (roleError) {
      console.error("Error assigning role to user:", roleError);
      // Don't throw error here as user was already created
    }

    return data.user;
  } catch (error) {
    console.error('Error in createStudentUser:', error);
    throw error;
  }
}

/**
 * Create a Supabase user account for a teacher
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
  try {
    // Validate required parameters
    if (!firstName || !lastName) {
      throw new Error('First name and last name are required for teacher user creation');
    }

    if (!email) {
      throw new Error('Email is required for teacher user creation');
    }

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long for teacher user creation');
    }

    if (!branchId) {
      throw new Error('Branch ID is required for teacher user creation');
    }

    console.log('Creating teacher user with params:', {
      firstName,
      lastName,
      email,
      branchId,
      isHQ,
      username,
      roleId,
      roleName,
      passwordLength: password.length
    });

    const supabase = createServerSupabaseClient();

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        firstName,
        lastName,
        role: roleName || 'Teacher',
        roles: [roleName || 'Teacher'],
        branchId,
        isHQ,
        roleId,
        username,
      },
    });

    if (error) {
      console.error('Supabase API error creating teacher user:', error);
      
      // Handle specific Supabase errors more gracefully
      if (error.message?.includes('already registered')) {
        throw new Error('A user with this email already exists. Please use a different email address.');
      }
      
      throw new Error(`Failed to create teacher user: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Failed to create user - no user returned from Supabase');
    }

    console.log("Supabase user created successfully:", data.user.id);

    // Role assignment will be handled by the calling router function
    // which has access to the teacherId after the teacher record is created

    return data.user;
  } catch (error) {
    console.error('Error in createTeacherUser:', error);
    throw error;
  }
}

/**
 * Create a Supabase user account for a parent
 */
export async function createParentUser(params: CreateTeacherUserParams) {
  // For now, create parent users with the same logic as teacher users
  return createTeacherUser(params);
}

/**
 * Create a Supabase user account for an employee
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
}: CreateEmployeeUserParams) {
  try {
    // Validate required parameters
    if (!firstName || !lastName) {
      throw new Error('First name and last name are required for employee user creation');
    }

    if (!email) {
      throw new Error('Email is required for employee user creation');
    }

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long for employee user creation');
    }

    if (!branchId) {
      throw new Error('Branch ID is required for employee user creation');
    }

    console.log('Creating employee user with params:', {
      firstName,
      lastName,
      email,
      branchId,
      username,
      roleId,
      roleName,
      passwordLength: password.length
    });

    const supabase = createServerSupabaseClient();
    
    // Debug: Check if we have the service role key
    console.log('Supabase config check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...',
      nodeEnv: process.env.NODE_ENV
    });

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        firstName,
        lastName,
        role: roleName || 'Employee',
        roles: [roleName || 'Employee'],
        branchId,
        roleId,
        username,
      },
    });

    if (error) {
      console.error('Supabase API error creating employee user:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code || 'unknown'
      });
      
      // Handle specific Supabase errors more gracefully
      if (error.message?.includes('already registered')) {
        throw new Error('A user with this email already exists. Please use a different email address.');
      }
      
      // Enhanced error message for debugging
      throw new Error(`Failed to create employee user: ${error.message}. Check that SUPABASE_SERVICE_ROLE_KEY is correctly configured in production.`);
    }

    if (!data.user) {
      throw new Error('Failed to create user - no user returned from Supabase');
    }

    console.log("Supabase user created successfully:", data.user.id);

    // Role assignment will be handled by the calling router function
    // which has access to the employeeId after the employee record is created

    return data.user;
  } catch (error) {
    console.error('Error in createEmployeeUser:', error);
    throw error;
  }
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(userId: string, metadata: Record<string, any>) {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: metadata,
    });

    if (error) {
      throw new Error(`Failed to update user metadata: ${error.message}`);
    }

    return data.user;
  } catch (error) {
    console.error('Error updating user metadata:', error);
    throw error;
  }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string) {
  try {
    const supabase = createServerSupabaseClient();

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data.user;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
} 