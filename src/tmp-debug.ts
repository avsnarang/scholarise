import { attendanceWindowRouter } from './server/api/routers/attendanceWindow';
import { PrismaClient } from '@prisma/client';

console.log('Router exists:', !!attendanceWindowRouter);
console.log('Router procedures:', Object.keys(attendanceWindowRouter._def.procedures));
console.log('getAll exists:', !!attendanceWindowRouter._def.procedures.getAll);

// Create a new Prisma client
const prisma = new PrismaClient();

// Check attendance window table directly
async function checkTables() {
  try {
    // Check if we can fetch any attendance windows
    const windows = await prisma.attendanceWindow.findMany({
      take: 5
    });
    console.log('AttendanceWindow count:', windows.length);
    if (windows.length > 0) {
      console.log('First window:', windows[0]);
    } else {
      console.log('No attendance windows found');
    }

    // Check attendance locations for comparison
    const locations = await prisma.attendanceLocation.findMany({
      take: 5
    });
    console.log('AttendanceLocation count:', locations.length);
    if (locations.length > 0) {
      console.log('First location:', locations[0]);
    } else {
      console.log('No attendance locations found');
    }
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkTables().catch(console.error);
