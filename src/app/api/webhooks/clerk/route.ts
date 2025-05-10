import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error occured', {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created') {
    // Get the user data from the webhook
    const { id, email_addresses, public_metadata } = evt.data;
    const primaryEmail = email_addresses[0]?.email_address;

    if (!primaryEmail) {
      return new NextResponse('No email address found', { status: 400 });
    }

    try {
      // Here you would typically:
      // 1. Check your database for user role assignment
      // 2. Check branch assignment
      // 3. Update the user's metadata in Clerk

      // For now, we'll set some default metadata
      const defaultMetadata = {
        role: determineUserRole(primaryEmail),
        branchId: determineBranchId(primaryEmail),
      };

      // Update the user's metadata in Clerk
      const response = await fetch(`https://api.clerk.com/v1/users/${id}/metadata`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_metadata: defaultMetadata,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user metadata');
      }

      return new NextResponse('User metadata updated', { status: 200 });
    } catch (error) {
      console.error('Error updating user metadata:', error);
      return new NextResponse('Error updating user metadata', { status: 500 });
    }
  }

  return new NextResponse('Webhook processed', { status: 200 });
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