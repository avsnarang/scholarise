import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/auth';
import { updateUserMetadata } from '@/utils/supabase-auth';

export async function POST(request: Request) {
  try {
    // Verify the current user is authenticated
    const currentUser = await getServerUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the request body (should contain the user ID to update)
    const body = await request.json();
    const { userId } = body;
    
    // Verify the user is updating their own account
    if (userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'You can only update your own account' },
        { status: 403 }
      );
    }
    
    // Update the user's metadata
    await updateUserMetadata(userId, {
      role: 'SuperAdmin',
      roles: ['SuperAdmin'],
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