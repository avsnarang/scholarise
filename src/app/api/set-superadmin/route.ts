import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { Role } from '@/types/permissions';

export async function POST(request: Request) {
  try {
    // Verify the current user is authenticated
    const { userId: currentUserId } = await auth();
    
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the request body (should contain the user ID to update)
    const body = await request.json();
    const { userId } = body;
    
    // Verify the user is updating their own account
    if (userId !== currentUserId) {
      return NextResponse.json(
        { error: 'You can only update your own account' },
        { status: 403 }
      );
    }
    
    // Update the user's metadata
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: {
        role: Role.SUPER_ADMIN,
        roles: [Role.SUPER_ADMIN],
      }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'User role updated to Super Admin'  
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update user role' },
      { status: 500 }
    );
  }
} 