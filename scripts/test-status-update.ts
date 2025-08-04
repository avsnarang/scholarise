import { updateStudentStatus } from './update-mark-students-status';

// Simple test script for the new status system
async function testStatusUpdate() {
  console.log('🧪 Testing new student status update system...\n');

  // Test with dry run first
  await updateStudentStatus({
    admissionNumbers: ['10001814', '10002048'],
    newStatus: 'WITHDRAWN',
    reason: 'Test withdrawal for status system',
    dryRun: true
  });
}

testStatusUpdate()
  .then(() => {
    console.log('\n🎉 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });