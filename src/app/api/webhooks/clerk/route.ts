import { Webhook } from 'svix';
import { headers } from 'next/headers';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET');
    return new NextResponse('Webhook Secret Not Found', { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error occurred -- missing Svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error occurred', { status: 400 });
  }

  // Handle the specific event
  const eventType = evt.type;
  
  console.log(`Webhook received: ${eventType}`);

  // Handle the before_sign_in event to check if the user is active
  if (eventType === 'session.created') {
    try {
      // Get user information
      const userId = (evt.data as any).user_id;
      
      // Get user's metadata to check active status
      const userResponse = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!userResponse.ok) {
        console.error('Error fetching user data from Clerk API');
        return new NextResponse(JSON.stringify({ status: 'allowed' }), { status: 200 });
      }
      
      const userData = await userResponse.json();
      const publicMetadata = userData.public_metadata || {};
      
      // If user is explicitly marked as inactive, block the sign-in
      if (publicMetadata.isActive === false) {
        console.log(`Blocking sign-in for inactive user: ${userId}`);
        
        // Return a response that blocks the sign-in attempt
        return new NextResponse(
          JSON.stringify({
            status: 'blocked',
            reason: 'Your account has been deactivated. Please contact the administrator.'
          }),
          { status: 200 }
        );
      }
    } catch (error) {
      console.error('Error in before_sign_in webhook handler:', error);
      // Allow the sign-in if there's an error checking the status
      return new NextResponse(JSON.stringify({ status: 'allowed' }), { status: 200 });
    }
  }

  // Default response for other events
  return new NextResponse(JSON.stringify({ status: 'success' }), { status: 200 });
}

// Helper function to determine user role based on email
function determineUserRole(email: string): string {
  if (email.endsWith('@admin.scholarise.com')) return 'Admin';
  if (email.endsWith('@teacher.scholarise.com')) return 'Teacher';
  if (email.endsWith('@student.scholarise.com')) return 'Student';
  if (email.endsWith('@scholarise.com')) return 'Employee';
  return 'Student'; // Default role
}

// Helper function to determine branch ID based on email
function determineBranchId(email: string): string {
  // This is a placeholder. In a real application, you would:
  // 1. Query your database for the user's assigned branch
  // 2. Use email patterns or other logic to determine the branch
  // For now, we'll default to Paonta Sahib branch
  return "1";
} 