import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentMessage() {
  console.log('🔍 Checking the most recent message (sent around 12:00)...\n');

  try {
    // Get the very recent message jobs
    const recentJobs = await prisma.messageJob.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        message: {
          include: {
            recipients: {
              take: 10
            }
          }
        }
      }
    });

    console.log(`Found ${recentJobs.length} recent message jobs:\n`);

    for (const job of recentJobs) {
      console.log(`📊 Job ID: ${job.id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Progress: ${job.progress}%`);
      console.log(`   Total Recipients: ${job.totalRecipients}`);
      console.log(`   Processed: ${job.processedRecipients}`);
      console.log(`   Successful: ${job.successfulSent}`);
      console.log(`   Failed: ${job.failed}`);
      console.log(`   Created: ${job.createdAt}`);
      console.log(`   Started: ${job.startedAt}`);
      console.log(`   Completed: ${job.completedAt}`);
      if (job.errorMessage) {
        console.log(`   Error: ${job.errorMessage}`);
      }
      
      console.log(`\n   📧 Message: ${job.message.title}`);
      console.log(`   Message Status: ${job.message.status}`);
      console.log(`   Message Success Count: ${job.message.successfulSent}`);
      console.log(`   Message Failed Count: ${job.message.failed}`);
      
      console.log(`\n   📱 Recipients (first 10):`);
      for (const recipient of job.message.recipients) {
        console.log(`     - ${recipient.recipientName} (${recipient.recipientPhone})`);
        console.log(`       Status: ${recipient.status}`);
        console.log(`       Meta ID: ${recipient.metaMessageId || '❌ NOT SET'}`);
        console.log(`       Sent At: ${recipient.sentAt || 'Not set'}`);
        console.log(`       Delivered At: ${recipient.deliveredAt || 'Not set'}`);
        console.log(`       Read At: ${recipient.readAt || 'Not set'}`);
        if (recipient.errorMessage) {
          console.log(`       Error: ${recipient.errorMessage}`);
        }
      }
      console.log('---\n');
    }

    // Check for the specific job mentioned in the logs
    const specificJob = await prisma.messageJob.findUnique({
      where: { id: 'cmdjvdxud00047io88wva23s0' },
      include: {
        message: {
          include: {
            recipients: true
          }
        }
      }
    });

    if (specificJob) {
      console.log(`\n🎯 Found the specific job from edge function logs:`);
      console.log(`   Job ID: ${specificJob.id}`);
      console.log(`   Status: ${specificJob.status}`);
      console.log(`   Total Recipients: ${specificJob.totalRecipients}`);
      console.log(`   Successful: ${specificJob.successfulSent}`);
      console.log(`   Failed: ${specificJob.failed}`);
      console.log(`   Completed: ${specificJob.completedAt}`);
      
      for (const recipient of specificJob.message.recipients) {
        console.log(`\n   📱 Recipient: ${recipient.recipientName}`);
        console.log(`      Phone: ${recipient.recipientPhone}`);
        console.log(`      Status: ${recipient.status}`);
        console.log(`      Meta Message ID: ${recipient.metaMessageId || '❌ NOT SET'}`);
        console.log(`      Sent At: ${recipient.sentAt}`);
        console.log(`      Delivered At: ${recipient.deliveredAt || 'Not set'}`);
        console.log(`      Read At: ${recipient.readAt || 'Not set'}`);
      }
    } else {
      console.log(`\n❌ Could not find job with ID: cmdjvdxud00047io88wva23s0`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentMessage(); 