import { appRouter } from './server/api/root';
import { createTRPCContext } from './server/api/trpc';
import { PrismaClient } from '@prisma/client';

// Create a direct database client
const prisma = new PrismaClient();

// Function to run the debug tests
async function debug() {
  // Create a context for tRPC
  const ctx = await createTRPCContext({ req: {} as any, resHeaders: new Headers() });
  
  // Create a caller
  const caller = appRouter.createCaller(ctx);
  
  try {
    console.log("\n=== CHECKING ROUTER IMPLEMENTATION ===");
    
    // Get what the router would return (what's shown in the UI)
    const routerWindows = await caller.attendanceWindow.getAll({ 
      branchId: "cm9vr2pix00037i2gb1vyn8pw" 
    });
    console.log(`Router returned ${routerWindows.length} windows`);
    if (routerWindows.length > 0) {
      console.log("First window from router:", routerWindows[0]);
    }
    
    console.log("\n=== CHECKING DATABASE DIRECTLY ===");
    
    // Get what's actually in the database
    const dbWindows = await prisma.attendanceWindow.findMany({
      where: { branchId: "cm9vr2pix00037i2gb1vyn8pw" },
      include: { locationType: true }
    });
    console.log(`Database has ${dbWindows.length} attendance windows`);
    if (dbWindows.length > 0) {
      console.log("First window from database:", dbWindows[0]);
    }
    
    // Check if there's a mismatch
    if (routerWindows.length !== dbWindows.length) {
      console.log("\n🚨 WARNING: Count mismatch between router and database!");
    } else if (routerWindows.length > 0 && dbWindows.length > 0) {
      if (routerWindows[0].id !== dbWindows[0].id) {
        console.log("\n🚨 WARNING: ID mismatch between router and database!");
        console.log("Router ID:", routerWindows[0].id);
        console.log("DB ID:", dbWindows[0].id);
      } else {
        console.log("\n✅ Data appears to match between router and database.");
      }
    }
    
  } catch (error) {
    console.error("Error in debug:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug function
debug().catch(console.error); 