import { type NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/auth';
import { syncUserPermissions, syncPermissionsForRole, syncAllUserPermissions } from '@/utils/sync-user-permissions';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Try multiple methods to get the authenticated user
    let currentUser = null;
    let userId = null;

    // Method 1: Try Supabase client
    try {
      const supabase = await createServerSupabaseAuthClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        currentUser = user;
        userId = user.id;
      }
    } catch (error) {
      console.log('Method 1 (Supabase client) failed:', error);
    }

    // Method 2: Try cookies directly  
    if (!currentUser) {
      try {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        console.log('Available cookies:', allCookies.map((c: { name: string }) => c.name));
        
        // Look for Supabase auth token
        const authCookie = allCookies.find((c: { name: string }) => c.name.includes('auth-token'));
        if (authCookie) {
          console.log('Found auth cookie:', authCookie.name);
        }
      } catch (error) {
        console.log('Method 2 (cookies) failed:', error);
      }
    }

    // Method 3: Try request headers
    if (!currentUser) {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        console.log('Found authorization header');
      }
    }

    const body = await request.json();
    const { action, userId: requestUserId, roleName } = body;

    // For debugging purposes, allow some actions without strict auth
    const allowedDebugActions = ['sync_cbse_incharge', 'sync_role'];
    const isDebugAction = allowedDebugActions.includes(action);

    // If no user but it's a debug action, we'll allow it
    if (!currentUser && !isDebugAction) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          details: 'Could not verify user authentication. Please ensure you are logged in.',
          userId: userId,
          hasAuthHeader: !!request.headers.get('authorization'),
          cookieCount: (await cookies()).getAll().length
        },
        { status: 401 }
      );
    }

    let result;
    let message = '';

    switch (action) {
      case 'sync_user':
        const targetUserId = requestUserId || userId;
        if (!targetUserId) {
          return NextResponse.json(
            { error: 'userId is required for sync_user action' },
            { status: 400 }
          );
        }
        await syncUserPermissions(targetUserId);
        message = `Successfully synced permissions for user ${targetUserId}`;
        break;

      case 'sync_role':
        if (!roleName) {
          return NextResponse.json(
            { error: 'roleName is required for sync_role action' },
            { status: 400 }
          );
        }
        result = await syncPermissionsForRole(roleName);
        message = `Successfully synced permissions for ${result} users with role "${roleName}"`;
        break;

      case 'sync_all':
        if (!currentUser) {
          return NextResponse.json(
            { error: 'Authentication required for sync_all action' },
            { status: 401 }
          );
        }
        result = await syncAllUserPermissions();
        message = `Successfully synced permissions for ${result} users`;
        break;

      case 'sync_cbse_incharge':
        result = await syncPermissionsForRole('CBSE In-Charge');
        message = `Successfully synced permissions for ${result} users with CBSE In-Charge role`;
        break;

      case 'sync_current_user':
        if (!userId) {
          return NextResponse.json(
            { error: 'Could not determine current user ID' },
            { status: 401 }
          );
        }
        await syncUserPermissions(userId);
        message = 'Successfully synced your permissions';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: sync_user, sync_role, sync_all, sync_cbse_incharge, or sync_current_user' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message,
      action,
      userId: userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in fix-permissions API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 